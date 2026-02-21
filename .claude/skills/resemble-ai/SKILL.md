---
name: resemble-ai
description: >
  Use this skill whenever working with the Resemble AI text-to-speech API. Triggers include:
  any mention of Resemble, resemble.ai, voice synthesis, TTS with Resemble, Chatterbox TTS,
  voice cloning with Resemble, or generating audio using a voice UUID. Use this skill when
  the user wants to synthesize speech, stream audio, list or manage voices, or build any
  application that calls the Resemble API. Always apply this skill when writing code that
  imports @resemble/node or the resemble Python package, or that calls f.cluster.resemble.ai
  or app.resemble.ai endpoints.
---

# Resemble AI — TTS Skill

## Key facts

| Item | Value |
|------|-------|
| **Default model** | `chatterbox-turbo` (`tts-v4-turbo`) — always use this unless the user specifies otherwise |
| **Character limit** | 2,000 chars (sync/stream HTTP); 3,000 chars (WebSocket) |
| **Synthesis server** | `https://f.cluster.resemble.ai` |
| **API server** | `https://app.resemble.ai/api/v2` |
| **Auth header** | `Authorization: Bearer YOUR_API_KEY` |
| **Rate limit** | 40 req/s (general); 10 req/min for audio enhancement |

## Models

| Model | Code | Latency | Notes |
|-------|------|---------|-------|
| **Chatterbox Turbo** ✅ default | `chatterbox-turbo` | 200ms TTFS | Native paralinguistic tags (`[laugh]`, `[cough]`, `[chuckle]`). Pre-built & Rapid English voices only. |
| Chatterbox | `tts-v4` | 250ms TTFS | Broader voice support including multilingual |
| Chatterbox Multilingual | `tts-v4` | 250ms TTFS | 23 languages — NOT compatible with turbo |

> **Paralinguistic tags** (Turbo only): `[laugh]`, `[chuckle]`, `[cough]`, `[sigh]`, etc. Insert inline in text.

## Synthesis modes

Choose the right mode for the use case:

| Mode | Endpoint | Best for |
|------|----------|----------|
| **Synchronous** | `POST /synthesize` | Short clips, notifications, batch jobs |
| **HTTP Streaming** | `POST /stream` | Long-form content, progressive playback |
| **WebSocket Streaming** | `wss://websocket.cluster.resemble.ai/stream` | Real-time agents (Business plan+) |

---

## Synchronous TTS

**Endpoint:** `POST https://f.cluster.resemble.ai/synthesize`

### Required fields
- `voice_uuid` — string
- `data` — text or SSML (≤ 2,000 chars)

### Optional fields
- `model` — default to `chatterbox-turbo`
- `output_format` — `wav` (default) or `mp3`
- `sample_rate` — `8000`, `16000`, `22050`, `32000`, `44100`, `48000` (default `48000`)
- `precision` — `PCM_32` (default), `PCM_24`, `PCM_16`, `MULAW`
- `use_hd` — `false` (default); small latency trade-off for higher quality
- `project_uuid`, `title` — optional metadata

### Response
Returns JSON with `audio_content` as **base64-encoded audio**. Decode to get raw bytes.

```python
import requests, base64, os

resp = requests.post(
    "https://f.cluster.resemble.ai/synthesize",
    headers={"Authorization": f"Bearer {os.environ['RESEMBLE_API_KEY']}"},
    json={
        "voice_uuid": "YOUR_VOICE_UUID",
        "data": "Hello from Resemble!",
        "model": "chatterbox-turbo",   # default — always include
        "output_format": "wav",
        "sample_rate": 48000,
    }
)
audio = base64.b64decode(resp.json()["audio_content"])
with open("output.wav", "wb") as f:
    f.write(audio)
```

```typescript
import fs from "fs";

const resp = await fetch("https://f.cluster.resemble.ai/synthesize", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.RESEMBLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    voice_uuid: "YOUR_VOICE_UUID",
    data: "Hello from Resemble!",
    model: "chatterbox-turbo",  // default — always include
    output_format: "wav",
    sample_rate: 48000,
  }),
});
const { audio_content } = await resp.json();
fs.writeFileSync("output.wav", Buffer.from(audio_content, "base64"));
```

---

## HTTP Streaming TTS

**Endpoint:** `POST https://f.cluster.resemble.ai/stream`

Same request body as synchronous. Response is a chunked PCM WAV stream.

```python
import requests, os

with requests.post(
    "https://f.cluster.resemble.ai/stream",
    headers={"Authorization": f"Bearer {os.environ['RESEMBLE_API_KEY']}"},
    json={
        "voice_uuid": "YOUR_VOICE_UUID",
        "data": "Streaming audio arrives progressively.",
        "model": "chatterbox-turbo",
        "sample_rate": 48000,
        "precision": "PCM_16",
    },
    stream=True,
) as resp:
    with open("output.wav", "wb") as f:
        for chunk in resp.iter_content(chunk_size=4096):
            f.write(chunk)
```

---

## WebSocket Streaming TTS

**URL:** `wss://websocket.cluster.resemble.ai/stream`  
*(Business plan required)*

Send a JSON payload, receive `audio` frames, terminate on `audio_end`.

```python
import asyncio, websockets, json, base64, os

async def stream_tts():
    uri = "wss://websocket.cluster.resemble.ai/stream"
    async with websockets.connect(uri, extra_headers={
        "Authorization": f"Bearer {os.environ['RESEMBLE_API_KEY']}"
    }) as ws:
        await ws.send(json.dumps({
            "voice_uuid": "YOUR_VOICE_UUID",
            "data": "Real-time voice streaming.",
            "model": "chatterbox-turbo",
            "binary_response": False,
            "output_format": "wav",
            "sample_rate": 32000,
        }))
        with open("output.wav", "wb") as f:
            async for msg in ws:
                frame = json.loads(msg)
                if frame["type"] == "audio_end":
                    break
                f.write(base64.b64decode(frame["audio_content"]))

asyncio.run(stream_tts())
```

**Frame types:**
- `audio` — contains `audio_content` (base64), `audio_timestamps`, `sample_rate`, `request_id`
- `audio_end` — synthesis complete
- `error` — check `error_name`; recoverable errors keep connection open

---

## Voice Management

### List voices
```bash
GET https://app.resemble.ai/api/v2/voices
```
Query params: `page`, `page_size`, `pre_built_resemble_voice`, `gender`, `age`, `accents`, `use_case`, `tone_of_voice`, `sample_url`

### Get voice
```bash
GET https://app.resemble.ai/api/v2/voices/{uuid}
```

### Delete voice
```bash
DELETE https://app.resemble.ai/api/v2/voices/{uuid}
```

```python
import requests, os

headers = {"Authorization": f"Bearer {os.environ['RESEMBLE_API_KEY']}"}

# List
voices = requests.get("https://app.resemble.ai/api/v2/voices", headers=headers).json()

# Get one
voice = requests.get(f"https://app.resemble.ai/api/v2/voices/{uuid}", headers=headers).json()
```

---

## Official SDKs

**Node.js:**
```bash
npm install @resemble/node
```
```ts
import { Resemble } from "@resemble/node";
Resemble.setApiKey(process.env.RESEMBLE_API_KEY!);

const response = await Resemble.v2.clips.createSync("PROJECT_UUID", {
  voice_uuid: "VOICE_UUID",
  body: "Hello!",
  title: "My clip",
});
console.log(response.item.audio_src);
```

**Python:**
```bash
pip install resemble
```
```python
from resemble import Resemble
import os

Resemble.api_key(os.environ.get("RESEMBLE_API_KEY"))

response = Resemble.v2.clips.create_sync(
    "PROJECT_UUID",
    "VOICE_UUID",
    "Hello from Resemble!",
    title="My clip"
)
print(response["item"]["audio_src"])
```

---

## Error handling

All REST responses include `"success": true/false`. On failure, `"message"` explains the error. Always check `success` and log errors with request IDs.

```python
resp_json = resp.json()
if not resp_json.get("success"):
    raise RuntimeError(f"Resemble error: {resp_json.get('message')}")
```

---

## Common pitfalls

- **Wrong server**: Use `f.cluster.resemble.ai` for synthesis/streaming; `app.resemble.ai` for voice/project management.
- **Turbo voice compatibility**: `chatterbox-turbo` only works with Pre-Built Library voices and Rapid English voices. Not compatible with Chatterbox Multilingual.
- **Character limits**: Sync and HTTP stream = 2,000 chars max; WebSocket = 3,000 chars max.
- **WebSocket plan requirement**: WebSocket streaming requires Business plan or above.
- **Auth format**: Some examples show bare key; always use `Bearer YOUR_API_KEY` in the `Authorization` header.

## Audio output parameters

| `sample_rate` | Use case |
|---------------|----------|
| 8000 / 16000 | Telephony |
| 22050 | Standard audio |
| 44100 / 48000 | High-quality (default 48000) |

| `precision` | Use case |
|-------------|----------|
| `PCM_32` | Highest quality (default) |
| `PCM_16` | Smaller files, streaming |
| `MULAW` | Telephony |

| `output_format` | |
|-----------------|---|
| `wav` | Default, lossless |
| `mp3` | Compressed |
