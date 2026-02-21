"use client";

import { useState, useRef, useCallback } from "react";

type Precision = "PCM_16" | "PCM_32" | "MULAW";
type Status = "idle" | "generating" | "ready" | "error";

const SAMPLE_RATES = [8000, 16000, 22050, 44100] as const;
const PRECISIONS: Precision[] = ["PCM_16", "PCM_32", "MULAW"];

export default function Home() {
  const [text, setText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [voiceUuid, setVoiceUuid] = useState("");
  const [sampleRate, setSampleRate] = useState<number>(44100);
  const [precision, setPrecision] = useState<Precision>("PCM_16");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevUrlRef = useRef<string | null>(null);

  const charCount = text.length;
  const MAX_CHARS = 50000;

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
          voiceUuid: voiceUuid.trim() || undefined,
          sampleRate,
          precision,
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
  }, [text, apiKey, voiceUuid, sampleRate, precision]);

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

        {/* Voice UUID */}
        <section className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Voice UUID <span className="text-zinc-600 normal-case">(optional)</span>
          </label>
          <input
            type="text"
            value={voiceUuid}
            onChange={(e) => setVoiceUuid(e.target.value)}
            placeholder="e.g. a1b2c3d4-…"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
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
