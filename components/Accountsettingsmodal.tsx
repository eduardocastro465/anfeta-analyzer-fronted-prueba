"use client";

import { useState, useEffect } from "react";
import {
  X,
  Sun,
  Moon,
  Volume2,
  Globe,
  ChevronRight,
  Check,
  Mic,
  Loader2,
  AlertCircle,
  Key,
  Zap,
  Cpu,
} from "lucide-react";
import type { VoiceEngine } from "@/components/Voiceengineselector";

interface AccountSettingsModalProps {
  open: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  rate: number;
  onChangeRate: (rate: number) => void;
  idiomaVoz: string;
  onChangeIdioma: (idioma: string) => void;
  engine: VoiceEngine;
  onEngineChange: (engine: VoiceEngine) => void;
  voskStatus: "idle" | "loading" | "ready" | "error";
  colaborador: {
    nombre?: string;
    email: string;
    avatar?: string | { url: string; dropboxPath: string };
  };
  onGuardarPreferencias?: (prefs: {
    velocidadVoz: number;
    idiomaVoz: string;
  }) => void;
  onOpenApiKeys?: () => void;
}

const IDIOMAS = [
  { value: "es-MX", label: "Español", sublabel: "México" },
  { value: "es-ES", label: "Español", sublabel: "España" },
  { value: "en-US", label: "English", sublabel: "US" },
  { value: "en-GB", label: "English", sublabel: "UK" },
  { value: "pt-BR", label: "Português", sublabel: "Brasil" },
];

const VELOCIDADES = [
  { value: 0.75, label: "0.75×" },
  { value: 1.0, label: "1×" },
  { value: 1.2, label: "1.2×" },
  { value: 1.5, label: "1.5×" },
  { value: 2.0, label: "2×" },
];

type Section = "main" | "idioma";

export function AccountSettingsModal({
  open,
  onClose,
  theme,
  onToggleTheme,
  rate,
  onChangeRate,
  idiomaVoz,
  onChangeIdioma,
  engine,
  onEngineChange,
  voskStatus,
  colaborador,
  onOpenApiKeys,
}: AccountSettingsModalProps) {
  const [localRate, setLocalRate] = useState(rate);
  const [localIdioma, setLocalIdioma] = useState(idiomaVoz);
  const [section, setSection] = useState<Section>("main");
  const [mounted, setMounted] = useState(false);

  const d = theme === "dark";

  useEffect(() => {
    if (open) {
      setLocalRate(rate);
      setLocalIdioma(idiomaVoz);
      setSection("main");
      setTimeout(() => setMounted(true), 10);
    } else {
      setMounted(false);
    }
  }, [open, rate, idiomaVoz]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleRateChange = (value: number) => {
    setLocalRate(value);
    onChangeRate(value);
  };

  const handleIdiomaChange = (value: string) => {
    setLocalIdioma(value);
    onChangeIdioma(value);
    setSection("main");
  };

  const initials = colaborador.nombre
    ? colaborador.nombre
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : colaborador.email.slice(0, 2).toUpperCase();

  const selectedIdioma = IDIOMAS.find((i) => i.value === localIdioma);
  const selectedIdiomaLabel = selectedIdioma
    ? `${selectedIdioma.label} (${selectedIdioma.sublabel})`
    : localIdioma;

  const voskStatusConfig = {
    idle: { label: "No cargado", dot: d ? "bg-gray-600" : "bg-gray-300" },
    loading: { label: "Cargando", dot: "bg-blue-400 animate-pulse" },
    ready: { label: "Listo", dot: "bg-emerald-400" },
    error: { label: "Error", dot: "bg-red-500" },
  };

  // ── tokens ───────────────────────────────────────────────────
  const surface = d ? "bg-[#0f0f0f]" : "bg-white";
  const border = d ? "border-[#1e1e1e]" : "border-gray-100";
  const divider = d ? "divide-[#1a1a1a]" : "divide-gray-100";
  const rowBg = d ? "bg-[#161616]" : "bg-gray-50";
  const rowHover = d ? "hover:bg-[#1c1c1c]" : "hover:bg-gray-100";
  const textPri = d ? "text-white" : "text-gray-900";
  const textSec = d ? "text-gray-400" : "text-gray-500";
  const textFaint = d ? "text-gray-600" : "text-gray-400";

  const avatarUrl =
    typeof colaborador.avatar === "string"
      ? colaborador.avatar
      : colaborador.avatar?.url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      style={{
        backdropFilter: "blur(6px)",
        background: d ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.4)",
      }}
    >
      <div
        className={`
          relative w-full sm:max-w-[360px] overflow-hidden
          rounded-t-3xl sm:rounded-2xl
          border ${border} ${surface}
          transition-all duration-300
          ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
        style={{
          boxShadow: d
            ? "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)"
            : "0 32px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, #6841ea 40%, #a78bfa 60%, transparent)",
            opacity: 0.8,
          }}
        />

        {section === "main" ? (
          <>
            {/* ── Header ────────────────────────────────────── */}
            <div className={`px-5 pt-6 pb-5 border-b ${border}`}>
              {/* drag handle (mobile) */}
              <div
                className={`sm:hidden mx-auto w-10 h-1 rounded-full mb-5 ${d ? "bg-[#2a2a2a]" : "bg-gray-200"}`}
              />

              {/* close */}
              <div className="flex items-center justify-end mb-4">
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    d
                      ? "bg-white/8 text-[#888] hover:bg-white/15 hover:text-white"
                      : "bg-black/6 text-[#999] hover:bg-black/12 hover:text-[#333]"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* avatar + info */}
              <div className="flex items-center gap-3.5">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-12 h-12 rounded-2xl object-cover shrink-0 ring-2 ring-[#6841ea]/20"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #5a2fd4, #7c5bf0)",
                    }}
                  >
                    <span className="text-white text-sm font-bold tracking-tight">
                      {initials}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {colaborador.nombre && (
                    <p className={`text-sm font-semibold truncate ${textPri}`}>
                      {colaborador.nombre}
                    </p>
                  )}
                  <p className={`text-[12px] truncate ${textSec}`}>
                    {colaborador.email}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Body ──────────────────────────────────────── */}
            <div className="px-5 py-5 space-y-6 overflow-y-auto max-h-[65vh] [&::-webkit-scrollbar]:hidden">
              {/* Apariencia */}
              <section>
                <Label d={d}>Apariencia</Label>
                <div
                  className={`flex rounded-xl overflow-hidden border ${border} p-1 gap-1 ${d ? "bg-[#0d0d0d]" : "bg-gray-100"}`}
                >
                  {[
                    { val: "light", icon: Sun, label: "Claro" },
                    { val: "dark", icon: Moon, label: "Oscuro" },
                  ].map(({ val, icon: Icon, label }) => (
                    <button
                      key={val}
                      onClick={() => theme !== val && onToggleTheme()}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                        theme === val
                          ? "bg-[#6841ea] text-white shadow-sm"
                          : `${textSec} ${rowHover}`
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Voz */}
              <section>
                <Label d={d}>Voz</Label>
                <div
                  className={`rounded-2xl overflow-hidden border ${border} divide-y ${divider}`}
                >
                  {/* Velocidad */}
                  <div className={`p-4 ${rowBg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Volume2 className={`w-3.5 h-3.5 ${textSec}`} />
                        <span className={`text-xs font-medium ${textPri}`}>
                          Velocidad
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#6841ea] tabular-nums">
                        {localRate}×
                      </span>
                    </div>

                    {/* custom range track */}
                    <div className="relative mb-3">
                      <input
                        type="range"
                        min={0.5}
                        max={2}
                        step={0.25}
                        value={localRate}
                        onChange={(e) =>
                          handleRateChange(parseFloat(e.target.value))
                        }
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#6841ea]"
                        style={{
                          background: `linear-gradient(to right, #6841ea ${((localRate - 0.5) / 1.5) * 100}%, ${d ? "#2a2a2a" : "#e5e7eb"} 0%)`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between gap-1">
                      {VELOCIDADES.map((v) => (
                        <button
                          key={v.value}
                          onClick={() => handleRateChange(v.value)}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${
                            localRate === v.value
                              ? "bg-[#6841ea] text-white"
                              : `${d ? "text-gray-500 hover:text-gray-300 hover:bg-white/5" : "text-gray-400 hover:text-gray-700 hover:bg-black/5"}`
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Idioma */}
                  <button
                    onClick={() => setSection("idioma")}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${rowBg} ${rowHover}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className={`w-3.5 h-3.5 ${textSec}`} />
                      <span className={`text-xs font-medium ${textPri}`}>
                        Idioma
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] ${textSec}`}>
                        {selectedIdiomaLabel}
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 ${textFaint}`} />
                    </div>
                  </button>
                </div>
              </section>

              {/* Transcripción */}
              <section>
                <Label d={d}>Motor de transcripción</Label>

                {/* API Keys button */}
                {onOpenApiKeys && (
                  <button
                    onClick={() => {
                      onOpenApiKeys();
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl mb-3 transition-all border ${
                      d
                        ? "border-[#6841ea]/25 bg-[#6841ea]/8 hover:bg-[#6841ea]/14 text-[#a78bfa]"
                        : "border-[#6841ea]/20 bg-[#f3f0ff] hover:bg-[#ebe6ff] text-[#6841ea]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Key className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">
                        Gestionar API Keys
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                )}

                <div
                  className={`rounded-2xl overflow-hidden border ${border} divide-y ${divider}`}
                >
                  {[
                    {
                      eng: "groq" as VoiceEngine,
                      icon: Zap,
                      label: "Groq",
                      badge: "Cloud",
                      badgeColor: d
                        ? "bg-orange-500/15 text-orange-400"
                        : "bg-orange-50 text-orange-600",
                    },
                    {
                      eng: "vosk" as VoiceEngine,
                      icon: Cpu,
                      label: "Vosk",
                      badge: "Local",
                      badgeColor: d
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-blue-50 text-blue-600",
                    },
                  ].map(({ eng, icon: Icon, label, badge, badgeColor }) => {
                    const isSelected = engine === eng;
                    const status = voskStatusConfig[voskStatus];

                    return (
                      <button
                        key={eng}
                        onClick={() => onEngineChange(eng)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 transition-all ${
                          isSelected
                            ? d
                              ? "bg-[#6841ea]/12"
                              : "bg-[#6841ea]/6"
                            : `${rowBg} ${rowHover}`
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-3.5 h-3.5 ${isSelected ? "text-[#6841ea]" : textSec}`}
                          />
                          <span
                            className={`text-xs font-medium ${isSelected ? "text-[#6841ea]" : textPri}`}
                          >
                            {label}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badgeColor}`}
                          >
                            {badge}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {eng === "vosk" && isSelected && (
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                              />
                              <span className={`text-[10px] ${textFaint}`}>
                                {status.label}
                              </span>
                            </div>
                          )}
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[#6841ea] flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p
                  className={`text-[10px] mt-2 px-1 leading-relaxed ${textFaint}`}
                >
                  Groq requiere conexión a internet · Vosk funciona sin internet
                </p>
              </section>
            </div>

            {/* ── Footer ────────────────────────────────────── */}
            <div className={`px-5 pb-5 pt-3 border-t ${border}`}>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-white text-xs font-semibold transition-all duration-200 relative overflow-hidden group"
                style={{
                  background:
                    "linear-gradient(135deg, #5a2fd4 0%, #6841ea 50%, #7c5bf0 100%)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background:
                      "linear-gradient(135deg, #6535e0 0%, #7547f0 50%, #8a69f5 100%)",
                  }}
                />
                <span className="relative">Listo</span>
              </button>
            </div>
          </>
        ) : (
          /* ── Idioma sub-screen ──────────────────────────── */
          <>
            <div className={`px-5 pt-5 pb-4 border-b ${border}`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSection("main")}
                  className={`p-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    d
                      ? "bg-white/8 text-[#888] hover:bg-white/15 hover:text-white"
                      : "bg-black/6 text-[#999] hover:bg-black/12 hover:text-[#333]"
                  }`}
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <div>
                  <p className={`text-sm font-semibold ${textPri}`}>
                    Idioma de voz
                  </p>
                  <p className={`text-[11px] ${textFaint}`}>
                    Selecciona el idioma de síntesis
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-1.5">
              {IDIOMAS.map((idioma) => {
                const isSelected = localIdioma === idioma.value;
                return (
                  <button
                    key={idioma.value}
                    onClick={() => handleIdiomaChange(idioma.value)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? d
                          ? "bg-[#6841ea]/15 border border-[#6841ea]/30"
                          : "bg-[#6841ea]/8 border border-[#6841ea]/20"
                        : `${d ? "hover:bg-[#161616]" : "hover:bg-gray-50"} border border-transparent`
                    }`}
                  >
                    <div>
                      <span
                        className={`text-xs font-medium ${isSelected ? "text-[#6841ea]" : textPri}`}
                      >
                        {idioma.label}
                      </span>
                      <span
                        className={`ml-1.5 text-[11px] ${isSelected ? "text-[#6841ea]/70" : textFaint}`}
                      >
                        {idioma.sublabel}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#6841ea] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Label({ children, d }: { children: React.ReactNode; d: boolean }) {
  return (
    <p
      className={`text-[10px] font-semibold uppercase tracking-widest mb-2.5 px-0.5 ${d ? "text-gray-600" : "text-gray-400"}`}
    >
      {children}
    </p>
  );
}
