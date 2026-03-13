"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { wavBlobToMp3Blob } from "@/lib/mp3";

type Status = "idle" | "generating" | "ready" | "error";

interface VoiceInfo {
  id: string;
  name: string;
  filename: string;
  is_predefined: boolean;
  clone_type?: string; // "rapid" | "pro"
}

/* ── SVG Icons ─────────────────────────────────────────────── */

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

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const CloneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);

const ServerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

/* ── Voice Pill ────────────────────────────────────────────── */

function VoicePill({
  voice,
  active,
  onSelect,
  onDelete,
  onRename,
}: {
  voice: { id: string; name: string; filename?: string; clone_type?: string };
  active: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string) => void;
}) {
  const cloneLabel =
    voice.clone_type === "pro"
      ? { text: "Pro", cls: "text-violet-400 bg-violet-500/10 border-violet-500/20" }
      : voice.clone_type === "rapid"
      ? { text: "Rapid", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" }
      : null;

  return (
    <div className="relative group">
      <button
        onClick={() => onSelect(voice.id)}
        aria-pressed={active}
        className={[
          "flex flex-col items-start px-3 py-2 rounded-lg text-sm font-medium",
          "transition-all duration-200 cursor-pointer min-h-[40px]",
          "focus:outline-none focus:ring-2 focus:ring-rose-500/40",
          active
            ? "bg-rose-600 text-white border border-rose-500 shadow-[0_0_12px_rgba(252,96,103,0.4)]"
            : "bg-zinc-800/60 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700/70",
        ].join(" ")}
      >
        <span className="flex items-center gap-1.5">
          {voice.name}
          {cloneLabel && (
            <span className={`text-[9px] font-semibold uppercase tracking-wider border px-1 py-0.5 rounded leading-none ${active ? "text-white/80 bg-white/10 border-white/20" : cloneLabel.cls}`}>
              {cloneLabel.text}
            </span>
          )}
        </span>
        {voice.filename && (
          <span className={`text-[10px] font-normal leading-none mt-0.5 ${active ? "text-rose-200" : "text-zinc-500"}`}>
            {voice.filename}
          </span>
        )}
      </button>
      {/* Action buttons on hover */}
      {(onDelete || onRename) && (
        <div className="absolute -top-1.5 -right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
          {onRename && (
            <button
              onClick={(e) => { e.stopPropagation(); onRename(voice.id); }}
              className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-600 text-zinc-400 hover:bg-blue-600 hover:border-blue-500 hover:text-white flex items-center justify-center cursor-pointer"
              aria-label={`Rename voice ${voice.name}`}
            >
              <PencilIcon />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(voice.id); }}
              className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-600 text-zinc-400 hover:bg-red-600 hover:border-red-500 hover:text-white flex items-center justify-center cursor-pointer"
              aria-label={`Delete voice ${voice.name}`}
            >
              <TrashIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Rename Dialog ─────────────────────────────────────────── */

function RenameDialog({
  voiceName,
  onConfirm,
  onCancel,
}: {
  voiceName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(voiceName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-full max-w-sm shadow-2xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-zinc-200">Rename Voice</h3>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onConfirm(name.trim());
            if (e.key === "Escape") onCancel();
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/25"
          placeholder="Voice name"
          maxLength={64}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 border border-zinc-700 hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 cursor-pointer transition-colors"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Component ──────────────────────────────────────────────── */

const NO_VOICE = "__none__";

export default function Home() {
  const [text, setText]                       = useState("");
  const [selectedVoice, setSelectedVoice]     = useState<string>(NO_VOICE);
  const [voices, setVoices]                   = useState<VoiceInfo[]>([]);
  const [selectedModel, setSelectedModel]     = useState<"original" | "turbo">("original");
  const [temperature, setTemperature]         = useState(0.8);
  const [exaggeration, setExaggeration]       = useState(0.5);
  const [cfgWeight, setCfgWeight]             = useState(0.5);
  const [speedFactor, setSpeedFactor]         = useState(1.0);
  const [status, setStatus]                   = useState<Status>("idle");
  const [errorMsg, setErrorMsg]               = useState("");
  const [audioUrl, setAudioUrl]               = useState<string | null>(null);
  const [isConvertingMp3, setIsConvertingMp3] = useState(false);
  const [mp3Progress, setMp3Progress]         = useState<number | null>(null);
  const [isUploading, setIsUploading]         = useState(false);
  const [backendStatus, setBackendStatus]     = useState<"checking" | "online" | "offline">("checking");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [hfTokenSet, setHfTokenSet]           = useState<boolean>(false);
  const [turboStatus, setTurboStatus]         = useState<string | null>(null);
  const [renamingVoice, setRenamingVoice]     = useState<VoiceInfo | null>(null);

  const audioRef      = useRef<HTMLAudioElement>(null);
  const prevUrlRef    = useRef<string | null>(null);
  const wavBlobRef    = useRef<Blob | null>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  // If turbo was selected but is not available (e.g. backend restarted without it), fall back
  const effectiveModel: "original" | "turbo" =
    selectedModel === "turbo" && backendStatus === "online" && !availableModels.includes("turbo")
      ? "original"
      : selectedModel;

  const charCount = text.length;
  const MAX_CHARS = 50000;
  const charPct   = Math.min((charCount / MAX_CHARS) * 100, 100);

  /* ── Load voices and check backend health ──────────────── */

  const fetchVoices = useCallback(async () => {
    try {
      const res = await fetch("/api/voices");
      if (res.ok) {
        const data = await res.json();
        setVoices(data.voices ?? []);
      }
    } catch { /* backend may not be ready */ }
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const applyHealth = (data: { model_loaded: boolean; models_loaded?: string[]; hf_token_set?: boolean; turbo_status?: string | null }) => {
      setAvailableModels(data.models_loaded ?? []);
      setHfTokenSet(data.hf_token_set ?? false);
      setTurboStatus(data.turbo_status ?? null);
      setBackendStatus(data.model_loaded ? "online" : "checking");
    };

    // Health check
    fetch("/api/health")
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        applyHealth(data);
        if (!data.model_loaded) {
          // Poll until original model is loaded
          intervalId = setInterval(async () => {
            try {
              const res = await fetch("/api/health");
              const d = await res.json();
              applyHealth(d);
              if (d.model_loaded && intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
            } catch { /* keep polling */ }
          }, 3000);
        }
      })
      .catch(() => setBackendStatus("offline"));

    fetchVoices();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchVoices]);

  /* ── Voice upload ──────────────────────────────────────── */

  const handleUploadVoice = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-voice", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(json.detail ?? json.error ?? res.statusText);
      }

      const data = await res.json();
      await fetchVoices();
      setSelectedVoice(data.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMsg(msg);
      setStatus("error");
    } finally {
      setIsUploading(false);
    }
  }, [fetchVoices]);

  const handleDeleteVoice = useCallback(async (voiceId: string) => {
    const voice = voices.find((v) => v.id === voiceId);
    const displayName = voice?.name ?? voiceId;
    if (!window.confirm(`Delete voice "${displayName}"?`)) return;

    try {
      const res = await fetch(`/api/delete-voice?id=${encodeURIComponent(voiceId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (selectedVoice === voiceId) {
          setSelectedVoice(NO_VOICE);
        }
        await fetchVoices();
      }
    } catch { /* ignore */ }
  }, [voices, selectedVoice, fetchVoices]);

  const handleRenameVoice = useCallback(async (voiceId: string, newName: string) => {
    try {
      const res = await fetch(`/api/rename-voice?id=${encodeURIComponent(voiceId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        const data = await res.json();
        // If the voice was selected, update to the new id
        if (selectedVoice === voiceId) {
          setSelectedVoice(data.id);
        }
        await fetchVoices();
      }
    } catch { /* ignore */ }
    setRenamingVoice(null);
  }, [selectedVoice, fetchVoices]);

  /* ── Generate speech ───────────────────────────────────── */

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) return;

    setStatus("generating");
    setErrorMsg("");

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice === NO_VOICE ? undefined : selectedVoice,
          model: effectiveModel,
          temperature,
          exaggeration,
          cfgWeight,
          speedFactor,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: "" }));
        const apiMsg: string = json.error ?? "";
        const fallback =
          res.status === 502
            ? "The synthesis backend crashed or is unavailable. On CPU this is usually an out-of-memory error — try splitting the text into shorter segments."
            : res.status === 503
            ? "The synthesis backend is not ready yet. Please wait a moment and try again."
            : `Request failed (HTTP ${res.status}).`;
        throw new Error(apiMsg || fallback);
      }

      const blob = await res.blob();
      wavBlobRef.current = blob;

      // Revoke old URL only after new audio is ready
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      prevUrlRef.current = url;
      setAudioUrl(url);
      setStatus("ready");

      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(msg);
      setStatus("error");
    }
  }, [text, selectedVoice, effectiveModel, temperature, exaggeration, cfgWeight, speedFactor, backendStatus]);

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

  /* ── Shared class strings ─────────────────────────────── */

  const inputCls =
    "rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm " +
    "placeholder-zinc-600 focus:border-rose-500 focus:outline-none " +
    "focus:ring-2 focus:ring-rose-500/25 transition-colors duration-200";

  const cardCls =
    "rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-4 flex flex-col gap-2.5";

  const sectionHeadingCls =
    "text-xs font-semibold uppercase tracking-widest text-zinc-500";

  const groupLabelCls =
    "text-[11px] uppercase tracking-wider text-zinc-600 font-semibold";

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-8 sm:py-12">

      {/* Rename dialog */}
      {renamingVoice && (
        <RenameDialog
          voiceName={renamingVoice.name}
          onConfirm={(newName) => handleRenameVoice(renamingVoice.id, newName)}
          onCancel={() => setRenamingVoice(null)}
        />
      )}

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-rose-600/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[280px] h-[280px] rounded-full bg-amber-600/[0.08] blur-[100px]" />
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
          Self-hosted text-to-speech powered by Chatterbox TTS
        </p>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 relative">

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── LEFT SIDEBAR: Voice Cloning ─────────────────────── */}
        {/* ══════════════════════════════════════════════════════ */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-8 lg:self-start">

          {/* ── Clone Voice ──────────────────────────────────── */}
          <section className={cardCls} aria-labelledby="clone-heading">
            <div className="flex items-center gap-2 text-zinc-400">
              <CloneIcon />
              <h2 id="clone-heading" className={sectionHeadingCls}>Clone Voice</h2>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Upload a reference audio clip to clone a voice. The model will match the speaker&apos;s
              voice characteristics when generating speech.
            </p>

            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.flac,.ogg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadVoice(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || backendStatus !== "online"}
              className={[
                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold",
                "border border-zinc-700 bg-zinc-800/60",
                "text-zinc-200 cursor-pointer transition-all duration-200",
                "hover:border-rose-500/50 hover:text-white hover:bg-zinc-800",
                "hover:shadow-[0_0_16px_rgba(252,96,103,0.15)]",
                "focus:outline-none focus:ring-2 focus:ring-rose-500/40",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
              ].join(" ")}
            >
              {isUploading ? <SpinnerIcon /> : <UploadIcon />}
              {isUploading ? "Cloning voice\u2026" : "Clone Voice from Audio"}
            </button>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Accepts .wav, .mp3, .flac, or .ogg files. Best results with 10\u201330 seconds of clear speech.
            </p>
          </section>

        </aside>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── CENTER: Status, Input, Generate ─────────────────── */}
        {/* ══════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-3">

          {/* ── Backend Status ─────────────────────────────────── */}
          <section className={cardCls} aria-labelledby="status-heading">
            <div className="flex items-center gap-2 text-zinc-400">
              <ServerIcon />
              <h2 id="status-heading" className={sectionHeadingCls}>Backend Status</h2>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={[
                "w-2.5 h-2.5 rounded-full flex-shrink-0",
                backendStatus === "online" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" :
                backendStatus === "checking" ? "bg-amber-500 animate-pulse" :
                "bg-red-500",
              ].join(" ")} />
              <span className="text-sm text-zinc-300">
                {backendStatus === "online" && availableModels.includes("turbo") && "Chatterbox TTS models loaded and ready"}
                {backendStatus === "online" && !availableModels.includes("turbo") && (
                  turboStatus
                    ? `Original model ready \u2014 Turbo: ${turboStatus}`
                    : "Original model ready"
                )}
                {backendStatus === "checking" && "Loading Chatterbox TTS models\u2026 this may take a minute on first run"}
                {backendStatus === "offline" && "Backend is offline \u2014 check Docker logs"}
              </span>
            </div>
          </section>

          {/* ── Text Input ───────────────────────────────────── */}
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
                {charCount.toLocaleString("en-US")} / {MAX_CHARS.toLocaleString("en-US")}
              </span>
            </div>

            <textarea
              id="tts-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              rows={16}
              maxLength={MAX_CHARS}
              placeholder="Enter the text you want to convert to speech\u2026"
              className={`resize-y ${inputCls} leading-relaxed min-h-[280px]`}
            />
            <p className="text-[11px] text-zinc-600">Press Ctrl+Enter to generate</p>

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

          {/* ── Generate Button ──────────────────────────────── */}
          <button
            onClick={handleGenerate}
            disabled={status === "generating" || !text.trim() || charCount > MAX_CHARS || backendStatus !== "online"}
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
              <><SpinnerIcon />Generating&hellip;</>
            ) : (
              <><WaveformIcon />Generate Speech</>
            )}
          </button>

          {/* ── Progress Bar ─────────────────────────────────── */}
          {status === "generating" && (
            <div className="flex flex-col gap-1.5" role="status" aria-live="polite">
              <div className="overflow-hidden rounded-full bg-zinc-800 h-1">
                <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 animate-progress" />
              </div>
              <p className="text-center text-xs text-zinc-500">Synthesising audio&hellip;</p>
            </div>
          )}

          {/* ── Error ────────────────────────────────────────── */}
          {status === "error" && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
            >
              <AlertIcon />
              <span>{errorMsg || "Speech generation failed. Please try again."}</span>
            </div>
          )}

          {/* ── Audio Player ─────────────────────────────────── */}
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
                    ? `Encoding\u2026 ${mp3Progress ?? 0}%`
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

              {/* MP3 encoding progress */}
              {mp3Progress !== null && (
                <div className="flex flex-col gap-1" role="status" aria-live="polite">
                  <div className="overflow-hidden rounded-full bg-zinc-800 h-1">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-150"
                      style={{ width: `${mp3Progress}%` }}
                    />
                  </div>
                  <p className="text-center text-[11px] text-zinc-500">
                    Encoding MP3 in background&hellip; {mp3Progress}%
                  </p>
                </div>
              )}
            </section>
          )}

          {/* ── Footer ───────────────────────────────────────── */}
          <footer className="text-center mt-3 pb-2">
            <p className="text-xs text-zinc-700">
              Powered by{" "}
              <span className="text-zinc-600">Chatterbox TTS</span>
              {" \u00B7 "}LuminAudio Self-Hosted
            </p>
          </footer>

        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── RIGHT SIDEBAR: Voice & Generation Settings ──────── */}
        {/* ══════════════════════════════════════════════════════ */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-8 lg:self-start">

          {/* ── Voice Picker ──────────────────────────────────── */}
          <section className={cardCls} aria-labelledby="voice-heading">
            <div className="flex items-center gap-2 text-zinc-400">
              <MicIcon />
              <h2 id="voice-heading" className={sectionHeadingCls}>Voice</h2>
            </div>

            {/* Default (no reference) */}
            <div className="flex flex-col gap-1.5">
              <p className={groupLabelCls}>Default</p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Default voice">
                <VoicePill
                  voice={{ id: NO_VOICE, name: "Default" }}
                  active={selectedVoice === NO_VOICE}
                  onSelect={setSelectedVoice}
                />
              </div>
            </div>

            {/* Uploaded / cloned voices */}
            {voices.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className={groupLabelCls}>Cloned Voices</p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Cloned voices">
                  {voices.map((v) => (
                    <VoicePill
                      key={v.id}
                      voice={{ id: v.id, name: v.name, filename: v.filename, clone_type: v.clone_type }}
                      active={selectedVoice === v.id}
                      onSelect={setSelectedVoice}
                      onDelete={handleDeleteVoice}
                      onRename={(id) => {
                        const voice = voices.find((x) => x.id === id);
                        if (voice) setRenamingVoice(voice);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Model Selection ───────────────────────────────── */}
          <section className={cardCls} aria-labelledby="model-heading">
            <div className="flex items-center gap-2 text-zinc-400">
              <WaveformIcon />
              <h2 id="model-heading" className={sectionHeadingCls}>Model</h2>
            </div>

            <div className="flex flex-col gap-2" role="radiogroup" aria-label="TTS model selection">
              <button
                onClick={() => setSelectedModel("original")}
                role="radio"
                aria-checked={selectedModel === "original"}
                className={[
                  "flex flex-col items-start px-3 py-2.5 rounded-lg text-sm font-medium",
                  "transition-all duration-200 cursor-pointer",
                  "focus:outline-none focus:ring-2 focus:ring-rose-500/40",
                  selectedModel === "original"
                    ? "bg-rose-600 text-white border border-rose-500 shadow-[0_0_12px_rgba(252,96,103,0.4)]"
                    : "bg-zinc-800/60 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700/70",
                ].join(" ")}
              >
                <span className="font-semibold">Original</span>
                <span className={`text-[11px] mt-0.5 ${selectedModel === "original" ? "text-rose-200" : "text-zinc-500"}`}>
                  Full control over expressiveness
                </span>
              </button>
              {(() => {
                const turboAvailable = availableModels.includes("turbo");
                const turboFailed = backendStatus === "online" && !turboAvailable;
                const turboLoading = false; // Once backend is online, turbo status is known
                return (
                  <button
                    onClick={() => turboAvailable && setSelectedModel("turbo")}
                    disabled={!turboAvailable}
                    role="radio"
                    aria-checked={selectedModel === "turbo"}
                    className={[
                      "flex flex-col items-start px-3 py-2.5 rounded-lg text-sm font-medium",
                      "transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-rose-500/40",
                      turboAvailable ? "cursor-pointer" : "cursor-not-allowed",
                      selectedModel === "turbo"
                        ? "bg-rose-600 text-white border border-rose-500 shadow-[0_0_12px_rgba(252,96,103,0.4)]"
                        : turboFailed
                        ? "bg-zinc-800/30 text-zinc-600 border border-zinc-800 opacity-50"
                        : "bg-zinc-800/60 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700/70",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">Turbo</span>
                      {turboAvailable && (
                        <span className={`text-[9px] font-semibold uppercase tracking-wider border px-1 py-0.5 rounded leading-none ${selectedModel === "turbo" ? "text-white/80 bg-white/10 border-white/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"}`}>
                          Fast
                        </span>
                      )}
                      {turboLoading && <SpinnerIcon />}
                      {turboFailed && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider border px-1 py-0.5 rounded leading-none text-red-400 bg-red-500/10 border-red-500/20">
                          Unavailable
                        </span>
                      )}
                    </div>
                    <span className={`text-[11px] mt-0.5 ${selectedModel === "turbo" ? "text-rose-200" : "text-zinc-500"}`}>
                      {turboFailed ? "Failed to load" : "Optimized for speed"}
                    </span>
                  </button>
                );
              })()}
            </div>
          </section>

          {/* ── Generation Settings ──────────────────────────── */}
          <section className={cardCls} aria-labelledby="settings-heading">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400">
                <SlidersIcon />
                <h2 id="settings-heading" className={sectionHeadingCls}>Generation Settings</h2>
              </div>
              <button
                onClick={() => { setSpeedFactor(1.0); setExaggeration(0.5); setTemperature(0.8); setCfgWeight(0.5); }}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
              >
                Reset
              </button>
            </div>

            {/* Speaking Pace */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="speed-factor" className="text-xs text-zinc-400 font-medium">
                  Speaking Pace
                </label>
                <span className="text-xs font-mono text-zinc-500">
                  {speedFactor.toFixed(2)}x
                  {speedFactor < 0.8 ? " (Slow)" : speedFactor > 1.3 ? " (Fast)" : " (Normal)"}
                </span>
              </div>
              <input
                id="speed-factor"
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={speedFactor}
                onChange={(e) => setSpeedFactor(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-600">Controls how fast the generated speech is delivered</p>
            </div>

            {/* Original-only settings: Exaggeration, Temperature, CFG Weight */}
            {effectiveModel === "original" && (
              <>
                {/* Exaggeration */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="exaggeration" className="text-xs text-zinc-400 font-medium">
                      Exaggeration
                    </label>
                    <span className="text-xs font-mono text-zinc-500">{exaggeration.toFixed(2)}x</span>
                  </div>
                  <input
                    id="exaggeration"
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.05"
                    value={exaggeration}
                    onChange={(e) => setExaggeration(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-600">Emotional expressiveness of the speech</p>
                </div>

                {/* Temperature */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="temperature" className="text-xs text-zinc-400 font-medium">
                      Temperature
                    </label>
                    <span className="text-xs font-mono text-zinc-500">
                      {temperature.toFixed(2)}
                      {temperature <= 0.5 ? " (Stable)" : temperature <= 1.0 ? " (Normal)" : " (Creative)"}
                    </span>
                  </div>
                  <input
                    id="temperature"
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-600">Increase variability. Can become unstable at high values.</p>
                </div>

                {/* CFG Weight */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="cfg-weight" className="text-xs text-zinc-400 font-medium">
                      CFG Weight
                    </label>
                    <span className="text-xs font-mono text-zinc-500">{cfgWeight.toFixed(2)}</span>
                  </div>
                  <input
                    id="cfg-weight"
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={cfgWeight}
                    onChange={(e) => setCfgWeight(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-600">Classifier-free guidance strength for voice adherence</p>
                </div>
              </>
            )}

            {effectiveModel === "turbo" && (
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Turbo model uses optimized defaults. Use paralinguistic tags in your text for expressiveness:
                {" "}<code className="text-zinc-400 bg-zinc-800 px-1 rounded">[laugh]</code>
                {" "}<code className="text-zinc-400 bg-zinc-800 px-1 rounded">[sigh]</code>
                {" "}<code className="text-zinc-400 bg-zinc-800 px-1 rounded">[cough]</code>
                {" "}<code className="text-zinc-400 bg-zinc-800 px-1 rounded">[chuckle]</code>
              </p>
            )}
          </section>

        </aside>

      </main>
    </div>
  );
}
