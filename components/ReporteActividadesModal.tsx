import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Mic,
  X,
  CheckCircle2,
  Loader2,
  Send,
  AlertCircle,
} from "lucide-react";

import type { ActividadDiaria } from "@/lib/types";
import { guardarReporteTarde } from "@/lib/api";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { transcribirAudioCliente } from "@/lib/transcription";
import { useAutoSendVoice } from "@/components/Audio/UseAutoSendVoiceOptions";

interface ReporteActividadesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  theme: "light" | "dark";
  actividadesDiarias: ActividadDiaria[];
  stopVoice: () => void;
  isSpeaking: boolean;
  onGuardarReporte: () => Promise<void>;
  guardandoReporte: boolean;
  speakText: (text: string) => void;
}

type PasoModal =
  | "inicial"
  | "preguntando-que-hizo"
  | "escuchando-que-hizo"
  | "guardando-que-hizo"
  | "preguntando-motivo"
  | "escuchando-motivo"
  | "guardando-motivo"
  | "completado";

export function ReporteActividadesModal({
  isOpen,
  onOpenChange,
  theme,
  actividadesDiarias,
  stopVoice,
  isSpeaking,
  onGuardarReporte,
  guardandoReporte,
  speakText,
}: ReporteActividadesModalProps) {
  // ==================== ESTADOS ====================
  const [paso, setPaso] = useState<PasoModal>("inicial");
  const [indiceActual, setIndiceActual] = useState(0);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  // ==================== REFS ====================
  const isProcessingRef = useRef(false);

  // ==================== HOOKS ====================
  const audioRecorder = useAudioRecorder();

  // ==================== REFS PARA CAPTURAR PASO ====================
  const pasoActualRef = useRef<PasoModal>(paso);

  // Sincronizar el paso actual con el ref
  useEffect(() => {
    pasoActualRef.current = paso;
  }, [paso]);

  // USAR EL HOOK useAutoSendVoice
  const {
    isRecording,
    isTranscribing,
    audioLevel,
    startVoiceRecording,
    cancelVoiceRecording,
    cleanup,
  } = useAutoSendVoice({
    silenceThreshold: 3000, // 3 segundos de silencio
    speechThreshold: 8,
    transcriptionService: transcribirAudioCliente,
    stopRecording: audioRecorder.stopRecording,
    startRecording: audioRecorder.startRecording,
    onTranscriptionComplete: async (transcript) => {
      await procesarRespuesta(transcript, pasoActualRef.current);
    },
    onError: (error) => {
      setErrorValidacion(error.message || "Error al procesar el audio");

      const pasoActualCapturado = pasoActualRef.current;
      setTimeout(() => {
        setErrorValidacion(null);
        setPaso(
          pasoActualCapturado === "escuchando-que-hizo"
            ? "preguntando-que-hizo"
            : "preguntando-motivo",
        );
      }, 3000);
    },
  });

  // ==================== TAREAS FILTRADAS ====================
  const tareasConDescripcion = actividadesDiarias.flatMap((actividad) =>
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

  const tareaActual = tareasConDescripcion[indiceActual];
  const totalTareas = tareasConDescripcion.length;
  const progreso = totalTareas > 0 ? (indiceActual / totalTareas) * 100 : 0;

  // ==================== PROCESAR RESPUESTA ====================
  const procesarRespuesta = async (
    transcript: string,
    pasoCapturado: PasoModal,
  ) => {
    if (isProcessingRef.current) {
      return;
    }

    if (transcript.length < 3) {
      setErrorValidacion("La respuesta es muy corta.");
      setTimeout(() => {
        setErrorValidacion(null);
        setPaso(
          pasoCapturado === "escuchando-que-hizo"
            ? "preguntando-que-hizo"
            : "preguntando-motivo",
        );
      }, 2000);
      return;
    }

    isProcessingRef.current = true;

    try {
      if (pasoCapturado === "escuchando-que-hizo") {
        setPaso("guardando-que-hizo");

        const payload = {
          actividadId: tareaActual.actividadId,
          pendienteId: tareaActual.pendienteId,
          queHizo: transcript,
        };

        const data = await guardarReporteTarde(payload);

        if (data.success) {
          if (data.completada) {
            speakText("Perfecto. Siguiente tarea.");
            setTimeout(() => avanzarSiguienteTarea(), 1500);
          } else {
            setPaso("preguntando-motivo");
            setTimeout(() => {
              speakText(`¿Por qué no completaste esta tarea?`);
              setTimeout(() => {
                setPaso("escuchando-motivo");
                startVoiceRecording();
              }, 1800);
            }, 500);
          }
        } else {
          throw new Error(data.error || "Error al guardar");
        }
      } else if (pasoCapturado === "escuchando-motivo") {
        setPaso("guardando-motivo");

        const payload = {
          pendienteId: tareaActual.pendienteId,
          actividadId: tareaActual.actividadId,
          motivo: transcript,
        };

        const response = await fetch("/api/reporte/guardar-motivo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.success) {
          speakText("Entendido. Siguiente.");
          setTimeout(() => avanzarSiguienteTarea(), 1500);
        } else {
          throw new Error(data.error || "Error al guardar motivo");
        }
      } else {
      }
    } catch (error) {
      setErrorValidacion("Hubo un problema. Inténtalo de nuevo.");
      setTimeout(() => {
        setErrorValidacion(null);
        setPaso(
          pasoCapturado === "escuchando-que-hizo"
            ? "preguntando-que-hizo"
            : "preguntando-motivo",
        );
      }, 3000);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const avanzarSiguienteTarea = () => {
    if (indiceActual + 1 < totalTareas) {
      setIndiceActual((prev) => prev + 1);
      setPaso("preguntando-que-hizo");
    } else {
      setPaso("completado");
      speakText("¡Excelente! Has completado el reporte de todas tus tareas.");
    }
  };

  const iniciarReporte = () => {
    if (totalTareas === 0) {
      alert("No hay tareas con descripción para reportar");
      return;
    }

    setPaso("preguntando-que-hizo");
    setIndiceActual(0);
  };

  const handleCancelar = async () => {
    await cancelVoiceRecording();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopVoice();
    onOpenChange(false);
    setPaso("inicial");
  };

  // ==================== EFECTOS ====================
  useEffect(() => {
    let active = true;

    if (paso === "preguntando-que-hizo" && tareaActual && isOpen) {
      const textoPrompt = `Tarea ${indiceActual + 1} de ${totalTareas}: ${tareaActual.nombre}. ¿Qué hiciste hoy?`;

      if (window.speechSynthesis) window.speechSynthesis.cancel();
      speakText(textoPrompt);

      const palabras = textoPrompt.split(" ").length;
      const tiempoEstimado = palabras * 450 + 1000;

      const timer = setTimeout(() => {
        if (active && paso === "preguntando-que-hizo") {
          setPaso("escuchando-que-hizo");
          startVoiceRecording();
        }
      }, tiempoEstimado);

      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [paso, indiceActual, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      cancelVoiceRecording();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // ==================== RENDER ====================
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancelar();
        else onOpenChange(true);
      }}
    >
      <DialogContent
        className={`max-w-2xl max-h-[85vh] overflow-hidden flex flex-col ${
          theme === "dark"
            ? "bg-[#1a1a1a] border-[#2a2a2a]"
            : "bg-white border-gray-200"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#6841ea]" />
              Reporte de Actividades del Día
            </div>
            {paso !== "inicial" && paso !== "completado" && (
              <Badge variant="outline">
                Tarea {indiceActual + 1} de {totalTareas}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* ========== PASO: INICIAL ========== */}
          {paso === "inicial" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg border ${
                  theme === "dark"
                    ? "bg-[#252527] border-[#2a2a2a]"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Tareas a reportar</span>
                  <Badge>{totalTareas} tareas</Badge>
                </div>
                <p className="text-sm text-gray-500">
                  El asistente te preguntará qué hiciste en cada tarea. Responde
                  con voz.
                </p>
              </div>

              {totalTareas === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    No hay tareas con descripción para reportar hoy.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={iniciarReporte}
                  className="w-full bg-[#6841ea] hover:bg-[#5a36d4] h-12"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Iniciar Reporte por Voz
                </Button>
              )}
            </div>
          )}

          {/* ========== BARRA DE PROGRESO ========== */}
          {paso !== "inicial" && paso !== "completado" && (
            <div className="mb-6">
              <div className="w-full h-2 bg-gray-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6841ea] transition-all duration-300"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>
          )}

          {/* ========== TAREA ACTUAL ========== */}
          {tareaActual && paso !== "inicial" && paso !== "completado" && (
            <div
              className={`p-4 rounded-lg border mb-6 ${
                theme === "dark"
                  ? "bg-[#252527] border-[#2a2a2a]"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                    theme === "dark"
                      ? "bg-[#6841ea]/20 text-[#6841ea]"
                      : "bg-[#6841ea]/10 text-[#6841ea]"
                  }`}
                >
                  {indiceActual + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold mb-1">{tareaActual.nombre}</h4>
                  <p className="text-sm text-gray-500 mb-2">
                    {tareaActual.descripcion}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{tareaActual.actividadTitulo}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tareaActual.duracionMin} min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== PASO: PREGUNTANDO QUÉ HIZO ========== */}
          {paso === "preguntando-que-hizo" && (
            <div className="text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                El asistente está hablando...
              </p>
            </div>
          )}

          {/* ========== PASO: ESCUCHANDO QUÉ HIZO ========== */}
          {paso === "escuchando-que-hizo" && (
            <div className="text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                  <Mic className="w-10 h-10 text-red-500" />
                </div>

                {/* Círculo de nivel de audio */}
                <div
                  className="absolute inset-0 rounded-full border-4 border-red-500 transition-all"
                  style={{
                    transform: `scale(${1 + audioLevel / 200})`,
                    opacity: audioLevel / 100,
                  }}
                />
              </div>

              <p className="text-sm text-gray-500">
                {isRecording
                  ? "Escuchando... (Deja de hablar 3 segundos para enviar automáticamente)"
                  : isTranscribing
                    ? "Procesando audio..."
                    : "Preparando micrófono..."}
              </p>

              {isRecording && (
                <div className="text-xs text-gray-400">
                  Nivel de audio: {audioLevel.toFixed(0)}%
                </div>
              )}
            </div>
          )}

          {/* ========== PASO: GUARDANDO QUÉ HIZO ========== */}
          {paso === "guardando-que-hizo" && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="w-12 h-12 text-[#6841ea] animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Guardando tu respuesta...</p>
            </div>
          )}

          {/* ========== PASO: PREGUNTANDO MOTIVO ========== */}
          {paso === "preguntando-motivo" && (
            <div className="text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                El asistente está preguntando...
              </p>
            </div>
          )}

          {/* ========== PASO: ESCUCHANDO MOTIVO ========== */}
          {paso === "escuchando-motivo" && (
            <div className="text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                  <Mic className="w-10 h-10 text-red-500" />
                </div>

                {/* Círculo de nivel de audio */}
                <div
                  className="absolute inset-0 rounded-full border-4 border-red-500 transition-all"
                  style={{
                    transform: `scale(${1 + audioLevel / 200})`,
                    opacity: audioLevel / 100,
                  }}
                />
              </div>

              <p className="text-sm text-gray-500">
                {isRecording
                  ? "Escuchando motivo... (Deja de hablar 3 segundos para enviar)"
                  : isTranscribing
                    ? "Procesando audio..."
                    : "Preparando micrófono..."}
              </p>

              {isRecording && (
                <div className="text-xs text-gray-400">
                  Nivel de audio: {audioLevel.toFixed(0)}%
                </div>
              )}
            </div>
          )}

          {/* ========== PASO: GUARDANDO MOTIVO ========== */}
          {paso === "guardando-motivo" && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="w-12 h-12 text-[#6841ea] animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Guardando motivo...</p>
            </div>
          )}

          {/* ========== PASO: COMPLETADO ========== */}
          {paso === "completado" && (
            <div className="text-center space-y-4 py-8">
              <div
                className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
                  theme === "dark" ? "bg-green-900/20" : "bg-green-100"
                }`}
              >
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold">¡Reporte Completado!</h3>
              <p className="text-sm text-gray-500">
                Has reportado todas las tareas del día correctamente.
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}

          {/* ========== ERROR DE VALIDACIÓN ========== */}
          {errorValidacion && (
            <div
              className={`mt-4 p-3 rounded-lg border ${
                theme === "dark"
                  ? "bg-red-900/20 border-red-500/20"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-500">{errorValidacion}</p>
              </div>
            </div>
          )}
        </div>

        {/* ========== BOTÓN CANCELAR ========== */}
        {paso !== "inicial" && paso !== "completado" && (
          <div
            className={`flex justify-center p-4 border-t ${
              theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200"
            }`}
          >
            <Button
              variant="outline"
              onClick={handleCancelar}
              className="hover:bg-red-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar Reporte
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
