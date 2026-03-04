"use client";
import { useState, useCallback } from "react";
import { useVoskRealtime } from "@/components/hooks/useVoskRealtime";
import { transcribirAudioCliente } from "@/lib/transcription";

export type VoiceEngine = "groq" | "vosk";

interface UseVoiceEngineOptions {
  onVoskPartial?: (text: string) => void;
  onVoskFinal?: (text: string) => void;
  onVoskError?: (error: Error) => void;
}

interface UseVoiceEngineReturn {
  engine: VoiceEngine;
  setEngine: (engine: VoiceEngine) => void;
  transcriptionService: (audioBlob: Blob) => Promise<string>;
  voskRealtime: ReturnType<typeof useVoskRealtime>;
  voskStatus: "idle" | "loading" | "ready" | "error";
}

// ==================== HOOK ====================
export function useVoiceEngine({
  onVoskPartial,
  onVoskFinal,
  onVoskError,
}: UseVoiceEngineOptions = {}): UseVoiceEngineReturn {
  const [engine, setEngineState] = useState<VoiceEngine>("vosk");

  const voskRealtime = useVoskRealtime({
    onPartial: onVoskPartial,
    onFinal: onVoskFinal,
    onError: onVoskError,
  });

  const setEngine = useCallback(
    (newEngine: VoiceEngine) => {
      setEngineState(newEngine);
      if (newEngine === "vosk" && voskRealtime.status === "idle") {
        voskRealtime.loadModel();
      }
    },
    [voskRealtime],
  );

  // ==================== SERVICIO DE TRANSCRIPCION CON VOSK ====================
  const transcriptionService = useCallback(
    (audioBlob: Blob): Promise<string> => transcribirAudioCliente(audioBlob),
    [],
  );

  return {
    engine,
    setEngine,
    transcriptionService,
    voskRealtime,
    voskStatus: voskRealtime.status,
  };
}

// ==================== COMPONENTE VISUAL ====================

interface VoiceEngineSelectorProps {
  engine: VoiceEngine;
  onEngineChange: (engine: VoiceEngine) => void;
  voskStatus: "idle" | "loading" | "ready" | "error";
  theme?: "light" | "dark";
}

export function VoiceEngineSelector({
  engine,
  onEngineChange,
  voskStatus,
  theme = "dark",
}: VoiceEngineSelectorProps) {
  const isDark = theme === "dark";

  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-full backdrop-blur-xl"
      style={{
        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
      }}
    >
      {/* Groq */}
      <button
        onClick={() => onEngineChange("groq")}
        className="relative flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200"
        style={{
          background:
            engine === "groq"
              ? isDark
                ? "rgba(251,146,60,0.15)"
                : "rgba(251,146,60,0.1)"
              : "transparent",
          color:
            engine === "groq"
              ? "#fb923c"
              : isDark
                ? "rgba(156,163,175,0.5)"
                : "rgba(107,114,128,0.6)",
          border:
            engine === "groq"
              ? "1px solid rgba(251,146,60,0.25)"
              : "1px solid transparent",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200"
          style={{
            background:
              engine === "groq"
                ? "#fb923c"
                : isDark
                  ? "rgba(156,163,175,0.3)"
                  : "rgba(107,114,128,0.3)",
            boxShadow:
              engine === "groq" ? "0 0 6px rgba(251,146,60,0.6)" : "none",
          }}
        />
        Groq
      </button>

      {/* Vosk */}
      <button
        onClick={() => onEngineChange("vosk")}
        className="relative flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200"
        style={{
          background:
            engine === "vosk"
              ? isDark
                ? "rgba(96,165,250,0.15)"
                : "rgba(96,165,250,0.1)"
              : "transparent",
          color:
            engine === "vosk"
              ? "#60a5fa"
              : isDark
                ? "rgba(156,163,175,0.5)"
                : "rgba(107,114,128,0.6)",
          border:
            engine === "vosk"
              ? "1px solid rgba(96,165,250,0.25)"
              : "1px solid transparent",
        }}
      >
        {/* Dot con glow según estado */}
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200 ${
            engine === "vosk" && voskStatus === "loading" ? "animate-pulse" : ""
          }`}
          style={{
            background:
              engine === "vosk"
                ? voskStatus === "ready"
                  ? "#34d399"
                  : voskStatus === "loading"
                    ? "#38bdf8"
                    : voskStatus === "error"
                      ? "#f87171"
                      : "rgba(156,163,175,0.3)"
                : isDark
                  ? "rgba(156,163,175,0.3)"
                  : "rgba(107,114,128,0.3)",
            boxShadow:
              engine === "vosk"
                ? voskStatus === "ready"
                  ? "0 0 6px rgba(52,211,153,0.7)"
                  : voskStatus === "loading"
                    ? "0 0 6px rgba(56,189,248,0.7)"
                    : voskStatus === "error"
                      ? "0 0 6px rgba(248,113,113,0.7)"
                      : "none"
                : "none",
          }}
        />
        Vosk
        {engine === "vosk" && voskStatus === "loading" && (
          <span className="text-[9px] text-sky-400/70 animate-pulse">
            cargando
          </span>
        )}
        {engine === "vosk" && voskStatus === "ready" && (
          <span className="text-[9px] text-emerald-400/70">listo</span>
        )}
        {engine === "vosk" && voskStatus === "error" && (
          <span className="text-[9px] text-red-400/70">error</span>
        )}
      </button>
    </div>
  );
}

// ==================== INDICADOR (solo lectura) ====================

interface VoiceEngineIndicatorProps {
  engine: VoiceEngine;
  voskStatus: "idle" | "loading" | "ready" | "error";
  theme: "light" | "dark";
}

export function VoiceEngineIndicator({
  engine,
  voskStatus,
  theme,
}: VoiceEngineIndicatorProps) {
  const isDark = theme === "dark";

  const dotColor =
    engine === "groq"
      ? "#fb923c"
      : voskStatus === "ready"
        ? "#34d399"
        : voskStatus === "loading"
          ? "#38bdf8"
          : voskStatus === "error"
            ? "#f87171"
            : "#9ca3af";

  const dotGlow =
    engine === "groq"
      ? "0 0 6px rgba(251,146,60,0.6)"
      : voskStatus === "ready"
        ? "0 0 6px rgba(52,211,153,0.6)"
        : voskStatus === "loading"
          ? "0 0 6px rgba(56,189,248,0.6)"
          : "none";

  const label = engine === "groq" ? "Groq" : "Vosk";

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium select-none"
      style={{
        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        color: isDark ? "rgba(156,163,175,0.8)" : "rgba(107,114,128,0.8)",
      }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          engine === "vosk" && voskStatus === "loading" ? "animate-pulse" : ""
        }`}
        style={{ background: dotColor, boxShadow: dotGlow }}
      />
      {label}
    </div>
  );
}
