"use client";

import { useState, useEffect } from "react";
import {
  X,
  Sun,
  Moon,
  Volume2,
  Globe,
  Settings,
  ChevronRight,
  Check,
  Mic,
  Loader2,
  AlertCircle,
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
}

const IDIOMAS = [
  { value: "es-MX", label: "Español (México)" },
  { value: "es-ES", label: "Español (España)" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "pt-BR", label: "Português (Brasil)" },
];

const VELOCIDADES = [
  { value: 0.75, label: "0.75x" },
  { value: 1.0, label: "1x" },
  { value: 1.2, label: "1.2x" },
  { value: 1.5, label: "1.5x" },
  { value: 2.0, label: "2x" },
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
}: AccountSettingsModalProps) {
  const [localRate, setLocalRate] = useState(rate);
  const [localIdioma, setLocalIdioma] = useState(idiomaVoz);
  const [section, setSection] = useState<Section>("main");

  const isDark = theme === "dark";

  useEffect(() => {
    if (open) {
      setLocalRate(rate);
      setLocalIdioma(idiomaVoz);
      setSection("main");
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

  const selectedIdiomaLabel =
    IDIOMAS.find((i) => i.value === localIdioma)?.label ?? localIdioma;

  const voskStatusConfig = {
    idle: { label: "No cargado", color: "text-gray-400" },
    loading: { label: "Cargando...", color: "text-blue-400" },
    ready: { label: "Listo", color: "text-green-500" },
    error: { label: "Error", color: "text-red-500" },
  };

  const dividerClass = isDark ? "divide-[#222]" : "divide-gray-100";
  const sectionLabel = `text-[10px] font-medium uppercase tracking-wider mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`;
  const rowBase = isDark
    ? "bg-[#1a1a1a] hover:bg-[#202020]"
    : "bg-gray-50 hover:bg-gray-100";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className={`relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${
          isDark
            ? "bg-[#111111] border border-[#222222] text-white"
            : "bg-white border border-gray-100 text-gray-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {section === "main" ? (
          <>
            {/* Header */}
            <div
              className={`px-5 pt-5 pb-4 border-b ${isDark ? "border-[#1e1e1e]" : "border-gray-100"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#6841ea]" />
                  <h2 className="text-sm font-semibold">Configuración</h2>
                </div>
                <button
                  onClick={onClose}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark
                      ? "hover:bg-[#1e1e1e] text-gray-400 hover:text-white"
                      : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Perfil */}
              <div
                className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-[#1a1a1a]" : "bg-gray-50"}`}
              >
                {(() => {
                  const avatarUrl =
                    typeof colaborador.avatar === "string"
                      ? colaborador.avatar
                      : colaborador.avatar?.url;
                  return avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#6841ea] flex items-center justify-center shrink-0">
                      <span className="text-white text-[11px] font-bold">
                        {initials}
                      </span>
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  {colaborador.nombre && (
                    <p className="text-xs font-medium truncate">
                      {colaborador.nombre}
                    </p>
                  )}
                  <p
                    className={`text-[11px] truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {colaborador.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-5">
              {/* Apariencia */}
              <div>
                <p className={sectionLabel}>Apariencia</p>
                <div
                  className={`flex rounded-xl overflow-hidden border ${isDark ? "border-[#222]" : "border-gray-200"}`}
                >
                  <button
                    onClick={() => theme === "dark" && onToggleTheme()}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                      theme === "light"
                        ? "bg-[#6841ea] text-white"
                        : isDark
                          ? "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    Claro
                  </button>
                  <button
                    onClick={() => theme === "light" && onToggleTheme()}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                      theme === "dark"
                        ? "bg-[#6841ea] text-white"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    Oscuro
                  </button>
                </div>
              </div>

              {/* Voz */}
              <div>
                <p className={sectionLabel}>Voz</p>
                <div
                  className={`rounded-xl overflow-hidden divide-y ${dividerClass}`}
                >
                  {/* Velocidad */}
                  <div
                    className={`p-3 ${isDark ? "bg-[#1a1a1a]" : "bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2
                        className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      />
                      <span
                        className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Velocidad
                      </span>
                      <span className="ml-auto text-xs font-mono text-[#6841ea]">
                        {localRate}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2}
                      step={0.25}
                      value={localRate}
                      onChange={(e) =>
                        handleRateChange(parseFloat(e.target.value))
                      }
                      className="w-full accent-[#6841ea] h-1 cursor-pointer"
                    />
                    <div className="flex justify-between mt-2">
                      {VELOCIDADES.map((v) => (
                        <button
                          key={v.value}
                          onClick={() => handleRateChange(v.value)}
                          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                            localRate === v.value
                              ? "bg-[#6841ea] text-white"
                              : isDark
                                ? "text-gray-500 hover:text-gray-300"
                                : "text-gray-400 hover:text-gray-600"
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
                    className={`w-full flex items-center justify-between p-3 transition-colors ${rowBase}`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe
                        className={`w-3.5 h-3.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      />
                      <span
                        className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Idioma
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {selectedIdiomaLabel}
                      </span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                      />
                    </div>
                  </button>
                </div>
              </div>

              {/* Motor de transcripción */}
              <div>
                <p className={sectionLabel}>Motor de transcripción</p>
                <div
                  className={`rounded-xl overflow-hidden divide-y ${dividerClass}`}
                >
                  {(["groq", "vosk"] as VoiceEngine[]).map((eng) => {
                    const isSelected = engine === eng;
                    const isVosk = eng === "vosk";
                    const statusCfg = voskStatusConfig[voskStatus];

                    return (
                      <button
                        key={eng}
                        onClick={() => onEngineChange(eng)}
                        className={`w-full flex items-center justify-between p-3 transition-colors ${
                          isSelected
                            ? isDark
                              ? "bg-[#6841ea]/15"
                              : "bg-[#6841ea]/8"
                            : rowBase
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Mic
                            className={`w-3.5 h-3.5 ${
                              isSelected
                                ? "text-[#6841ea]"
                                : isDark
                                  ? "text-gray-400"
                                  : "text-gray-500"
                            }`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              isSelected
                                ? "text-[#6841ea]"
                                : isDark
                                  ? "text-gray-300"
                                  : "text-gray-700"
                            }`}
                          >
                            {eng === "groq" ? "Groq" : "Vosk"}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              eng === "groq"
                                ? isDark
                                  ? "bg-orange-500/15 text-orange-400"
                                  : "bg-orange-50 text-orange-600"
                                : isDark
                                  ? "bg-blue-500/15 text-blue-400"
                                  : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {eng === "groq" ? "Cloud" : "Local"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isVosk && isSelected && (
                            <span
                              className={`text-[10px] ${statusCfg.color} flex items-center gap-1`}
                            >
                              {voskStatus === "loading" && (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              )}
                              {voskStatus === "error" && (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              {statusCfg.label}
                            </span>
                          )}
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#6841ea]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p
                  className={`text-[10px] mt-1.5 px-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}
                >
                  Groq requiere conexión. Vosk funciona sin internet una vez
                  cargado.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[#6841ea] hover:bg-[#5a36d4] text-white text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Sub-pantalla idioma */}
            <div
              className={`px-5 pt-5 pb-4 border-b ${isDark ? "border-[#1e1e1e]" : "border-gray-100"}`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSection("main")}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark
                      ? "hover:bg-[#1e1e1e] text-gray-400 hover:text-white"
                      : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <h2 className="text-sm font-semibold">Idioma de voz</h2>
              </div>
            </div>
            <div className="px-5 py-4 space-y-1">
              {IDIOMAS.map((idioma) => (
                <button
                  key={idioma.value}
                  onClick={() => handleIdiomaChange(idioma.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                    localIdioma === idioma.value
                      ? isDark
                        ? "bg-[#6841ea]/20 border border-[#6841ea]/30"
                        : "bg-[#6841ea]/10 border border-[#6841ea]/20"
                      : isDark
                        ? "hover:bg-[#1a1a1a]"
                        : "hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`text-xs ${
                      localIdioma === idioma.value
                        ? "text-[#6841ea] font-medium"
                        : isDark
                          ? "text-gray-300"
                          : "text-gray-700"
                    }`}
                  >
                    {idioma.label}
                  </span>
                  {localIdioma === idioma.value && (
                    <Check className="w-3.5 h-3.5 text-[#6841ea]" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
