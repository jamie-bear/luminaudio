# LuminAudio

An open-source web frontend for generating and downloading high-quality, long-form text-to-speech audio. Built for audiobooks, voice-overs, narrations, and anything else that needs great-sounding speech at scale.

Powered by [Resemble.ai Chatterbox](https://resemble.ai), running entirely in your browser/local environment. Your API key never leaves your own server.

---

## Features

- **Long-form TTS** — up to 50,000 characters per generation; long texts are automatically split at natural sentence/paragraph boundaries and stitched back together
- **7 built-in voices** (3 male, 4 female) + support for any custom Resemble.ai voice UUID
- **WAV download** — lossless output at your chosen sample rate and bit depth
- **MP3 export** — client-side 128 kbps conversion, no server round-trip
- **Configurable audio quality** — sample rate (8 – 48 kHz), PCM precision (16/24/32-bit or MULAW)
- **Expressive controls** — speaking pace, exaggeration, and temperature sliders
- **Auto model fallback** — silently retries with `chatterbox` if `chatterbox-turbo` is unavailable for a voice
- Fully client-side MP3 encoding (no server processing of the final audio)
- Responsive, accessible UI — keyboard navigable, ARIA-labelled, reduced-motion safe

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | [React 19](https://react.dev) + [Tailwind CSS 4](https://tailwindcss.com) |
| MP3 encoding | [@breezystack/lamejs](https://github.com/breezystack/lamejs) (client-side) |
| TTS API | [Resemble.ai Chatterbox](https://resemble.ai) |
| Language | TypeScript 5 (strict) |

### Key Dependencies

```
next                   ^16.1.6   — React framework
react / react-dom      ^19       — UI rendering
@breezystack/lamejs    ^1.2.1    — Client-side MP3 encoding (lamejs fork, Turbopack-compatible)
tailwindcss            ^4        — Utility-first CSS
```

---

## Quick Start

**Requirements:** Node.js 18+, a [Resemble.ai](https://resemble.ai) account with an API key.

```bash
git clone <repo-url>
cd luminaudio
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste your Resemble.ai API key, and start generating.

### Production build

```bash
npm run build
npm start
```

---

## Getting a Resemble.ai API Key

1. Sign up at [app.resemble.ai](https://app.resemble.ai)
2. Go to **Settings → API** and copy your API token
3. Paste it into the **API Key** field in LuminAudio

The key is sent on each request from your browser to the Next.js API route, which forwards it to Resemble.ai. It is never stored, logged, or persisted anywhere.

---

## Voices

| Name | Gender | UUID |
|---|---|---|
| Lothar | Male | `78671217` |
| Orion | Male | `aa8053cc` |
| Ash | Male | `ee322483` |
| Hem | Female | `b6edbe5f` |
| Lucy | Female | `fb2d2858` |
| Abigail | Female | `91b49260` |
| Cutesy | Female | `5ec517ba` |

You can also enter any **Custom UUID** from your own Resemble.ai voice library.

---

## Audio Settings Reference

| Setting | Range | Default | Description |
|---|---|---|---|
| Sample Rate | 8000 – 48000 Hz | 48000 | Output audio sample rate. 48 kHz is CD-quality and the recommended default. |
| Precision | PCM\_16/24/32, MULAW | PCM\_32 | Bit depth of the WAV output. PCM\_32 is highest quality; PCM\_16 is broadly compatible. |
| Speaking Pace | 0.5 – 2.0 | 1.0 | Speed multiplier. 1.0 = natural pace. |
| Exaggeration | 0.0 – 2.0 | 0.65 | Controls emotional expressiveness. Higher = more dramatic delivery. |
| Temperature | 0.0 – 2.0 | 1.3 | Sampling randomness. Lower = more consistent; higher = more varied. |

---

## Security Notes

### For local use (default)
No extra configuration needed. The app is designed for personal, local use. Your API key travels over `localhost` only.

### For remote / shared deployments

> **Warning:** LuminAudio has no built-in authentication. Anyone with access to the URL can use your Resemble.ai API key to generate audio, incurring costs on your account.

If you're deploying this for others to use, consider:

1. **Serve over HTTPS** — the API key is transmitted in request bodies. Always use TLS in production. The `Strict-Transport-Security` header is already set.
2. **Add authentication** — protect the app behind a login (e.g. HTTP Basic Auth via a reverse proxy like nginx/Caddy, or NextAuth.js).
3. **Use a server-side environment variable** instead of client-provided keys:
   - Set `RESEMBLE_API_KEY=your_key` in your environment
   - Modify `src/app/api/tts/route.ts` to read `process.env.RESEMBLE_API_KEY` instead of accepting `apiKey` from the request body
   - Remove the API Key input from the UI
4. **Rate-limit the `/api/tts` route** — e.g. with a reverse proxy or an in-process rate limiter to prevent abuse.

### What's already hardened
- Server-side input validation: text length (≤ 50,000 chars), API key length, voice UUID length, numeric param clamping, model/precision/sample-rate whitelisting
- Security headers on all routes: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`
- Upstream error messages are truncated before being forwarded to the client
- No cookies, no sessions, no database — stateless by design

---

## Project Structure

```
src/
├── app/
│   ├── api/tts/route.ts   # Server-side TTS proxy → Resemble.ai
│   ├── page.tsx           # Main UI
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles + Tailwind
└── lib/
    ├── mp3.ts             # Client-side WAV → MP3 conversion
    ├── wav.ts             # WAV header parsing and concatenation
    └── chunker.ts         # Smart text splitting for long inputs
```

---

## License

MIT — free to use, modify, and self-host.
