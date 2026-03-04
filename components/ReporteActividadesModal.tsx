import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Mic,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  XCircle,
  Zap,
  MicOff,
} from "lucide-react";

import type { ActividadDiaria } from "@/lib/types";
import { guardarReporteTarde } from "@/lib/api";
import { useVoiceSynthesis } from "@/components/hooks/use-voice-synthesis";
import { useVoskRealtime } from "@/components/hooks/useVoskRealtime";

interface ReporteActividadesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  theme: "light" | "dark";
  actividadesDiarias: ActividadDiaria[];
  onGuardarReporte: () => Promise<void>;
  guardandoReporte: boolean;
  turno: "mañana" | "tarde";
  tareasSeleccionadas?: Set<string>;
  actividadesConTareas?: any[];
  tareasReportadasMap?: Map<string, any>;
  sessionId?: string | null;
}

type PasoModal =
  | "inicial"
  | "preguntando-que-hizo"
  | "escuchando-que-hizo"
  | "guardando-que-hizo"
  | "preguntando-aclaracion"
  | "escuchando-aclaracion"
  | "guardando-aclaracion"
  | "preguntando-motivo"
  | "escuchando-motivo"
  | "guardando-motivo"
  | "completado";

type EstadoTarea = "pendiente" | "completada" | "no-completada";

// ─── Constante para limitar reintentos de aclaración ─────────────────────────
const MAX_INTENTOS_ACLARACION = 2;

export function ReporteActividadesModal({
  isOpen,
  onOpenChange,
  theme,
  actividadesDiarias,
  onGuardarReporte,
  guardandoReporte,
  turno,
  tareasSeleccionadas = new Set(),
  actividadesConTareas = [],
  tareasReportadasMap = new Map(),
  sessionId,
}: ReporteActividadesModalProps) {
  const isDark = theme === "dark";

  // ==================== ESTADOS ====================
  const [paso, setPaso] = useState<PasoModal>("inicial");
  const [indiceActual, setIndiceActual] = useState(0);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [preguntaAclaracion, setPreguntaAclaracion] = useState<string | null>(
    null,
  );
  const [estadoTareas, setEstadoTareas] = useState<Map<string, EstadoTarea>>(
    new Map(),
  );
  const [indiceNoCompletada, setIndiceNoCompletada] = useState<number | null>(
    null,
  );
  const [transcriptNoCompletada, setTranscriptNoCompletada] = useState<
    string | null
  >(null);

  // ─── FIX #1: contador de intentos de aclaración ──────────────────────────
  const intentosAclaracionRef = useRef(0);

  // ==================== REFS ====================
  const isProcessingRef = useRef(false);
  // ─── Guard para ignorar callbacks async que llegan después de cerrar ──────
  const isModalOpenRef = useRef(false);
  // ─── Registro de timeouts pendientes para cancelarlos al cerrar ──────────
  const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pasoActualRef = useRef<PasoModal>(paso);
  const indiceRef = useRef(indiceActual);
  const speakRef = useRef<(text: string) => Promise<void>>(async () => {});
  const stopVoiceRef = useRef<() => void>(() => {});
  const startRecordingRef = useRef<() => void>(() => {});
  const cancelRecordingRef = useRef<() => void>(() => {});
  const voskFinalCallbackRef = useRef<(text: string) => void>(() => {});

  // ==================== HOOKS DE VOZ ====================
  const { speak: speakText, stop: stopVoice } = useVoiceSynthesis();

  const {
    status: voskStatus,
    isRecording,
    transcript: voskTranscript,
    silenceCountdown,
    startRealtime,
    stopRealtime,
    cancelRealtime,
    loadModel,
  } = useVoskRealtime({
    silenceThresholdMs: 3000,
    onFinal: (text) => voskFinalCallbackRef.current(text),
    onError: (err) => {
      if (!isModalOpenRef.current) return;
      setErrorValidacion(err.message || "Error en Vosk");
      safeTimeout(() => {
        if (!isModalOpenRef.current) return;
        setErrorValidacion(null);
        setPaso("preguntando-que-hizo");
      }, 3000);
    },
  });

  // ─── Helper: setTimeout que se auto-cancela si el modal se cerró ─────────
  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (!isModalOpenRef.current) return;
      fn();
    }, ms);
    pendingTimeoutsRef.current.push(id);
    return id;
  }, []);

  // ==================== SYNC REFS ====================
  useEffect(() => {
    isModalOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    pasoActualRef.current = paso;
  }, [paso]);
  useEffect(() => {
    indiceRef.current = indiceActual;
  }, [indiceActual]);
  useEffect(() => {
    speakRef.current = speakText;
  }, [speakText]);
  useEffect(() => {
    stopVoiceRef.current = stopVoice;
  }, [stopVoice]);
  useEffect(() => {
    startRecordingRef.current = () => startRealtime();
    cancelRecordingRef.current = () => cancelRealtime();
  }, [startRealtime, cancelRealtime]);

  const handleVoskFinal = useCallback((text: string) => {
    if (pasoActualRef.current === "escuchando-motivo") {
      procesarMotivoRef.current(text);
    } else {
      procesarRespuestaRef.current(text, pasoActualRef.current);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    voskFinalCallbackRef.current = handleVoskFinal;
  }, [handleVoskFinal]);

  useEffect(() => {
    if (isOpen && voskStatus === "idle") loadModel().catch(() => {});
  }, [isOpen, voskStatus, loadModel]);

  // ─── FIX #3: resetear TODO el estado al abrir ───────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Cancelar callbacks pendientes de la sesión anterior
      pendingTimeoutsRef.current.forEach(clearTimeout);
      pendingTimeoutsRef.current = [];

      setEstadoTareas(new Map());
      setPaso("inicial");
      setIndiceActual(0);
      setPreguntaAclaracion(null);
      setIndiceNoCompletada(null);
      setTranscriptNoCompletada(null);
      setErrorValidacion(null); // ← FIX: limpiar error de sesión anterior
      isProcessingRef.current = false;
      intentosAclaracionRef.current = 0;
    }
  }, [isOpen]);

  // ==================== TAREAS ====================
  const tareasParaReportar = useMemo(() => {
    if (tareasSeleccionadas.size > 0 && actividadesConTareas.length > 0) {
      const tareas: any[] = [];
      actividadesConTareas.forEach((revision) => {
        revision.tareasNoReportadas?.forEach((tarea: any) => {
          if (tareasSeleccionadas.has(tarea.id)) {
            tareas.push({
              pendienteId: tarea.id,
              nombre: tarea.nombre,
              descripcion: tarea.descripcion || "",
              duracionMin: tarea.duracionMin || 0,
              terminada: false,
              motivoNoCompletado: null,
              actividadId: revision.actividadId,
              completadoLocal: false,
              motivoLocal: "",
              actividadTitulo: revision.actividadTitulo,
              actividadHorario: revision.actividadHorario,
            });
          }
        });
        revision.tareasReportadas?.forEach((tarea: any) => {
          if (tareasSeleccionadas.has(tarea.id)) {
            const reporteExistente = Array.from(
              tareasReportadasMap.values(),
            ).find(
              (r) =>
                r.pendienteId === tarea.id || r.nombreTarea === tarea.nombre,
            );
            tareas.push({
              pendienteId: tarea.id,
              nombre: tarea.nombre,
              descripcion: tarea.descripcion || reporteExistente?.texto || "",
              duracionMin: tarea.duracionMin || 0,
              terminada: false,
              motivoNoCompletado: null,
              actividadId: revision.actividadId,
              completadoLocal: false,
              motivoLocal: "",
              actividadTitulo: revision.actividadTitulo,
              actividadHorario: revision.actividadHorario,
            });
          }
        });
      });
      return tareas;
    }
    return actividadesDiarias.flatMap((actividad) =>
      actividad.pendientes
        .filter((p) => p.descripcion && p.descripcion.trim().length > 0)
        .map((p) => ({
          pendienteId: p.pendienteId,
          nombre: p.nombre,
          descripcion: p.descripcion || "",
          duracionMin: p.duracionMin,
          terminada: p.terminada,
          motivoNoCompletado: p.motivoNoCompletado || null,
          actividadId: actividad.actividadId,
          completadoLocal: false,
          motivoLocal: "",
          actividadTitulo: actividad.titulo,
          actividadHorario: `${actividad.horaInicio} - ${actividad.horaFin}`,
        })),
    );
  }, [
    tareasSeleccionadas,
    actividadesConTareas,
    actividadesDiarias,
    tareasReportadasMap,
  ]);

  const tareasRef = useRef(tareasParaReportar);
  useEffect(() => {
    tareasRef.current = tareasParaReportar;
  }, [tareasParaReportar]);

  const tareaActual = tareasParaReportar[indiceActual];
  const totalTareas = tareasParaReportar.length;
  const progreso = totalTareas > 0 ? (indiceActual / totalTareas) * 100 : 0;
  const completadas = [...estadoTareas.values()].filter(
    (e) => e === "completada",
  ).length;
  const noCompletadas = [...estadoTareas.values()].filter(
    (e) => e === "no-completada",
  ).length;

  // ==================== HELPERS ====================
  const actualizarEstadoTarea = useCallback(
    (pendienteId: string, estado: EstadoTarea) => {
      setEstadoTareas((prev) => {
        const next = new Map(prev);
        next.set(pendienteId, estado);
        return next;
      });
    },
    [],
  );

  const avanzarSiguienteTarea = useCallback((indice: number) => {
    intentosAclaracionRef.current = 0; // resetear al avanzar
    if (indice + 1 < tareasRef.current.length) {
      setIndiceActual(indice + 1);
      setPaso("preguntando-que-hizo");
    } else {
      setPaso("completado");
      speakRef
        .current("¡Excelente! Has completado el reporte de todas tus tareas.")
        .catch(() => {});
    }
  }, []);

  // ─── Refs para funciones mutuas (evitar dependencias circulares) ──────────
  const procesarRespuestaRef = useRef<
    (transcript: string, paso: PasoModal) => Promise<void>
  >(async () => {});
  const procesarMotivoRef = useRef<(motivoTranscript: string) => Promise<void>>(
    async () => {},
  );

  const procesarRespuesta = useCallback(
    async (transcript: string, pasoCapturado: PasoModal) => {
      if (isProcessingRef.current) return;

      const trimmed = transcript.trim();

      // Validación frontend básica
      if (trimmed.length < 10) {
        setErrorValidacion("¿Puedes dar más detalles sobre qué hiciste?");
        safeTimeout(() => {
          setErrorValidacion(null);
          setPaso("escuchando-que-hizo");
          safeTimeout(() => startRecordingRef.current(), 500);
        }, 2000);
        return;
      }

      const frasesInvalidas = [
        "gracias",
        "ok",
        "sí",
        "no",
        "bien",
        "listo",
        "perfecto",
      ];
      if (frasesInvalidas.includes(trimmed.toLowerCase())) {
        setErrorValidacion("¿Puedes dar más detalles sobre qué hiciste?");
        safeTimeout(() => {
          setErrorValidacion(null);
          setPaso("escuchando-que-hizo");
          safeTimeout(() => startRecordingRef.current(), 500);
        }, 2500);
        return;
      }

      isProcessingRef.current = true;
      const indiceCapturado = indiceRef.current;
      const tareaCapturada = tareasRef.current[indiceCapturado];
      const esAclaracion = pasoCapturado === "escuchando-aclaracion";

      try {
        setPaso(esAclaracion ? "guardando-aclaracion" : "guardando-que-hizo");

        const data = await guardarReporteTarde({
          sessionId: sessionId ?? null,
          actividadId: tareaCapturada.actividadId,
          pendienteId: tareaCapturada.pendienteId,
          queHizo: transcript,
        });

        if (!data.success) throw new Error(data.error || "Error al guardar");

        // ─── FIX #4: condición original era código muerto (backend retorna
        // completada:null cuando hay baja confianza, nunca completada:false).
        // Unificamos la lógica de "requiere aclaración" en un solo bloque. ───
        const necesitaAclaracion =
          data.requiereMejora === true || data.completada === null;

        if (necesitaAclaracion) {
          // ─── FIX #5: limitar intentos de aclaración ───────────────────────
          intentosAclaracionRef.current += 1;

          if (intentosAclaracionRef.current > MAX_INTENTOS_ACLARACION) {
            // Demasiados intentos → forzar flujo "no completada" para no bloquear
            stopVoiceRef.current();
            setIndiceNoCompletada(indiceCapturado);
            setTranscriptNoCompletada(transcript);
            setPaso("preguntando-motivo");
            const texto =
              "No pude entender bien tu respuesta. ¿Cuál fue el motivo por el que no completaste la tarea?";
            speakRef
              .current(texto)
              .then(() => {
                if (pasoActualRef.current === "preguntando-motivo") {
                  setPaso("escuchando-motivo");
                  setTimeout(() => startRecordingRef.current(), 400);
                }
              })
              .catch(() => {});
            return;
          }

          setPreguntaAclaracion(
            data.preguntaAclaracion ||
              "No entendí bien tu respuesta. ¿Puedes explicar qué hiciste en esta tarea?",
          );
          setPaso("preguntando-aclaracion");
          return;
        }

        // Respuesta válida: ¿completada o no?
        if (data.completada) {
          intentosAclaracionRef.current = 0;
          actualizarEstadoTarea(tareaCapturada.pendienteId, "completada");
          speakRef.current("Perfecto, tarea completada.").catch(() => {});
          safeTimeout(() => avanzarSiguienteTarea(indiceCapturado), 1500);
        } else {
          // Tarea no completada
          stopVoiceRef.current();
          setIndiceNoCompletada(indiceCapturado);
          setTranscriptNoCompletada(transcript);

          if (data.motivoYaCapturado) {
            // El backend ya extrajo el motivo del texto → no preguntar
            actualizarEstadoTarea(tareaCapturada.pendienteId, "no-completada");
            speakRef
              .current("Entendido, registrado. Pasamos a la siguiente tarea.")
              .catch(() => {});
            setIndiceNoCompletada(null);
            setTranscriptNoCompletada(null);
            safeTimeout(() => avanzarSiguienteTarea(indiceCapturado), 1500);
            return;
          }

          setPaso("preguntando-motivo");
          const texto =
            "¿Cuál fue el motivo por el que no pudiste completar la tarea?";
          speakRef
            .current(texto)
            .then(() => {
              if (pasoActualRef.current === "preguntando-motivo") {
                setPaso("escuchando-motivo");
                setTimeout(() => startRecordingRef.current(), 400);
              }
            })
            .catch(() => {});
        }
      } catch (error) {
        setErrorValidacion("Hubo un problema. Inténtalo de nuevo.");
        safeTimeout(() => {
          setErrorValidacion(null);
          setPaso("preguntando-que-hizo");
        }, 3000);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [actualizarEstadoTarea, avanzarSiguienteTarea],
  );

  const procesarMotivo = useCallback(
    async (motivoTranscript: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      const indiceCapturado = indiceNoCompletada ?? indiceRef.current;
      const tareaCapturada = tareasRef.current[indiceCapturado];

      try {
        setPaso("guardando-motivo");
        await guardarReporteTarde({
          actividadId: tareaCapturada.actividadId,
          pendienteId: tareaCapturada.pendienteId,
          queHizo: transcriptNoCompletada || "",
          motivoNoCompletado: motivoTranscript.trim(),
          soloGuardarMotivo: true,
        });
        actualizarEstadoTarea(tareaCapturada.pendienteId, "no-completada");
        speakRef
          .current("Entendido, registrado. Pasamos a la siguiente tarea.")
          .catch(() => {});
        setIndiceNoCompletada(null);
        setTranscriptNoCompletada(null);
        safeTimeout(() => avanzarSiguienteTarea(indiceCapturado), 1500);
      } catch {
        setErrorValidacion("Hubo un problema al guardar. Intenta de nuevo.");
        safeTimeout(() => {
          setErrorValidacion(null);
          setPaso("escuchando-motivo");
          safeTimeout(() => startRecordingRef.current(), 500);
        }, 3000);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [
      indiceNoCompletada,
      transcriptNoCompletada,
      actualizarEstadoTarea,
      avanzarSiguienteTarea,
    ],
  );

  // Mantener refs actualizados para el callback de Vosk
  useEffect(() => {
    procesarRespuestaRef.current = procesarRespuesta;
  }, [procesarRespuesta]);
  useEffect(() => {
    procesarMotivoRef.current = procesarMotivo;
  }, [procesarMotivo]);

  const reintentarExplicacion = () => {
    cancelRecordingRef.current();
    stopVoiceRef.current();
    intentosAclaracionRef.current = 0; // resetear intentos al reintentar
    setIndiceNoCompletada(null);
    setTranscriptNoCompletada(null);
    setPaso("preguntando-que-hizo");
  };

  // ─── FIX #6: iniciarReporte también resetea isProcessingRef ──────────────
  const iniciarReporte = () => {
    if (totalTareas === 0) return;
    isProcessingRef.current = false; // ← FIX
    intentosAclaracionRef.current = 0; // ← FIX
    setIndiceActual(0);
    setEstadoTareas(new Map());
    setPaso("preguntando-que-hizo");
  };

  const handleCancelar = () => {
    // Cancelar todos los timeouts pendientes para que no muten estado al reabrir
    pendingTimeoutsRef.current.forEach(clearTimeout);
    pendingTimeoutsRef.current = [];

    isProcessingRef.current = false;
    intentosAclaracionRef.current = 0;
    stopRealtime();
    cancelRecordingRef.current();
    stopVoiceRef.current();
    onOpenChange(false);
    setPaso("inicial");
    setEstadoTareas(new Map());
    setPreguntaAclaracion(null);
    setIndiceNoCompletada(null);
    setTranscriptNoCompletada(null);
    setErrorValidacion(null); // ← FIX: limpiar error para que no persista al reabrir
  };

  // ==================== EFFECTS DE VOZ ====================
  useEffect(() => {
    if (paso !== "preguntando-que-hizo" || !isOpen) return;
    const tarea = tareasRef.current[indiceRef.current];
    if (!tarea) return;
    const total = tareasRef.current.length;
    const tieneResumen = tarea.resumen?.trim();
    const texto = tieneResumen
      ? `Tarea ${indiceRef.current + 1} de ${total}: ${tarea.nombre}. ${tarea.resumen} ¿Quieres agregar algo más o confirmar?`
      : `Tarea ${indiceRef.current + 1} de ${total}: ${tarea.nombre}. ¿Qué hiciste en esta tarea?`;

    let cancelled = false;

    // ─── FIX: esperar a que el TTS termine (Promise) en lugar de un timer ───
    // Así el micrófono nunca interrumpe al bot aunque la voz sea lenta/rápida.
    speakRef
      .current(texto)
      .then(() => {
        if (cancelled) return;
        if (pasoActualRef.current !== "preguntando-que-hizo") return;
        setPaso("escuchando-que-hizo");
        setTimeout(() => {
          if (pasoActualRef.current === "escuchando-que-hizo")
            startRecordingRef.current();
        }, 400);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      // ─── FIX: NO llamar stopVoiceRef aquí — el cleanup se dispara en cada
      // re-render con deps cambiadas (ej. Vosk status) y cortaría el TTS.
      // El stop explícito solo ocurre en handleCancelar e isOpen=false.
    };
  }, [paso, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (paso !== "preguntando-aclaracion" || !isOpen || !preguntaAclaracion)
      return;

    let cancelled = false;

    speakRef
      .current(preguntaAclaracion)
      .then(() => {
        if (cancelled) return;
        if (pasoActualRef.current !== "preguntando-aclaracion") return;
        setPaso("escuchando-aclaracion");
        setTimeout(() => {
          if (pasoActualRef.current === "escuchando-aclaracion")
            startRecordingRef.current();
        }, 400);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      // ─── FIX: mismo motivo — NO detener voz en cleanup ───────────────────
    };
  }, [paso, isOpen, preguntaAclaracion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) {
      cancelRecordingRef.current();
      stopVoiceRef.current();
    }
  }, [isOpen]);

  // ==================== MIC PANEL ====================
  const MicPanel = ({
    color = "primary",
  }: {
    color?: "primary" | "warning" | "danger";
  }) => {
    const styles = {
      primary: {
        bg: isDark ? "bg-violet-500/10" : "bg-violet-50",
        border: isDark ? "border-violet-500/30" : "border-violet-200",
        iconColor: "text-violet-500",
        ringColor: isDark ? "border-violet-400" : "border-violet-500",
        dotColor: "bg-violet-500",
        countdownBg: isDark
          ? "bg-violet-950/50 border-violet-800/60 text-violet-300"
          : "bg-violet-50 border-violet-300 text-violet-700",
        transcriptBg: isDark
          ? "bg-white/5 border-white/10 text-gray-300"
          : "bg-white border-gray-200 text-gray-700",
      },
      warning: {
        bg: isDark ? "bg-amber-500/10" : "bg-amber-50",
        border: isDark ? "border-amber-500/30" : "border-amber-200",
        iconColor: "text-amber-500",
        ringColor: isDark ? "border-amber-400" : "border-amber-500",
        dotColor: "bg-amber-500",
        countdownBg: isDark
          ? "bg-amber-950/50 border-amber-800/60 text-amber-300"
          : "bg-amber-50 border-amber-300 text-amber-700",
        transcriptBg: isDark
          ? "bg-white/5 border-white/10 text-gray-300"
          : "bg-white border-gray-200 text-gray-700",
      },
      danger: {
        bg: isDark ? "bg-red-500/10" : "bg-red-50",
        border: isDark ? "border-red-500/30" : "border-red-200",
        iconColor: "text-red-500",
        ringColor: isDark ? "border-red-400" : "border-red-500",
        dotColor: "bg-red-500",
        countdownBg: isDark
          ? "bg-red-950/50 border-red-800/60 text-red-300"
          : "bg-red-50 border-red-300 text-red-700",
        transcriptBg: isDark
          ? "bg-white/5 border-white/10 text-gray-300"
          : "bg-white border-gray-200 text-gray-700",
      },
    }[color];

    return (
      <div
        className={`rounded-2xl border p-5 space-y-4 ${styles.bg} ${styles.border}`}
      >
        <div className="flex items-center gap-4">
          {/* Mic icon with pulse rings */}
          <div className="relative w-14 h-14 flex-shrink-0">
            {isRecording && (
              <>
                <span
                  className={`absolute inset-0 rounded-full border-2 ${styles.ringColor} animate-ping opacity-30`}
                />
                <span
                  className={`absolute inset-[-6px] rounded-full border ${styles.ringColor} animate-pulse opacity-20`}
                />
              </>
            )}
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${styles.bg} ${styles.border}`}
            >
              {isRecording ? (
                <Mic className={`w-6 h-6 ${styles.iconColor}`} />
              ) : (
                <MicOff
                  className={`w-6 h-6 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {voskStatus === "loading"
                ? "Cargando modelo..."
                : isRecording
                  ? "Escuchando..."
                  : "Preparando..."}
            </p>
            <p
              className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              {isRecording
                ? "Silencio de 3s para enviar automáticamente"
                : "El micrófono se activará en un momento"}
            </p>

            {/* ─── FIX #8: audio bars sin Math.random() — solo CSS animation ── */}
            {isRecording && (
              <div className="flex items-end gap-0.5 mt-2 h-4">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full ${styles.dotColor} opacity-70`}
                    style={{
                      height: "100%",
                      animation: `audioBar ${0.4 + i * 0.07}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live transcript */}
        {voskTranscript && isRecording && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles.transcriptBg}`}
          >
            <span
              className={`text-xs font-bold uppercase tracking-wider mr-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}
            >
              En vivo
            </span>
            <span className="italic">{voskTranscript}</span>
          </div>
        )}

        {/* Silence countdown */}
        {silenceCountdown !== null && (
          <div
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full border text-xs font-bold ${styles.countdownBg}`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${styles.dotColor} animate-ping`}
            />
            Enviando en {silenceCountdown}s...
          </div>
        )}
      </div>
    );
  };

  // ==================== TASK CARD ====================
  const TaskCard = () => {
    if (!tareaActual || paso === "inicial" || paso === "completado")
      return null;
    const estadoTarea = estadoTareas.get(tareaActual.pendienteId);

    return (
      <div
        className={`rounded-2xl border overflow-hidden ${
          estadoTarea === "completada"
            ? isDark
              ? "bg-emerald-950/30 border-emerald-700/40"
              : "bg-emerald-50 border-emerald-200"
            : estadoTarea === "no-completada"
              ? isDark
                ? "bg-red-950/30 border-red-700/40"
                : "bg-red-50 border-red-200"
              : isDark
                ? "bg-white/5 border-white/10"
                : "bg-white border-gray-200"
        }`}
      >
        {/* Task number strip */}
        <div
          className={`px-4 py-2 flex items-center justify-between text-xs font-bold ${
            estadoTarea === "completada"
              ? isDark
                ? "bg-emerald-900/40 text-emerald-400"
                : "bg-emerald-100 text-emerald-700"
              : estadoTarea === "no-completada"
                ? isDark
                  ? "bg-red-900/40 text-red-400"
                  : "bg-red-100 text-red-700"
                : isDark
                  ? "bg-white/5 text-gray-400"
                  : "bg-gray-50 text-gray-500"
          }`}
        >
          <span>
            TAREA {indiceActual + 1} DE {totalTareas}
          </span>
          {estadoTarea === "completada" && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> COMPLETADA
            </span>
          )}
          {estadoTarea === "no-completada" && (
            <span className="flex items-center gap-1">
              <XCircle className="w-3 h-3" /> NO COMPLETADA
            </span>
          )}
        </div>

        {/* Task content */}
        <div className="px-4 py-3">
          <h4
            className={`font-bold text-sm leading-snug ${isDark ? "text-white" : "text-gray-900"}`}
          >
            {tareaActual.nombre}
          </h4>
          {tareaActual.descripcion?.trim() && (
            <p
              className={`text-xs mt-1 leading-relaxed line-clamp-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              {tareaActual.descripcion}
            </p>
          )}
          <div
            className={`flex items-center gap-3 mt-2 text-[10px] font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}
          >
            <span className="truncate max-w-[160px]">
              {tareaActual.actividadTitulo}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 flex-shrink-0">
              <Clock className="w-2.5 h-2.5" />
              {tareaActual.duracionMin} min
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ==================== RENDER ====================
  return (
    <>
      <style>{`
        @keyframes audioBar {
          from { transform: scaleY(0.15); }
          to   { transform: scaleY(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-slide-up { animation: fadeSlideUp 0.25s ease forwards; }
      `}</style>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelar();
          else onOpenChange(true);
        }}
      >
        <DialogContent
          className={`max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border shadow-2xl p-0 gap-0 ${
            isDark ? "bg-[#111113] border-white/10" : "bg-white border-gray-200"
          }`}
        >
          {/* ── HEADER ── */}
          <DialogHeader
            className={`px-5 pt-5 pb-4 border-b flex-shrink-0 ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isDark
                      ? "bg-orange-500/15 border border-orange-500/20"
                      : "bg-orange-50 border border-orange-200"
                  }`}
                >
                  <Mic className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <DialogTitle
                    className={`text-sm font-bold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {turno === "tarde"
                      ? "Explicación de Tareas"
                      : "Reporte de Actividades"}
                  </DialogTitle>
                  <p
                    className={`text-[11px] mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    {turno === "tarde"
                      ? "Explica lo que hiciste en cada tarea"
                      : "Reporta tu progreso del día"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Vosk status pill */}
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    voskStatus === "ready"
                      ? isDark
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : voskStatus === "loading"
                        ? isDark
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                        : isDark
                          ? "bg-white/5 text-gray-500 border-white/10"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}
                >
                  {voskStatus === "loading" ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <Zap className="w-2.5 h-2.5" />
                  )}
                  {voskStatus === "ready"
                    ? "Vosk listo"
                    : voskStatus === "loading"
                      ? "Cargando..."
                      : "Vosk"}
                </span>

                {paso !== "inicial" && paso !== "completado" && (
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-600"}`}
                  >
                    {indiceActual + 1} / {totalTareas}
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {paso !== "inicial" && paso !== "completado" && (
              <div
                className={`mt-3 h-1 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-100"}`}
              >
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700 ease-out rounded-full"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            )}
          </DialogHeader>

          {/* ── BODY ── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* ══ INICIAL ══ */}
            {paso === "inicial" && (
              <div className="fade-slide-up space-y-4">
                <div
                  className={`rounded-2xl border p-4 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-gray-50 border-gray-200"}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {turno === "tarde"
                        ? "Tareas a explicar"
                        : "Tareas a reportar"}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                      {totalTareas} tareas
                    </span>
                  </div>

                  {totalTareas > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto [scrollbar-width:none]">
                      {tareasParaReportar.map((tarea, i) => (
                        <div
                          key={tarea.pendienteId}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs ${isDark ? "bg-white/5" : "bg-white border border-gray-100"}`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-600"}`}
                          >
                            {i + 1}
                          </span>
                          <span
                            className={`font-medium truncate ${isDark ? "text-gray-300" : "text-gray-700"}`}
                          >
                            {tarea.nombre}
                          </span>
                          <span
                            className={`ml-auto flex-shrink-0 flex items-center gap-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {tarea.duracionMin}m
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <AlertCircle
                        className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-gray-600" : "text-gray-400"}`}
                      />
                      <p
                        className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}
                      >
                        No hay tareas para reportar
                      </p>
                    </div>
                  )}
                </div>

                {/* Vosk status */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs ${
                    voskStatus === "ready"
                      ? isDark
                        ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-400"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : voskStatus === "loading"
                        ? isDark
                          ? "bg-amber-950/30 border-amber-800/40 text-amber-400"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                        : voskStatus === "error"
                          ? isDark
                            ? "bg-red-950/30 border-red-800/40 text-red-400"
                            : "bg-red-50 border-red-200 text-red-600"
                          : isDark
                            ? "bg-white/5 border-white/10 text-gray-500"
                            : "bg-gray-50 border-gray-200 text-gray-500"
                  }`}
                >
                  {voskStatus === "loading" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  ) : voskStatus === "ready" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : voskStatus === "error" ? (
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span className="font-medium">
                    {voskStatus === "loading"
                      ? "Cargando modelo Vosk (~30 MB)..."
                      : voskStatus === "ready"
                        ? "Modelo listo · Procesamiento 100% local"
                        : voskStatus === "error"
                          ? "Error al cargar Vosk"
                          : "Preparando Vosk..."}
                  </span>
                </div>

                {totalTareas > 0 && (
                  <Button
                    onClick={iniciarReporte}
                    disabled={
                      voskStatus === "loading" || voskStatus === "error"
                    }
                    className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:shadow-none transition-all"
                  >
                    {voskStatus === "loading" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                        Cargando Vosk...
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />{" "}
                        {turno === "tarde"
                          ? "Iniciar explicación"
                          : "Iniciar reporte"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* ══ HISTORIAL ══ */}
            {paso !== "inicial" &&
              paso !== "completado" &&
              indiceActual > 0 && (
                <div
                  className={`rounded-xl border overflow-hidden ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
                >
                  <div
                    className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? "bg-white/5 text-gray-500" : "bg-gray-50 text-gray-400"}`}
                  >
                    Anteriores
                  </div>
                  {tareasParaReportar.slice(0, indiceActual).map((tarea, i) => {
                    const estado = estadoTareas.get(tarea.pendienteId);
                    return (
                      <div
                        key={tarea.pendienteId}
                        className={`flex items-center justify-between px-3 py-2 border-t text-xs ${isDark ? "border-white/[0.04]" : "border-gray-50"}`}
                      >
                        <span
                          className={`truncate max-w-[70%] ${isDark ? "text-gray-400" : "text-gray-600"}`}
                        >
                          <span className="font-bold mr-1.5">{i + 1}.</span>
                          {tarea.nombre}
                        </span>
                        {estado === "completada" && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>
                        )}
                        {estado === "no-completada" && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                            <XCircle className="w-3 h-3" /> Sin completar
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            {/* ══ TAREA ACTUAL ══ */}
            <TaskCard />

            {/* ══ ESTADOS DE VOZ ══ */}
            {paso === "preguntando-que-hizo" && (
              <div
                className={`fade-slide-up flex items-center gap-3 px-4 py-3 rounded-xl border ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}
              >
                <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" />
                <p
                  className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  El asistente está hablando...
                </p>
              </div>
            )}

            {paso === "escuchando-que-hizo" && (
              <div className="fade-slide-up">
                <MicPanel color="primary" />
              </div>
            )}

            {(paso === "guardando-que-hizo" ||
              paso === "guardando-aclaracion") && (
              <div
                className={`fade-slide-up flex items-center gap-3 px-4 py-3 rounded-xl border ${isDark ? "bg-violet-950/30 border-violet-800/40" : "bg-violet-50 border-violet-200"}`}
              >
                <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
                <p
                  className={`text-xs font-medium ${isDark ? "text-violet-400" : "text-violet-700"}`}
                >
                  Analizando respuesta con IA...
                </p>
              </div>
            )}

            {paso === "preguntando-aclaracion" && (
              <div
                className={`fade-slide-up rounded-xl border p-4 space-y-2 ${isDark ? "bg-amber-950/30 border-amber-800/40" : "bg-amber-50 border-amber-200"}`}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p
                    className={`text-xs font-bold ${isDark ? "text-amber-400" : "text-amber-700"}`}
                  >
                    Necesitamos más detalle
                    {intentosAclaracionRef.current > 0 && (
                      <span
                        className={`ml-2 font-normal ${isDark ? "text-amber-600" : "text-amber-500"}`}
                      >
                        (intento {intentosAclaracionRef.current}/
                        {MAX_INTENTOS_ACLARACION})
                      </span>
                    )}
                  </p>
                </div>
                {preguntaAclaracion && (
                  <p
                    className={`text-xs italic pl-6 ${isDark ? "text-amber-300/70" : "text-amber-600"}`}
                  >
                    "{preguntaAclaracion}"
                  </p>
                )}
              </div>
            )}

            {paso === "escuchando-aclaracion" && (
              <div className="fade-slide-up">
                <MicPanel color="warning" />
              </div>
            )}

            {paso === "preguntando-motivo" && (
              <div
                className={`fade-slide-up flex items-center gap-3 px-4 py-3 rounded-xl border ${isDark ? "bg-red-950/30 border-red-800/40" : "bg-red-50 border-red-200"}`}
              >
                <Loader2 className="w-4 h-4 text-red-500 animate-spin flex-shrink-0" />
                <p
                  className={`text-xs font-medium ${isDark ? "text-red-400" : "text-red-600"}`}
                >
                  Preguntando el motivo...
                </p>
              </div>
            )}

            {(paso === "escuchando-motivo" || paso === "guardando-motivo") && (
              <div className="fade-slide-up space-y-3">
                {paso === "escuchando-motivo" && <MicPanel color="danger" />}
                {paso === "guardando-motivo" && (
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isDark ? "bg-red-950/30 border-red-800/40" : "bg-red-50 border-red-200"}`}
                  >
                    <Loader2 className="w-4 h-4 text-red-500 animate-spin flex-shrink-0" />
                    <p
                      className={`text-xs font-medium ${isDark ? "text-red-400" : "text-red-600"}`}
                    >
                      Guardando motivo...
                    </p>
                  </div>
                )}
                {paso === "escuchando-motivo" && (
                  <button
                    onClick={reintentarExplicacion}
                    className="w-full text-[11px] text-orange-500 hover:text-orange-400 font-medium transition-colors"
                  >
                    ¿Sí la completaste? → Volver a explicar
                  </button>
                )}
              </div>
            )}

            {/* ══ COMPLETADO ══ */}
            {paso === "completado" && (
              <div className="fade-slide-up space-y-4">
                <div className="text-center py-4">
                  <div
                    className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 ${isDark ? "bg-emerald-950/50 border-2 border-emerald-700/50" : "bg-emerald-50 border-2 border-emerald-200"}`}
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3
                    className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    ¡Reporte completado!
                  </h3>
                  <p
                    className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    Todas las tareas han sido procesadas
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`rounded-xl border p-3 text-center ${isDark ? "bg-emerald-950/30 border-emerald-800/40" : "bg-emerald-50 border-emerald-200"}`}
                  >
                    <p
                      className={`text-2xl font-bold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}
                    >
                      {completadas}
                    </p>
                    <p
                      className={`text-[10px] font-medium mt-0.5 ${isDark ? "text-emerald-600" : "text-emerald-500"}`}
                    >
                      Completadas
                    </p>
                  </div>
                  <div
                    className={`rounded-xl border p-3 text-center ${isDark ? "bg-red-950/30 border-red-800/40" : "bg-red-50 border-red-200"}`}
                  >
                    <p
                      className={`text-2xl font-bold ${isDark ? "text-red-400" : "text-red-600"}`}
                    >
                      {noCompletadas}
                    </p>
                    <p
                      className={`text-[10px] font-medium mt-0.5 ${isDark ? "text-red-600" : "text-red-500"}`}
                    >
                      No completadas
                    </p>
                  </div>
                </div>

                <div
                  className={`rounded-xl border overflow-hidden ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
                >
                  <div
                    className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? "bg-white/5 text-gray-500" : "bg-gray-50 text-gray-400"}`}
                  >
                    Resumen
                  </div>
                  {tareasParaReportar.map((tarea, i) => {
                    const estado = estadoTareas.get(tarea.pendienteId);
                    return (
                      <div
                        key={tarea.pendienteId}
                        className={`flex items-center justify-between px-3 py-2.5 border-t text-xs ${isDark ? "border-white/[0.04]" : "border-gray-50"}`}
                      >
                        <span
                          className={`truncate max-w-[70%] ${isDark ? "text-gray-300" : "text-gray-700"}`}
                        >
                          <span
                            className={`font-bold mr-1.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                          >
                            {i + 1}.
                          </span>
                          {tarea.nombre}
                        </span>
                        {estado === "completada" && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>
                        )}
                        {estado === "no-completada" && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                            <XCircle className="w-3 h-3" /> Pendiente
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={() => onOpenChange(false)}
                  className="w-full h-10 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Cerrar
                </Button>
              </div>
            )}

            {/* ══ ERROR ══ */}
            {errorValidacion && (
              <div
                className={`fade-slide-up flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-medium ${
                  isDark
                    ? "bg-red-950/40 border-red-800/50 text-red-400"
                    : "bg-red-50 border-red-200 text-red-600"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errorValidacion}
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          {paso !== "inicial" && paso !== "completado" && (
            <div
              className={`px-5 py-3 border-t flex-shrink-0 ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
            >
              <Button
                variant="ghost"
                onClick={handleCancelar}
                className={`w-full h-9 rounded-xl text-xs font-semibold ${isDark ? "text-gray-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
              >
                <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar reporte
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
