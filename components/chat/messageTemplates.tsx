import {
  Bot,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Brain,
  Target,
  User,
  Mail,
  Check,
  Users,
} from "lucide-react";
import type { AssistantAnalysis } from "@/lib/types";

interface MessageTemplateProps {
  theme: "light" | "dark";
}

// ========== MENSAJES DE SISTEMA ==========

export const systemTemplates = {
  modeIA: ({ theme }: MessageTemplateProps) => (
    <div
      className={`p-3 rounded-lg border ${
        theme === "dark"
          ? "bg-[#6841ea]/10 border-[#6841ea]/20"
          : "bg-purple-50 border-purple-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-[#6841ea] flex-shrink-0" />
        <span className="text-sm font-medium text-[#6841ea]">
          Modo Asistente IA activado
        </span>
      </div>
      <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
        Ahora puedes hacer preguntas sobre tus tareas y recibir ayuda
        personalizada.
      </p>
    </div>
  ),

  modeNormal: ({ theme }: MessageTemplateProps) => (
    <div className="text-xs text-gray-500 dark:text-gray-400">
      Modo normal activado
    </div>
  ),

  loadingActivities: ({
    theme,
    showAll,
  }: MessageTemplateProps & { showAll?: boolean }) => (
    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
      <Brain className="w-4 h-4 text-[#6841ea] flex-shrink-0" />
      <span className="text-sm">
        {showAll
          ? "Obteniendo todas tus actividades..."
          : "Obteniendo análisis de tus actividades..."}
      </span>
    </div>
  ),
};

// ========== MENSAJES DE BIENVENIDA ==========

export const welcomeTemplates = {
  userInfo: ({
    theme,
    displayName,
    email,
  }: MessageTemplateProps & { displayName: string; email: string }) => (
    <div className="flex flex-col gap-3 w-full">
      {/* Card Usuario */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-[#6841ea]/5 border border-[#6841ea]/10 w-full max-w-full">
        <div className="p-2 rounded-full bg-[#6841ea]/10 shrink-0">
          <User className="w-5 h-5 text-[#6841ea]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm break-words leading-tight">
            Hola, {displayName}!
          </p>

          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 min-w-0">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="break-all leading-tight">{email}</span>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="flex items-start gap-3 w-full max-w-full">
        <div className="p-2 rounded-full bg-[#6841ea]/10 shrink-0">
          <Brain className="w-5 h-5 text-[#6841ea]" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm sm:text-base">Resumen de tu día</h3>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString("es-MX", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  ),
};

// ========== MENSAJES DE ANÁLISIS ==========

export const analysisTemplates = {
  metrics: ({
    theme,
    analysis,
  }: MessageTemplateProps & { analysis: AssistantAnalysis }) => (
   <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 mt-3">
        {/* ── Alta prioridad ── */}
        <div
          className={`p-2 sm:p-3 rounded-lg border ${
            theme === "dark"
              ? "bg-gradient-to-br from-red-950/20 to-red-900/10 border-red-500/20"
              : "bg-gradient-to-br from-red-50 to-red-100/50 border-red-200"
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-2 mb-1">
            <Target className="w-3 h-3 text-red-500 flex-shrink-0" />
            <span
              className={`text-[10px] sm:text-xs font-medium truncate ${
                theme === "dark" ? "text-red-300" : "text-red-700"
              }`}
            >
              Alta
            </span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-red-500 truncate">
            {analysis.metrics.tareasAltaPrioridad || 0}
          </div>
        </div>

        {/* ── Total ── */}
        <div
          className={`p-2 sm:p-3 rounded-lg border ${
            theme === "dark"
              ? "bg-gradient-to-br from-green-950/20 to-green-900/10 border-green-500/20"
              : "bg-gradient-to-br from-green-50 to-green-100/50 border-green-200"
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-2 mb-1">
            <FileText className="w-3 h-3 text-green-500 flex-shrink-0" />
            <span
              className={`text-[10px] sm:text-xs font-medium truncate ${
                theme === "dark" ? "text-green-300" : "text-green-700"
              }`}
            >
              Total
            </span>
          </div>
          <div
            className={`text-lg sm:text-xl font-bold truncate ${
              theme === "dark" ? "text-green-400" : "text-green-600"
            }`}
          >
            {analysis.metrics.tareasConTiempo || 0}
          </div>
        </div>

        {/* ── Tiempo ── */}
        <div
          className={`p-2 sm:p-3 rounded-lg border ${
            theme === "dark"
              ? "bg-gradient-to-br from-yellow-950/20 to-yellow-900/10 border-yellow-500/20"
              : "bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200"
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-2 mb-1">
            <Clock className="w-3 h-3 text-yellow-500 flex-shrink-0" />
            <span
              className={`text-[10px] sm:text-xs font-medium truncate ${
                theme === "dark" ? "text-yellow-300" : "text-yellow-700"
              }`}
            >
              Tiempo
            </span>
          </div>
          {/* Tiempo puede ser "2h 30m" — usamos text-sm en xs para que quepa */}
          <div className="text-sm sm:text-xl font-bold text-yellow-500 truncate">
            {analysis.metrics.tiempoEstimadoTotal || "0h 0m"}
          </div>
        </div>
      </div>

      {/* ── Texto descriptivo ── */}
      {analysis.answer && (
        <div
          className={`p-3 rounded-lg border ${
            theme === "dark"
              ? "bg-gradient-to-br from-[#6841ea]/10 to-[#8b5cf6]/5 border-[#6841ea]/20"
              : "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200"
          }`}
        >
          <div className="flex items-start gap-2">
            <Bot className="w-4 h-4 text-[#6841ea] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
              {analysis.answer
                .split("\n")
                .filter((line) => line.trim().length > 0)
                .map((line, i) => {
                  const isBold = line.includes("**");
                  const clean = line.replace(/\*\*/g, "").trim();
                  return (
                    <p
                      key={i}
                      className={`text-sm leading-relaxed ${
                        isBold
                          ? "font-semibold text-[#6841ea]"
                          : theme === "dark"
                            ? "text-gray-200"
                            : "text-gray-700"
                      }`}
                    >
                      {clean}
                    </p>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  ),
};

// ========== MENSAJES DE TAREAS ==========

export const tasksTemplates = {
  tasksLoaded: ({
    theme,
    total,
    reportadas,
    pendientes,
  }: MessageTemplateProps & {
    total: number;
    reportadas: number;
    pendientes: number;
  }) => (
    <div
      className={`p-3 rounded-lg border ${
        theme === "dark"
          ? "bg-[#6841ea]/10 border-[#6841ea]/20"
          : "bg-purple-50 border-purple-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <Target className="w-5 h-5 text-[#6841ea] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm mb-2">Tareas encontradas</p>
          <div className="flex gap-2 text-xs flex-wrap">
            <span
              className={`px-2 py-1 rounded whitespace-nowrap ${
                theme === "dark"
                  ? "bg-gray-700 text-gray-300"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Total: {total}
            </span>
            <span
              className={`px-2 py-1 rounded whitespace-nowrap ${
                theme === "dark"
                  ? "bg-green-500/20 text-green-300"
                  : "bg-green-100 text-green-700"
              }`}
            >
              Reportadas: {reportadas}
            </span>
            <span
              className={`px-2 py-1 rounded whitespace-nowrap ${
                theme === "dark"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              Pendientes: {pendientes}
            </span>
          </div>
          <p
            className={`text-xs mt-2 ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {pendientes > 0
              ? "Selecciona las tareas que deseas reportar abajo"
              : "¡Todas las tareas han sido reportadas!"}
          </p>
        </div>
      </div>
    </div>
  ),

  tasksLoadedColaborative: ({
    theme,
    total,
    miasReportadas,
    otrosReportadas,
    pendientes,
  }: MessageTemplateProps & {
    total: number;
    miasReportadas: number;
    otrosReportadas: number;
    pendientes: number;
  }) => (
    <div
      className={`p-3 rounded-lg border ${
        theme === "dark"
          ? "bg-purple-900/20 border-purple-500/20"
          : "bg-purple-50 border-purple-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <Users className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm mb-2 flex items-center gap-2">
            Trabajo colaborativo detectado
          </p>
          <div className="flex flex-wrap gap-2 text-xs mb-2">
            <span
              className={`px-2 py-1 rounded whitespace-nowrap ${
                theme === "dark"
                  ? "bg-gray-700 text-gray-300"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Total: {total}
            </span>
            {miasReportadas > 0 && (
              <span
                className={`px-2 py-1 rounded whitespace-nowrap ${
                  theme === "dark"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-green-100 text-green-700"
                }`}
              >
                Tuyas: {miasReportadas}
              </span>
            )}
            {otrosReportadas > 0 && (
              <span
                className={`px-2 py-1 rounded whitespace-nowrap ${
                  theme === "dark"
                    ? "bg-purple-500/20 text-purple-300"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                Colaboradores: {otrosReportadas}
              </span>
            )}
            {pendientes > 0 && (
              <span
                className={`px-2 py-1 rounded whitespace-nowrap ${
                  theme === "dark"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                Pendientes: {pendientes}
              </span>
            )}
          </div>
          <p
            className={`text-xs ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {otrosReportadas > 0 && miasReportadas === 0
              ? "Hay reportes de tus colaboradores. Puedes ver el progreso del equipo abajo"
              : pendientes > 0
                ? "Selecciona las tareas que deseas reportar abajo"
                : "¡Todo el equipo ha reportado sus tareas!"}
          </p>
        </div>
      </div>
    </div>
  ),

  noTasksFound: ({ theme }: MessageTemplateProps) => (
    <div
      className={`p-3 rounded-lg border ${
        theme === "dark"
          ? "bg-gray-800/50 border-gray-700"
          : "bg-gray-50 border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-sm">No hay tareas pendientes</p>
          <p
            className={`text-xs mt-1 ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Todas tus tareas han sido reportadas o no hay tareas asignadas para
            hoy.
          </p>
        </div>
      </div>
    </div>
  ),
};

// ========== MENSAJES DE ÉXITO ==========

export const successTemplates = {
  reportSaved: ({ theme, count }: MessageTemplateProps & { count: number }) => (
    <div
      className={`p-4 rounded-lg border ${
        theme === "dark"
          ? "bg-green-900/20 border-green-500/20"
          : "bg-green-50 border-green-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        <div className="min-w-0">
          <span className="font-medium text-sm">Reporte guardado</span>
          <p
            className={`text-sm mt-1 ${
              theme === "dark" ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Se actualizaron {count} tareas correctamente. ¡Buen trabajo hoy!
          </p>
        </div>
      </div>
    </div>
  ),

  journeyStarted: ({
    theme,
    tasksCount,
  }: MessageTemplateProps & { tasksCount: number }) => (
    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        <div className="min-w-0">
          <span className="font-medium text-sm">¡Jornada iniciada!</span>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            Has explicado {tasksCount} tareas correctamente. ¡Mucho éxito!
          </p>
        </div>
      </div>
    </div>
  ),

  explanationsSaved: ({
    theme,
    tasksCount,
  }: MessageTemplateProps & { tasksCount: number }) => (
    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
      <div className="flex items-center gap-3">
        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
        <div className="min-w-0">
          <span className="font-medium text-sm">Actividades guardadas</span>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            Has explicado {tasksCount} tareas.
          </p>
        </div>
      </div>
    </div>
  ),
};

// ========== MENSAJES DE ERROR ==========

export const errorTemplates = {
  reportError: ({ theme }: MessageTemplateProps) => (
    <div
      className={`p-4 rounded-lg border ${
        theme === "dark"
          ? "bg-red-900/20 border-red-500/20"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <span className="text-sm">
          Error al guardar el reporte. Intenta nuevamente.
        </span>
      </div>
    </div>
  ),

  activitiesError: ({ theme }: MessageTemplateProps) => (
    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div className="min-w-0">
          <span className="font-medium text-sm">
            Error al obtener actividades
          </span>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            Hubo un problema al obtener tus actividades. Por favor, intenta
            nuevamente más tarde.
          </p>
        </div>
      </div>
    </div>
  ),

  generic: ({ theme, message }: MessageTemplateProps & { message: string }) => (
    <div
      className={`p-4 rounded-lg border ${
        theme === "dark"
          ? "bg-red-900/20 border-red-500/20"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <span className="text-sm min-w-0 break-words">{message}</span>
      </div>
    </div>
  ),
};

// ========== EXPORT UNIFICADO ==========

export const messageTemplates = {
  system: systemTemplates,
  welcome: welcomeTemplates,
  analysis: analysisTemplates,
  tasks: tasksTemplates,
  success: successTemplates,
  error: errorTemplates,
};

// ========== MENSAJES DE TEXTO SIMPLE ==========

export const textMessages = {
  // Bienvenida
  greeting: (displayName: string) => `¡Hola ${displayName}! Soy tu asistente.`,

  // Voz
  voiceValidating: "Validando tu explicación...",
  voiceValidated:
    "Perfecto, explicación validada. Pasamos a la siguiente tarea.",
  voiceRetry: "Por favor, explica nuevamente cómo resolverás esta tarea.",
  voiceShortResponse: "Tu respuesta es muy corta. Por favor, da más detalles.",
  voiceNoResponse: "No escuché tu explicación. Por favor, intenta de nuevo.",
  voiceError: "Hubo un error. Por favor, intenta de nuevo.",
  voiceMicError: "Hubo un error con el micrófono. Por favor, intenta de nuevo.",
  voiceNoActivities: "No hay actividades para explicar.",
  voiceNoTasks: "No hay tareas con tiempo asignado para explicar.",
  voiceComplete:
    "¡Excelente! Has completado todas las tareas. ¿Quieres enviar el reporte?",
  voicePerfect:
    "¡Perfecto! Has explicado todas las tareas. ¿Quieres enviar este reporte?",
  voiceJourneyStart:
    "¡Perfecto! Tu jornada ha comenzado. Mucho éxito con tus tareas.",

  // Reporte
  reportSending: "Enviando tu reporte...",
  reportSent: "¡Correcto! Tu reporte ha sido enviado.",
  reportSendError: "Hubo un error al enviar tu reporte.",
  reportSaved: (count: number) =>
    `Reporte guardado. Se actualizaron ${count} tareas. Buen trabajo hoy.`,
  reportMissingReasons:
    "Por favor, explica por qué no completaste todas las tareas marcadas como incompletas.",
  reportFinish: "Terminamos. ¿Quieres guardar el reporte?",
  reportTaskCompleted: "Ok, completada.",
  reportTaskNotCompleted: "Entendido, no completada.",

  // Modo voz - confirmación inicio
  voiceStart: (count: number) =>
    `Vamos a explicar ${count} actividades con tareas programadas. ¿Listo para comenzar?`,

  // Actividad
  activityPresentation: (
    index: number,
    total: number,
    title: string,
    taskCount: number,
  ) =>
    `Actividad ${index + 1} de ${total}: ${title}. Tiene ${taskCount} tarea${taskCount !== 1 ? "s" : ""}.`,

  // Tarea
  taskPresentation: (index: number, total: number, name: string) =>
    `Tarea ${index + 1} de ${total}: ${name}. ¿Cómo planeas resolver esta tarea?`,

  taskQuestion: (index: number, name: string) =>
    `Tarea ${index + 1}: ${name}. ¿La completaste y qué hiciste? O si no, ¿por qué no?`,

  // Chat IA
  chatError: "Lo siento, hubo un error al procesar tu mensaje.",
};
