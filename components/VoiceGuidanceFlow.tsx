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
  SendingStep,
  ConfirmStartStep,
} from "@/components/VoiceGuidanceFlow-SubComponents";
import type { VoiceGuidanceFlowProps } from "@/lib/types";

export const VoiceGuidanceFlow: React.FC<VoiceGuidanceFlowProps> = ({
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
  confirmStartVoiceMode,
  speakTaskByIndices,
  startTaskExplanation,
  skipTask,
  stopRecording,
  processVoiceExplanation = () => {},
  confirmExplanation,
  retryExplanation,
  sendExplanationsToBackend,
  recognitionRef,
  setIsRecording,
  setIsListening,
  setVoiceStep,
  setCurrentListeningFor,
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

  const currentActivity = getCurrentActivity();
  const currentTask = getCurrentTask();
  const totalActivities = activitiesWithTasks.length;
  const totalTasks = activitiesWithTasks.reduce(
    (sum, activity) => sum + activity.tareas.length,
    0,
  );

  const isInFinalSteps = voiceStep === "summary" || voiceStep === "sending";

  if (!currentActivity && !isInFinalSteps) {
    console.error("ERROR: No hay actividad en el índice actual");
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
              <SpeedControlModal
                rate={rate}
                changeRate={changeRate}
                theme={theme}
              />
              <Button variant="ghost" size="sm" onClick={cancelVoiceMode}>
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
              cancelVoiceMode={cancelVoiceMode}
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
              stopRecording={stopRecording}
              processVoiceExplanation={processVoiceExplanation}
              recognitionRef={recognitionRef}
              setIsRecording={setIsRecording}
              setIsListening={setIsListening}
              setVoiceStep={setVoiceStep}
              setCurrentListeningFor={setCurrentListeningFor}
            />
          )}

          {/* ✅ NUEVO: Estado de procesamiento/validación */}
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
                  <p className="text-sm font-medium">📋 {currentTask.nombre}</p>
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
              confirmExplanation={confirmExplanation}
              retryExplanation={retryExplanation}
            />
          )}

          {voiceStep === "summary" && (
            <SummaryStep
              activitiesWithTasks={activitiesWithTasks}
              taskExplanations={taskExplanations}
              totalTasks={totalTasks}
              theme={theme}
              isSpeaking={isSpeaking}
              sendExplanationsToBackend={sendExplanationsToBackend}
              cancelVoiceMode={cancelVoiceMode}
            />
          )}

          {voiceStep === "sending" && <SendingStep theme={theme} />}
        </div>
      </div>
    </div>
  );
};
