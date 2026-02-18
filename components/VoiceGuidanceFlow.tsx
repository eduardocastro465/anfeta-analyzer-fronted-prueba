"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  AlertCircle,
  Headphones,
  X,
  Loader2,
  Pause,
  Play,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpeedControlModal } from "./speed-control-modal";
import {
  ActivityPresentationStep,
  TaskPresentationStep,
  ListeningExplanationStep,
  ConfirmationStep,
  SummaryStep,
  ConfirmStartStep,
} from "@/components/VoiceGuidanceFlow-SubComponents";
import type { VoiceGuidanceFlowProps, VoiceModeStep } from "@/lib/types";

// Extendemos el tipo para incluir las tareas seleccionadas
interface ExtendedVoiceGuidanceFlowProps extends VoiceGuidanceFlowProps {
  selectedTaskIds?: string[] | Set<string>; // IDs de las tareas seleccionadas
  autoSendVoice?: {
    isRecording: boolean;
    isTranscribing: boolean;
    audioLevel: number;
    startVoiceRecording: () => Promise<void>;
    cancelVoiceRecording: () => Promise<void>;
  };
}

export const VoiceGuidanceFlow: React.FC<ExtendedVoiceGuidanceFlowProps> = ({
  voiceMode,
  voiceStep,
  theme,
  isSpeaking,
  currentActivityIndex,
  currentTaskIndex,
  activitiesWithTasks,
  taskExplanations,
  voiceTranscript,
  currentListeningFor,
  retryCount,
  voiceConfirmationText,
  rate,
  changeRate,
  cancelVoiceMode,
  finishVoiceMode,
  confirmStartVoiceMode,
  speakTaskByIndices,
  startTaskExplanation,
  skipTask,
  processVoiceExplanation = () => {},
  retryExplanation,
  recognitionRef,
  setIsRecording,
  setIsListening,
  setVoiceStep,
  setCurrentListeningFor,
  selectedTaskIds = [],
  autoSendVoice,
}) => {
  // CREAR UN VALOR POR DEFECTO SEGURO PARA autoSendVoice
  const safeAutoSendVoice = useMemo(
    () =>
      autoSendVoice || {
        isRecording: false,
        isTranscribing: false,
        audioLevel: 0,
        startVoiceRecording: async () => {
          console.warn("autoSendVoice.startVoiceRecording no está disponible");
        },
        cancelVoiceRecording: () => {
          console.warn("autoSendVoice.cancelVoiceRecording no está disponible");
        },
      },
    [autoSendVoice],
  );

  // Estado para pausar/continuar
  const [isPaused, setIsPaused] = useState(false);
  const [pausedStep, setPausedStep] = useState<VoiceModeStep | null>(null);

  // Convertir selectedTaskIds a un Set estable
  const stableSelectedTaskIds = useMemo(() => {
    try {
      if (selectedTaskIds instanceof Set) {
        return new Set(selectedTaskIds);
      } else if (Array.isArray(selectedTaskIds)) {
        return new Set(selectedTaskIds);
      }
      return new Set();
    } catch (error) {
      console.error("Error al procesar selectedTaskIds:", error);
      return new Set();
    }
  }, [selectedTaskIds]);

  // Filtrar actividades para mostrar solo las que tienen tareas seleccionadas
  const filteredActivitiesWithTasks = useMemo(() => {
    if (!activitiesWithTasks || activitiesWithTasks.length === 0) {
      return [];
    }

    // Si hay tareas seleccionadas, filtrar
    if (stableSelectedTaskIds.size > 0) {

      const filteredActivities = activitiesWithTasks
        .map((activity, activityIndex) => {
          // Filtrar solo las tareas seleccionadas de esta actividad
          const tareasFiltradas = activity.tareas.filter((tarea: any) =>
            stableSelectedTaskIds.has(tarea.id),
          );

          // Si esta actividad tiene tareas seleccionadas, incluirla
          if (tareasFiltradas.length > 0) {

            return {
              ...activity,
              tareas: tareasFiltradas,
            };
          }
          return null;
        })
        .filter((activity): activity is any => activity !== null);


      return filteredActivities;
    } else {
      return activitiesWithTasks;
    }
  }, [activitiesWithTasks, stableSelectedTaskIds]);

  const getCurrentActivity = useCallback(() => {
    if (
      currentActivityIndex >= 0 &&
      currentActivityIndex < filteredActivitiesWithTasks.length
    ) {
      return filteredActivitiesWithTasks[currentActivityIndex];
    }
    return null;
  }, [currentActivityIndex, filteredActivitiesWithTasks]);

  const getCurrentTask = useCallback(() => {
    const currentActivity = getCurrentActivity();
    if (
      currentActivity &&
      currentTaskIndex >= 0 &&
      currentTaskIndex < currentActivity.tareas.length
    ) {
      return currentActivity.tareas[currentTaskIndex];
    }
    return null;
  }, [
    currentActivityIndex,
    currentTaskIndex,
    filteredActivitiesWithTasks,
    getCurrentActivity,
  ]);

  // Función para cancelar el modo voz con limpieza
  const handleCancelVoiceMode = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    cancelVoiceMode();
  }, [cancelVoiceMode]);

  // FUNCIÓN PARA EDITAR UNA TAREA DESDE EL RESUMEN
  const handleEditTask = useCallback(
    (activityIndex: number, taskIndex: number) => {

      // Detener cualquier reproducción de audio
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      const currentTask = getCurrentTask();
      if (currentTask) {
        setCurrentListeningFor(`Explicación para: ${currentTask.nombre}`);
      }

      setVoiceStep("listening-explanation");

      // USAR AUTO-SEND EN LUGAR DE VOICE RECOGNITION
      setTimeout(async () => {
        await safeAutoSendVoice.startVoiceRecording();
      }, 100);
    },
    [
      voiceStep,
      setCurrentListeningFor,
      setVoiceStep,
      safeAutoSendVoice,
      getCurrentTask,
    ],
  );

  // Función para pausar la explicación
  const handlePauseExplanation = () => {
    if (isSpeaking) {
      // Pausar síntesis de voz si está activa
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }

      // Guardar el paso actual
      setPausedStep(voiceStep);
      setIsPaused(true);

      // Detener reconocimiento de voz si está activo
      if (recognitionRef?.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Recognition ya estaba detenido");
        }
      }

      // Resetear estados de grabación
      if (setIsRecording) setIsRecording(false);
      if (setIsListening) setIsListening(false);
    }
  };

  // Función para continuar la explicación
  const handleResumeExplanation = () => {
    // Reanudar síntesis de voz si estaba pausada
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    setIsPaused(false);
    setPausedStep(null);

    // Si estábamos en listening y tenemos un paso pausado, restaurarlo
    if (pausedStep) {
      setVoiceStep(pausedStep);
    }
  };

  // Función para saltar a la siguiente tarea
  const handleSkipToNext = () => {
    if (isSpeaking && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (skipTask) {
      skipTask();
    }
  };

  if (!voiceMode) return null;

  if (
    !filteredActivitiesWithTasks ||
    filteredActivitiesWithTasks.length === 0
  ) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center ${
          theme === "dark" ? "bg-black/80" : "bg-white/95"
        }`}
      >
        <div
          className={`max-w-2xl w-full mx-4 rounded-xl overflow-hidden shadow-2xl ${
            theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"
          }`}
        >
          <div className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">
              No hay tareas seleccionadas
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              No se encontraron tareas seleccionadas para explicar. Por favor
              selecciona tareas antes de iniciar el modo voz.
            </p>
            <Button onClick={handleCancelVoiceMode}>Cerrar</Button>
          </div>
        </div>
      </div>
    );
  }

  const currentActivity = getCurrentActivity();
  const currentTask = getCurrentTask();
  const totalActivities = filteredActivitiesWithTasks.length;

  // Calcular total de tareas seleccionadas
  const totalTasks = filteredActivitiesWithTasks.reduce(
    (sum, activity) => sum + activity.tareas.length,
    0,
  );

  const isInFinalSteps = voiceStep === "summary" || voiceStep === "sending";
  const isInTransition =
    voiceStep === "activity-presentation" && !currentActivity;

  // Durante transiciones, mostrar un loading simple
  if (isInTransition) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center ${
          theme === "dark" ? "bg-black/80" : "bg-white/95"
        }`}
      >
        <Loader2 className="w-8 h-8 animate-spin text-[#6841ea]" />
      </div>
    );
  }

  if (!currentActivity && !isInFinalSteps && !isInTransition) {
    return null;
  }

  const safeActivityTasksCount = currentActivity?.tareas?.length || 1;
  const progressPercentage = isInFinalSteps
    ? 100
    : totalActivities > 0
      ? (currentActivityIndex * 100) / totalActivities +
        (currentTaskIndex * 100) / (totalActivities * safeActivityTasksCount)
      : 0;

  const getHeaderSubtitle = () => {
    if (isPaused) return "Explicación pausada";
    if (isSpeaking) return "Asistente hablando...";
    if (safeAutoSendVoice.isTranscribing) return "Transcribiendo audio...";
    if (voiceStep === "confirm-start")
      return `${totalTasks} tareas seleccionadas`;
    if (voiceStep === "activity-presentation")
      return ` Actividad ${currentActivityIndex + 1} de ${totalActivities}`;
    if (voiceStep === "task-presentation")
      return ` Tarea ${currentTaskIndex + 1} de ${safeActivityTasksCount}`;
    if (voiceStep === "waiting-for-explanation")
      return " Esperando explicación";
    if (voiceStep === "listening-explanation")
      return " Escuchando tu explicación";
    if (voiceStep === "processing-explanation")
      return " Validando explicación...";
    if (voiceStep === "confirmation") return "Confirmar explicación";
    if (voiceStep === "summary") return " Resumen final";
    if (voiceStep === "sending") return " Enviando...";
    return "Listo";
  };

  const getProgressText = () => {
    if (isInFinalSteps) return "Completado";
    if (voiceStep === "activity-presentation")
      return `Actividad ${currentActivityIndex + 1} de ${totalActivities}`;
    return `Actividad ${currentActivityIndex + 1}, Tarea ${currentTaskIndex + 1} de ${safeActivityTasksCount}`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        theme === "dark" ? "bg-black/80" : "bg-white/95"
      }`}
    >
      <div
        className={`max-w-2xl w-full mx-4 rounded-xl overflow-hidden shadow-2xl ${
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
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  theme === "dark" ? "bg-[#6841ea]/20" : "bg-[#6841ea]/10"
                }`}
              >
                <Headphones className="w-5 h-5 text-[#6841ea]" />
              </div>
              <div>
                <h3 className="font-bold">
                  {isPaused ? "Modo Voz Pausado" : "Modo Voz Guiado"}
                </h3>
                <p className="text-xs text-gray-500">{getHeaderSubtitle()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* BOTONES DE CONTROL DE REPRODUCCIÓN */}
              {(isSpeaking || isPaused) && (
                <div className="flex items-center gap-1 mr-2">
                  {!isPaused ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePauseExplanation}
                      className="h-8 w-8 p-0"
                      title="Pausar explicación"
                    >
                      <Pause className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResumeExplanation}
                      className="h-8 w-8 p-0"
                      title="Continuar explicación"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkipToNext}
                    className="h-8 w-8 p-0"
                    title="Saltar a siguiente tarea"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Indicador de que está hablando */}
              {isSpeaking && !isPaused && (
                <div className="flex gap-1 mr-2">
                  {[0, 100, 200, 300].map((delay, i) => (
                    <div
                      key={i}
                      className={`w-1 bg-[#6841ea] rounded-full animate-pulse ${
                        i % 2 === 0
                          ? "h-4"
                          : i === 1
                            ? "h-6"
                            : i === 2
                              ? "h-5"
                              : "h-7"
                      }`}
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              )}

              {/* INDICADOR DE NIVEL DE AUDIO */}
              {safeAutoSendVoice.isRecording && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          safeAutoSendVoice.audioLevel > i * 25
                            ? "bg-red-500 h-6"
                            : "bg-gray-400 h-2"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-red-500 font-medium">REC</span>
                </div>
              )}

              <SpeedControlModal
                rate={rate}
                changeRate={changeRate}
                theme={theme}
              />
              <Button variant="ghost" size="sm" onClick={handleCancelVoiceMode}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {totalActivities > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span>{getProgressText()}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div
                className={`h-1 rounded-full ${
                  theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-200"
                }`}
              >
                <div
                  className="h-full bg-[#6841ea] rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {/* INDICADOR DE TAREAS SELECCIONADAS */}
              <div className="mt-2 text-xs text-center">
                <span
                  className={`px-2 py-0.5 rounded ${
                    theme === "dark"
                      ? "bg-green-900/30 text-green-300"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {totalActivities} actividad{totalActivities !== 1 ? "es" : ""}{" "}
                  |{totalTasks} tarea{totalTasks !== 1 ? "s" : ""} seleccionada
                  {totalTasks !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {voiceStep === "confirm-start" && (
            <ConfirmStartStep
              activitiesWithTasks={filteredActivitiesWithTasks}
              totalActivities={totalActivities}
              totalTasks={totalTasks}
              theme={theme}
              confirmStartVoiceMode={confirmStartVoiceMode}
              cancelVoiceMode={handleCancelVoiceMode}
            />
          )}

          {voiceStep === "activity-presentation" && currentActivity && (
            <ActivityPresentationStep
              currentActivity={currentActivity}
              currentActivityIndex={currentActivityIndex}
              totalActivities={totalActivities}
              theme={theme}
              isSpeaking={isSpeaking}
              isPaused={isPaused}
              speakTaskByIndices={speakTaskByIndices}
            />
          )}

          {(voiceStep === "task-presentation" ||
            voiceStep === "waiting-for-explanation") &&
            currentTask &&
            currentActivity && (
              <TaskPresentationStep
                currentTask={currentTask}
                currentActivity={currentActivity}
                currentTaskIndex={currentTaskIndex}
                taskExplanations={taskExplanations}
                theme={theme}
                voiceStep={voiceStep}
                isSpeaking={isSpeaking}
                isPaused={isPaused}
                startTaskExplanation={startTaskExplanation}
                skipTask={skipTask}
              />
            )}

          {voiceStep === "listening-explanation" && (
            <ListeningExplanationStep
              currentListeningFor={currentListeningFor}
              retryCount={retryCount}
              voiceTranscript={voiceTranscript}
              theme={theme}
              stopRecording={safeAutoSendVoice.cancelVoiceRecording}
              processVoiceExplanation={processVoiceExplanation}
              recognitionRef={recognitionRef}
              setIsRecording={setIsRecording}
              setIsListening={setIsListening}
              setVoiceStep={setVoiceStep}
              setCurrentListeningFor={setCurrentListeningFor}
              isPaused={isPaused}
            />
          )}

          {voiceStep === "processing-explanation" && (
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full mx-auto bg-blue-500/20 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="absolute w-24 h-24 rounded-full border-2 border-blue-500 animate-ping"
                      style={{
                        animationDelay: `${i * 0.3}s`,
                        opacity: 0.3 - i * 0.05,
                      }}
                    />
                  ))}
                </div>
              </div>

              <h4 className="text-lg font-bold">
                {isPaused ? "Validación pausada" : " Validando explicación..."}
              </h4>

              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {isPaused
                  ? "La validación está pausada. Haz clic en 'Continuar' para reanudar."
                  : "El asistente está revisando tu explicación con inteligencia artificial"}
              </p>

              {currentTask && (
                <div
                  className={`p-3 rounded-lg ${
                    theme === "dark"
                      ? "bg-blue-900/20 border border-blue-500/20"
                      : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  <p className="text-sm font-medium">{currentTask.nombre}</p>
                </div>
              )}

              {!isPaused && (
                <div className="flex gap-1 justify-center">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {voiceStep === "confirmation" && currentTask && (
            <ConfirmationStep
              currentTask={currentTask}
              voiceConfirmationText={voiceConfirmationText}
              theme={theme}
              isSpeaking={isSpeaking}
              isPaused={isPaused}
              retryExplanation={retryExplanation}
            />
          )}

          {voiceStep === "summary" && (
            <SummaryStep
              activitiesWithTasks={filteredActivitiesWithTasks}
              taskExplanations={taskExplanations}
              totalTasks={totalTasks}
              theme={theme}
              finishVoiceMode={finishVoiceMode}
              isSpeaking={isSpeaking}
              isPaused={isPaused}
              cancelVoiceMode={handleCancelVoiceMode}
              onEditTask={handleEditTask}
            />
          )}

          {voiceStep === "sending"}
        </div>

        {/* BOTONES DE PAUSA/RESUMEN EN LA PARTE INFERIOR */}
        {(voiceStep === "activity-presentation" ||
          voiceStep === "task-presentation" ||
          voiceStep === "listening-explanation" ||
          voiceStep === "processing-explanation" ||
          voiceStep === "confirmation") && (
          <div
            className={`p-3 border-t ${
              theme === "dark"
                ? "border-[#2a2a2a] bg-[#252527]"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex justify-center gap-2">
              {!isPaused ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePauseExplanation}
                  className="flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pausar Explicación
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleResumeExplanation}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
                >
                  <Play className="w-4 h-4" />
                  Continuar Explicación
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleSkipToNext}
                className="flex items-center gap-2"
              >
                <SkipForward className="w-4 h-4" />
                Saltar Tarea
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
