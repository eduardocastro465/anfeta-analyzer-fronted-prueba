"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Zap,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { guardarKeysUsuario } from "@/lib/api";
import { invalidarCacheKeys } from "@/lib/transcription";

interface ApiKeysModalProps {
  open: boolean;
  theme: "light" | "dark";
  keysRequeridas: { groq: boolean; gemini: boolean };
  keysIniciales?: { groq: string[]; gemini: string };
  onSuccess: () => void;
  onClose?: () => void;
  onLogout?: () => void;
}

interface Paso {
  titulo: string;
  descripcion: string;
  imagen: string | null;
  link?: string;
  placeholder?: string;
}

const IMG = {
  groq1: "/instrucciones/groq/paso_1_groq.webp",
  groq2: "/instrucciones/groq/paso_2_groq.webp",
  groq3: "/instrucciones/groq/paso_3_groq.webp",
  groq4: "/instrucciones/groq/paso_4_groq.webp",
  groq5: "/instrucciones/groq/paso_5_groq.webp",
  groq6: "/instrucciones/groq/paso_6_groq.webp",
  groq7: "/instrucciones/groq/paso_7_groq.webp",
  gemini1: "/instrucciones/gemeni/Paso_1_Gemeni.webp",
  gemini2: "/instrucciones/gemeni/Paso_2_Gemeni.webp",
  gemini3: "/instrucciones/gemeni/Paso_3_Gemeni.webp",
  gemini4: "/instrucciones/gemeni/Paso_4_Gemeni.webp",
  gemini5: "/instrucciones/gemeni/Paso_5_Gemeni.webp",
};

const pasosGroq: Paso[] = [
  {
    titulo: "Entra a console.groq.com",
    descripcion: "Abre el sitio oficial y haz clic en Continue with Google.",
    link: "https://console.groq.com",
    imagen: IMG.groq1,
  },
  {
    titulo: "Selecciona tu cuenta de Google",
    descripcion: "Elige tu cuenta para continuar hacia el dashboard.",
    imagen: IMG.groq2,
  },
  {
    titulo: "Haz clic en API Keys",
    descripcion:
      "Está en la barra de navegación superior derecha del dashboard.",
    imagen: IMG.groq3,
  },
  {
    titulo: "Haz clic en + Create API Key",
    descripcion: "Botón en la esquina superior derecha de la sección.",
    imagen: IMG.groq4,
  },
  {
    titulo: "Escribe un nombre para tu key",
    descripcion: "Escribe cualquier nombre en el campo Display Name.",
    imagen: IMG.groq5,
  },
  {
    titulo: "Haz clic en Submit",
    descripcion: "Confirma la creación de tu API Key.",
    imagen: IMG.groq6,
  },
  {
    titulo: "Copia tu API Key",
    descripcion: "Empieza con gsk_ — cópiala ahora, no se mostrará de nuevo.",
    imagen: IMG.groq7,
  },
];

const pasosGemini: Paso[] = [
  {
    titulo: "Entra a Google AI Studio",
    descripcion: "Abre el sitio oficial y haz clic en Get started.",
    link: "https://aistudio.google.com/app/apikey",
    imagen: IMG.gemini1,
  },
  {
    titulo: "Selecciona tu cuenta de Google",
    descripcion: "Elige tu cuenta para continuar hacia el dashboard.",
    imagen: IMG.gemini2,
  },
  {
    titulo: "Haz clic en Crear clave de API",
    descripcion: "Botón en la esquina superior derecha de la sección.",
    imagen: IMG.gemini3,
  },
  {
    titulo: "Selecciona un proyecto y confirma",
    descripcion:
      "Elige Default Gemini Project o crea uno nuevo, luego confirma.",
    imagen: IMG.gemini4,
  },
  {
    titulo: "Copia tu API Key",
    descripcion:
      "Haz clic en el ícono de copiar junto a tu key. Empieza con AIza.",
    imagen: IMG.gemini5,
  },
];

type EstadoKey = "idle" | "validando" | "ok" | "error";

export function ApiKeysModal({
  open,
  theme,
  keysRequeridas,
  keysIniciales,
  onSuccess,
  onClose,
  onLogout,
}: ApiKeysModalProps) {
  const tieneKeys =
    (keysIniciales?.groq?.filter((k) => k.trim()).length ?? 0) > 0;

  const [groqKeys, setGroqKeys] = useState<string[]>(["", ""]);
  const [mostrarGroq, setMostrarGroq] = useState<boolean[]>([false, false]);
  const [groqEstados, setGroqEstados] = useState<EstadoKey[]>(["idle", "idle"]);
  const [gemini, setGemini] = useState("");
  const [mostrarGemini, setMostrarGemini] = useState(false);
  const [geminiEstado, setGeminiEstado] = useState<EstadoKey>("idle");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [tabActiva, setTabActiva] = useState<"groq" | "gemini">("groq");
  const [pasoActivo, setPasoActivo] = useState(0);
  const [lightboxAbierto, setLightboxAbierto] = useState(false);
  const [lightboxPaso, setLightboxPaso] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showHint, setShowHint] = useState(true);

  const GROQ_MIN_LENGTH = 50;
  const GEMINI_MIN_LENGTH = 35;
  const timersGroq = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const timerGemini = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pasos = tabActiva === "groq" ? pasosGroq : pasosGemini;
  const pasosConImagen = pasos.filter((p) => p.imagen);

  const cerrarLightbox = useCallback(() => setLightboxAbierto(false), []);
  const lightboxAnterior = useCallback(() => {
    setLightboxPaso((prev) => {
      const n = Math.max(0, prev - 1);
      const idx = pasos.findIndex((p) => p.imagen === pasosConImagen[n].imagen);
      if (idx >= 0) setPasoActivo(idx);
      return n;
    });
  }, [pasos, pasosConImagen]);
  const lightboxSiguiente = useCallback(() => {
    setLightboxPaso((prev) => {
      const n = Math.min(pasosConImagen.length - 1, prev + 1);
      const idx = pasos.findIndex((p) => p.imagen === pasosConImagen[n].imagen);
      if (idx >= 0) setPasoActivo(idx);
      return n;
    });
  }, [pasos, pasosConImagen]);

  useEffect(() => {
    if (!open) return;
    const tieneKeys =
      (keysIniciales?.groq?.filter((k) => k.trim()).length ?? 0) > 0;
    setGroqKeys(tieneKeys ? keysIniciales!.groq : ["", ""]);
    setMostrarGroq(
      tieneKeys ? keysIniciales!.groq.map(() => true) : [false, false],
    );
    setGroqEstados(
      tieneKeys ? keysIniciales!.groq.map(() => "idle") : ["idle", "idle"],
    );

    setGemini(keysIniciales?.gemini ?? "");
    setMostrarGemini(!!keysIniciales?.gemini?.trim());
    setGeminiEstado("idle");
    setError("");
    setShowWarning(false);
    setTabActiva("groq");
    setPasoActivo(0);
    setShowHint(true);
    setLightboxAbierto(false);
  }, [open, keysIniciales]);

  useEffect(() => {
    if (!lightboxAbierto) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") lightboxAnterior();
      if (e.key === "ArrowRight") lightboxSiguiente();
      if (e.key === "Escape") cerrarLightbox();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [lightboxAbierto, lightboxAnterior, lightboxSiguiente, cerrarLightbox]);

  if (!open) return null;

  const paso = pasos[pasoActivo];
  const pasoLightbox = pasosConImagen[lightboxPaso];
  const d = theme === "dark";

  // ── design tokens ────────────────────────────────────────────
  const surface = d ? "bg-[#111111]" : "bg-white";
  const surfaceAlt = d ? "bg-[#0d0d0d]" : "bg-[#f7f8fa]";
  const border = d ? "border-[#1e1e1e]" : "border-[#e8eaed]";
  const textPri = d ? "text-white" : "text-[#0d0d0d]";
  const textSec = d ? "text-[#666]" : "text-[#888]";
  const textFaint = d ? "text-[#3a3a3a]" : "text-[#bbb]";

  const agregarGroqKey = () => {
    const ultimaKey = groqKeys[groqKeys.length - 1].trim();

    if (!ultimaKey) {
      setError("Completa la key anterior antes de agregar otra.");
      return;
    }
    if (groqKeys.slice(0, -1).some((k) => k.trim() === ultimaKey)) {
      setError("Esta key ya está agregada.");
      return;
    }
    setGroqKeys((p) => [...p, ""]);
    setMostrarGroq((p) => [...p, false]);
    setGroqEstados((p) => [...p, "idle"]);
  };
  const eliminarGroqKey = (i: number) => {
    clearTimeout(timersGroq.current[i]);
    setGroqKeys((p) => p.filter((_, j) => j !== i));
    setMostrarGroq((p) => p.filter((_, j) => j !== i));
    setGroqEstados((p) => p.filter((_, j) => j !== i));
  };

  const validarGroqKey = async (key: string) => {
    try {
      return (
        await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        })
      ).ok;
    } catch {
      return false;
    }
  };
  const validarGeminiKey = async (key: string) => {
    try {
      return (
        await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        )
      ).ok;
    } catch {
      return false;
    }
  };

  const actualizarGroqKey = (index: number, value: string) => {
    setGroqKeys((p) => p.map((k, i) => (i === index ? value : k)));
    setError("");
    clearTimeout(timersGroq.current[index]);
    const t = value.trim();
    if (!t) {
      setGroqEstados((p) => p.map((s, i) => (i === index ? "idle" : s)));
      return;
    }
    if (!t.startsWith("gsk_") || t.length < GROQ_MIN_LENGTH) {
      setGroqEstados((p) => p.map((s, i) => (i === index ? "error" : s)));
      return;
    }
    setGroqEstados((p) => p.map((s, i) => (i === index ? "validando" : s)));
    timersGroq.current[index] = setTimeout(async () => {
      const v = await validarGroqKey(t);
      setGroqEstados((p) =>
        p.map((s, i) => (i === index ? (v ? "ok" : "error") : s)),
      );
    }, 800);
  };

  const actualizarGemini = (value: string) => {
    setGemini(value);
    setError("");
    if (timerGemini.current) clearTimeout(timerGemini.current);
    const t = value.trim();
    if (!t) {
      setGeminiEstado("idle");
      return;
    }
    if (!t.startsWith("AIza") || t.length < GEMINI_MIN_LENGTH) {
      setGeminiEstado("error");
      return;
    }
    setGeminiEstado("validando");
    timerGemini.current = setTimeout(async () => {
      setGeminiEstado((await validarGeminiKey(t)) ? "ok" : "error");
    }, 800);
  };

  const abrirLightbox = (idx: number) => {
    const i = pasosConImagen.findIndex((p) => p.imagen === pasos[idx].imagen);
    if (i >= 0) {
      setLightboxPaso(i);
      setLightboxAbierto(true);
    }
  };
  const handleTabChange = (tab: "groq" | "gemini") => {
    setTabActiva(tab);
    setPasoActivo(0);
  };

  const handleGuardar = async () => {
    const keysValidas = groqKeys.map((k) => k.trim()).filter(Boolean);
    if (!keysValidas.length) {
      setError("Agrega al menos una Groq API Key");
      return;
    }
    if (keysValidas.length < 2 && !showWarning) {
      setShowWarning(true);
      return;
    }
    if (
      groqEstados.some((s) => s === "validando") ||
      geminiEstado === "validando"
    ) {
      setError("Espera a que terminen las validaciones.");
      return;
    }
    const errores = groqEstados
      .map((s, i) => (s === "error" && groqKeys[i].trim() ? i + 1 : null))
      .filter(Boolean) as number[];
    if (errores.length) {
      setError(`Las keys en posición ${errores.join(", ")} no son válidas.`);
      return;
    }
    if (gemini.trim() && geminiEstado === "error") {
      setError("La key de Gemini no es válida.");
      return;
    }
    try {
      setGuardando(true);
      setError("");
      const payload: { groq?: string[]; gemini?: string } = {
        groq: keysValidas,
      };
      if (gemini.trim()) payload.gemini = gemini.trim();
      const res = await guardarKeysUsuario(payload);
      if (!res.success) {
        setError(res.message || "Error al guardar las keys");
        return;
      }
      invalidarCacheKeys();
      onSuccess();
    } catch {
      setError("No se pudieron guardar las keys. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const estadoBorde = (e: EstadoKey) => {
    if (e === "ok") return "border-emerald-500/40 bg-emerald-500/[0.03]";
    if (e === "error") return "border-red-500/40 bg-red-500/[0.03]";
    if (e === "validando")
      return d ? "border-[#6841ea]/50" : "border-[#6841ea]/40";
    return d
      ? "border-[#232323] focus-within:border-[#6841ea]/50"
      : "border-[#e0e0e0] focus-within:border-[#6841ea]/50";
  };

  const tieneKeysGuardadas =
    (keysIniciales?.groq?.filter((k) => k.trim()).length ?? 0) > 0;

  return (
    <>
      {/* ── Backdrop ───────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: d ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.5)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          className={`relative w-full max-w-[800px] rounded-2xl flex flex-col overflow-hidden max-h-[92vh] ${surface} border ${border}`}
          style={{
            boxShadow: d
              ? "0 32px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)"
              : "0 32px 100px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
          }}
        >
          {/* Top accent */}
          <div
            className="absolute top-0 left-0 right-0 h-px z-10"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #6841ea 35%, #a78bfa 55%, transparent 100%)",
              opacity: 0.9,
            }}
          />

          {/* ── Header ─────────────────────────────────────────── */}
          <div
            className={`relative px-6 py-5 flex items-center gap-4 border-b ${border} shrink-0`}
          >
            {/* icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: d
                  ? "rgba(104,65,234,0.12)"
                  : "rgba(104,65,234,0.08)",
                border: "1px solid rgba(104,65,234,0.2)",
              }}
            >
              <Key className="w-[18px] h-[18px] text-[#6841ea]" />
            </div>

            <div className="flex-1 min-w-0">
              <h2
                className={`text-[15px] font-semibold tracking-tight ${textPri}`}
              >
                Configura tus API Keys
              </h2>
              <p className={`text-[12px] mt-0.5 ${textSec}`}>
                Necesarias para habilitar la transcripción de voz
              </p>
            </div>

            {tieneKeysGuardadas && onClose ? (
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
            ) : (
              <div
                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium border ${
                  d
                    ? "bg-amber-500/8 border-amber-500/20 text-amber-400"
                    : "bg-amber-50 border-amber-200 text-amber-600"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Acción requerida
              </div>
            )}
          </div>

          {/* ── Body ───────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            {/* Left: Form */}
            <div
              className={`flex flex-col md:flex-1 min-h-0 border-b md:border-b-0 md:border-r ${border}`}
            >
              <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-6 [&::-webkit-scrollbar]:hidden">
                {/* ── Groq ───────────────────────────────────── */}
                <div className="space-y-3">
                  {/* row: badge + add */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                          d
                            ? "bg-[#1a1528] border-[#6841ea]/25 text-[#a78bfa]"
                            : "bg-[#f3f0ff] border-[#6841ea]/20 text-[#6841ea]"
                        }`}
                      >
                        <Zap className="w-2.5 h-2.5" />
                        Groq
                      </div>
                      {tieneKeysGuardadas ? (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}
                        >
                          Guardada ✓
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-500"}`}
                        >
                          Requerida
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={agregarGroqKey}
                      className={`flex items-center gap-1.5 text-[11px] font-semibold transition-all rounded-lg px-2.5 py-1.5 ${
                        d
                          ? "text-[#a78bfa] hover:bg-[#6841ea]/12"
                          : "text-[#6841ea] hover:bg-[#6841ea]/8"
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      Agregar cuenta
                    </button>
                  </div>

                  <div className="space-y-2">
                    {/* Hint */}
                    {groqKeys.length > 1 && (
                      <div
                        className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-[11px] leading-relaxed border ${
                          d
                            ? "bg-amber-500/6 border-amber-500/18 text-amber-400"
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                        <span className="flex-1">
                          Las API Key deben ser de{" "}
                          <strong className="font-bold">
                            diferentes cuentas de Google
                          </strong>{" "}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowHint(false)}
                          className={`shrink-0 p-0.5 rounded transition-colors opacity-60 hover:opacity-100 ${d ? "hover:text-amber-300" : "hover:text-amber-900"}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Keys list */}
                    {groqKeys.map((key, idx) => (
                      <div key={idx}>
                        <div className="flex items-center gap-2">
                          {groqKeys.length > 1 && (
                            <span
                              className={`text-[10px] font-mono w-4 text-center shrink-0 ${textFaint}`}
                            >
                              {idx + 1}
                            </span>
                          )}
                          <div
                            className={`flex-1 flex items-center rounded-xl border transition-all duration-200 ${estadoBorde(groqEstados[idx])}`}
                            onFocus={() => handleTabChange("groq")}
                          >
                            <input
                              type={mostrarGroq[idx] ? "text" : "password"}
                              value={key}
                              onChange={(e) =>
                                actualizarGroqKey(idx, e.target.value)
                              }
                              placeholder="gsk_••••••••••••••••••••••••••••••••••••••"
                              className={`flex-1 px-3.5 py-2.5 text-[12.5px] bg-transparent outline-none font-mono tracking-wider ${
                                d
                                  ? "text-white placeholder:text-[#2e2e2e]"
                                  : "text-[#0d0d0d] placeholder:text-[#ccc]"
                              }`}
                            />
                            <div className="flex items-center gap-1 pr-3 shrink-0">
                              {groqEstados[idx] === "validando" && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6841ea]" />
                              )}
                              {groqEstados[idx] === "ok" && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                              {groqEstados[idx] === "error" && key.trim() && (
                                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setMostrarGroq((p) =>
                                    p.map((v, i) => (i === idx ? !v : v)),
                                  )
                                }
                                className={`p-1.5 rounded-lg transition-colors ${
                                  d
                                    ? "text-[#444] hover:text-[#999] hover:bg-white/5"
                                    : "text-[#bbb] hover:text-[#666] hover:bg-black/5"
                                }`}
                              >
                                {mostrarGroq[idx] ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          {groqKeys.length > 2 && (
                            <button
                              type="button"
                              onClick={() => eliminarGroqKey(idx)}
                              className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                                d
                                  ? "text-[#333] hover:text-red-400 hover:bg-red-500/8"
                                  : "text-[#ccc] hover:text-red-500 hover:bg-red-50"
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {groqEstados[idx] === "error" && key.trim() && (
                          <p
                            className={`mt-1.5 text-[10px] text-red-500 ${groqKeys.length > 1 ? "ml-6" : ""}`}
                          >
                            {!key.trim().startsWith("gsk_")
                              ? 'Debe comenzar con "gsk_"'
                              : key.trim().length < GROQ_MIN_LENGTH
                                ? `Muy corta — mínimo ${GROQ_MIN_LENGTH} caracteres`
                                : "Key inválida o revocada"}
                          </p>
                        )}
                        {groqEstados[idx] === "ok" && (
                          <p
                            className={`mt-1.5 text-[10px] text-emerald-500 ${groqKeys.length > 1 ? "ml-6" : ""}`}
                          >
                            Key verificada ✓
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {groqKeys.length > 1 && (
                    <p
                      className={`text-[10px] flex items-center gap-1.5 ${textFaint}`}
                    >
                      <Shield className="w-3 h-3" />
                      Las keys rotan automáticamente para distribuir la carga
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex-1 h-px ${d ? "bg-[#1c1c1c]" : "bg-[#ebebeb]"}`}
                  />
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest px-2 ${textFaint}`}
                  >
                    opcional
                  </span>
                  <div
                    className={`flex-1 h-px ${d ? "bg-[#1c1c1c]" : "bg-[#ebebeb]"}`}
                  />
                </div>

                {/* ── Gemini ─────────────────────────────────── */}
                <div className="space-y-3">
                  <div
                    className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border w-fit ${
                      d
                        ? "bg-[#0e1a2e] border-blue-500/25 text-blue-400"
                        : "bg-[#eff6ff] border-blue-200 text-blue-600"
                    }`}
                  >
                    Gemini
                  </div>
                  <div onFocus={() => handleTabChange("gemini")}>
                    <div
                      className={`flex items-center rounded-xl border transition-all duration-200 ${estadoBorde(geminiEstado)}`}
                    >
                      <input
                        type={mostrarGemini ? "text" : "password"}
                        value={gemini}
                        onChange={(e) => actualizarGemini(e.target.value)}
                        placeholder="AIza••••••••••••••••••••••••••••••••••••"
                        className={`flex-1 px-3.5 py-2.5 text-[12.5px] bg-transparent outline-none font-mono tracking-wider ${
                          d
                            ? "text-white placeholder:text-[#2e2e2e]"
                            : "text-[#0d0d0d] placeholder:text-[#ccc]"
                        }`}
                      />
                      <div className="flex items-center gap-1 pr-3 shrink-0">
                        {geminiEstado === "validando" && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6841ea]" />
                        )}
                        {geminiEstado === "ok" && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        {geminiEstado === "error" && gemini.trim() && (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                        <button
                          type="button"
                          onClick={() => setMostrarGemini((v) => !v)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            d
                              ? "text-[#444] hover:text-[#999] hover:bg-white/5"
                              : "text-[#bbb] hover:text-[#666] hover:bg-black/5"
                          }`}
                        >
                          {mostrarGemini ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {geminiEstado === "error" && gemini.trim() && (
                      <p className="mt-1.5 text-[10px] text-red-500">
                        {!gemini.trim().startsWith("AIza")
                          ? 'Debe comenzar con "AIza"'
                          : gemini.trim().length < GEMINI_MIN_LENGTH
                            ? `Muy corta — mínimo ${GEMINI_MIN_LENGTH} caracteres`
                            : "Key inválida o revocada"}
                      </p>
                    )}
                    {geminiEstado === "ok" && (
                      <p className="mt-1.5 text-[10px] text-emerald-500">
                        Key verificada ✓
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Footer ───────────────────────────────────── */}
              <div
                className={`px-6 py-4 border-t shrink-0 space-y-2.5 ${border}`}
              >
                {error && (
                  <div
                    className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-[11px] leading-relaxed border ${
                      d
                        ? "bg-red-500/6 border-red-500/15 text-red-400"
                        : "bg-red-50 border-red-200 text-red-600"
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}
                {showWarning && (
                  <div
                    className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-[11px] leading-relaxed border ${
                      d
                        ? "bg-amber-500/6 border-amber-500/18 text-amber-400"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                    <span className="flex-1">
                      Se recomienda tener{" "}
                      <strong className="font-bold">2 cuentas de Groq</strong>{" "}
                      para distribuir la carga y evitar límites. ¿Deseas
                      continuar con solo una?
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowWarning(false)}
                      className={`shrink-0 p-0.5 rounded opacity-60 hover:opacity-100 ${d ? "hover:text-amber-300" : "hover:text-amber-900"}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {/* Primary CTA */}
                <button
                  onClick={handleGuardar}
                  disabled={guardando}
                  className="w-full relative py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 overflow-hidden group"
                  style={{
                    background:
                      "linear-gradient(135deg, #5a2fd4 0%, #6841ea 50%, #7c5bf0 100%)",
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{
                      background:
                        "linear-gradient(135deg, #6535e0 0%, #7547f0 50%, #8a69f5 100%)",
                    }}
                  />
                  <span className="relative flex items-center gap-2">
                    {guardando ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        Guardar y continuar
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </span>
                </button>

                {/* Logout */}
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all border ${
                      d
                        ? "text-red-400 border-red-500/20 bg-red-500/6 hover:bg-red-500/12 hover:border-red-500/30"
                        : "text-red-500 border-red-200 bg-red-50/80 hover:bg-red-100 hover:border-red-300"
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Cerrar sesión
                  </button>
                )}
              </div>
            </div>

            {/* ── Right: Guide ───────────────────────────────── */}
            <div
              className={`md:w-[264px] shrink-0 flex flex-col max-h-60 md:max-h-none ${surfaceAlt}`}
            >
              {/* Tabs */}
              <div className={`px-4 pt-4 pb-3 border-b shrink-0 ${border}`}>
                <p
                  className={`text-[9px] font-bold uppercase tracking-widest mb-2.5 ${textFaint}`}
                >
                  Guía paso a paso
                </p>
                <div
                  className={`flex rounded-xl p-1 gap-1 ${d ? "bg-[#0a0a0a]" : "bg-[#ebebeb]"}`}
                >
                  {(["groq", "gemini"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 capitalize ${
                        tabActiva === tab
                          ? "bg-[#6841ea] text-white shadow-sm"
                          : textSec
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden min-h-0">
                {/* Image */}
                <div className="p-4">
                  {paso.imagen ? (
                    <div
                      onClick={() => abrirLightbox(pasoActivo)}
                      className={`relative rounded-xl overflow-hidden cursor-zoom-in group border ${border}`}
                      style={{
                        boxShadow: d
                          ? "0 4px 16px rgba(0,0,0,0.5)"
                          : "0 2px 10px rgba(0,0,0,0.08)",
                      }}
                    >
                      <img
                        src={paso.imagen}
                        alt={paso.titulo}
                        className="w-full h-36 object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ background: "rgba(0,0,0,0.18)" }}
                      >
                        <div className="bg-black/65 backdrop-blur-sm rounded-full p-2.5">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[9px] text-white/80 font-mono">
                        {pasoActivo + 1}/{pasos.length}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`rounded-xl border h-36 flex items-center justify-center ${border} ${d ? "bg-[#111]" : "bg-[#f0f0f0]"}`}
                    >
                      <p className={`text-xs ${textFaint}`}>
                        {paso.placeholder}
                      </p>
                    </div>
                  )}
                </div>

                {/* Step info */}
                <div className="px-4 pb-4 -mt-1">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: "linear-gradient(135deg, #5a2fd4, #7c5bf0)",
                      }}
                    >
                      {pasoActivo + 1}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-[12px] font-semibold leading-snug ${textPri}`}
                      >
                        {paso.titulo}
                      </p>
                      <p
                        className={`text-[11px] mt-1 leading-relaxed ${textSec}`}
                      >
                        {paso.descripcion}
                      </p>
                      {paso.link && (
                        <a
                          href={paso.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#6841ea] hover:text-[#8b5cf6] transition-colors group"
                        >
                          Abrir sitio
                          <ExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step nav */}
              <div className={`px-4 py-3 border-t shrink-0 ${border}`}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setPasoActivo(Math.max(0, pasoActivo - 1))}
                    disabled={pasoActivo === 0}
                    className={`p-1.5 rounded-lg transition-colors disabled:opacity-20 ${
                      d
                        ? "text-[#444] hover:text-[#aaa] hover:bg-white/5"
                        : "text-[#bbb] hover:text-[#555] hover:bg-black/5"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex gap-1.5 items-center">
                    {pasos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPasoActivo(i)}
                        className={`rounded-full transition-all duration-200 ${
                          i === pasoActivo
                            ? "w-4 h-1.5 bg-[#6841ea]"
                            : `w-1.5 h-1.5 ${d ? "bg-[#2a2a2a] hover:bg-[#444]" : "bg-[#d0d0d0] hover:bg-[#aaa]"}`
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setPasoActivo(Math.min(pasos.length - 1, pasoActivo + 1))
                    }
                    disabled={pasoActivo === pasos.length - 1}
                    className={`p-1.5 rounded-lg transition-colors disabled:opacity-20 ${
                      d
                        ? "text-[#444] hover:text-[#aaa] hover:bg-white/5"
                        : "text-[#bbb] hover:text-[#555] hover:bg-black/5"
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lightbox ───────────────────────────────────────────── */}
      {lightboxAbierto && pasoLightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/96 backdrop-blur-md"
          onClick={cerrarLightbox}
        >
          <div
            className="relative max-w-4xl w-full mx-8 md:mx-16"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={cerrarLightbox}
              className="absolute -top-11 right-0 flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-xs font-medium"
            >
              <X className="w-4 h-4" /> Cerrar
            </button>

            <div
              className="rounded-2xl overflow-hidden border border-white/8"
              style={{ boxShadow: "0 40px 120px rgba(0,0,0,0.9)" }}
            >
              <img
                src={pasoLightbox.imagen!}
                alt={pasoLightbox.titulo}
                className="w-full object-contain max-h-[65vh]"
              />
            </div>

            <div className="mt-4 flex items-end justify-between px-1">
              <div>
                <p className="text-white/90 text-sm font-semibold">
                  {pasoLightbox.titulo}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {pasoLightbox.descripcion}
                </p>
              </div>
              <span className="text-white/25 text-xs font-mono shrink-0 ml-4">
                {lightboxPaso + 1} / {pasosConImagen.length}
              </span>
            </div>

            <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1 justify-center">
              {pasosConImagen.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setLightboxPaso(i);
                    const idx = pasos.findIndex((x) => x.imagen === p.imagen);
                    if (idx >= 0) setPasoActivo(idx);
                  }}
                  className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-150 ${
                    i === lightboxPaso
                      ? "border-[#6841ea] opacity-100 scale-[1.06]"
                      : "border-transparent opacity-30 hover:opacity-65"
                  }`}
                >
                  <img
                    src={p.imagen!}
                    alt={p.titulo}
                    className="w-14 h-9 object-cover object-top"
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 px-1">
              <button
                onClick={lightboxAnterior}
                disabled={lightboxPaso === 0}
                className="flex items-center gap-1.5 text-white/40 hover:text-white disabled:opacity-15 transition-colors text-xs font-medium"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                onClick={lightboxSiguiente}
                disabled={lightboxPaso === pasosConImagen.length - 1}
                className="flex items-center gap-1.5 text-white/40 hover:text-white disabled:opacity-15 transition-colors text-xs font-medium"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
