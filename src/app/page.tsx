"use client";

import { useState, useRef, useCallback } from "react";

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
  { label: "Lothar", uuid: "fb2d2858", gender: "Male" },
  { label: "Orion",  uuid: "aa8053cc", gender: "Male" },
  { label: "Ash",    uuid: "ee322483", gender: "Male" },
  { label: "Hem",    uuid: "b6edbe5f", gender: "Female" },
  { label: "Lucy",   uuid: "78671217", gender: "Female" },
  { label: "Abigail",uuid: "91b49260", gender: "Female" },
  { label: "Cutesy", uuid: "5ec517ba", gender: "Female" },
];
const CUSTOM_VALUE = "__custom__";

export default function Home() {
  const [text, setText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [voiceSelect, setVoiceSelect] = useState<string>(VOICES[0].uuid);
  const [customUuid, setCustomUuid] = useState("");
  const [sampleRate, setSampleRate] = useState<number>(48000);
  const [precision, setPrecision] = useState<Precision>("PCM_32");
  const [speakingRate, setSpeakingRate] = useState<number>(1.0);
  const [exaggeration, setExaggeration] = useState<number>(0.65);
  const [temperature, setTemperature] = useState<number>(1.3);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevUrlRef = useRef<string | null>(null);

  const charCount = text.length;
  const MAX_CHARS = 50000;

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

    // Revoke old object URL to avoid memory leaks
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
      const url = URL.createObjectURL(blob);
      prevUrlRef.current = url;
      setAudioUrl(url);
      setStatus("ready");

      // Auto-play
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-12">
      {/* Header */}
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Lumin<span className="text-violet-400">Audio</span>
        </h1>
        <p className="mt-2 text-zinc-400 text-sm">
          High-quality text-to-speech powered by Resemble.ai Chatterbox
        </p>
      </header>

      <main className="w-full max-w-2xl flex flex-col gap-6">
        {/* API Key */}
        <section className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Resemble.ai API key"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <p className="text-xs text-zinc-500">
            Your key is sent only to your own server and never stored.
          </p>
        </section>

        {/* Voice */}
        <section className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Voice
          </label>
          <select
            value={voiceSelect}
            onChange={(e) => setVoiceSelect(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <optgroup label="Male">
              {VOICES.filter((v) => v.gender === "Male").map((v) => (
                <option key={v.uuid} value={v.uuid}>
                  {v.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Female">
              {VOICES.filter((v) => v.gender === "Female").map((v) => (
                <option key={v.uuid} value={v.uuid}>
                  {v.label}
                </option>
              ))}
            </optgroup>
            <option value={CUSTOM_VALUE}>Custom UUID…</option>
          </select>
          {voiceSelect === CUSTOM_VALUE && (
            <input
              type="text"
              value={customUuid}
              onChange={(e) => setCustomUuid(e.target.value)}
              placeholder="Enter custom voice UUID"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          )}
        </section>

        {/* Settings row */}
        <section className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Sample Rate
            </label>
            <select
              value={sampleRate}
              onChange={(e) => setSampleRate(Number(e.target.value))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {SAMPLE_RATES.map((r) => (
                <option key={r} value={r}>
                  {r.toLocaleString()} Hz
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Precision
            </label>
            <select
              value={precision}
              onChange={(e) => setPrecision(e.target.value as Precision)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {PRECISIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Speaking rate / Exaggeration / Temperature */}
        <section className="flex flex-col gap-4">
          {(
            [
              { label: "Speaking Pace", value: speakingRate, set: setSpeakingRate, min: 0.5, max: 2.0, step: 0.05 },
              { label: "Exaggeration",  value: exaggeration, set: setExaggeration, min: 0.0, max: 2.0, step: 0.05 },
              { label: "Temperature",   value: temperature,  set: setTemperature,  min: 0.0, max: 2.0, step: 0.05 },
            ] as const
          ).map(({ label, value, set, min, max, step }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  {label}
                </label>
                <span className="text-xs tabular-nums text-zinc-400">{value.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => (set as (v: number) => void)(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>{min}</span>
                <span>{max}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Text input */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Text
            </label>
            <span
              className={`text-xs ${
                charCount > MAX_CHARS ? "text-red-400" : "text-zinc-500"
              }`}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            maxLength={MAX_CHARS}
            placeholder="Enter the text you want to convert to speech…"
            className="resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm placeholder-zinc-600 leading-relaxed focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </section>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={status === "generating" || !text.trim() || charCount > MAX_CHARS}
          className="w-full rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "generating" ? "Generating…" : "Generate Speech"}
        </button>

        {/* Progress bar */}
        {status === "generating" && (
          <div className="flex flex-col gap-1.5">
            <div className="overflow-hidden rounded-full bg-zinc-800 h-1.5">
              <div
                className="h-full w-2/5 rounded-full bg-violet-500"
                style={{ animation: "shimmer 1.6s ease-in-out infinite" }}
              />
            </div>
            <p className="text-center text-xs text-zinc-500">Synthesising audio…</p>
          </div>
        )}

        {/* Error */}
        {status === "error" && errorMsg && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Audio player */}
        {audioUrl && (
          <section className="flex flex-col gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Output
            </p>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
            />
            <button
              onClick={handleDownload}
              className="self-end rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Download WAV
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
