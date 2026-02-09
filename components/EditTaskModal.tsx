import React, { useState, useEffect, useRef } from "react";
import { X, Mic, Check, RotateCcw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  nombre: string;
  prioridad: string;
  duracionMin: number;
  diasPendiente: number;
}

interface EditTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  activityTitle: string;
  currentExplanation: string;
  theme: string;
  onClose: () => void;
  onSave: (taskId: string, newExplanation: string) => Promise<boolean>;
}

type EditStep = "idle" | "recording" | "validating" | "success" | "error";

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  task,
  activityTitle,
  currentExplanation,
  theme,
  onClose,
  onSave,
}) => {
  const [editStep, setEditStep] = useState<EditStep>("idle");
  const [transcript, setTranscript] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const recognitionRef = useRef<any>(null);

  // Resetear cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      setEditStep("idle");
      setTranscript("");
      setCountdown(null);
      setValidationMessage("");
      setErrorMessage("");
    } else {
      // Detener reconocimiento al cerrar
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }
  }, [isOpen]);

  // Auto-envío después de 3 segundos de silencio
  useEffect(() => {
    if (editStep !== "recording" || !transcript) return;

    let silenceTimer: NodeJS.Timeout;
    let countdownInterval: NodeJS.Timeout;

    if (transcript.trim().length > 0) {
      setCountdown(3);

      countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      silenceTimer = setTimeout(() => {
        setCountdown(null);
        handleStopRecording();
      }, 3000);
    }

    return () => {
      clearTimeout(silenceTimer);
      clearInterval(countdownInterval);
    };
  }, [transcript, editStep]);

  // Iniciar grabación
  const startRecording = () => {
    setTranscript("");
    setEditStep("recording");

    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setErrorMessage("Tu navegador no soporta reconocimiento de voz");
      setEditStep("error");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "es-ES";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + " ";
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      setTranscript((prev) => prev + finalTranscript || interimTranscript);
    };

    recognition.onerror = (event: any) => {
      setErrorMessage(`Error: ${event.error}`);
      setEditStep("error");
    };

    recognition.onend = () => {};

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Detener grabación y validar
  const handleStopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (!transcript.trim()) {
      setErrorMessage("No se detectó ninguna explicación");
      setEditStep("error");
      return;
    }

    setEditStep("validating");

    try {
      // Validar y guardar
      const success = await onSave(task!.id, transcript.trim());

      if (success) {
        setValidationMessage("Explicación actualizada correctamente");
        setEditStep("success");

        // Cerrar después de 1.5 segundos
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMessage("Error al guardar la explicación");
        setEditStep("error");
      }
    } catch (error) {
      setErrorMessage("Error al validar la explicación");
      setEditStep("error");
    }
  };

  // Cancelar grabación
  const cancelRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setTranscript("");
    setEditStep("idle");
    setCountdown(null);
  };

  if (!isOpen || !task) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center ${
        theme === "dark" ? "bg-black/80" : "bg-white/95"
      }`}
      onClick={(e) => {
        if (
          e.target === e.currentTarget &&
          editStep !== "recording" &&
          editStep !== "validating"
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`max-w-lg w-full mx-4 rounded-xl overflow-hidden shadow-2xl ${
          theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b ${
            theme === "dark"
              ? "border-[#2a2a2a] bg-[#252527]"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Editar Explicación</h3>
              <p className="text-xs text-gray-500">{activityTitle}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={editStep === "validating"}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Información de la tarea */}
          <div
            className={`p-3 rounded-lg ${
              theme === "dark" ? "bg-[#252527]" : "bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{task.nombre}</span>
              <Badge
                variant={
                  task.prioridad === "ALTA" ? "destructive" : "secondary"
                }
              >
                {task.prioridad}
              </Badge>
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>{task.duracionMin} min</span>
              <span>{task.diasPendiente || 0} días</span>
            </div>
          </div>

          {/* Explicación actual */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Explicación Actual:
            </label>
            <div
              className={`p-3 rounded text-sm ${
                theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"
              }`}
            >
              {currentExplanation}
            </div>
          </div>

          {/* Estados */}
          {editStep === "idle" && (
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-500">
                Presiona el botón para grabar una nueva explicación
              </p>
              <Button
                onClick={startRecording}
                className="bg-[#6841ea] hover:bg-[#5a36d4] w-full"
              >
                <Mic className="w-4 h-4 mr-2" />
                Grabar Nueva Explicación
              </Button>
            </div>
          )}

          {editStep === "recording" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full mx-auto bg-red-500/20 animate-pulse flex items-center justify-center">
                    <Mic className="w-8 h-8 text-red-500" />
                  </div>

                  {countdown !== null && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      <div className="bg-[#6841ea] text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                        Enviando en {countdown}s
                      </div>
                    </div>
                  )}
                </div>

                <h4 className="text-lg font-bold mt-3">Grabando...</h4>
              </div>

              {transcript && (
                <div
                  className={`p-3 rounded ${
                    theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"
                  }`}
                >
                  <p className="text-sm mb-2">{transcript}</p>
                  <p className="text-xs text-gray-500">
                    {countdown !== null
                      ? `Se enviará en ${countdown} segundo${countdown !== 1 ? "s" : ""}...`
                      : "Continúa hablando..."}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleStopRecording}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Enviar Ahora
                </Button>
                <Button
                  onClick={cancelRecording}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {editStep === "validating" && (
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full mx-auto bg-blue-500/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="absolute w-20 h-20 rounded-full border-2 border-blue-500 animate-ping"
                      style={{
                        animationDelay: `${i * 0.3}s`,
                        opacity: 0.3 - i * 0.05,
                      }}
                    />
                  ))}
                </div>
              </div>
              <h4 className="text-lg font-bold">Validando y guardando...</h4>
              <p className="text-sm text-gray-500">
                Estamos procesando tu explicación con IA
              </p>
            </div>
          )}

          {editStep === "success" && (
            <div className="text-center space-y-4">
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                  theme === "dark" ? "bg-green-900/20" : "bg-green-100"
                }`}
              >
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h4 className="text-lg font-bold text-green-500">
                ¡Actualizado!
              </h4>
              <p className="text-sm text-gray-500">{validationMessage}</p>
            </div>
          )}

          {editStep === "error" && (
            <div className="text-center space-y-4">
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                  theme === "dark" ? "bg-red-900/20" : "bg-red-100"
                }`}
              >
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h4 className="text-lg font-bold text-red-500">Error</h4>
              <p className="text-sm text-gray-500">{errorMessage}</p>
              <Button
                onClick={() => setEditStep("idle")}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Intentar de Nuevo
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
