"""
LuminAudio Self-Hosted Chatterbox TTS Backend

A FastAPI server wrapping the Chatterbox TTS model for local text-to-speech
synthesis with voice cloning support. Designed to replace the Resemble.ai API
for fully self-hosted deployments.
"""

import asyncio
import io
import os
import re
import uuid
import struct
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from functools import partial
from typing import Optional

import torch
import torchaudio
import soundfile as sf
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

VOICES_DIR = Path(os.environ.get("VOICES_DIR", "/app/voices"))
MODEL_CACHE = Path(os.environ.get("HF_HOME", "/app/model-cache"))
DEFAULT_SAMPLE_RATE = int(os.environ.get("DEFAULT_SAMPLE_RATE", "24000"))
MAX_TEXT_LENGTH = 50_000
MAX_CHUNK_SIZE = 1000
MAX_REFERENCE_DURATION = 30  # seconds

VOICES_DIR.mkdir(parents=True, exist_ok=True)
MODEL_CACHE.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chatterbox-tts")

# ---------------------------------------------------------------------------
# Global model state
# ---------------------------------------------------------------------------

MODELS: dict[str, object] = {}  # "original" -> ChatterboxTTS, "turbo" -> ChatterboxTurboTTS
DEVICE = None

def load_models():
    """Load both Chatterbox TTS models (original and turbo)."""
    global DEVICE

    if torch.cuda.is_available():
        DEVICE = "cuda"
    else:
        DEVICE = "cpu"

    # Load original model (required — failure is fatal)
    logger.info(f"Loading Chatterbox TTS (original) on {DEVICE}...")
    from chatterbox.tts import ChatterboxTTS
    try:
        MODELS["original"] = ChatterboxTTS.from_pretrained(DEVICE)
    except RuntimeError as e:
        if DEVICE == "cuda" and "no kernel image" in str(e):
            logger.warning(
                f"CUDA kernel incompatible with this GPU. Falling back to CPU. "
                f"(Original error: {e})"
            )
            DEVICE = "cpu"
            MODELS["original"] = ChatterboxTTS.from_pretrained(DEVICE)
        else:
            raise
    logger.info(f"Chatterbox TTS (original) loaded successfully on {DEVICE}.")

    # Load turbo model (optional — failure is non-fatal)
    # Turbo weights may be pre-cached in the Docker image (no token needed) or
    # downloaded at runtime (requires HF_TOKEN for the gated HF repo).
    import importlib.util
    if importlib.util.find_spec("chatterbox.tts_turbo") is None:
        logger.info("Chatterbox TTS (turbo) module not found in installed package. Turbo will be unavailable.")
    else:
        hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
        if hf_token:
            try:
                import huggingface_hub
                huggingface_hub.login(token=hf_token, add_to_git_credential=False)
                logger.info("Authenticated with Hugging Face for turbo model access.")
            except Exception as e:
                logger.warning(f"Hugging Face login failed: {e}")

        try:
            logger.info(f"Loading Chatterbox TTS (turbo) on {DEVICE}...")
            from chatterbox.tts_turbo import ChatterboxTurboTTS
            MODELS["turbo"] = ChatterboxTurboTTS.from_pretrained(DEVICE)
            logger.info("Chatterbox TTS (turbo) loaded successfully.")
        except Exception as e:
            if "token" in str(e).lower() and not hf_token:
                logger.warning(
                    "Chatterbox TTS (turbo) requires a Hugging Face token for download. "
                    "Set HF_TOKEN env var or pre-cache weights in the Docker image. "
                    "Turbo will be unavailable."
                )
            else:
                logger.warning(f"Chatterbox TTS (turbo) failed to load: {e}. Turbo will be unavailable.")


async def _load_models_with_retry(max_retries: int = 3, base_delay: float = 10.0):
    """Attempt to load models with retries in the background."""
    loop = asyncio.get_event_loop()
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Model loading attempt {attempt}/{max_retries}...")
            await loop.run_in_executor(None, load_models)
            logger.info("Models loaded successfully.")
            return
        except Exception as e:
            logger.error(f"Model loading attempt {attempt}/{max_retries} failed: {e}")
            if attempt < max_retries:
                delay = base_delay * attempt
                logger.info(f"Retrying in {delay:.0f}s...")
                await asyncio.sleep(delay)
    logger.error("All model loading attempts failed. The /api/health endpoint will report models as unavailable.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start model loading in the background so the server can accept health checks immediately."""
    task = asyncio.create_task(_load_models_with_retry())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="LuminAudio Chatterbox TTS",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class SynthesizeRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    model: str = "original"  # "original" | "turbo"
    temperature: float = Field(0.8, ge=0.1, le=1.5)
    exaggeration: float = Field(0.5, ge=0.0, le=2.0)
    cfg_weight: float = Field(0.5, ge=0.0, le=1.0)
    seed: Optional[int] = None
    speed_factor: float = Field(1.0, ge=0.5, le=2.0)
    sample_rate: int = Field(24000, ge=8000, le=48000)

class VoiceInfo(BaseModel):
    id: str
    name: str
    filename: str
    is_predefined: bool
    clone_type: str = "rapid"  # "rapid" | "pro"

# ---------------------------------------------------------------------------
# Text chunking (mirrors frontend chunker.ts logic)
# ---------------------------------------------------------------------------

def chunk_text(text: str) -> list[str]:
    """Split text into chunks at natural boundaries."""
    trimmed = text.strip()
    if not trimmed:
        return []
    if len(trimmed) <= MAX_CHUNK_SIZE:
        return [trimmed]

    chunks = []
    remaining = trimmed

    while remaining:
        if len(remaining) <= MAX_CHUNK_SIZE:
            chunks.append(remaining.strip())
            break

        cut = _find_best_break(remaining, MAX_CHUNK_SIZE)
        chunks.append(remaining[:cut].strip())
        remaining = remaining[cut:].strip()

    return [c for c in chunks if c]


def _find_best_break(text: str, max_len: int) -> int:
    window = text[:max_len]

    # 1. Paragraph break
    idx = window.rfind("\n\n")
    if idx > max_len * 0.3:
        return idx + 2

    # 2. Sentence end
    last_sentence = -1
    for m in re.finditer(r'[.!?]["\'\)\]»]?\s', window):
        last_sentence = m.end()
    if last_sentence > max_len * 0.3:
        return last_sentence

    # 3. Clause boundary
    last_clause = -1
    for m in re.finditer(r'[;:,—–]\s', window):
        last_clause = m.end()
    if last_clause > max_len * 0.3:
        return last_clause

    # 4. Word boundary
    idx = window.rfind(" ")
    if idx > max_len * 0.2:
        return idx + 1

    return max_len

# ---------------------------------------------------------------------------
# Audio utilities
# ---------------------------------------------------------------------------

def build_wav_header(data_length: int, sample_rate: int, bits_per_sample: int = 16, num_channels: int = 1) -> bytes:
    """Build a standard 44-byte WAV header."""
    byte_rate = sample_rate * num_channels * (bits_per_sample // 8)
    block_align = num_channels * (bits_per_sample // 8)

    header = bytearray(44)
    struct.pack_into('<4sI4s', header, 0, b'RIFF', 36 + data_length, b'WAVE')
    struct.pack_into('<4sIHHIIHH', header, 12,
                     b'fmt ', 16, 1, num_channels, sample_rate,
                     byte_rate, block_align, bits_per_sample)
    struct.pack_into('<4sI', header, 36, b'data', data_length)
    return bytes(header)


def audio_tensor_to_wav(audio: torch.Tensor, sample_rate: int, target_sr: int = None) -> bytes:
    """Convert a torch audio tensor to WAV bytes."""
    if audio.dim() == 1:
        audio = audio.unsqueeze(0)

    # Resample if needed
    if target_sr and target_sr != sample_rate:
        audio = torchaudio.functional.resample(audio, sample_rate, target_sr)
        sample_rate = target_sr

    # Normalize to prevent clipping
    peak = audio.abs().max()
    if peak > 0:
        audio = audio * (0.95 / peak)

    # Convert to 16-bit PCM
    audio_np = (audio.squeeze().cpu().numpy() * 32767).astype(np.int16)

    buf = io.BytesIO()
    sf.write(buf, audio_np, sample_rate, format='WAV', subtype='PCM_16')
    buf.seek(0)
    return buf.read()


def concatenate_wav_bytes(wav_list: list[bytes], silence_ms: int = 400) -> bytes:
    """Concatenate multiple WAV byte arrays with silence gaps."""
    if len(wav_list) == 0:
        return b''
    if len(wav_list) == 1:
        return wav_list[0]

    all_audio = []
    sample_rate = None

    for wav_bytes in wav_list:
        data, sr = sf.read(io.BytesIO(wav_bytes), dtype='int16')
        if sample_rate is None:
            sample_rate = sr
        all_audio.append(data)
        # Add silence gap
        silence_samples = int((silence_ms / 1000) * sr)
        all_audio.append(np.zeros(silence_samples, dtype=np.int16))

    # Remove trailing silence
    if len(all_audio) > 1:
        all_audio = all_audio[:-1]

    combined = np.concatenate(all_audio)
    buf = io.BytesIO()
    sf.write(buf, combined, sample_rate, format='WAV', subtype='PCM_16')
    buf.seek(0)
    return buf.read()

# ---------------------------------------------------------------------------
# Voice management helpers
# ---------------------------------------------------------------------------

def list_voices() -> list[VoiceInfo]:
    """List all available voice files."""
    voices = []
    if not VOICES_DIR.exists():
        return voices

    for f in sorted(VOICES_DIR.iterdir()):
        if f.suffix.lower() in ('.wav', '.mp3', '.flac', '.ogg'):
            voice_id = f.stem
            name = f.stem.replace("_", " ").replace("-", " ").title()
            voices.append(VoiceInfo(
                id=voice_id,
                name=name,
                filename=f.name,
                is_predefined=False,
            ))
    return voices


def get_voice_path(voice_id: str) -> Optional[Path]:
    """Resolve a voice ID to its audio file path."""
    if not voice_id:
        return None

    voices_root = VOICES_DIR.resolve()

    # Direct filename match
    for ext in ('.wav', '.mp3', '.flac', '.ogg'):
        path = VOICES_DIR / f"{voice_id}{ext}"
        if path.resolve().is_relative_to(voices_root) and path.exists():
            return path

    # Try exact filename
    path = VOICES_DIR / voice_id
    if path.resolve().is_relative_to(voices_root) and path.exists():
        return path

    return None

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    """Health check endpoint."""
    hf_token_set = bool(os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN"))
    return {
        "status": "ok",
        "model_loaded": "original" in MODELS,
        "models_loaded": list(MODELS.keys()),
        "device": str(DEVICE),
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "hf_token_set": hf_token_set,
    }


@app.get("/api/voices")
async def get_voices():
    """List all available voices (predefined and uploaded)."""
    voices = list_voices()
    return {"voices": [v.model_dump() for v in voices]}


@app.post("/api/upload-voice")
async def upload_voice(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
):
    """Upload a reference audio file for voice cloning."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ('.wav', '.mp3', '.flac', '.ogg'):
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Use .wav, .mp3, .flac, or .ogg"
        )

    content = await file.read()

    # Validate audio duration
    try:
        data, sr = sf.read(io.BytesIO(content))
        duration = len(data) / sr
        if duration > MAX_REFERENCE_DURATION:
            raise HTTPException(
                status_code=400,
                detail=f"Audio too long ({duration:.1f}s). Maximum is {MAX_REFERENCE_DURATION}s."
            )
        if duration < 0.5:
            raise HTTPException(
                status_code=400,
                detail="Audio too short. Minimum is 0.5 seconds."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read audio file: {e}")

    # Generate safe filename
    if name:
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name.strip())
    else:
        safe_name = Path(file.filename).stem
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', safe_name)

    # Avoid collisions
    target = VOICES_DIR / f"{safe_name}{ext}"
    if target.exists():
        safe_name = f"{safe_name}_{uuid.uuid4().hex[:6]}"
        target = VOICES_DIR / f"{safe_name}{ext}"

    target.write_bytes(content)
    logger.info(f"Saved voice file: {target}")

    return {
        "id": safe_name,
        "name": safe_name.replace("_", " ").replace("-", " ").title(),
        "filename": target.name,
        "duration": round(duration, 1),
    }


@app.delete("/api/voices/{voice_id}")
async def delete_voice(voice_id: str):
    """Delete an uploaded voice file."""
    path = get_voice_path(voice_id)
    if not path:
        raise HTTPException(status_code=404, detail="Voice not found")

    path.unlink()
    logger.info(f"Deleted voice file: {path}")
    return {"status": "deleted", "id": voice_id}


class RenameVoiceRequest(BaseModel):
    name: str


@app.patch("/api/voices/{voice_id}")
async def rename_voice(voice_id: str, req: RenameVoiceRequest):
    """Rename an uploaded voice file."""
    path = get_voice_path(voice_id)
    if not path:
        raise HTTPException(status_code=404, detail="Voice not found")

    new_name = req.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', new_name)
    if not safe_name:
        raise HTTPException(status_code=400, detail="Name must contain at least one alphanumeric character")

    ext = path.suffix
    new_path = VOICES_DIR / f"{safe_name}{ext}"

    # Avoid collisions (but allow renaming to same file)
    if new_path != path and new_path.exists():
        safe_name = f"{safe_name}_{uuid.uuid4().hex[:6]}"
        new_path = VOICES_DIR / f"{safe_name}{ext}"

    path.rename(new_path)
    logger.info(f"Renamed voice file: {path} -> {new_path}")

    return {
        "id": safe_name,
        "name": safe_name.replace("_", " ").replace("-", " ").title(),
        "filename": new_path.name,
    }


@app.post("/api/synthesize")
async def synthesize(req: SynthesizeRequest):
    """Synthesize speech from text using Chatterbox TTS."""
    if len(MODELS) == 0:
        raise HTTPException(status_code=503, detail="Models not loaded yet. Please wait.")

    model_key = req.model if req.model in ("original", "turbo") else "original"
    model = MODELS.get(model_key)
    if model is None:
        raise HTTPException(status_code=503, detail=f"Model '{model_key}' is not loaded.")

    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")

    if len(req.text) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Text exceeds maximum length of {MAX_TEXT_LENGTH:,} characters"
        )

    # Resolve voice reference audio
    audio_prompt_path = None
    if req.voice_id:
        voice_path = get_voice_path(req.voice_id)
        if voice_path:
            audio_prompt_path = str(voice_path)
        else:
            raise HTTPException(status_code=404, detail=f"Voice '{req.voice_id}' not found")

    # Set seed for reproducibility
    if req.seed is not None:
        torch.manual_seed(req.seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed(req.seed)

    try:
        chunks = chunk_text(req.text)
        if not chunks:
            raise HTTPException(status_code=400, detail="Text is empty after processing")

        is_turbo = model_key == "turbo"
        wav_buffers = []
        loop = asyncio.get_event_loop()
        for i, chunk in enumerate(chunks):
            logger.info(f"Synthesizing chunk {i+1}/{len(chunks)} ({len(chunk)} chars) [model={model_key}]")

            if is_turbo:
                fn = partial(
                    model.generate,
                    chunk,
                    audio_prompt_path=audio_prompt_path,
                )
            else:
                fn = partial(
                    model.generate,
                    chunk,
                    audio_prompt_path=audio_prompt_path,
                    exaggeration=req.exaggeration,
                    temperature=req.temperature,
                    cfg_weight=req.cfg_weight,
                )
            # Run blocking synthesis in a thread so the event loop (and health
            # checks) remain responsive during long CPU inference.
            wav = await loop.run_in_executor(None, fn)

            # Apply speed factor
            if req.speed_factor != 1.0 and req.speed_factor > 0:
                original_sr = 24000
                new_sr = int(original_sr * req.speed_factor)
                wav = torchaudio.functional.resample(wav, new_sr, original_sr)

            wav_bytes = audio_tensor_to_wav(wav, 24000, target_sr=req.sample_rate)
            wav_buffers.append(wav_bytes)

        # Concatenate chunks
        if len(wav_buffers) == 1:
            result = wav_buffers[0]
        else:
            result = concatenate_wav_bytes(wav_buffers)

        return Response(
            content=result,
            media_type="audio/wav",
            headers={
                "Content-Disposition": 'inline; filename="output.wav"',
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Synthesis failed")
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)[:300]}")


@app.post("/api/synthesize-with-upload")
async def synthesize_with_upload(
    text: str = Form(...),
    model: str = Form("original"),
    temperature: float = Form(0.8),
    exaggeration: float = Form(0.5),
    cfg_weight: float = Form(0.5),
    seed: Optional[int] = Form(None),
    speed_factor: float = Form(1.0),
    sample_rate: int = Form(24000),
    reference_audio: Optional[UploadFile] = File(None),
):
    """Synthesize with an inline reference audio upload (for one-off cloning)."""
    if len(MODELS) == 0:
        raise HTTPException(status_code=503, detail="Models not loaded yet. Please wait.")

    model_key = model if model in ("original", "turbo") else "original"
    selected_model = MODELS.get(model_key)
    if selected_model is None:
        raise HTTPException(status_code=503, detail=f"Model '{model_key}' is not loaded.")

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")

    if len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Text exceeds maximum length of {MAX_TEXT_LENGTH:,} characters"
        )

    # Clamp parameters to valid ranges
    temperature = max(0.1, min(1.5, temperature))
    exaggeration = max(0.0, min(2.0, exaggeration))
    cfg_weight = max(0.0, min(1.0, cfg_weight))
    speed_factor = max(0.5, min(2.0, speed_factor))
    sample_rate = max(8000, min(48000, sample_rate))

    audio_prompt_path = None
    temp_file = None

    try:
        # Handle inline reference audio
        if reference_audio and reference_audio.filename:
            content = await reference_audio.read()
            ext = Path(reference_audio.filename).suffix.lower()
            temp_file = Path(f"/tmp/ref_{uuid.uuid4().hex}{ext}")
            temp_file.write_bytes(content)
            audio_prompt_path = str(temp_file)

        if seed is not None:
            torch.manual_seed(seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed(seed)

        chunks = chunk_text(text)
        if not chunks:
            raise HTTPException(status_code=400, detail="Text is empty after processing")

        is_turbo = model_key == "turbo"
        wav_buffers = []
        loop = asyncio.get_event_loop()
        for i, chunk in enumerate(chunks):
            logger.info(f"Synthesizing chunk {i+1}/{len(chunks)} ({len(chunk)} chars) [model={model_key}]")

            if is_turbo:
                fn = partial(
                    selected_model.generate,
                    chunk,
                    audio_prompt_path=audio_prompt_path,
                )
            else:
                fn = partial(
                    selected_model.generate,
                    chunk,
                    audio_prompt_path=audio_prompt_path,
                    exaggeration=exaggeration,
                    temperature=temperature,
                    cfg_weight=cfg_weight,
                )
            # Run blocking synthesis in a thread so the event loop remains responsive.
            wav = await loop.run_in_executor(None, fn)

            if speed_factor != 1.0 and speed_factor > 0:
                original_sr = 24000
                new_sr = int(original_sr * speed_factor)
                wav = torchaudio.functional.resample(wav, new_sr, original_sr)

            wav_bytes = audio_tensor_to_wav(wav, 24000, target_sr=sample_rate)
            wav_buffers.append(wav_bytes)

        if len(wav_buffers) == 1:
            result = wav_buffers[0]
        else:
            result = concatenate_wav_bytes(wav_buffers)

        return Response(
            content=result,
            media_type="audio/wav",
            headers={
                "Content-Disposition": 'inline; filename="output.wav"',
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Synthesis failed")
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)[:300]}")
    finally:
        if temp_file and temp_file.exists():
            temp_file.unlink()
