# LuminAudio Self-Hosted

A fully self-contained, Dockerized version of LuminAudio that runs the [Chatterbox TTS](https://github.com/resemble-ai/chatterbox) model locally instead of calling the Resemble.ai cloud API. Includes an easy-to-use voice cloning UI.

## Features

- **No API key required** — the Chatterbox TTS model runs entirely on your machine
- **Voice cloning** — upload a short audio clip (0.5–30s) and the model will match that voice
- **Same LuminAudio UI** — dark theme, audio player, WAV/MP3 downloads
- **GPU accelerated** — NVIDIA CUDA support for fast inference
- **CPU fallback** — works without a GPU (slower)
- **Persistent storage** — model weights and voice files survive container restarts

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  Docker Compose                   │
│                                                   │
│  ┌─────────────┐         ┌─────────────────────┐ │
│  │  Frontend    │  HTTP   │  Chatterbox Backend  │ │
│  │  Next.js     │───────→│  FastAPI + PyTorch   │ │
│  │  :3000       │        │  :8000 (internal)    │ │
│  └─────────────┘         └─────────────────────┘ │
│        ↑                         ↑               │
│     Browser                 GPU / CPU             │
└──────────────────────────────────────────────────┘
```

## Quick Start

### With NVIDIA GPU

```bash
# Requires: Docker, Docker Compose, NVIDIA Container Toolkit
docker compose up -d --build
```

### CPU Only

```bash
docker compose -f docker-compose.cpu.yml up -d --build
```

Then open **http://localhost:3000** in your browser.

The first startup downloads the Chatterbox TTS model (~2 GB). The UI shows a loading indicator until the model is ready.

## Voice Cloning

1. Click **"Upload reference audio"** in the Voice section
2. Select a `.wav` or `.mp3` file (0.5–30 seconds of clear speech)
3. The uploaded voice appears as a selectable pill
4. Select it and generate speech — the output will match the uploaded voice

Uploaded voices are stored in `./voices/` and persist across restarts.

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `LUMINAUDIO_PORT` | `3000` | Host port for the web UI |
| `CHATTERBOX_BACKEND_URL` | `http://chatterbox:8000` | Backend URL (internal) |
| `HF_HOME` | `/app/model-cache` | HuggingFace model cache path |
| `VOICES_DIR` | `/app/voices` | Voice files directory |

## Generation Parameters

| Parameter | Range | Default | Description |
|---|---|---|---|
| Temperature | 0.1 – 1.5 | 0.8 | Sampling randomness (lower = more consistent) |
| Exaggeration | 0.0 – 2.0 | 0.5 | Emotional expressiveness |
| CFG Weight | 0.0 – 1.0 | 0.5 | Classifier-free guidance strength |
| Speed | 0.5x – 2.0x | 1.0x | Playback speed multiplier |

## System Requirements

### GPU Mode (Recommended)
- NVIDIA GPU with ≥6 GB VRAM
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/)
- Docker with GPU support

### CPU Mode
- 16 GB RAM recommended
- Inference is significantly slower (~10–30x)

## Stopping

```bash
docker compose down
```

To remove downloaded models:

```bash
docker compose down -v
```
