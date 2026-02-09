"use client";

import React from "react";
import { AlertCircle, Headphones, X, Loader2 } from "lucide-react";
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
import type { VoiceGuidanceFlowProps } from "@/lib/types";

// ==================== NUEVAS PROPS NECESARIAS ====================
interface ExtendedVoiceGuidanceFlowProps extends VoiceGuidanceFlowProps {
  // Props del hook useAutoSendVoice
  autoSendVoice: {
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
  stopRecording,
  processVoiceExplanation = () => {},
  retryExplanation,
  recognitionRef,
  setIsRecording,
  setIsListening,
  setVoiceStep,
  setCurrentListeningFor,
  setCurrentActivityIndex,
  setCurrentTaskIndex,
  autoSendVoice, // 🆕 NUEVO PROP
}) => {
  if (!voiceMode) return null;

  if (!activitiesWithTasks || activitiesWithTasks.length === 0) {
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
              No hay actividades disponibles
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              No se encontraron actividades con tareas para explicar.
            </p>
            <Button onClick={cancelVoiceMode}>Cerrar</Button>
          </div>
        </div>
      </div>
    );
  }

  const getCurrentActivity = () => {
    if (
      currentActivityIndex >= 0 &&
      currentActivityIndex < activitiesWithTasks.length
    ) {
      return activitiesWithTasks[currentActivityIndex];
    }
    return null;
  };

  const getCurrentTask = () => {
    const currentActivity = getCurrentActivity();
    if (
      currentActivity &&
      currentTaskIndex >= 0 &&
      currentTaskIndex < currentActivity.tareas.length
    ) {
      return currentActivity.tareas[currentTaskIndex];
    }
    return null;
  };

  // ==================== MANEJO DE CANCELACIÓN ====================
  const handleCancelVoiceMode = React.useCallback(async () => {
    // 🆕 Cancelar grabación automática si está activa
    if (autoSendVoice.isRecording) {
      await autoSendVoice.cancelVoiceRecording();
    }
    cancelVoiceMode();
  }, [autoSendVoice, cancelVoiceMode]);

  // ==================== FUNCIÓN PARA EDITAR UNA TAREA ====================
  const handleEditTask = React.useCallback(
    async (activityIndex: number, taskIndex: number) => {
      // Detener cualquier reproducción de audio
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // 🆕 Cancelar grabación automática
      if (autoSendVoice.isRecording) {
        await autoSendVoice.cancelVoiceRecording();
      }

      // Detener reconocimiento de voz si está activo
      if (recognitionRef?.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      // Resetear estados de grabación
      if (setIsRecording) setIsRecording(false);
      if (setIsListening) setIsListening(false);
      if (setCurrentListeningFor) setCurrentListeningFor("");

      // Primero ir a un estado de transición
      setVoiceStep("activity-presentation");

      // Usar requestAnimationFrame para asegurar que React procese el cambio
      requestAnimationFrame(() => {
        // Navegar a esa tarea específica
        if (setCurrentActivityIndex) setCurrentActivityIndex(activityIndex);
        if (setCurrentTaskIndex) setCurrentTaskIndex(taskIndex);

        // Esperar otro frame antes de ir a waiting-for-explanation
        requestAnimationFrame(() => {
          setVoiceStep("waiting-for-explanation");
        });
      });
    },
    [
      autoSendVoice,
      recognitionRef,
      setIsRecording,
      setIsListening,
      setCurrentListeningFor,
      setCurrentActivityIndex,
      setCurrentTaskIndex,
      setVoiceStep,
    ],
  );

  // ==================== INICIO DE GRABACIÓN CON AUTO-SEND ====================
  const handleStartTaskExplanation = React.useCallback(async () => {
    const allowedStates = [
      "waiting-for-explanation",
      "confirmation",
      "task-presentation",
    ];

    if (!allowedStates.includes(voiceStep)) {
      return;
    }

    // Detener voz del asistente
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const currentTask = getCurrentTask();
    if (currentTask) {
      setCurrentListeningFor(`Explicación para: ${currentTask.nombre}`);
    }

    setVoiceStep("listening-explanation");

    // 🆕 USAR AUTO-SEND EN LUGAR DE VOICE RECOGNITION
    setTimeout(async () => {
      await autoSendVoice.startVoiceRecording();
    }, 100);
  }, [
    voiceStep,
    setCurrentListeningFor,
    setVoiceStep,
    autoSendVoice,
    getCurrentTask,
  ]);

  const currentActivity = getCurrentActivity();
  const currentTask = getCurrentTask();
  const totalActivities = activitiesWithTasks.length;
  const totalTasks = activitiesWithTasks.reduce(
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
    if (isSpeaking) return "Asistente hablando...";
    // 🆕 Mostrar estado de transcripción
    if (autoSendVoice.isTranscribing) return "Transcribiendo audio...";
    if (voiceStep === "confirm-start") return "Confirmar inicio";
    if (voiceStep === "activity-presentation")
      return `Presentando actividad ${currentActivityIndex + 1} de ${totalActivities}`;
    if (voiceStep === "task-presentation")
      return `Tarea ${currentTaskIndex + 1} de ${safeActivityTasksCount}`;
    if (voiceStep === "waiting-for-explanation") return "Esperando explicación";
    if (voiceStep === "listening-explanation")
      return "Escuchando tu explicación";
    if (voiceStep === "processing-explanation")
      return "Validando explicación...";
    if (voiceStep === "confirmation") return "Confirmar explicación";
    if (voiceStep === "summary") return "Resumen final";
    if (voiceStep === "sending") return "Enviando...";
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
                <h3 className="font-bold">Modo Voz Guiado</h3>
                <p className="text-xs text-gray-500">{getHeaderSubtitle()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* 🆕 INDICADOR DE VOZ MEJORADO */}
              {isSpeaking && (
                <div className="flex gap-1">
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

              {/* 🆕 INDICADOR DE NIVEL DE AUDIO */}
              {autoSendVoice.isRecording && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          autoSendVoice.audioLevel > i * 25
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
            </div>
          )}
        </div>

        <div className="p-6">
          {voiceStep === "confirm-start" && (
            <ConfirmStartStep
              activitiesWithTasks={activitiesWithTasks}
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
                startTaskExplanation={handleStartTaskExplanation} // 🆕 USAR LA NUEVA FUNCIÓN
                skipTask={skipTask}
              />
            )}

          {voiceStep === "listening-explanation" && (
            <ListeningExplanationStep
              currentListeningFor={currentListeningFor}
              retryCount={retryCount}
              voiceTranscript={voiceTranscript}
              theme={theme}
              stopRecording={autoSendVoice.cancelVoiceRecording} // 🆕 USAR AUTO-SEND
              processVoiceExplanation={processVoiceExplanation}
              recognitionRef={recognitionRef}
              setIsRecording={setIsRecording}
              setIsListening={setIsListening}
              setVoiceStep={setVoiceStep}
              setCurrentListeningFor={setCurrentListeningFor}
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

              <h4 className="text-lg font-bold">Validando explicación...</h4>

              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                El asistente está revisando tu explicación con inteligencia
                artificial
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

              <div className="flex gap-1 justify-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {voiceStep === "confirmation" && currentTask && (
            <ConfirmationStep
              currentTask={currentTask}
              voiceConfirmationText={voiceConfirmationText}
              theme={theme}
              isSpeaking={isSpeaking}
              retryExplanation={retryExplanation}
            />
          )}

          {voiceStep === "summary" && (
            <SummaryStep
              activitiesWithTasks={activitiesWithTasks}
              taskExplanations={taskExplanations}
              totalTasks={totalTasks}
              theme={theme}
              finishVoiceMode={finishVoiceMode}
              isSpeaking={isSpeaking}
              cancelVoiceMode={handleCancelVoiceMode}
              onEditTask={handleEditTask}
            />
          )}

          {voiceStep === "sending"}
        </div>
      </div>
    </div>
  );
};
