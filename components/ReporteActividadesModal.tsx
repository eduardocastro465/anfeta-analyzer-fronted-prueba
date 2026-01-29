import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  Mic,
  X,
  Volume2,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  Send,
} from "lucide-react";
import type { ActividadDiaria, PendienteEstadoLocal } from "@/lib/types";

interface ReporteActividadesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  theme: "light" | "dark";
  modoVoz: boolean;
  setModoVoz: (value: boolean) => void;
  isListening: boolean;
  isSpeaking: boolean;
  indiceActual: number;
  totalPendientes: number;
  voiceTranscript: string;
  actividadesDiarias: ActividadDiaria[];
  pendientesReporte: PendienteEstadoLocal[];
  onToggleCompletado: (pendienteId: string) => void;
  onExplicacionChange: (pendienteId: string, explicacion: string) => void;
  iniciarModoVoz: () => void;
  stopVoice: () => void;
  recognitionRef: React.MutableRefObject<any>;
  pasoModalVoz: "esperando" | "escuchando" | "procesando";
  iniciarGrabacionEnModal: () => void;
  voiceTranscriptRef: React.MutableRefObject<string>;
  procesarRespuestaReporte: (transcript: string) => void;
  guardarReporteDiario: () => void;
  guardandoReporte: boolean;
  setPasoModalVoz: (paso: "esperando" | "escuchando" | "procesando") => void;
  setIndicePendienteActual: (indice: number) => void;
}

export function ReporteActividadesModal({
  isOpen,
  onOpenChange,
  theme,
  modoVoz,
  setModoVoz,
  isListening,
  isSpeaking,
  indiceActual,
  voiceTranscript,
  actividadesDiarias,
  pendientesReporte,
  onToggleCompletado,
  onExplicacionChange,
  iniciarModoVoz,
  stopVoice,
  recognitionRef,
  pasoModalVoz,
  iniciarGrabacionEnModal,
  voiceTranscriptRef,
  procesarRespuestaReporte,
  guardarReporteDiario,
  guardandoReporte,
  setPasoModalVoz,
  setIndicePendienteActual,
}: ReporteActividadesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-4xl max-h-[85vh] overflow-hidden flex flex-col ${
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
            {!modoVoz && pendientesReporte.length > 0 && (
              <Button
                size="sm"
                onClick={iniciarModoVoz}
                className="bg-[#6841ea] hover:bg-[#5a36d4] flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Modo Voz
              </Button>
            )}
          </DialogTitle>

          <p className="text-sm text-gray-500">
            {modoVoz
              ? " Habla para reportar cada tarea, una por una"
              : "Marca las tareas que completaste y explica las que no pudiste terminar"}
          </p>
        </DialogHeader>

        {/* 🎤 INDICADOR DE MODO VOZ ACTIVO */}
        {modoVoz && (
          <div
            className={`px-4 py-3 border-b ${
              theme === "dark"
                ? "bg-[#252527] border-[#2a2a2a]"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isListening ? (
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" />
                    <div
                      className="w-1 h-6 bg-red-500 rounded-full animate-pulse"
                      style={{ animationDelay: "100ms" }}
                    />
                    <div
                      className="w-1 h-5 bg-red-500 rounded-full animate-pulse"
                      style={{ animationDelay: "200ms" }}
                    />
                  </div>
                ) : (
                  <Volume2 className="w-4 h-4 text-[#6841ea]" />
                )}
                <span className="text-sm font-medium">
                  {isListening
                    ? "🎙️ Escuchando..."
                    : isSpeaking
                      ? "🔊 Asistente hablando..."
                      : `Tarea ${indiceActual + 1} de ${pendientesReporte.length}`}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setModoVoz(false);
                  stopVoice();
                  if (recognitionRef.current) {
                    recognitionRef.current.stop();
                  }
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Barra de progreso */}
            <div className="w-full h-2 bg-gray-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#6841ea] transition-all duration-300"
                style={{
                  width: `${(indiceActual / pendientesReporte.length) * 100}%`,
                }}
              />
            </div>

            {/* Transcripción en vivo */}
            {isListening && voiceTranscript && (
              <div
                className={`mt-3 p-2 rounded text-xs ${
                  theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"
                }`}
              >
                <span className="text-gray-500">Transcripción:</span>
                <p className="mt-1">{voiceTranscript}</p>
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO SEGÚN MODO */}
        {!modoVoz ? (
          // 📋 MODO MANUAL (original)
          <>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* Resumen */}
              <div
                className={`p-4 rounded-lg border ${
                  theme === "dark"
                    ? "bg-[#252527] border-[#2a2a2a]"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Progreso del día
                  </span>
                  <Badge variant="outline">
                    {
                      pendientesReporte.filter((p) => p.completadoLocal)
                        .length
                    }{" "}
                    de {pendientesReporte.length} completadas
                  </Badge>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-[#6841ea] transition-all duration-300"
                    style={{
                      width: `${pendientesReporte.length > 0 ? (pendientesReporte.filter((p) => p.completadoLocal).length / pendientesReporte.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Lista de actividades */}
              {actividadesDiarias.map((actividad) => (
                <div
                  key={actividad.actividadId}
                  className={`rounded-lg border overflow-hidden ${
                    theme === "dark"
                      ? "bg-[#1a1a1a] border-[#2a2a2a]"
                      : "bg-white border-gray-200"
                  }`}
                >
                  {/* Header de actividad */}
                  <div
                    className={`p-3 border-b ${
                      theme === "dark"
                        ? "bg-[#252527] border-[#2a2a2a]"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">
                          {actividad.titulo}
                        </h4>
                        {actividad.tituloProyecto && (
                          <p className="text-xs text-gray-500">
                            {actividad.tituloProyecto}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {actividad.horaInicio} - {actividad.horaFin}
                      </Badge>
                    </div>
                  </div>

                  {/* Pendientes de la actividad */}
                  <div className="p-3 space-y-3">
                    {actividad.pendientes.map((pendiente) => {
                      const estado = pendientesReporte.find(
                        (p) => p.pendienteId === pendiente.pendienteId,
                      );

                      if (!estado) return null;

                      return (
                        <div
                          key={pendiente.pendienteId}
                          className={`p-3 rounded-lg border transition-all ${
                            estado.completadoLocal
                              ? theme === "dark"
                                ? "bg-green-900/20 border-green-500/20"
                                : "bg-green-50 border-green-200"
                              : theme === "dark"
                                ? "bg-[#252527] border-[#2a2a2a]"
                                : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          {/* Checkbox y nombre */}
                          <div className="flex items-start gap-3 mb-2">
                            <Checkbox
                              checked={estado.completadoLocal}
                              onCheckedChange={() =>
                                onToggleCompletado(pendiente.pendienteId)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <p
                                className={`font-medium ${
                                  estado.completadoLocal
                                    ? "line-through opacity-60"
                                    : ""
                                }`}
                              >
                                {pendiente.nombre}
                              </p>
                              {pendiente.descripcion && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {pendiente.descripcion}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {pendiente.duracionMin} min
                                </span>
                              </div>
                            </div>
                            {estado.completadoLocal ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-gray-400" />
                            )}
                          </div>

                          {/* Campo de motivo si NO está completado */}
                          {!estado.completadoLocal && (
                            <div className="ml-8 mt-2">
                              <label className="text-xs text-gray-500 block mb-1">
                                ¿Por qué no se completó? *
                              </label>
                              <Textarea
                                value={estado.motivoLocal}
                                onChange={(e) =>
                                  onExplicacionChange(
                                    pendiente.pendienteId,
                                    e.target.value,
                                  )
                                }
                                placeholder="Explica el motivo (ej: faltó información del cliente, bloqueo técnico, etc.)"
                                className={`text-sm h-20 ${
                                  theme === "dark"
                                    ? "bg-[#1a1a1a] border-[#2a2a2a]"
                                    : "bg-white border-gray-200"
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer con botones */}
            <div
              className={`flex justify-end gap-2 pt-4 border-t ${
                theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200"
              }`}
            >
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={guardandoReporte}
              >
                Cancelar
              </Button>
              <Button
                onClick={guardarReporteDiario}
                disabled={guardandoReporte}
                className="bg-[#6841ea] hover:bg-[#5a36d4]"
              >
                {guardandoReporte ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Guardar Reporte
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              {pendientesReporte[indiceActual] && (
                <div className="space-y-4">
                  {/* Tarea actual */}
                  <div
                    className={`p-4 rounded-lg border ${
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
                        <h4 className="font-bold mb-1">
                          {pendientesReporte[indiceActual].nombre}
                        </h4>
                        {pendientesReporte[indiceActual]
                          .descripcion && (
                          <p className="text-sm text-gray-500 mb-2">
                            {
                              pendientesReporte[indiceActual]
                                .descripcion
                            }
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {
                              pendientesReporte[indiceActual]
                                .duracionMin
                            }{" "}
                            min
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MOSTRAR SEGÚN EL PASO */}
                  {pasoModalVoz === "esperando" && (
                    <div className="text-center space-y-3">
                      <p className="text-sm text-gray-500">
                        Presiona el botón y dime si completaste esta tarea y
                        qué hiciste
                      </p>
                      <Button
                        onClick={iniciarGrabacionEnModal}
                        className="bg-[#6841ea] hover:bg-[#5a36d4] h-14 px-8"
                        disabled={isSpeaking}
                      >
                        <Mic className="w-5 h-5 mr-2" />
                        Hablar Ahora
                      </Button>
                    </div>
                  )}

                  {/* Escuchando - Mostrar micrófono animado */}
                  {pasoModalVoz === "escuchando" && (
                    <div className="text-center space-y-4">
                      <div className="relative w-20 h-20 mx-auto">
                        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                          <Mic className="w-10 h-10 text-red-500" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="absolute w-24 h-24 rounded-full border-2 border-red-500 animate-ping"
                              style={{
                                animationDelay: `${i * 0.2}s`,
                                opacity: 0.5 - i * 0.1,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Habla naturalmente. Se enviará tras 3 segundos de
                        silencio.
                      </p>
                      <Button
                        onClick={() => {
                          if (recognitionRef.current) {
                            recognitionRef.current.stop();
                          }
                          // Forzar procesamiento inmediato
                          if (voiceTranscriptRef.current.trim()) {
                            procesarRespuestaReporte(
                              voiceTranscriptRef.current,
                            );
                          }
                        }}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Terminar
                      </Button>
                    </div>
                  )}

                  {/* Procesando - Mostrar loader */}
                  {pasoModalVoz === "procesando" && (
                    <div className="text-center space-y-4 py-8">
                      <Loader2 className="w-12 h-12 text-[#6841ea] animate-spin mx-auto" />
                      <p className="text-sm text-gray-500">
                        Validando tu respuesta...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Todas completadas */}
              {indiceActual >= pendientesReporte.length && (
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
                    Reportaste todas las tareas. Ahora puedes guardar el
                    reporte.
                  </p>
                  <div className="flex gap-3 justify-center pt-4">
                    <Button
                      onClick={guardarReporteDiario}
                      disabled={guardandoReporte}
                      className="bg-[#6841ea] hover:bg-[#5a36d4] px-8"
                    >
                      {guardandoReporte ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Guardar Reporte
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModoVoz(false);
                        setIndicePendienteActual(0);
                        setPasoModalVoz("esperando");
                      }}
                    >
                      Volver a Manual
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}