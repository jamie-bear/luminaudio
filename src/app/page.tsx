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
    <line x1="12" y1="8"  x2="12"    y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
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
    <line x1="9"  y1="20" x2="15" y2="20" />
    <line x1="12" y1="4"  x2="12" y2="20" />
  </svg>
);

const HashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4"  y1="9"  x2="20" y2="9"  />
    <line x1="4"  y1="15" x2="20" y2="15" />
    <line x1="10" y1="3"  x2="8"  y2="21" />
    <line x1="16" y1="3"  x2="14" y2="21" />
  </svg>
);

/* ── Voice Pill (top-level to avoid re-mount on every render) ─ */

function VoicePill({
  voice,
  active,
  dashed,
  onSelect,
}: {
  voice: { label: string; uuid: string };
  active: boolean;
  dashed?: boolean;
  onSelect: (uuid: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(voice.uuid)}
      aria-pressed={active}
      className={[
        "px-3 py-2 rounded-lg text-sm font-medium",
        "transition-all duration-200 cursor-pointer min-h-[40px]",
        "focus:outline-none focus:ring-2 focus:ring-rose-500/40",
        active
          ? "bg-rose-600 text-white border border-rose-500 shadow-[0_0_12px_rgba(252,96,103,0.4)]"
          : dashed
            ? "bg-zinc-800/60 text-zinc-500 border border-dashed border-zinc-700 hover:border-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60"
            : "bg-zinc-800/60 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700/70",
      ].join(" ")}
    >
      {voice.label}
    </button>
  );
}

/* ── Component ──────────────────────────────────────────────── */

export default function Home() {
  const [text, setText]                       = useState("");
  const [apiKey, setApiKey]                   = useState("");
  const [voiceSelect, setVoiceSelect]         = useState<string>(VOICES[0].uuid);
  const [customUuid, setCustomUuid]           = useState("");
  const [sampleRate, setSampleRate]           = useState<number>(48000);
  const [precision, setPrecision]             = useState<Precision>("PCM_32");
  const [useHd, setUseHd]                     = useState<boolean>(false);
  const [status, setStatus]                   = useState<Status>("idle");
  const [errorMsg, setErrorMsg]               = useState("");
  const [audioUrl, setAudioUrl]               = useState<string | null>(null);
  const [isConvertingMp3, setIsConvertingMp3] = useState(false);
  const [mp3Progress, setMp3Progress]         = useState<number | null>(null);
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
          useHd,
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
        audioRef.current?.play().catch(() => {/* autoplay blocked – click to play */});
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(msg);
      setStatus("error");
    }
  }, [text, apiKey, effectiveVoiceUuid, sampleRate, precision, useHd]);

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
    setMp3Progress(0);
    try {
      const mp3Blob = await wavBlobToMp3Blob(wavBlobRef.current, setMp3Progress);
      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "luminaudio-output.mp3";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsConvertingMp3(false);
      setMp3Progress(null);
    }
  }, []);

  /* ── Shared class strings ─────────────────────────────────── */

  const inputCls =
    "rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm " +
    "placeholder-zinc-600 focus:border-rose-500 focus:outline-none " +
    "focus:ring-2 focus:ring-rose-500/25 transition-colors duration-200";

  const selectCls =
    "rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm " +
    "focus:border-rose-500 focus:outline-none focus:ring-2 " +
    "focus:ring-rose-500/25 transition-colors duration-200 cursor-pointer";

  const cardCls =
    "rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-4 flex flex-col gap-2.5";

  const sectionHeadingCls =
    "text-xs font-semibold uppercase tracking-widest text-zinc-500";

  const groupLabelCls =
    "text-[11px] uppercase tracking-wider text-zinc-600 font-semibold";

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-8 sm:py-12">

      {/* Ambient glow — rose + amber to match icon palette */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-rose-600/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[280px] h-[280px] rounded-full bg-amber-600/8 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="mb-7 text-center relative">
        <img
          src="/luminaudio-icon.svg"
          alt="LuminAudio logo"
          className="w-12 h-12 mx-auto mb-3"
        />
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-none">
          Lumin
          <span className="bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">
            Audio
          </span>
        </h1>
        <p className="mt-2 text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
          High-quality text-to-speech powered by Resemble.ai Chatterbox
        </p>
      </header>

      <main className="w-full max-w-2xl flex flex-col gap-3 relative">

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

          {/* Male */}
          <div className="flex flex-col gap-1.5">
            <p className={groupLabelCls}>Male</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Male voices">
              {VOICES.filter((v) => v.gender === "Male").map((v) => (
                <VoicePill key={v.uuid} voice={v} active={voiceSelect === v.uuid} onSelect={setVoiceSelect} />
              ))}
            </div>
          </div>

          {/* Female */}
          <div className="flex flex-col gap-1.5">
            <p className={groupLabelCls}>Female</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Female voices">
              {VOICES.filter((v) => v.gender === "Female").map((v) => (
                <VoicePill key={v.uuid} voice={v} active={voiceSelect === v.uuid} onSelect={setVoiceSelect} />
              ))}
            </div>
          </div>

          {/* Custom UUID — own section */}
          <div className="flex flex-col gap-1.5">
            <p className={groupLabelCls}>Custom</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Custom voice">
              <VoicePill
                voice={{ label: "+ Custom UUID", uuid: CUSTOM_VALUE }}
                active={voiceSelect === CUSTOM_VALUE}
                dashed
                onSelect={setVoiceSelect}
              />
            </div>
          </div>

          {voiceSelect === CUSTOM_VALUE && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="custom-uuid" className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <HashIcon />
                Voice UUID
              </label>
              <input
                id="custom-uuid"
                type="text"
                value={customUuid}
                onChange={(e) => setCustomUuid(e.target.value)}
                placeholder="e.g. ee322483-…"
                aria-label="Custom voice UUID"
                className={inputCls}
              />
            </div>
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

          {/* HD Quality toggle */}
          <button
            id="use-hd"
            role="switch"
            aria-checked={useHd}
            onClick={() => setUseHd((v) => !v)}
            className={[
              "flex items-center justify-between w-full rounded-lg px-4 py-3",
              "border transition-all duration-200 cursor-pointer text-left",
              "focus:outline-none focus:ring-2 focus:ring-rose-500/40",
              useHd
                ? "border-rose-500/60 bg-rose-900/30"
                : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-600",
            ].join(" ")}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-zinc-300">HD Quality</span>
              <span className="text-[11px] text-zinc-500">Higher fidelity · slight latency trade-off</span>
            </div>
            <div
              className={[
                "relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0",
                useHd ? "bg-rose-600" : "bg-zinc-700",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                  useHd ? "translate-x-4" : "translate-x-0.5",
                ].join(" ")}
              />
            </div>
          </button>
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
                    : "bg-rose-500"
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
            "bg-gradient-to-r from-rose-600 to-orange-500",
            "transition-all duration-200 cursor-pointer",
            "hover:from-rose-500 hover:to-orange-400",
            "hover:shadow-[0_0_28px_rgba(252,96,103,0.4)]",
            "focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950",
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
          ].join(" ")}
        >
          {status === "generating" ? (
            <><SpinnerIcon />Generating…</>
          ) : (
            <><WaveformIcon />Generate Speech</>
          )}
        </button>

        {/* ── Progress Bar ─────────────────────────────────────── */}
        {status === "generating" && (
          <div className="flex flex-col gap-1.5" role="status" aria-live="polite">
            <div className="overflow-hidden rounded-full bg-zinc-800 h-1">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 animate-progress" />
            </div>
            <p className="text-center text-xs text-zinc-500">Synthesising audio…</p>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────── */}
        {status === "error" && errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
          >
            <AlertIcon />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── Audio Player ─────────────────────────────────────── */}
        {audioUrl && (
          <section
            className="flex flex-col gap-3 rounded-xl border border-rose-800/40 bg-zinc-900/60 backdrop-blur-sm p-4 shadow-[0_0_28px_rgba(252,96,103,0.1)]"
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
                  "border border-rose-700/60 bg-rose-900/30 px-4 py-2.5",
                  "text-xs font-medium text-rose-300 cursor-pointer",
                  "transition-all duration-200",
                  "hover:bg-rose-800/50 hover:border-rose-600",
                  "focus:outline-none focus:ring-2 focus:ring-rose-500/40",
                  "disabled:cursor-wait disabled:opacity-50",
                ].join(" ")}
              >
                {isConvertingMp3 ? <SpinnerIcon /> : <DownloadIcon />}
                {isConvertingMp3
                  ? `Encoding… ${mp3Progress ?? 0}%`
                  : "Download MP3"}
              </button>

              <button
                onClick={handleDownload}
                disabled={isConvertingMp3}
                className={[
                  "flex-1 flex items-center justify-center gap-2 rounded-lg min-h-[44px]",
                  "border border-zinc-700 bg-zinc-800/60 px-4 py-2.5",
                  "text-xs font-medium text-zinc-300 cursor-pointer",
                  "transition-all duration-200",
                  "hover:bg-zinc-700 hover:border-zinc-600",
                  "focus:outline-none focus:ring-2 focus:ring-zinc-500/40",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                <DownloadIcon />
                Download WAV
              </button>
            </div>

            {/* MP3 encoding progress — shown while the Web Worker is running */}
            {mp3Progress !== null && (
              <div className="flex flex-col gap-1" role="status" aria-live="polite">
                <div className="overflow-hidden rounded-full bg-zinc-800 h-1">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-150"
                    style={{ width: `${mp3Progress}%` }}
                  />
                </div>
                <p className="text-center text-[11px] text-zinc-500">
                  Encoding MP3 in background… {mp3Progress}%
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="text-center mt-3 pb-2">
          <p className="text-xs text-zinc-700">
            Powered by{" "}
            <a
              href="https://resemble.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-rose-400 transition-colors duration-200 cursor-pointer focus:outline-none focus:underline"
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
