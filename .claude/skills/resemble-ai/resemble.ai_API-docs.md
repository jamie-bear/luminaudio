***

title: Authentication
slug: /getting-started/authentication
-------------------------------------

All Resemble API endpoints use the same authentication method. Your API key works across both servers.

## Getting Your API Key

Create or retrieve your API key from the [Account → API](https://app.resemble.ai/hub/api) page.

## Authentication Format

All requests require a Bearer token in the Authorization header:

```http
Authorization: Bearer YOUR_API_KEY
```

## Servers

Resemble uses two servers depending on the endpoint type:

| Server    | Base URL                         | Purpose                                           |
| --------- | -------------------------------- | ------------------------------------------------- |
| Synthesis | `https://f.cluster.resemble.ai`  | Text-to-Speech, Speech-to-Speech                  |
| API       | `https://app.resemble.ai/api/v2` | Voices, projects, clips, recordings, agents, etc. |

### Synthesis Server Example

```bash
curl --request POST "https://f.cluster.resemble.ai/synthesize" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "voice_uuid": "YOUR_VOICE_UUID",
    "data": "Hello from Resemble!"
  }'
```

### API Server Example

```bash
curl 'https://app.resemble.ai/api/v2/voices' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

## SDK Configuration

The SDKs handle authentication automatically once you set your API key:

### Node.js

```ts
import { Resemble } from "@resemble/node";

Resemble.setApiKey("YOUR_API_KEY");
```

### Python

```python
from resemble import Resemble

Resemble.api_key("YOUR_API_KEY")
```

Store tokens securely and rotate them according to your security policies.

***

title: Rate Limits
slug: /getting-started/rate-limits
----------------------------------

The public REST API generally allows **40 requests per second** per API token. Please verify against the endpoint-specific rate limits below, as some endpoints have different limits. Contact [support@resemble.ai](mailto:support@resemble.ai) if you need higher throughput.

## Endpoint-Specific Rate Limits

Some endpoints have different rate limits:

| Endpoint                                            | Rate Limit                 | Description                  |
| --------------------------------------------------- | -------------------------- | ---------------------------- |
| [Audio Enhancement](/audio-tools/audio-enhancement) | **10 requests per minute** | `/api/v2/audio_enhancements` |

***

title: Error Handling
slug: /getting-started/errors
-----------------------------

All REST endpoints return JSON along with an HTTP status code.

```json
{
  "success": true,
  "...": "other response fields"
}
```

When a request fails, the response includes a descriptive message:

```json
{
  "success": false,
  "message": "Why the request failed"
}
```

Log errors with the associated request ID whenever possible so that the Resemble team can help debug issues quickly.

***

title: Model Versions
slug: /getting-started/model-versions
-------------------------------------

All voices you clone with Resemble automatically use **Chatterbox**, our latest and most advanced text-to-speech model. You don't need to select a model—every new voice is created with Chatterbox by default.

## Resemble Chatterbox

Chatterbox is available in three variants:

| Variant                 | Version Code   | Description                                                             | Dataset Requirements | Streaming Support |
| ----------------------- | -------------- | ----------------------------------------------------------------------- | -------------------- | ----------------- |
| Chatterbox              | `tts-v4`       | Next-generation TTS model offering improved performance and efficiency. | 10+ seconds          | ✅ Yes             |
| Chatterbox-Turbo        | `tts-v4-turbo` | Most efficient model with native paralinguistic tag support.            | 10+ seconds          | ✅ Yes             |
| Chatterbox Multilingual | `tts-v4`       | Multilingual TTS supporting 23 languages with high-quality performance. | 10+ seconds          | ✅ Yes             |

### Performance

| Variant                 | Latency / TTFS\* | Character Limits         | Notes                                                                                                                                                                                                                                                                                                                                             |
| ----------------------- | ---------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chatterbox              | 250ms            | Maximum 2000 characters. | SSML Tags Not Supported: `<prosody>`, `<emotion>`, `<phonemes>`, `<substitutions>`, `<emphasis>`, `<say-as>`. Timestamps not supported.                                                                                                                                                                                                           |
| Chatterbox-Turbo        | 200ms            | Maximum 2000 characters. | **Native paralinguistic tag support:** Use `[cough]`, `[laugh]`, `[chuckle]`, and more for added realism. Optimized for low-latency voice agents, narration, and creative workflows. Compatible with Pre Built Library Voices and Rapid English voices only. **Not supported with Chatterbox Multilingual.** Same SSML limitations as Chatterbox. |
| Chatterbox Multilingual | 250ms            | Maximum 2000 characters. | Same limitations as Chatterbox. Supported languages: es, en, fr, de, ar, pt, ru, tr, it, da, fi, ja, ko, zh, nl, sk, sv, vi, no, pl, sw, hi, he.                                                                                                                                                                                                  |

> **Note:** *Time-to-first-sound (TTFS) reflects best-case numbers. Cold starts, network latency, and load can increase actual latency.*

## Deprecated Models

The following models are deprecated and no longer available for new voice cloning. They are listed here for reference only.

<Accordion title="Deprecated Text-to-Speech Models">
  | Version Name             | Version Code | Description                                                   | Dataset Requirements | Streaming Support | Release Date |
  | ------------------------ | ------------ | ------------------------------------------------------------- | -------------------- | ----------------- | ------------ |
  | Resemble Enhanced TTS v3 | `tts-v3`     | Enhanced TTS with excellent latency and fidelity.             | 10+ minutes          | ✅ Yes             | Q4 2023      |
  | Resemble Enhanced TTS v2 | `tts-v2`     | Enhanced model with lower latency and high naturalness.       | 30+ minutes          | ✅ Yes             | Q3 2023      |
  | Resemble Enhanced TTS v1 | `tts-v1`     | First enhanced model delivering state-of-the-art naturalness. | 10+ minutes          | 🚫 No             | Q2 2023      |
  | Resemble Legacy TTS      | `tts-legacy` | First-generation TTS balancing speed and quality.             | 1+ minutes           | ✅ Yes             | Q2 2021      |
</Accordion>

## Speech-to-Speech Models

| Version Name         | Version Code | Description                                                | Dataset Requirements | Streaming Support | Release Date |
| -------------------- | ------------ | ---------------------------------------------------------- | -------------------- | ----------------- | ------------ |
| Resemble Core STS v2 | `sts-v2`     | Improved pitch tracking and 48 kHz support.                | 10+ minutes          | ✅ Yes             | Q4 2023      |
| Resemble Core STS v1 | `sts-v1`     | Enhanced conversion with better speed and accuracy.        | 10+ minutes          | ✅ Yes             | Q2 2023      |
| Resemble Legacy STS  | `sts-legacy` | Initial speech-to-speech model for basic voice conversion. | 10+ minutes          | ✅ Yes             | Q2 2021      |


***

title: Synthesize Your First Clip
slug: /guides/creating-clips/getting-started
--------------------------------------------

Learn how to synthesize audio clips using the Resemble API.

## Prerequisites

* Resemble account with confirmed email
* API key (see [Authentication](/getting-started/authentication))
* A voice UUID (use a marketplace voice or create your own)

## Quick Examples

### HTTP (curl)

```bash
curl --request POST "https://f.cluster.resemble.ai/synthesize" \
  -H "Authorization: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "voice_uuid": "YOUR_VOICE_UUID",
    "data": "Hello from Resemble!",
    "sample_rate": 22050,
    "output_format": "wav"
  }' \
  | jq -r '.audio_content' | base64 --decode > output.wav
```

### Node.js

```bash
npm install @resemble/node
```

```js
import { Resemble } from "@resemble/node";

Resemble.setApiKey(process.env.RESEMBLE_API_KEY);

const response = await Resemble.v2.clips.createSync("YOUR_PROJECT_UUID", {
  voice_uuid: "YOUR_VOICE_UUID",
  body: "Hello from Resemble!",
  title: "My First Clip"
});

console.log(response.item.audio_src);
```

### Python

```bash
pip install resemble
```

```python
from resemble import Resemble
import os

Resemble.api_key(os.environ.get("RESEMBLE_API_KEY"))

response = Resemble.v2.clips.create_sync(
    "YOUR_PROJECT_UUID",
    "YOUR_VOICE_UUID",
    "Hello from Resemble!",
    title="My First Clip"
)

print(response["item"]["audio_src"])
```

## Response

The synthesis server returns:

```json
{
  "success": true,
  "audio_content": "<base64-encoded-audio>",
  "audio_timestamps": {
    "graph_chars": ["H", "e", "l", "l", "o", " ", "f", "r", "o", "m", " ", "R", "e", "s", "e", "m", "b", "l", "e", "!"],
    "graph_times": [[0.08, 0.12], [0.12, 0.18], [0.18, 0.24], [0.24, 0.30], [0.30, 0.36], [0.36, 0.40], [0.40, 0.46], [0.46, 0.52], [0.52, 0.58], [0.58, 0.64], [0.64, 0.68], [0.68, 0.74], [0.74, 0.80], [0.80, 0.86], [0.86, 0.92], [0.92, 0.98], [0.98, 1.04], [1.04, 1.10], [1.10, 1.16], [1.16, 1.68]],
    "phon_chars": [],
    "phon_times": []
  },
  "duration": 1.68,
  "issues": [],
  "output_format": "wav",
  "sample_rate": 22050,
  "seed": 3389672177,
  "synth_duration": 1.68,
  "title": null
}
```

Decode `audio_content` from base64 to get the raw audio bytes.

## Next Steps

* Learn about [streaming synthesis](/voice-generation/text-to-speech/streaming-http) for lower latency
* Explore [voice cloning](/voice-creation/voices/clone-overview) to create custom voices
* See [SSML Reference](/getting-started/ssml) for advanced speech control


***

title: Text-to-Speech
slug: /voice-generation/text-to-speech
--------------------------------------

Turn text into natural, production-ready speech. Resemble supports multiple synthesis modes tuned for different latency and integration needs.

## Synthesis Modes

### [Synchronous](./text-to-speech/synchronous)

Request-based synthesis that returns a complete audio file in a single response.

Best suited for:

* Alerts and notifications
* Short-form content
* Workflows that require the entire clip before progressing

### [Streaming over HTTP](./text-to-speech/streaming-http)

Receive audio chunks progressively via chunked HTTP responses.

Best suited for:

* Longer scripts
* Progressive playback experiences
* Reducing perceived latency without persistent sockets

### [Streaming over WebSocket](./text-to-speech/streaming-websocket)

Maintain a WebSocket to receive the lowest-latency audio stream with per-chunk metadata.

Best suited for:

* Conversational agents
* Interactive assistants
* Real-time media experiences where milliseconds matter (Business plan and above)

## Next Steps

1. Generate an API token from the dashboard.
2. Pick the synthesis mode that fits your UX.
3. Follow the dedicated page for request/response formats and implementation tips.

***

title: Synchronous
slug: /voice-generation/text-to-speech/synchronous
--------------------------------------------------

The synchronous endpoint processes the entire input and returns a single audio payload—ideal for short prompts, notifications, or background jobs that do not require streaming.

## Quick Example

```bash
curl --request POST "https://f.cluster.resemble.ai/synthesize" \
  -H "Authorization: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip" \
  --data '{
    "voice_uuid": "55592656",
    "data": "Hello from Resemble!",
    "sample_rate": 48000,
    "output_format": "wav"
  }'
```

Decode the `audio_content` field from base64 to retrieve the raw audio bytes.

## Endpoint

`POST https://f.cluster.resemble.ai/synthesize`

### Request Headers

| Header            | Value                      | Description                 |
| ----------------- | -------------------------- | --------------------------- |
| `Authorization`   | `YOUR_API_KEY`             | API key from the dashboard. |
| `Content-Type`    | `application/json`         | JSON request body.          |
| `Accept-Encoding` | `gzip`, `deflate`, or `br` | Optional compression.       |

### Request Body

| Field           | Type    | Required | Description                                                                                                                                                                                                                                                                                                            |
| --------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `voice_uuid`    | string  | Yes      | Voice to synthesize.                                                                                                                                                                                                                                                                                                   |
| `data`          | string  | Yes      | Text or SSML to synthesize (≤ 2,000 characters).                                                                                                                                                                                                                                                                       |
| `project_uuid`  | string  | No       | Project to store the clip in.                                                                                                                                                                                                                                                                                          |
| `title`         | string  | No       | Title for the generated clip.                                                                                                                                                                                                                                                                                          |
| `model`         | string  | No       | Model to use for synthesis. Pass `chatterbox-turbo` to use the Turbo model for lower latency and paralinguistic tag support. If not specified, defaults to Chatterbox or Chatterbox Multilingual based on the voice. **Note:** Chatterbox-Turbo is supported by all Rapid English voices and Pre Built Library voices. |
| `precision`     | string  | No       | `MULAW`, `PCM_16`, `PCM_24`, `PCM_32` (default). Applies to WAV output.                                                                                                                                                                                                                                                |
| `output_format` | string  | No       | `wav` (default) or `mp3`.                                                                                                                                                                                                                                                                                              |
| `sample_rate`   | number  | No       | `8000`, `16000`, `22050`, `32000`, `44100`, or `48000`. Defaults to `48000`.                                                                                                                                                                                                                                           |
| `use_hd`        | boolean | No       | Enables higher-definition synthesis with a small latency trade-off. Defaults to `false`.                                                                                                                                                                                                                               |

### Response

```json
{
  "audio_content": "<base64>",
  "audio_timestamps": {
    "graph_chars": ["H", "e", "l", "l", "o"],
    "graph_times": [[0.0, 0.12], [0.12, 0.24], ...],
    "phon_chars": [],
    "phon_times": []
  },
  "duration": 1.68,
  "issues": [],
  "output_format": "wav",
  "sample_rate": 48000,
  "seed": 962692783,
  "success": true,
  "synth_duration": 1.64,
  "title": null
}
```

| Field              | Type           | Description                                                                                                                                                                                                                                                                                                |
| ------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audio_content`    | string         | Base64-encoded audio bytes.                                                                                                                                                                                                                                                                                |
| `audio_timestamps` | object         | Timestamp arrays for graphemes and phonemes. Grapheme timestamps (`graph_chars`, `graph_times`) are supported for all models, with times in seconds as `[start, end]` pairs. Phoneme timestamps (`phon_chars`, `phon_times`) return empty arrays for newer models and are only populated by legacy models. |
| `duration`         | number         | Final clip duration in seconds.                                                                                                                                                                                                                                                                            |
| `issues`           | array          | Issues related to the request.                                                                                                                                                                                                                                                                             |
| `output_format`    | string         | Echoes the requested format.                                                                                                                                                                                                                                                                               |
| `sample_rate`      | number         | Echoes the requested sample rate.                                                                                                                                                                                                                                                                          |
| `seed`             | number         | Random seed used for generation.                                                                                                                                                                                                                                                                           |
| `success`          | boolean        | Whether the synthesis succeeded.                                                                                                                                                                                                                                                                           |
| `synth_duration`   | number         | Raw synthesis time prior to post-processing.                                                                                                                                                                                                                                                               |
| `title`            | string \| null | Title saved with the clip, or `null` if not provided.                                                                                                                                                                                                                                                      |

> **Try it** – Repeat the request above and decode `audio_content` locally:
>
> ```bash
> curl --request POST "https://f.cluster.resemble.ai/synthesize" \
>   -H "Authorization: YOUR_API_KEY" \
>   -H "Content-Type: application/json" \
>   --data '{
>     "voice_uuid": "55592656",
>     "data": "Hello from Resemble!",
>     "sample_rate": 48000,
>     "output_format": "wav"
>   }' \
> | jq -r '.audio_content' | base64 --decode > output.wav
> ```

***

title: Streaming (HTTP)
slug: /voice-generation/text-to-speech/streaming-http
-----------------------------------------------------

Use the streaming endpoint to start playback as audio is generated. Responses are chunked WAV data so you can progressively feed a player while long-form synthesis completes.

See the [streaming demo project](https://github.com/resemble-ai/resemble-streaming-demo) for a full reference implementation.

> **Careful:** Streaming requests target dedicated synthesis hosts (see your streaming endpoint in the dashboard). Do not send them to `app.resemble.ai`.

## Endpoint

```
POST https://f.cluster.resemble.ai/stream
```

### Request Body

| Field          | Type    | Required | Description                                                                                                                                                                                                                                                                                                            |
| -------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `voice_uuid`   | string  | Yes      | Voice to synthesize.                                                                                                                                                                                                                                                                                                   |
| `data`         | string  | Yes      | Text or SSML to synthesize (≤ 2,000 characters; partial SSML support).                                                                                                                                                                                                                                                 |
| `project_uuid` | string  | No       | Project that will own the generated clip.                                                                                                                                                                                                                                                                              |
| `model`        | string  | No       | Model to use for synthesis. Pass `chatterbox-turbo` to use the Turbo model for lower latency and paralinguistic tag support. If not specified, defaults to Chatterbox or Chatterbox Multilingual based on the voice. **Note:** Chatterbox-Turbo is supported by all Rapid English voices and Pre Built Library voices. |
| `precision`    | string  | No       | One of `PCM_32`, `PCM_24`, `PCM_16`, or `MULAW`. Defaults to `PCM_32`.                                                                                                                                                                                                                                                 |
| `sample_rate`  | number  | No       | One of `8000`, `16000`, `22050`, `32000`, `44100`, or `48000`. Defaults to `48000`.                                                                                                                                                                                                                                    |
| `use_hd`       | boolean | No       | Enables higher-definition synthesis with a small latency trade-off. Defaults to `false`.                                                                                                                                                                                                                               |

### Response

The response is a single-channel PCM WAV stream. The first bytes include metadata describing duration and timestamps before audio frames arrive.

## Working with the Stream

1. Read the first chunk to obtain metadata such as duration, grapheme timestamps, and phoneme timestamps.
2. Continue reading chunks and feed them to your playback pipeline.
3. Handle the `Content-Encoding` header if you requested compression.

> **Try it** – Issue a streaming request and pipe the response to a file:
>
> ```bash
> curl --output - "https://f.cluster.resemble.ai/stream" \
>   -H "Authorization: Bearer YOUR_API_TOKEN" \
>   -H "Content-Type: application/json" \
>   --data '{
>     "voice_uuid": "YOUR_VOICE_UUID",
>     "data": "Streaming helps deliver synthesized audio before it is finished.",
>     "precision": "PCM_16"
>   }' \
> | ffplay -
> ```

## WAV Metadata Layout

Resemble annotates WAV headers to expose timing data without additional requests.

* File-level metadata in the `RIFF` and `fmt` chunks
* Grapheme and phoneme cue points in `cue`, `list`, and `ltxt` chunks
* PCM audio bytes in the `data` chunk

### Header & Format Chunks

| Size | Description         | Value             |
| ---- | ------------------- | ----------------- |
| 4    | RIFF ID             | `"RIFF"`          |
| 4    | Remaining file size | `(file size) - 8` |
| 4    | RIFF type           | `"WAVE"`          |
| 4    | Format chunk ID     | `"fmt "`          |
| 4    | Chunk data size     | `16`              |
| 2    | Compression code    | `1` (PCM)         |
| 2    | Number of channels  | `1`               |
| 4    | Sample rate         | `8000`–`48000`    |
| 4    | Byte rate           | `16000`–`96000`   |
| 2    | Block align         | `2`               |
| 2    | Bits per sample     | `16`              |

> Older models may report the file size as `0xFFFFFFFF`. Contact support to upgrade if you see this value.

### Cue, List, and LTXT Chunks

* `cue ` chunk lists offsets for grapheme and phoneme boundaries.
* `list` chunk (type `adtl`) groups label data.
* Each `ltxt` chunk pairs a cue ID with either a grapheme (`"grph"`) or phoneme (`"phon"`) label and duration (in samples).

When reading `ltxt` chunks, align to 2-byte boundaries. If `text_length` is odd, skip an additional byte before the next chunk.

### Data Chunk

| Size | Description     | Value            |
| ---- | --------------- | ---------------- |
| 4    | Data chunk ID   | `"data"`         |
| 4    | Remaining bytes | `wav_length * 2` |

After the header metadata, the stream consists of PCM16 samples that you can decode on the fly.

***

title: Streaming (WebSocket)
slug: /voice-generation/text-to-speech/streaming-websocket
----------------------------------------------------------

Maintain a persistent WebSocket to stream audio frames with the lowest possible latency. This API is available to Business plans and above.

## WebSocket URL

```
wss://websocket.cluster.resemble.ai/stream
```

The server enforces global and per-key concurrency limits. Defaults allow up to 20 simultaneous sessions across the cluster and 20 parallel connections per API key. If you hit capacity errors, back off and retry.

## Request Flow

1. Open a WebSocket connection to the endpoint above.
2. Send a JSON payload describing the synthesis request.
3. Consume a stream of audio frames and metadata.
4. Listen for a terminal `audio_end` message before closing the socket.

### Request Payload

```json
{
  "voice_uuid": "<voice_uuid>",
  "project_uuid": "<project_uuid>",
  "data": "<text or SSML>",
  "model": "chatterbox-turbo",
  "binary_response": false,
  "request_id": 0,
  "output_format": "wav",
  "sample_rate": 32000,
  "precision": "PCM_32",
  "no_audio_header": false
}
```

| Field             | Type    | Required | Description                                                                                                                                                                                                                                                                                                            |
| ----------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `voice_uuid`      | string  | ✅        | Voice to synthesize.                                                                                                                                                                                                                                                                                                   |
| `project_uuid`    | string  | ✅        | Project to attach the clip to.                                                                                                                                                                                                                                                                                         |
| `data`            | string  | ✅        | Text or SSML (≤ 3,000 characters excluding tags).                                                                                                                                                                                                                                                                      |
| `model`           | string  | ❌        | Model to use for synthesis. Pass `chatterbox-turbo` to use the Turbo model for lower latency and paralinguistic tag support. If not specified, defaults to Chatterbox or Chatterbox Multilingual based on the voice. **Note:** Chatterbox-Turbo is supported by all Rapid English voices and Pre Built Library voices. |
| `request_id`      | number  | ❌        | Optional integer echoed back on responses. Auto-increments per message if omitted.                                                                                                                                                                                                                                     |
| `binary_response` | boolean | ❌        | When `true`, responses are raw audio bytes (WAV or MP3). Defaults to JSON frames with base64 audio.                                                                                                                                                                                                                    |
| `output_format`   | string  | ❌        | `wav` (default) or `mp3`.                                                                                                                                                                                                                                                                                              |
| `sample_rate`     | number  | ❌        | `8000`, `16000`, `22050`, `32000`, or `44100`.                                                                                                                                                                                                                                                                         |
| `precision`       | string  | ❌        | PCM bit depth (`PCM_32`, `PCM_24`, `PCM_16`, `MULAW`).                                                                                                                                                                                                                                                                 |
| `no_audio_header` | boolean | ❌        | When `true`, omits WAV headers from binary responses.                                                                                                                                                                                                                                                                  |

## Response Shapes

### JSON Frames (`binary_response = false`)

```json
{
  "type": "audio",
  "audio_content": "<base64>",
  "audio_timestamps": {
    "graph_chars": ["H", "e"],
    "graph_times": [[0.0374, 0.1247], [0.0873, 0.1746]],
    "phon_chars": ["h", "ˈe"],
    "phon_times": [[0.0374, 0.1247], [0.0873, 0.1746]]
  },
  "sample_rate": 32000,
  "request_id": 0
}
```

Audio chunks arrive sequentially until an `audio_end` message is emitted.

### Binary Frames (`binary_response = true`)

Frames contain contiguous bytes of the requested format. If `no_audio_header` is `false`, the first frame includes a standard WAV header with Resemble's timestamp metadata.

### Termination Message

```json
{
  "type": "audio_end",
  "request_id": 0
}
```

## Error Handling

> **Note:** The WebSocket API is limited to Business plan customers. Upgrade on the [billing page](https://app.resemble.ai/account/billing) if you receive `Unauthorized` responses.

### Unrecoverable Errors

Connection-level failures close the socket immediately.

```json
{
  "type": "error",
  "success": false,
  "error_name": "ConnectionFailure",
  "message": "Failed to establish a connection.",
  "status_code": 401
}
```

### Recoverable Errors

The connection remains open, allowing you to fix the issue and retry.

```json
{
  "type": "error",
  "success": false,
  "error_name": "BadJSON",
  "error_params": {"explanation": "Provide your query in the 'data' field"},
  "message": "Invalid JSON",
  "status_code": 400
}
```

Log the `error_name` and `request_id` so that you can correlate failures with client requests.

***

title: Voice Resource
slug: /voice-creation/voices
----------------------------

A voice represents a cloned persona that powers synthesis across synchronous, streaming, and speech-to-speech flows. Every clip you generate references a voice UUID.

## Schema

```ts
interface Voice {
  uuid: string;
  name: string;
  status: string;
  default_language: string;
  supported_languages: string[];
  voice_type: string;
  dataset_url?: string;
  callback_uri?: string;
  component_status: VoiceComponentStatus;
  api_support: VoiceApiSupport;
  source: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

interface VoiceComponentStatus {
  text_to_speech: string;
  speech_to_speech: string;
  fill: string;
}

interface VoiceApiSupport {
  sync: boolean;
  async: boolean;
  direct_synthesis: boolean;
  streaming: boolean;
}
```

Use the endpoints below to list, create, build, and delete voices.

***

title: List Voices
slug: /voice-creation/voices/list
---------------------------------

`GET https://app.resemble.ai/api/v2/voices`

Retrieve a paginated list of voices accessible to the user.

| Parameter                  | Type    | Required | Notes                                        |
| -------------------------- | ------- | -------- | -------------------------------------------- |
| `page`                     | integer | ❌        | Page number.                                 |
| `page_size`                | integer | ❌        | Items per page.                              |
| `pre_built_resemble_voice` | boolean | ❌        | Filter by pre-built voices.                  |
| `age`                      | string  | ❌        | Filter by age (comma-separated values).      |
| `gender`                   | string  | ❌        | Filter by gender (comma-separated values).   |
| `accents`                  | string  | ❌        | Filter by accents (comma-separated values).  |
| `use_case`                 | string  | ❌        | Filter by use case (comma-separated values). |
| `tone_of_voice`            | string  | ❌        | Filter by tone (comma-separated values).     |
| `advanced`                 | boolean | ❌        | Include advanced model information.          |
| `sample_url`               | boolean | ❌        | Include sample audio URLs.                   |
| `filters`                  | boolean | ❌        | Include filter metadata.                     |
| `voice_selector`           | boolean | ❌        | Format for voice selector UI.                |

```bash
curl 'https://app.resemble.ai/api/v2/voices?page=1&page_size=10' \
  -H 'Authorization: Bearer YOUR_API_TOKEN'
```

```json
{
  "success": true,
  "page": 1,
  "total_results": 10,
  "page_count": 1,
  "items": [
    {
      "uuid": "VOICE_UUID",
      "name": "Production Voice",
      "status": "ready",
      "voice_status": "ready",
      "voice_type": "professional",
      "default_language": "en-US",
      "supported_languages": ["en-US"],
      "dataset_url": null,
      "callback_uri": null,
      "source": "Custom Voice",
      "dataset_analysis_failure": false,
      "component_status": {
        "text_to_speech": { "status": "ready" },
        "fill": { "status": "ready" },
        "voice_conversion": { "status": "ready" }
      },
      "api_support": {
        "sync_tts": true,
        "async_tts": true,
        "fill": true,
        "sts": true
      },
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:32:00Z"
    }
  ]
}
```

***

title: Get Voice
slug: /voice-creation/voices/get
--------------------------------

`GET https://app.resemble.ai/api/v2/voices/{uuid}`

Retrieve details of a specific voice.

| Parameter    | Type    | Required | Notes                                                 |
| ------------ | ------- | -------- | ----------------------------------------------------- |
| `uuid`       | string  | ✅        | Voice UUID (URL parameter).                           |
| `advanced`   | boolean | ❌        | Include advanced model information (query parameter). |
| `sample_url` | boolean | ❌        | Include sample audio URL (query parameter).           |
| `filters`    | boolean | ❌        | Include filter metadata (query parameter).            |

```bash
curl 'https://app.resemble.ai/api/v2/voices/VOICE_UUID?advanced=true' \
  -H 'Authorization: Bearer YOUR_API_TOKEN'
```

```json
{
  "success": true,
  "item": {
    "uuid": "VOICE_UUID",
    "name": "Production Voice",
    "status": "ready",
    "voice_status": "ready",
    "voice_type": "professional",
    "default_language": "en-US",
    "supported_languages": ["en-US"],
    "dataset_url": null,
    "callback_uri": null,
    "source": "Custom Voice",
    "component_status": {
      "text_to_speech": { "status": "ready" },
      "fill": { "status": "ready" },
      "voice_conversion": { "status": "ready" }
    },
    "api_support": {
      "sync_tts": true,
      "async_tts": true,
      "fill": true,
      "sts": true
    },
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:32:00Z"
  }
}
```

***

title: Delete Voice
slug: /voice-creation/voices/delete
-----------------------------------

`DELETE https://app.resemble.ai/api/v2/voices/{uuid}`

Delete a custom voice from your account.

| Parameter | Type   | Required | Notes                       |
| --------- | ------ | -------- | --------------------------- |
| `uuid`    | string | ✅        | Voice UUID (URL parameter). |

```bash
curl --request DELETE 'https://app.resemble.ai/api/v2/voices/VOICE_UUID' \
  -H 'Authorization: Bearer YOUR_API_TOKEN'
```

```json
{
  "success": true,
  "message": "Voice was deleted."
}
```

<Note>
  Permanently deletes the custom voice.
</Note>

# Synchronous text-to-speech synthesis

POST https://f.cluster.resemble.ai/synthesize
Content-Type: application/json

Generate speech synchronously from text or SSML. Returns complete audio as base64.

Reference: https://docs.resemble.ai/api-reference/text-to-speech/synthesize

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Synchronous text-to-speech synthesis
  version: endpoint_textToSpeech.synthesize
paths:
  /synthesize:
    post:
      operationId: synthesize
      summary: Synchronous text-to-speech synthesis
      description: >-
        Generate speech synchronously from text or SSML. Returns complete audio
        as base64.
      tags:
        - - subpackage_textToSpeech
      parameters:
        - name: Authorization
          in: header
          description: API token from https://app.resemble.ai/account/api
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful synthesis
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Text-to-Speech_synthesize_Response_200'
        '400':
          description: Bad request
          content: {}
        '401':
          description: Unauthorized
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                voice_uuid:
                  type: string
                  description: Voice UUID to use for synthesis
                project_uuid:
                  type: string
                  description: Optional project UUID to store the clip
                title:
                  type: string
                  description: Optional title for the generated clip
                data:
                  type: string
                  description: Text or SSML to synthesize (max 3,000 characters)
                model:
                  type: string
                  description: >-
                    Model to use for synthesis. Pass `chatterbox-turbo` to use
                    the Turbo model for lower latency and paralinguistic tag
                    support. If not specified, defaults to Chatterbox or
                    Chatterbox Multilingual based on the voice. Note -
                    Chatterbox-Turbo is supported by all Rapid English voices
                    and Pre Built Library voices.
                precision:
                  $ref: >-
                    #/components/schemas/SynthesizePostRequestBodyContentApplicationJsonSchemaPrecision
                  description: Audio precision for WAV output
                output_format:
                  $ref: >-
                    #/components/schemas/SynthesizePostRequestBodyContentApplicationJsonSchemaOutputFormat
                  description: Audio output format
                sample_rate:
                  $ref: >-
                    #/components/schemas/SynthesizePostRequestBodyContentApplicationJsonSchemaSampleRate
                  description: Audio sample rate in Hz
                use_hd:
                  type: boolean
                  default: false
                  description: Enable HD synthesis with small latency trade-off
              required:
                - voice_uuid
                - data
components:
  schemas:
    SynthesizePostRequestBodyContentApplicationJsonSchemaPrecision:
      type: string
      enum:
        - value: MULAW
        - value: PCM_16
        - value: PCM_24
        - value: PCM_32
      default: PCM_32
    SynthesizePostRequestBodyContentApplicationJsonSchemaOutputFormat:
      type: string
      enum:
        - value: wav
        - value: mp3
      default: wav
    SynthesizePostRequestBodyContentApplicationJsonSchemaSampleRate:
      type: string
      enum:
        - value: '8000'
        - value: '16000'
        - value: '22050'
        - value: '32000'
        - value: '44100'
        - value: '48000'
    AudioTimestamps:
      type: object
      properties:
        graph_chars:
          type: array
          items:
            type: string
          description: Grapheme characters
        graph_times:
          type: array
          items:
            type: array
            items:
              type: number
              format: double
          description: Grapheme timestamps [start, end] in seconds
        phon_chars:
          type: array
          items:
            type: string
          description: Phoneme characters
        phon_times:
          type: array
          items:
            type: array
            items:
              type: number
              format: double
          description: Phoneme timestamps [start, end] in seconds
    Text-to-Speech_synthesize_Response_200:
      type: object
      properties:
        success:
          type: boolean
        audio_content:
          type: string
          format: byte
          description: Base64-encoded audio bytes
        audio_timestamps:
          $ref: '#/components/schemas/AudioTimestamps'
        duration:
          type: number
          format: double
          description: Audio duration in seconds
        synth_duration:
          type: number
          format: double
          description: Raw synthesis time
        output_format:
          type: string
        sample_rate:
          type: integer
        title:
          type: string
        issues:
          type: array
          items:
            type: string

```

## SDK Code Examples

```python
import requests

url = "https://f.cluster.resemble.ai/synthesize"

payload = {
    "voice_uuid": "55592656",
    "data": "Hello from Resemble!"
}
headers = {
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```javascript
const url = 'https://f.cluster.resemble.ai/synthesize';
const options = {
  method: 'POST',
  headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
  body: '{"voice_uuid":"55592656","data":"Hello from Resemble!"}'
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://f.cluster.resemble.ai/synthesize"

	payload := strings.NewReader("{\n  \"voice_uuid\": \"55592656\",\n  \"data\": \"Hello from Resemble!\"\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("Authorization", "Bearer <token>")
	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://f.cluster.resemble.ai/synthesize")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"voice_uuid\": \"55592656\",\n  \"data\": \"Hello from Resemble!\"\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://f.cluster.resemble.ai/synthesize")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"voice_uuid\": \"55592656\",\n  \"data\": \"Hello from Resemble!\"\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://f.cluster.resemble.ai/synthesize', [
  'body' => '{
  "voice_uuid": "55592656",
  "data": "Hello from Resemble!"
}',
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'Content-Type' => 'application/json',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://f.cluster.resemble.ai/synthesize");
var request = new RestRequest(Method.POST);
request.AddHeader("Authorization", "Bearer <token>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"voice_uuid\": \"55592656\",\n  \"data\": \"Hello from Resemble!\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
]
let parameters = [
  "voice_uuid": "55592656",
  "data": "Hello from Resemble!"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://f.cluster.resemble.ai/synthesize")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```

# Streaming text-to-speech synthesis (HTTP)

POST https://f.cluster.resemble.ai/stream
Content-Type: application/json

Stream audio as it's generated. Returns chunked WAV data for progressive playback.

Reference: https://docs.resemble.ai/api-reference/text-to-speech/stream-synthesize

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Streaming text-to-speech synthesis (HTTP)
  version: endpoint_textToSpeech.streamSynthesize
paths:
  /stream:
    post:
      operationId: stream-synthesize
      summary: Streaming text-to-speech synthesis (HTTP)
      description: >-
        Stream audio as it's generated. Returns chunked WAV data for progressive
        playback.
      tags:
        - - subpackage_textToSpeech
      parameters:
        - name: Authorization
          in: header
          description: API token from https://app.resemble.ai/account/api
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Streaming audio response (chunked WAV)
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary
        '400':
          description: Bad request
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                voice_uuid:
                  type: string
                  description: Voice UUID to use for synthesis
                data:
                  type: string
                  description: Text or SSML to synthesize (max 2000 characters)
                project_uuid:
                  type: string
                  description: Optional project UUID to store the clip
                model:
                  type: string
                  description: >-
                    Model to use for synthesis. Pass `chatterbox-turbo` to use
                    the Turbo model for lower latency and paralinguistic tag
                    support. If not specified, defaults to Chatterbox or
                    Chatterbox Multilingual based on the voice. Note -
                    Chatterbox-Turbo is supported by all Rapid English voices
                    and Pre Built Library voices.
                precision:
                  $ref: >-
                    #/components/schemas/StreamPostRequestBodyContentApplicationJsonSchemaPrecision
                  description: Audio precision
                sample_rate:
                  $ref: >-
                    #/components/schemas/StreamPostRequestBodyContentApplicationJsonSchemaSampleRate
                  description: Audio sample rate in Hz
                use_hd:
                  type: boolean
                  default: false
                  description: Enable HD synthesis with small latency trade-off
              required:
                - voice_uuid
                - data
components:
  schemas:
    StreamPostRequestBodyContentApplicationJsonSchemaPrecision:
      type: string
      enum:
        - value: MULAW
        - value: PCM_16
        - value: PCM_24
        - value: PCM_32
      default: PCM_32
    StreamPostRequestBodyContentApplicationJsonSchemaSampleRate:
      type: string
      enum:
        - value: '8000'
        - value: '16000'
        - value: '22050'
        - value: '32000'
        - value: '44100'
        - value: '48000'

```

## SDK Code Examples

```python
import requests

url = "https://f.cluster.resemble.ai/stream"

payload = {
    "voice_uuid": "string",
    "data": "string"
}
headers = {
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```javascript
const url = 'https://f.cluster.resemble.ai/stream';
const options = {
  method: 'POST',
  headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
  body: '{"voice_uuid":"string","data":"string"}'
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://f.cluster.resemble.ai/stream"

	payload := strings.NewReader("{\n  \"voice_uuid\": \"string\",\n  \"data\": \"string\"\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("Authorization", "Bearer <token>")
	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://f.cluster.resemble.ai/stream")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"voice_uuid\": \"string\",\n  \"data\": \"string\"\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://f.cluster.resemble.ai/stream")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"voice_uuid\": \"string\",\n  \"data\": \"string\"\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://f.cluster.resemble.ai/stream', [
  'body' => '{
  "voice_uuid": "string",
  "data": "string"
}',
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'Content-Type' => 'application/json',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://f.cluster.resemble.ai/stream");
var request = new RestRequest(Method.POST);
request.AddHeader("Authorization", "Bearer <token>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"voice_uuid\": \"string\",\n  \"data\": \"string\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
]
let parameters = [
  "voice_uuid": "string",
  "data": "string"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://f.cluster.resemble.ai/stream")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```

***

title: Client Libraries
slug: /libraries
----------------

Official SDKs keep your integration strongly typed and up to date. Pick the language that matches your stack and start shipping faster.

## Supported SDKs

* [Node.js SDK](/libraries/node) – TypeScript-first with streaming helpers and project management utilities.
* [Python SDK](/libraries/python) – idiomatic client for scripts, notebooks, and back-end services.

Looking for another language or want to contribute? Reach out to [support@resemble.ai](mailto:support@resemble.ai) with your use case.
