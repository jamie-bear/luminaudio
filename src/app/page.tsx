"use client";

import { useState, useRef, useCallback } from "react";
import { wavBlobToMp3Blob } from "@/lib/mp3";

type Precision = "PCM_16" | "PCM_24" | "PCM_32" | "MULAW";
type Status = "idle" | "generating" | "ready" | "error";

const SAMPLE_RATES = [8000, 16000, 22050, 44100, 48000] as const;
const PRECISIONS: Precision[] = ["PCM_32", "PCM_24", "PCM_16", "MULAW"];

interface VoiceOption {
  label: string;
  uuid: string;
  gender: "Male" | "Female";
}

const VOICES: VoiceOption[] = [
  { label: "Lothar",  uuid: "78671217", gender: "Male" },
  { label: "Orion",   uuid: "aa8053cc", gender: "Male" },
  { label: "Ash",     uuid: "ee322483", gender: "Male" },
  { label: "Hem",     uuid: "b6edbe5f", gender: "Female" },
  { label: "Lucy",    uuid: "fb2d2858", gender: "Female" },
  { label: "Abigail", uuid: "91b49260", gender: "Female" },
  { label: "Cutesy",  uuid: "5ec517ba", gender: "Female" },
];

const CUSTOM_VALUE = "__custom__";

/* ── SVG Icons ─────────────────────────────────────────────── */

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const SlidersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4"  y1="21" x2="4"  y2="14" />
    <line x1="4"  y1="10" x2="4"  y2="3"  />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8"  x2="12" y2="3"  />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3"  />
    <line x1="1"  y1="14" x2="7"  y2="14" />
    <line x1="9"  y1="8"  x2="15" y2="8"  />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const WaveformIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 6v12M22 12h-2" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8"     x2="12"    y2="12" />
    <line x1="12" y1="16"    x2="12.01" y2="16" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg"
    fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10"
      stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8"  y1="23" x2="16" y2="23" />
  </svg>
);

const TypeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

/* ── Component ──────────────────────────────────────────────── */

export default function Home() {
  const [text, setText]                     = useState("");
  const [apiKey, setApiKey]                 = useState("");
  const [voiceSelect, setVoiceSelect]       = useState<string>(VOICES[0].uuid);
  const [customUuid, setCustomUuid]         = useState("");
  const [sampleRate, setSampleRate]         = useState<number>(48000);
  const [precision, setPrecision]           = useState<Precision>("PCM_32");
  const [speakingRate, setSpeakingRate]     = useState<number>(1.0);
  const [exaggeration, setExaggeration]     = useState<number>(0.65);
  const [temperature, setTemperature]       = useState<number>(1.3);
  const [status, setStatus]                 = useState<Status>("idle");
  const [errorMsg, setErrorMsg]             = useState("");
  const [audioUrl, setAudioUrl]             = useState<string | null>(null);
  const [isConvertingMp3, setIsConvertingMp3] = useState(false);
  const audioRef   = useRef<HTMLAudioElement>(null);
  const prevUrlRef = useRef<string | null>(null);
  const wavBlobRef = useRef<Blob | null>(null);

  const charCount = text.length;
  const MAX_CHARS = 50000;
  const charPct   = Math.min((charCount / MAX_CHARS) * 100, 100);

  const effectiveVoiceUuid =
    voiceSelect === CUSTOM_VALUE ? customUuid.trim() : voiceSelect;

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) return;
    if (!apiKey.trim()) {
      setErrorMsg("Please enter your Resemble.ai API key.");
      setStatus("error");
      return;
    }

    setStatus("generating");
    setErrorMsg("");

    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }
    setAudioUrl(null);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          apiKey,
          voiceUuid: effectiveVoiceUuid || undefined,
          sampleRate,
          precision,
          speakingRate,
          exaggeration,
          temperature,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(json.error ?? res.statusText);
      }

      const blob = await res.blob();
      wavBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      prevUrlRef.current = url;
      setAudioUrl(url);
      setStatus("ready");

      setTimeout(() => {
        audioRef.current?.play().catch(() => {/* autoplay blocked – user can click manually */});
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(msg);
      setStatus("error");
    }
  }, [text, apiKey, effectiveVoiceUuid, sampleRate, precision, speakingRate, exaggeration, temperature]);

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = "luminaudio-output.wav";
    a.click();
  };

  const handleDownloadMp3 = useCallback(async () => {
    if (!wavBlobRef.current) return;
    setIsConvertingMp3(true);
    try {
      const mp3Blob = await wavBlobToMp3Blob(wavBlobRef.current);
      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "luminaudio-output.mp3";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsConvertingMp3(false);
    }
  }, []);

  /* ── Shared class strings ─────────────────────────────────── */

  const inputCls =
    "rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm " +
    "placeholder-zinc-600 focus:border-violet-500 focus:outline-none " +
    "focus:ring-2 focus:ring-violet-500/30 transition-colors duration-200";

  const selectCls =
    "rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm " +
    "focus:border-violet-500 focus:outline-none focus:ring-2 " +
    "focus:ring-violet-500/30 transition-colors duration-200 cursor-pointer";

  const cardCls =
    "rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-5 flex flex-col gap-3";

  const sectionHeadingCls =
    "text-xs font-semibold uppercase tracking-widest text-zinc-500";

  /* ── Voice pill helper ────────────────────────────────────── */

  const VoicePill = ({ voice }: { voice: VoiceOption | { label: string; uuid: string; dashed?: boolean } }) => {
    const active = voiceSelect === voice.uuid;
    const dashed = "dashed" in voice && voice.dashed;
    return (
      <button
        onClick={() => setVoiceSelect(voice.uuid)}
        aria-pressed={active}
        className={[
          "flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium",
          "transition-all duration-200 cursor-pointer min-h-[44px]",
          "focus:outline-none focus:ring-2 focus:ring-violet-500/40",
          active
            ? "bg-violet-600 text-white border border-violet-500 shadow-[0_0_14px_rgba(139,92,246,0.45)]"
            : dashed
              ? "bg-zinc-800/60 text-zinc-400 border border-dashed border-zinc-700 hover:border-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60"
              : "bg-zinc-800/60 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700/70",
        ].join(" ")}
      >
        {voice.label}
      </button>
    );
  };

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-12 sm:py-16">

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[640px] h-[420px] rounded-full bg-violet-600/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[320px] h-[320px] rounded-full bg-fuchsia-700/8 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="mb-10 text-center relative">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 mb-4">
          <WaveformIcon />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-none">
          Lumin
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Audio
          </span>
        </h1>
        <p className="mt-3 text-zinc-400 text-base max-w-xs mx-auto leading-relaxed">
          High-quality text-to-speech powered by Resemble.ai Chatterbox
        </p>
      </header>

      <main className="w-full max-w-2xl flex flex-col gap-4 relative">

        {/* ── API Key ──────────────────────────────────────────── */}
        <section className={cardCls} aria-labelledby="api-key-heading">
          <div className="flex items-center gap-2 text-zinc-400">
            <LockIcon />
            <h2 id="api-key-heading" className={sectionHeadingCls}>API Key</h2>
          </div>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Resemble.ai API key"
            aria-label="Resemble.ai API key"
            className={inputCls}
          />
          <p className="text-xs text-zinc-600 leading-relaxed">
            Sent only to your own server — never stored or logged.
          </p>
        </section>

        {/* ── Voice Picker ─────────────────────────────────────── */}
        <section className={cardCls} aria-labelledby="voice-heading">
          <div className="flex items-center gap-2 text-zinc-400">
            <MicIcon />
            <h2 id="voice-heading" className={sectionHeadingCls}>Voice</h2>
          </div>

          <fieldset className="flex flex-col gap-3 border-0 p-0 m-0">
            <legend className="text-[11px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">
              Male
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Male voices">
              {VOICES.filter((v) => v.gender === "Male").map((v) => (
                <VoicePill key={v.uuid} voice={v} />
              ))}
            </div>

            <p className="text-[11px] uppercase tracking-wider text-zinc-600 font-semibold mt-1">
              Female
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Female voices">
              {VOICES.filter((v) => v.gender === "Female").map((v) => (
                <VoicePill key={v.uuid} voice={v} />
              ))}
              <VoicePill voice={{ label: "+ Custom UUID", uuid: CUSTOM_VALUE, dashed: true }} />
            </div>
          </fieldset>

          {voiceSelect === CUSTOM_VALUE && (
            <input
              type="text"
              value={customUuid}
              onChange={(e) => setCustomUuid(e.target.value)}
              placeholder="Enter custom voice UUID"
              aria-label="Custom voice UUID"
              className={inputCls}
            />
          )}
        </section>

        {/* ── Audio Settings ───────────────────────────────────── */}
        <section className={cardCls} aria-labelledby="audio-settings-heading">
          <div className="flex items-center gap-2 text-zinc-400">
            <SlidersIcon />
            <h2 id="audio-settings-heading" className={sectionHeadingCls}>Audio Settings</h2>
          </div>

          {/* Sample rate + Precision */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sample-rate" className="text-xs text-zinc-400 font-medium">
                Sample Rate
              </label>
              <select
                id="sample-rate"
                value={sampleRate}
                onChange={(e) => setSampleRate(Number(e.target.value))}
                className={selectCls}
              >
                {SAMPLE_RATES.map((r) => (
                  <option key={r} value={r}>{r.toLocaleString()} Hz</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="precision" className="text-xs text-zinc-400 font-medium">
                Precision
              </label>
              <select
                id="precision"
                value={precision}
                onChange={(e) => setPrecision(e.target.value as Precision)}
                className={selectCls}
              >
                {PRECISIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sliders */}
          <div className="flex flex-col gap-5 pt-1">
            {(
              [
                { id: "speaking-rate", label: "Speaking Pace",  value: speakingRate, set: setSpeakingRate, min: 0.5, max: 2.0, step: 0.05, hint: "Slower → Faster"       },
                { id: "exaggeration",  label: "Exaggeration",   value: exaggeration, set: setExaggeration, min: 0.0, max: 2.0, step: 0.05, hint: "Neutral → Expressive"  },
                { id: "temperature",   label: "Temperature",    value: temperature,  set: setTemperature,  min: 0.0, max: 2.0, step: 0.05, hint: "Predictable → Creative" },
              ] as const
            ).map(({ id, label, value, set, min, max, step, hint }) => (
              <div key={id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={id} className="text-xs text-zinc-400 font-medium">
                    {label}
                  </label>
                  <span className="text-xs tabular-nums font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-md">
                    {value.toFixed(2)}
                  </span>
                </div>
                <input
                  id={id}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={(e) => (set as (v: number) => void)(Number(e.target.value))}
                  className="w-full accent-violet-500 cursor-pointer"
                  aria-valuemin={min}
                  aria-valuemax={max}
                  aria-valuenow={value}
                />
                <div className="flex justify-between text-[11px] text-zinc-600">
                  <span>{min}</span>
                  <span className="italic">{hint}</span>
                  <span>{max}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Text Input ───────────────────────────────────────── */}
        <section className={cardCls} aria-labelledby="text-heading">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-400">
              <TypeIcon />
              <label htmlFor="tts-text" id="text-heading" className={sectionHeadingCls}>
                Text
              </label>
            </div>
            <span
              className={`text-xs font-mono ${
                charCount > MAX_CHARS
                  ? "text-red-400"
                  : charCount > MAX_CHARS * 0.8
                    ? "text-amber-400"
                    : "text-zinc-500"
              }`}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>

          <textarea
            id="tts-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            maxLength={MAX_CHARS}
            placeholder="Enter the text you want to convert to speech…"
            className={`resize-y ${inputCls} leading-relaxed`}
          />

          {/* Character progress bar */}
          <div className="h-0.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                charCount > MAX_CHARS
                  ? "bg-red-500"
                  : charCount > MAX_CHARS * 0.8
                    ? "bg-amber-500"
                    : "bg-violet-500"
              }`}
              style={{ width: `${charPct}%` }}
            />
          </div>
        </section>

        {/* ── Generate Button ──────────────────────────────────── */}
        <button
          onClick={handleGenerate}
          disabled={status === "generating" || !text.trim() || charCount > MAX_CHARS}
          aria-busy={status === "generating"}
          className={[
            "w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5",
            "text-sm font-semibold text-white min-h-[52px]",
            "bg-gradient-to-r from-violet-600 to-fuchsia-600",
            "transition-all duration-200 cursor-pointer",
            "hover:from-violet-500 hover:to-fuchsia-500",
            "hover:shadow-[0_0_28px_rgba(139,92,246,0.45)]",
            "focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950",
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
          ].join(" ")}
        >
          {status === "generating" ? (
            <>
              <SpinnerIcon />
              Generating…
            </>
          ) : (
            <>
              <WaveformIcon />
              Generate Speech
            </>
          )}
        </button>

        {/* ── Progress Bar ─────────────────────────────────────── */}
        {status === "generating" && (
          <div className="flex flex-col gap-1.5" role="status" aria-live="polite">
            <div className="overflow-hidden rounded-full bg-zinc-800 h-1">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-progress" />
            </div>
            <p className="text-center text-xs text-zinc-500">Synthesising audio…</p>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────── */}
        {status === "error" && errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-800/50 bg-red-950/40 px-4 py-3.5 text-sm text-red-300"
          >
            <AlertIcon />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── Audio Player ─────────────────────────────────────── */}
        {audioUrl && (
          <section
            className="flex flex-col gap-4 rounded-xl border border-violet-800/40 bg-zinc-900/60 backdrop-blur-sm p-5 shadow-[0_0_30px_rgba(139,92,246,0.12)]"
            aria-labelledby="output-heading"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircleIcon />
                <h2 id="output-heading" className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Output
                </h2>
              </div>
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                Ready
              </span>
            </div>

            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full rounded-lg"
              aria-label="Generated speech audio"
            />

            <div className="flex gap-2">
              <button
                onClick={handleDownloadMp3}
                disabled={isConvertingMp3}
                className={[
                  "flex-1 flex items-center justify-center gap-2 rounded-lg min-h-[44px]",
                  "border border-violet-700/60 bg-violet-900/30 px-4 py-2.5",
                  "text-xs font-medium text-violet-300 cursor-pointer",
                  "transition-all duration-200",
                  "hover:bg-violet-800/50 hover:border-violet-600",
                  "focus:outline-none focus:ring-2 focus:ring-violet-500/40",
                  "disabled:cursor-wait disabled:opacity-50",
                ].join(" ")}
              >
                {isConvertingMp3 ? <SpinnerIcon /> : <DownloadIcon />}
                {isConvertingMp3 ? "Converting…" : "Download MP3"}
              </button>

              <button
                onClick={handleDownload}
                className={[
                  "flex-1 flex items-center justify-center gap-2 rounded-lg min-h-[44px]",
                  "border border-zinc-700 bg-zinc-800/60 px-4 py-2.5",
                  "text-xs font-medium text-zinc-300 cursor-pointer",
                  "transition-all duration-200",
                  "hover:bg-zinc-700 hover:border-zinc-600",
                  "focus:outline-none focus:ring-2 focus:ring-zinc-500/40",
                ].join(" ")}
              >
                <DownloadIcon />
                Download WAV
              </button>
            </div>
          </section>
        )}

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="text-center mt-4 pb-2">
          <p className="text-xs text-zinc-700">
            Powered by{" "}
            <a
              href="https://resemble.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-violet-400 transition-colors duration-200 cursor-pointer focus:outline-none focus:underline"
            >
              Resemble.ai
            </a>
            {" · "}LuminAudio
          </p>
        </footer>

      </main>
    </div>
  );
}
