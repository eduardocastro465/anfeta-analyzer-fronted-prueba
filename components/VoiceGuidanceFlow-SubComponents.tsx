import React from "react";
import {
  FolderOpen,
  Play,
  Mic,
  SkipForward,
  Check,
  X,
  Volume2,
  RotateCcw,
  Loader2,
  Target,
  Clock,
  Calendar,
  ListChecks,
} from "lucide-react";
import type { TaskExplanation } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Activity {
  actividadId: string;
  actividadTitulo: string;
  actividadHorario: string;
  tareas: Task[];
}

interface Task {
  id: string;
  nombre: string;
  prioridad: string;
  duracionMin: number;
  diasPendiente: number;
}

// ============================================
// CONFIRM START STEP
// ============================================
export const ConfirmStartStep: React.FC<{
  activitiesWithTasks: Activity[];
  totalActivities: number;
  totalTasks: number;
  theme: string;
  confirmStartVoiceMode: () => void;
  cancelVoiceMode: () => void;
}> = ({
  activitiesWithTasks,
  totalActivities,
  totalTasks,
  theme,
  confirmStartVoiceMode,
  cancelVoiceMode,
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-1.5">
      <div
        className={`p-2 rounded-md ${
          theme === "dark" ? "bg-[#252527]" : "bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-1">
          <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs">Actividades</span>
        </div>
        <div className="text-lg font-semibold leading-tight">
          {totalActivities}
        </div>
      </div>

      <div
        className={`p-2 rounded-md ${
          theme === "dark" ? "bg-[#252527]" : "bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-1">
          <ListChecks className="w-3.5 h-3.5 text-green-500" />
          <span className="text-xs">Tareas</span>
        </div>
        <div className="text-lg font-semibold leading-tight">{totalTasks}</div>
      </div>
    </div>

    {/* Lista de tareas */}
    <div
      className={`max-h-72 overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-400/40 hover:scrollbar-thumb-gray-400/70 ${
        theme === "dark"
          ? "border-[#2a2a2a] scrollbar-thumb-white/20"
          : "border-gray-200"
      }`}
    >
      {activitiesWithTasks.map((activity, aIdx) => (
        <div
          key={activity.actividadId}
          className={`${aIdx > 0 ? "border-t" : ""} ${
            theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200"
          }`}
        >
          <div
            className={`p-3 ${
              theme === "dark" ? "bg-[#252527]" : "bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-sm truncate">
                {activity.actividadTitulo}
              </span>
              <span className="text-xs text-gray-500 ml-auto shrink-0">
                {activity.actividadHorario}
              </span>
            </div>
          </div>
          {activity.tareas.map((tarea, tIdx) => (
            <div
              key={tarea.id}
              className={`p-3 flex items-center justify-between ${
                tIdx % 2 === 0
                  ? theme === "dark"
                    ? "bg-[#1a1a1a]"
                    : "bg-white"
                  : theme === "dark"
                    ? "bg-[#1f1f1f]"
                    : "bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    tarea.prioridad === "ALTA"
                      ? "bg-red-500/20 text-red-500"
                      : tarea.prioridad === "MEDIA"
                        ? "bg-yellow-500/20 text-yellow-500"
                        : "bg-green-500/20 text-green-500"
                  }`}
                >
                  {tIdx + 1}
                </div>
                <span className="text-sm truncate">{tarea.nombre}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <Badge
                  variant={
                    tarea.prioridad === "ALTA" ? "destructive" : "secondary"
                  }
                  className="text-xs"
                >
                  {tarea.prioridad}
                </Badge>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {tarea.duracionMin}m
                </span>
                {tarea.diasPendiente > 0 && (
                  <span className="text-xs text-gray-500">
                    {tarea.diasPendiente}d
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>

    {/* Tiempo total */}
    <div
      className={`p-3 rounded-lg ${
        theme === "dark" ? "bg-[#252527]" : "bg-gray-50"
      } flex justify-between items-center`}
    >
      <span className="text-sm text-gray-400">Tiempo total estimado:</span>
      <span className="font-bold text-[#6841ea]">
        {activitiesWithTasks.reduce(
          (sum, act) => sum + act.tareas.reduce((s, t) => s + t.duracionMin, 0),
          0,
        )}{" "}
        min
      </span>
    </div>

    <div className="flex gap-3 justify-center pt-2">
      <Button
        onClick={confirmStartVoiceMode}
        className="bg-[#6841ea] hover:bg-[#5a36d4] px-6"
      >
        <Play className="w-4 h-4 mr-2" />
        Comenzar
      </Button>
      <Button
        variant="outline"
        onClick={cancelVoiceMode}
        className="bg-transparent"
      >
        Cancelar
      </Button>
    </div>
  </div>
);

// ============================================
// ACTIVITY PRESENTATION STEP
// ============================================
export const ActivityPresentationStep: React.FC<{
  currentActivity: Activity;
  currentActivityIndex: number;
  totalActivities: number;
  isPaused: boolean;
  theme: string;
  isSpeaking: boolean;
  speakTaskByIndices: (activityIndex: number, taskIndex: number) => void;
}> = ({
  currentActivity,
  currentActivityIndex,
  totalActivities,
  theme,
  isSpeaking,
  isPaused,
  speakTaskByIndices,
}) => (
  <div className="space-y-4">
    <div
      className={`p-4 rounded-lg ${
        theme === "dark"
          ? "bg-blue-900/20 border border-blue-500/20"
          : "bg-blue-50 border border-blue-200"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
          }`}
        >
          <FolderOpen className="w-4 h-4 text-blue-500" />
        </div>
        <div>
          <h4 className="font-bold">
            Actividad {currentActivityIndex + 1} de {totalActivities}
          </h4>
          <p className="text-xs text-gray-500">
            {currentActivity.actividadHorario}
          </p>
        </div>
      </div>
      <h3 className="font-bold text-lg mb-2">
        {currentActivity.actividadTitulo}
      </h3>
      <div className="flex items-center gap-3 text-sm">
        <span
          className={`px-2 py-1 rounded ${
            theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"
          }`}
        >
          {currentActivity.tareas.length} tarea
          {currentActivity.tareas.length !== 1 ? "s" : ""}
        </span>
        <span
          className={`px-2 py-1 rounded ${
            theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"
          }`}
        >
          {currentActivity.tareas.reduce((sum, t) => sum + t.duracionMin, 0)}{" "}
          min
        </span>
      </div>
    </div>

    <div className="text-center">
      <p
        className={`text-sm ${
          theme === "dark" ? "text-gray-300" : "text-gray-600"
        } mb-4`}
      >
        Esta actividad tiene {currentActivity.tareas.length} tarea
        {currentActivity.tareas.length !== 1 ? "s" : ""} pendiente
        {currentActivity.tareas.length !== 1 ? "s" : ""}. Comenzaré a
        presentarlas.
      </p>
      <Button
        onClick={() => speakTaskByIndices(currentActivityIndex, 0)}
        className="bg-[#6841ea] hover:bg-[#5a36d4]"
        disabled={isSpeaking}
      >
        <Play className="w-4 h-4 mr-2" />
        Ver primera tarea
      </Button>
    </div>
  </div>
);

// ============================================
// TASK PRESENTATION STEP
// ============================================
export const TaskPresentationStep: React.FC<{
  currentTask: Task;
  currentActivity: Activity;
  currentTaskIndex: number;
  taskExplanations: TaskExplanation[];
  theme: string;
  voiceStep: string;
  isSpeaking: boolean;
  isPaused: boolean;
  startTaskExplanation: () => void;
  skipTask: () => void;
}> = ({
  currentTask,
  currentActivity,
  currentTaskIndex,
  taskExplanations,
  theme,
  voiceStep,
  isSpeaking,
  isPaused,
  startTaskExplanation,
  skipTask,
}) => (
  <div className="space-y-4">
    <div
      className={`p-3 rounded-lg ${
        theme === "dark" ? "bg-[#252527]" : "bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <FolderOpen className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium">
          {currentActivity.actividadTitulo}
        </span>
      </div>

      <div
        className={`p-3 rounded ${
          theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentTask.prioridad === "ALTA"
                    ? "bg-red-500/20 text-red-500"
                    : currentTask.prioridad === "MEDIA"
                      ? "bg-yellow-500/20 text-yellow-500"
                      : "bg-green-500/20 text-green-500"
                }`}
              >
                {currentTaskIndex + 1}
              </div>
              <h4 className="font-bold">{currentTask.nombre}</h4>
            </div>
            <div className="flex gap-3 text-sm text-gray-500 ml-8">
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {currentTask.prioridad}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {currentTask.duracionMin} min
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {currentTask.diasPendiente || 0} días
              </span>
            </div>
          </div>
          <Badge
            variant={
              currentTask.prioridad === "ALTA" ? "destructive" : "secondary"
            }
            className="text-xs shrink-0"
          >
            {currentTask.prioridad}
          </Badge>
        </div>

        {taskExplanations.find((exp) => exp.taskId === currentTask.id)
          ?.explanation !== "[Tarea saltada]" &&
          taskExplanations.find((exp) => exp.taskId === currentTask.id) && (
            <div
              className={`mt-3 p-2 rounded ${
                theme === "dark"
                  ? "bg-green-900/20 border border-green-500/20"
                  : "bg-green-50 border border-green-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-xs font-medium">
                  Explicación guardada
                </span>
              </div>
            </div>
          )}
      </div>
    </div>

    <div className="flex gap-3">
      <Button
        onClick={startTaskExplanation}
        className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4] h-12"
        disabled={isSpeaking}
      >
        <Mic className="w-4 h-4 mr-2" />
        {taskExplanations.find((exp) => exp.taskId === currentTask.id)
          ? "Corregir explicación"
          : "Explicar esta tarea"}
      </Button>
      <Button
        variant="outline"
        onClick={skipTask}
        className="h-12 bg-transparent"
        disabled={isSpeaking}
      >
        <SkipForward className="w-4 h-4" />
      </Button>
    </div>

    {voiceStep === "waiting-for-explanation" && (
      <div className="text-center text-sm text-gray-500">
        Presiona el botón para empezar a explicar esta tarea, o di "saltar" para
        omitirla
      </div>
    )}
  </div>
);

// ============================================
// LISTENING EXPLANATION STEP
// ============================================
export const ListeningExplanationStep: React.FC<{
  currentListeningFor: string;
  retryCount: number;
  voiceTranscript: string;
  theme: string;
  stopRecording: () => void;
  recognitionRef: React.MutableRefObject<any>;
  setIsRecording: (recording: boolean) => void;
  setIsListening: (listening: boolean) => void;
  setVoiceStep: (step: any) => void;
  processVoiceExplanation: (transcript: string) => void;
  setCurrentListeningFor: (text: string) => void;
  isPaused: boolean;
}> = ({
  currentListeningFor,
  retryCount,
  voiceTranscript,
  theme,
  stopRecording,
  recognitionRef,
  setIsRecording,
  setIsListening,
  setVoiceStep,
  processVoiceExplanation,
  setCurrentListeningFor,
  isPaused,
}) => {
  const [isValidating, setIsValidating] = React.useState(false);
  const [countdown, setCountdown] = React.useState<number | null>(null);

  React.useEffect(() => {
    let silenceTimer: NodeJS.Timeout | null = null;
    let countdownInterval: NodeJS.Timeout | null = null;

    if (voiceTranscript && voiceTranscript.trim().length > 0) {
      setCountdown(3);

      countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval!);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      silenceTimer = setTimeout(() => {
        setCountdown(null);

        // DETENER RECONOCIMIENTO Y PROCESAR
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setIsRecording(false);
        setIsListening(false);

        // LLAMAR DIRECTAMENTE A processVoiceExplanation
        processVoiceExplanation(voiceTranscript);
      }, 3000);
    }

    return () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [
    voiceTranscript,
    processVoiceExplanation,
    recognitionRef,
    setIsRecording,
    setIsListening,
  ]);

  return (
    <div className="text-center space-y-4">
      <div className="relative">
        <div
          className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
            isValidating
              ? "bg-blue-500/20 animate-spin"
              : "bg-red-500/20 animate-pulse"
          }`}
        >
          {isValidating ? (
            <Loader2 className="w-10 h-10 text-blue-500" />
          ) : (
            <Mic className="w-10 h-10 text-red-500" />
          )}
        </div>

        {!isValidating && (
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
        )}

        {/* Countdown flotante debajo del micrófono */}
        {countdown !== null && !isValidating && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="bg-[#6841ea] text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
              Enviando en {countdown}s
            </div>
          </div>
        )}
      </div>

      <h4 className="text-lg font-bold">
        {isValidating ? "Validando..." : "Escuchando..."}
      </h4>

      {currentListeningFor && !isValidating && (
        <div
          className={`p-3 rounded-lg ${
            theme === "dark"
              ? "bg-blue-900/20 border border-blue-500/20"
              : "bg-blue-50 border border-blue-200"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              theme === "dark" ? "text-blue-300" : "text-blue-700"
            }`}
          >
            Escuchando para: {currentListeningFor}
          </p>
        </div>
      )}

      <p
        className={`text-sm ${
          theme === "dark" ? "text-gray-300" : "text-gray-600"
        }`}
      >
        {isValidating
          ? "Validando tu explicación con el asistente..."
          : retryCount > 0
            ? "Corrige tu explicación, por favor."
            : "Por favor, explica cómo resolverás esta tarea."}
      </p>

      {/* INDICADOR DE GRABACIÓN ACTIVA - Cuando no hay transcript todavía */}
      {!voiceTranscript && !isValidating && (
        <div className={`p-4 rounded-lg border-2 border-dashed ${
          theme === "dark" 
            ? "border-red-500/30 bg-red-900/10" 
            : "border-red-300 bg-red-50"
        }`}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full animate-pulse"
                  style={{
                    height: `${12 + (i % 3) * 8}px`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: '0.8s'
                  }}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-red-500">
              🎤 Grabando... Habla ahora
            </span>
          </div>
          <p className="text-xs text-center text-gray-500">
            Tu voz se está capturando. El texto aparecerá aquí en tiempo real.
          </p>
        </div>
      )}

      {/* CONTADOR DE SILENCIO GRANDE Y PROMINENTE */}
      {countdown !== null && !isValidating && voiceTranscript && (
        <div className={`p-4 rounded-lg border-2 ${
          theme === "dark"
            ? "border-[#6841ea] bg-[#6841ea]/10"
            : "border-[#6841ea] bg-[#6841ea]/5"
        }`}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-[#6841ea] animate-pulse" />
            <span className="text-lg font-bold text-[#6841ea]">
              Auto-envío en {countdown} segundo{countdown !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-center text-gray-500">
            Detecté silencio. Si no hablas más, enviaré automáticamente tu explicación.
          </p>
          {/* Barra de progreso visual */}
          <div className="mt-3 w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#6841ea] transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* MOSTRAR TRANSCRIPT cuando existe */}
      {voiceTranscript && (
        <div
          className={`p-3 rounded ${
            theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"
          }`}
        >
          <p className="text-sm mb-2">{voiceTranscript}</p>
          <p className="text-xs text-gray-500">
            {isValidating
              ? "Validando con IA..."
              : countdown !== null
                ? "⏱️ Timer activo - Continúa hablando para cancelar el auto-envío"
                : "Continúa hablando o haz clic en un botón"}
          </p>
        </div>
      )}

      {!isValidating && (
        <div className="flex gap-3 justify-center">
          <Button
            onClick={stopRecording}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            Enviar ahora
          </Button>
          <Button
            onClick={() => {
              if (recognitionRef.current) {
                recognitionRef.current.stop();
              }
              setIsRecording(false);
              setIsListening(false);
              setVoiceStep("waiting-for-explanation");
              setCurrentListeningFor("");
            }}
            variant="outline"
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
};

// ============================================
// CONFIRMATION STEP
// ============================================
export const ConfirmationStep: React.FC<{
  currentTask: Task;
  voiceConfirmationText: string;
  theme: string;
  isSpeaking: boolean;
  isPaused: boolean;
  retryExplanation: () => void;
}> = ({
  currentTask,
  voiceConfirmationText,
  theme,
  isSpeaking,
  isPaused,
  retryExplanation,
}) => (
  <div className="space-y-4">
    <div
      className={`p-4 rounded-lg ${
        theme === "dark"
          ? "bg-blue-900/20 border border-blue-500/20"
          : "bg-blue-50 border border-blue-200"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Volume2 className="w-5 h-5 text-blue-500" />
        <span className="font-medium">Tu explicación para:</span>
      </div>
      <p className="text-sm font-medium mb-2">{currentTask.nombre}</p>
      <div
        className={`p-3 rounded ${
          theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"
        }`}
      >
        <p
          className={`text-sm ${
            theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`}
        >
          {voiceConfirmationText}
        </p>
      </div>
    </div>

    <p
      className={`text-sm text-center ${
        theme === "dark" ? "text-gray-300" : "text-gray-600"
      }`}
    >
      ¿Confirmas esta explicación? Di "sí" para confirmar o "no" para corregir.
    </p>

    <div className="flex gap-3">
      <Button
        className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4]"
        disabled={isSpeaking}
      >
        <Check className="w-4 h-4 mr-2" />
        Sí, confirmar
      </Button>
      <Button
        variant="outline"
        onClick={retryExplanation}
        className="flex-1 bg-transparent"
        disabled={isSpeaking}
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        No, corregir
      </Button>
    </div>
  </div>
);

// ============================================
// SUMMARY STEP
// ============================================
export const SummaryStep: React.FC<{
  activitiesWithTasks: Activity[];
  taskExplanations: TaskExplanation[];
  totalTasks: number;
  theme: string;
  isSpeaking: boolean;
  isPaused: boolean;
  cancelVoiceMode: () => void;
  onEditTask: (activityIndex: number, taskIndex: number) => void;
  finishVoiceMode: () => void;
}> = ({
  activitiesWithTasks,
  taskExplanations,
  totalTasks,
  theme,
  isSpeaking,
  isPaused,
  cancelVoiceMode,
  onEditTask,
  finishVoiceMode,
}) => (
  <div className="space-y-4">
    <div className="text-center">
      <div
        className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
          theme === "dark" ? "bg-green-900/20" : "bg-green-100"
        }`}
      >
        <Check className="w-8 h-8 text-green-500" />
      </div>
      <h4 className="text-lg font-bold mt-3">¡Todas las tareas explicadas!</h4>
      <p
        className={`text-sm ${
          theme === "dark" ? "text-gray-300" : "text-gray-600"
        } mt-1`}
      >
        Has completado{" "}
        {
          taskExplanations.filter(
            (exp) => exp.explanation !== "[Tarea saltada]",
          ).length
        }{" "}
        de {totalTasks} tareas.
      </p>
    </div>

    <div
      className={`max-h-60 overflow-y-auto rounded-lg border ${
        theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200"
      }`}
    >
      {activitiesWithTasks.map((activity) => {
        const activityExplanations = taskExplanations.filter(
          (exp) =>
            exp.activityTitle === activity.actividadTitulo &&
            exp.explanation !== "[Tarea saltada]",
        );

        if (activityExplanations.length === 0) return null;

        return (
          <div key={activity.actividadId} className="border-b border-[#2a2a2a]">
            <div
              className={`p-3 ${
                theme === "dark" ? "bg-[#252527]" : "bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">
                  {activity.actividadTitulo}
                </span>
                <Badge variant="outline" className="text-xs">
                  {activityExplanations.length} de {activity.tareas.length}
                </Badge>
              </div>
            </div>
            {activityExplanations.map((exp, tIdx) => (
              <div
                key={exp.taskId}
                className={`p-3 ${
                  tIdx % 2 === 0
                    ? theme === "dark"
                      ? "bg-[#1a1a1a]"
                      : "bg-white"
                    : theme === "dark"
                      ? "bg-[#252527]"
                      : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Check
                    className={`w-3 h-3 ${
                      exp.confirmed ? "text-green-500" : "text-yellow-500"
                    }`}
                  />
                  <span className="font-medium text-sm truncate">
                    {exp.taskName}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {exp.priority}
                  </Badge>
                </div>
                <p
                  className={`text-xs ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  } ml-5`}
                >
                  {exp.explanation}
                </p>
              </div>
            ))}
          </div>
        );
      })}
    </div>

    <div className="flex gap-3">
      <Button
        onClick={finishVoiceMode}
        className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4]"
        disabled={isSpeaking}
      >
        enviar y comenzar jornada
      </Button>
    </div>
  </div>
);