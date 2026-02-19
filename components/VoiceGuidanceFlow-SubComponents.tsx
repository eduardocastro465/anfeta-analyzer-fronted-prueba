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
}> = ({ activitiesWithTasks, totalActivities, totalTasks, theme, confirmStartVoiceMode, cancelVoiceMode }) => (
  <div className="space-y-2 sm:space-y-4">
    {/* Métricas en 3 columnas para incluir tiempo total */}
    <div className="grid grid-cols-3 gap-1.5">
      <div className={`p-2 rounded-md ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
        <div className="flex items-center gap-1 mb-0.5">
          <FolderOpen className="w-3 h-3 text-blue-500" />
          <span className="text-[10px] sm:text-xs text-gray-500">Act.</span>
        </div>
        <div className="text-base sm:text-lg font-semibold leading-none">{totalActivities}</div>
      </div>
      <div className={`p-2 rounded-md ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
        <div className="flex items-center gap-1 mb-0.5">
          <ListChecks className="w-3 h-3 text-green-500" />
          <span className="text-[10px] sm:text-xs text-gray-500">Tareas</span>
        </div>
        <div className="text-base sm:text-lg font-semibold leading-none">{totalTasks}</div>
      </div>
      <div className={`p-2 rounded-md ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
        <div className="flex items-center gap-1 mb-0.5">
          <Clock className="w-3 h-3 text-purple-500" />
          <span className="text-[10px] sm:text-xs text-gray-500">Min.</span>
        </div>
        <div className="text-base sm:text-lg font-semibold leading-none">
          {activitiesWithTasks.reduce(
            (sum, act) => sum + act.tareas.reduce((s, t) => s + t.duracionMin, 0),
            0,
          )}
        </div>
      </div>
    </div>

    {/* Lista de tareas */}
    <div
      className={`max-h-40 sm:max-h-72 overflow-y-auto rounded-lg border ${
        theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200"
      }`}
    >
      {activitiesWithTasks.map((activity, aIdx) => (
        <div
          key={activity.actividadId}
          className={`${aIdx > 0 ? "border-t" : ""} ${
            theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200"
          }`}
        >
          {/* Cabecera actividad */}
          <div className={`px-2.5 py-1.5 sm:p-3 ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
              <span className="font-medium text-[11px] sm:text-sm truncate flex-1">
                {activity.actividadTitulo}
              </span>
              <span className="text-[10px] text-gray-500 shrink-0">{activity.actividadHorario}</span>
            </div>
          </div>

          {/* Filas de tareas */}
          {activity.tareas.map((tarea, tIdx) => (
            <div
              key={tarea.id}
              className={`px-2.5 py-1.5 sm:p-3 flex items-center justify-between gap-2 ${
                tIdx % 2 === 0
                  ? theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"
                  : theme === "dark" ? "bg-[#1f1f1f]" : "bg-gray-50/60"
              }`}
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    tarea.prioridad === "ALTA"
                      ? "bg-red-500/20 text-red-500"
                      : tarea.prioridad === "MEDIA"
                        ? "bg-yellow-500/20 text-yellow-500"
                        : "bg-green-500/20 text-green-500"
                  }`}
                >
                  {tIdx + 1}
                </div>
                <span className="text-[11px] sm:text-sm truncate">{tarea.nombre}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-gray-400">
                <Clock className="w-2.5 h-2.5" />
                {tarea.duracionMin}m
                {tarea.diasPendiente > 0 && (
                  <span className="hidden sm:inline">{tarea.diasPendiente}d</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>

    {/* Acciones */}
    <div className="flex gap-2">
      <Button
        onClick={confirmStartVoiceMode}
        className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4] h-8 sm:h-10 text-xs sm:text-sm"
      >
        <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
        Comenzar
      </Button>
      <Button
        variant="outline"
        onClick={cancelVoiceMode}
        className="bg-transparent h-8 sm:h-10 px-3 sm:px-5 text-xs sm:text-sm"
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
}> = ({ currentActivity, currentActivityIndex, totalActivities, theme, isSpeaking, speakTaskByIndices }) => (
  <div className="space-y-3 sm:space-y-4">
    <div
      className={`p-3 sm:p-4 rounded-lg ${
        theme === "dark"
          ? "bg-blue-900/20 border border-blue-500/20"
          : "bg-blue-50 border border-blue-200"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${
            theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-xs sm:text-base">
            Actividad {currentActivityIndex + 1} de {totalActivities}
          </h4>
          <p className="text-[10px] sm:text-xs text-gray-500 truncate">
            {currentActivity.actividadHorario}
          </p>
        </div>
      </div>

      <h3 className="font-bold text-sm sm:text-lg mb-2">{currentActivity.actividadTitulo}</h3>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs ${theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"}`}>
          {currentActivity.tareas.length} tarea{currentActivity.tareas.length !== 1 ? "s" : ""}
        </span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs ${theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"}`}>
          {currentActivity.tareas.reduce((sum, t) => sum + t.duracionMin, 0)} min
        </span>
      </div>
    </div>

    <div className="text-center">
      <p className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"} mb-3`}>
        Esta actividad tiene {currentActivity.tareas.length} tarea
        {currentActivity.tareas.length !== 1 ? "s" : ""} pendiente
        {currentActivity.tareas.length !== 1 ? "s" : ""}.
      </p>
      <Button
        onClick={() => speakTaskByIndices(currentActivityIndex, 0)}
        className="bg-[#6841ea] hover:bg-[#5a36d4] h-8 sm:h-10 text-xs sm:text-sm w-full sm:w-auto"
        disabled={isSpeaking}
      >
        <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
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
  startTaskExplanation,
  skipTask,
}) => {
  const hasExplanation = taskExplanations.find((exp) => exp.taskId === currentTask.id);
  const isSkipped = hasExplanation?.explanation === "[Tarea saltada]";

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <div className={`p-2.5 sm:p-3 rounded-lg ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
        {/* Actividad padre */}
        <div className="flex items-center gap-1.5 mb-2">
          <FolderOpen className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
          <span className="text-[11px] sm:text-sm font-medium truncate">
            {currentActivity.actividadTitulo}
          </span>
        </div>

        {/* Tarjeta tarea */}
        <div className={`p-2.5 sm:p-3 rounded ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}>
          <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${
                    currentTask.prioridad === "ALTA"
                      ? "bg-red-500/20 text-red-500"
                      : currentTask.prioridad === "MEDIA"
                        ? "bg-yellow-500/20 text-yellow-500"
                        : "bg-green-500/20 text-green-500"
                  }`}
                >
                  {currentTaskIndex + 1}
                </div>
                <h4 className="font-bold text-xs sm:text-base">{currentTask.nombre}</h4>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-sm text-gray-500 ml-6 sm:ml-8">
                <span className="flex items-center gap-0.5">
                  <Target className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {currentTask.prioridad}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {currentTask.duracionMin}m
                </span>
                <span className="flex items-center gap-0.5">
                  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {currentTask.diasPendiente || 0}d
                </span>
              </div>
            </div>
            <Badge
              variant={currentTask.prioridad === "ALTA" ? "destructive" : "secondary"}
              className="text-[10px] px-1 sm:px-1.5 py-0.5 shrink-0 h-fit"
            >
              {currentTask.prioridad}
            </Badge>
          </div>

          {hasExplanation && !isSkipped && (
            <div
              className={`p-1.5 sm:p-2 rounded ${
                theme === "dark"
                  ? "bg-green-900/20 border border-green-500/20"
                  : "bg-green-50 border border-green-200"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" />
                <span className="text-[10px] sm:text-xs font-medium">Explicación guardada</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={startTaskExplanation}
          className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4] h-8 sm:h-12 text-xs sm:text-sm"
          disabled={isSpeaking}
        >
          <Mic className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
          {hasExplanation && !isSkipped ? "Corregir" : "Explicar"}
        </Button>
        <Button
          variant="outline"
          onClick={skipTask}
          className="h-8 sm:h-12 px-2.5 sm:px-3 bg-transparent"
          disabled={isSpeaking}
          title="Saltar tarea"
        >
          <SkipForward className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
      </div>

      {voiceStep === "waiting-for-explanation" && (
        <p className="text-center text-[10px] sm:text-sm text-gray-500">
          Presiona el botón para explicar esta tarea, o di "saltar" para omitirla.
        </p>
      )}
    </div>
  );
};

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
        if (recognitionRef.current) recognitionRef.current.stop();
        setIsRecording(false);
        setIsListening(false);
        processVoiceExplanation(voiceTranscript);
      }, 3000);
    }

    return () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [voiceTranscript, processVoiceExplanation, recognitionRef, setIsRecording, setIsListening]);

  return (
    <div className="text-center space-y-2.5 sm:space-y-4">
      {/* Ícono micrófono */}
      <div className="relative w-14 h-14 sm:w-20 sm:h-20 mx-auto">
        <div
          className={`w-full h-full rounded-full flex items-center justify-center ${
            isValidating ? "bg-blue-500/20 animate-spin" : "bg-red-500/20 animate-pulse"
          }`}
        >
          {isValidating
            ? <Loader2 className="w-7 h-7 sm:w-10 sm:h-10 text-blue-500" />
            : <Mic className="w-7 h-7 sm:w-10 sm:h-10 text-red-500" />
          }
        </div>
        {!isValidating && (
          <div className="absolute inset-0 flex items-center justify-center">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute rounded-full border-2 border-red-500 animate-ping"
                style={{
                  width: `${i * 18 + 56}px`,
                  height: `${i * 18 + 56}px`,
                  animationDelay: `${i * 0.2}s`,
                  opacity: 0.4 - i * 0.1,
                }}
              />
            ))}
          </div>
        )}
        {countdown !== null && !isValidating && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <div className="bg-[#6841ea] text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse whitespace-nowrap">
              {countdown}s
            </div>
          </div>
        )}
      </div>

      <h4 className="text-sm sm:text-lg font-bold">
        {isValidating ? "Validando..." : "Escuchando..."}
      </h4>

      {currentListeningFor && !isValidating && (
        <div
          className={`px-2.5 py-1.5 sm:p-3 rounded-lg ${
            theme === "dark"
              ? "bg-blue-900/20 border border-blue-500/20"
              : "bg-blue-50 border border-blue-200"
          }`}
        >
          <p
            className={`text-[10px] sm:text-sm font-medium truncate ${
              theme === "dark" ? "text-blue-300" : "text-blue-700"
            }`}
          >
            {currentListeningFor}
          </p>
        </div>
      )}

      <p className={`text-[10px] sm:text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
        {isValidating
          ? "Validando tu explicación con el asistente..."
          : retryCount > 0
            ? "Corrige tu explicación, por favor."
            : "Por favor, explica cómo resolverás esta tarea."}
      </p>

      {/* Indicador grabando (sin transcript aún) */}
      {!voiceTranscript && !isValidating && (
        <div
          className={`p-2.5 sm:p-4 rounded-lg border-2 border-dashed ${
            theme === "dark" ? "border-red-500/30 bg-red-900/10" : "border-red-300 bg-red-50"
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-0.5 bg-red-500 rounded-full animate-pulse"
                  style={{
                    height: `${10 + (i % 3) * 6}px`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: "0.8s",
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-red-500">Grabando...</span>
          </div>
          <p className="text-[10px] text-center text-gray-500 hidden sm:block">
            Tu voz se está capturando. El texto aparecerá aquí en tiempo real.
          </p>
        </div>
      )}

      {/* Countdown de silencio */}
      {countdown !== null && !isValidating && voiceTranscript && (
        <div
          className={`p-2.5 sm:p-4 rounded-lg border-2 ${
            theme === "dark" ? "border-[#6841ea] bg-[#6841ea]/10" : "border-[#6841ea] bg-[#6841ea]/5"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 sm:gap-3 mb-1.5">
            <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#6841ea] animate-pulse" />
            <span className="text-xs sm:text-lg font-bold text-[#6841ea]">
              Auto-envío en {countdown}s
            </span>
          </div>
          <p className="text-[10px] text-center text-gray-500 hidden sm:block">
            Detecté silencio. Si no hablas más, enviaré automáticamente tu explicación.
          </p>
          <div className="mt-1.5 sm:mt-3 w-full h-1 sm:h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6841ea] transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Transcript */}
      {voiceTranscript && (
        <div className={`p-2 sm:p-3 rounded text-left ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}>
          <p className="text-xs sm:text-sm">{voiceTranscript}</p>
          <p className="text-[10px] text-gray-500 mt-1">
            {isValidating
              ? "Validando con IA..."
              : countdown !== null
                ? "Continúa hablando para cancelar el auto-envío"
                : "Haz clic en un botón para continuar"}
          </p>
        </div>
      )}

      {!isValidating && (
        <div className="flex gap-2 justify-center">
          <Button
            onClick={stopRecording}
            className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white h-8 sm:h-10 text-xs sm:text-sm"
          >
            <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            Enviar
          </Button>
          <Button
            onClick={() => {
              if (recognitionRef.current) recognitionRef.current.stop();
              setIsRecording(false);
              setIsListening(false);
              setVoiceStep("waiting-for-explanation");
              setCurrentListeningFor("");
            }}
            variant="outline"
            className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white border-red-500 h-8 sm:h-10 text-xs sm:text-sm"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
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
}> = ({ currentTask, voiceConfirmationText, theme, isSpeaking, retryExplanation }) => (
  <div className="space-y-2.5 sm:space-y-4">
    <div
      className={`p-2.5 sm:p-4 rounded-lg ${
        theme === "dark"
          ? "bg-blue-900/20 border border-blue-500/20"
          : "bg-blue-50 border border-blue-200"
      }`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
        <Volume2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-500" />
        <span className="font-medium text-xs sm:text-base">Tu explicación para:</span>
      </div>
      <p className="text-[11px] sm:text-sm font-medium mb-1.5">{currentTask.nombre}</p>
      <div className={`p-2 sm:p-3 rounded ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}>
        <p className={`text-[11px] sm:text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
          {voiceConfirmationText}
        </p>
      </div>
    </div>

    <p className={`text-[10px] sm:text-sm text-center ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
      ¿Confirmas esta explicación? Di "sí" para confirmar o "no" para corregir.
    </p>

    <div className="flex gap-2">
      <Button
        className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4] h-8 sm:h-11 text-xs sm:text-sm"
        disabled={isSpeaking}
      >
        <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
        Sí, confirmar
      </Button>
      <Button
        variant="outline"
        onClick={retryExplanation}
        className="flex-1 bg-transparent h-8 sm:h-11 text-xs sm:text-sm"
        disabled={isSpeaking}
      >
        <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
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
}> = ({ activitiesWithTasks, taskExplanations, totalTasks, theme, isSpeaking, finishVoiceMode }) => {
  const completedCount = taskExplanations.filter(
    (exp) => exp.explanation !== "[Tarea saltada]",
  ).length;

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <div className="text-center">
        <div
          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto flex items-center justify-center ${
            theme === "dark" ? "bg-green-900/20" : "bg-green-100"
          }`}
        >
          <Check className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
        </div>
        <h4 className="text-sm sm:text-lg font-bold mt-2">¡Todas las tareas explicadas!</h4>
        <p className={`text-[10px] sm:text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"} mt-0.5`}>
          Has completado {completedCount} de {totalTasks} tareas.
        </p>
      </div>

      {/* Lista resumen */}
      <div
        className={`max-h-36 sm:max-h-60 overflow-y-auto rounded-lg border ${
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
            <div
              key={activity.actividadId}
              className={`border-b last:border-b-0 ${theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200"}`}
            >
              <div className={`px-2.5 py-1.5 sm:p-3 ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
                  <span className="font-medium text-[11px] sm:text-sm truncate flex-1">
                    {activity.actividadTitulo}
                  </span>
                  <span className="text-[10px] text-gray-500 shrink-0">
                    {activityExplanations.length}/{activity.tareas.length}
                  </span>
                </div>
              </div>

              {activityExplanations.map((exp, tIdx) => (
                <div
                  key={exp.taskId}
                  className={`px-2.5 py-1.5 sm:p-3 ${
                    tIdx % 2 === 0
                      ? theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"
                      : theme === "dark" ? "bg-[#252527]" : "bg-gray-50/60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Check
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 ${
                        exp.confirmed ? "text-green-500" : "text-yellow-500"
                      }`}
                    />
                    <span className="font-medium text-[10px] sm:text-sm truncate flex-1">
                      {exp.taskName}
                    </span>
                    <Badge variant="outline" className="text-[10px] hidden sm:flex">
                      {exp.priority}
                    </Badge>
                  </div>
                  <p
                    className={`text-[10px] sm:text-xs ml-4 sm:ml-5 line-clamp-1 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {exp.explanation}
                  </p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <Button
        onClick={finishVoiceMode}
        className="w-full bg-[#6841ea] hover:bg-[#5a36d4] h-8 sm:h-11 text-xs sm:text-sm"
        disabled={isSpeaking}
      >
        Enviar y comenzar jornada
      </Button>
    </div>
  );
};