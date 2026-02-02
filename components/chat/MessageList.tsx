"use client";

import {
  Bot,
  Target,
  CheckCircle2,
  ListChecks,
  Headphones,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageItem } from "./MessageItem";
import { MessageListProps } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
import { verificarHorarioReporte } from "@/util/HorarioReporte";

export function MessageList({
  messages,
  isTyping,
  theme,
  onVoiceMessageClick,
  scrollRef,
  assistantAnalysis,
  reportConfig,
  onOpenReport,
  onStartVoiceMode,
}: MessageListProps) {
  // ========== ESTADOS ==========
  const [tareasConDescripcion] = useState<Set<string>>(
    new Set(),
  );
  
  // Estado para forzar re-renders cada minuto
  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar la hora cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Actualizar cada 60 segundos

    return () => clearInterval(interval);
  }, []);

  // Filtrar actividades con tareas pendientes (sin descripción)
  const actividadesConTareasPendientes = useMemo(() => {
    if (!assistantAnalysis?.data.revisionesPorActividad) return [];

    return assistantAnalysis.data.revisionesPorActividad
      .map((revision) => {
        const tareasPendientes = revision.tareasConTiempo.filter(
          (tarea) => !tareasConDescripcion.has(tarea.id),
        );

        return {
          ...revision,
          tareasConTiempo: tareasPendientes,
        };
      })
      .filter((revision) => revision.tareasConTiempo.length > 0);
  }, [assistantAnalysis, tareasConDescripcion]);

  const hayTareas = actividadesConTareasPendientes.length > 0;

  // Calcular total de tareas pendientes
  const totalTareasPendientes = useMemo(() => {
    return actividadesConTareasPendientes.reduce(
      (acc, revision) => acc + revision.tareasConTiempo.length,
      0,
    );
  }, [actividadesConTareasPendientes]);

  // Determinar si es hora de reporte - ahora depende de currentTime
  const esHoraReporte = useMemo(() => {
    if (!reportConfig?.horaInicio || !reportConfig?.horaFin) return false;

    return verificarHorarioReporte(
      reportConfig.horaInicio,
      reportConfig.horaFin,
    );
  }, [reportConfig, currentTime]); // Agregamos currentTime como dependencia

  // ✅ Auto-scroll cuando hay nuevas tareas
  useEffect(() => {
    if (!assistantAnalysis || !hayTareas || !scrollRef.current) return;

    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [assistantAnalysis, hayTareas, scrollRef]);

  // ========== RENDER ==========

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Lista de mensajes */}
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          theme={theme}
          onVoiceMessageClick={onVoiceMessageClick}
        />
      ))}

      {/* Indicador de typing */}
      {isTyping && <TypingIndicator theme={theme} />}

      {/* Panel de tareas */}
      {hayTareas && assistantAnalysis && (
        <TasksPanel
          actividadesConTareasPendientes={actividadesConTareasPendientes}
          totalTareasPendientes={totalTareasPendientes}
          esHoraReporte={esHoraReporte}
          theme={theme}
          assistantAnalysis={assistantAnalysis}
          onOpenReport={onOpenReport}
          onStartVoiceMode={onStartVoiceMode}
        />
      )}

      {/* Mensaje cuando no hay tareas */}
      {!hayTareas && assistantAnalysis && <NoTasksMessage theme={theme} />}
    </div>
  );
}

// ========== COMPONENTES AUXILIARES ==========

interface TasksPanelProps {
  actividadesConTareasPendientes: any[];
  totalTareasPendientes: number;
  esHoraReporte: boolean;
  theme: "light" | "dark";
  assistantAnalysis: any;
  onOpenReport?: () => void;
  onStartVoiceMode?: () => void;
}

export function TasksPanel({
  actividadesConTareasPendientes,
  totalTareasPendientes,
  esHoraReporte,
  theme,
  assistantAnalysis,
  onOpenReport,
  onStartVoiceMode,
}: TasksPanelProps) {
  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-4">
      <div
        className={`w-full max-w-xl rounded-lg border overflow-hidden ${
          theme === "dark"
            ? "bg-[#1a1a1a] border-[#2a2a2a]"
            : "bg-white border-gray-200"
        }`}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-[#2a2a2a] bg-[#6841ea]/10 flex justify-between items-center">
          <h4 className="font-medium text-xs flex items-center gap-2 uppercase tracking-wide">
            <Target className="w-4 h-4" />
            Tareas Pendientes ({totalTareasPendientes})
          </h4>
          <Badge
            variant="secondary"
            className="text-[10px] bg-[#6841ea] text-white border-none"
          >
            {esHoraReporte ? "MODO REPORTE" : "PLANIFICACIÓN"}
          </Badge>
        </div>

        {/* Lista de actividades */}
        <div className="p-3 space-y-4">
          {actividadesConTareasPendientes.map((revision, idx) => {
            const actividad = assistantAnalysis.data.actividades.find(
              (act: any) => act.id === revision.actividadId,
            );

            if (!actividad) return null;

            return (
              <ActivityItem
                key={revision.actividadId}
                revision={revision}
                actividad={actividad}
                index={idx}
                theme={theme}
              />
            );
          })}
        </div>

        {/* Footer con acciones */}
        <TasksPanelFooter
          totalTareasPendientes={totalTareasPendientes}
          esHoraReporte={esHoraReporte}
          theme={theme}
          onOpenReport={onOpenReport}
          onStartVoiceMode={onStartVoiceMode}
        />
      </div>
    </div>
  );
}

interface ActivityItemProps {
  revision: any;
  actividad: any;
  index: number;
  theme: "light" | "dark";
}

function ActivityItem({
  revision,
  actividad,
  index,
  theme,
}: ActivityItemProps) {
  // Color del badge según el índice
  const badgeColor = useMemo(() => {
    const colors = [
      "bg-blue-500/20 text-blue-500",
      "bg-purple-500/20 text-purple-500",
      "bg-pink-500/20 text-pink-500",
    ];
    return colors[index % 3];
  }, [index]);

  return (
    <div
      className={`p-3 rounded-lg ${
        theme === "dark" ? "bg-[#252527]" : "bg-gray-50"
      }`}
    >
      {/* Header de actividad */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${badgeColor}`}
          >
            {index + 1}
          </div>
          <h5 className="font-medium text-sm">{actividad.titulo}</h5>
        </div>
        <Badge variant="outline" className="text-xs">
          {actividad.horario}
        </Badge>
      </div>

      {/* Lista de tareas */}
      {revision.tareasConTiempo.length > 0 && (
        <div className="ml-8 mt-2 space-y-2">
          {revision.tareasConTiempo.map((tarea: any) => (
            <TaskItem key={tarea.id} tarea={tarea} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}

interface TaskItemProps {
  tarea: any;
  theme: "light" | "dark";
}

function TaskItem({ tarea, theme }: TaskItemProps) {
  return (
    <div
      className={`p-2 rounded ${
        theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm">{tarea.nombre}</span>
        <Badge
          variant={tarea.prioridad === "ALTA" ? "destructive" : "secondary"}
          className="text-[10px]"
        >
          {tarea.prioridad}
        </Badge>
      </div>
    </div>
  );
}

interface TasksPanelFooterProps {
  totalTareasPendientes: number;
  esHoraReporte: boolean;
  theme: "light" | "dark";
  onOpenReport?: () => void;
  onStartVoiceMode?: () => void;
}

function TasksPanelFooter({
  totalTareasPendientes,
  esHoraReporte,
  theme,
  onOpenReport,
  onStartVoiceMode,
}: TasksPanelFooterProps) {
  // Handler del botón principal
  const handleMainAction = () => {
    if (esHoraReporte) {
      onOpenReport?.();
    } else {
      onStartVoiceMode?.();
    }
  };

  return (
    <div
      className={`p-3 border-t ${
        theme === "dark"
          ? "border-[#2a2a2a] bg-[#252527]"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex flex-col gap-3">
        {/* Contador de tareas */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">
            {totalTareasPendientes} tarea
            {totalTareasPendientes !== 1 ? "s" : ""} sin descripción
          </span>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button
            onClick={handleMainAction}
            size="sm"
            className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4] text-xs h-8"
          >
            {esHoraReporte ? (
              <>
                <ListChecks className="w-3.5 h-3.5 mr-2" />
                Reportar Actividades
              </>
            ) : (
              <>
                <Headphones className="w-3.5 h-3.5 mr-2" />
                Explicar Tareas
              </>
            )}
          </Button>

          <Button
            onClick={onStartVoiceMode}
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-8"
          >
            Continuar Chat
          </Button>
        </div>
      </div>
    </div>
  );
}

interface NoTasksMessageProps {
  theme: "light" | "dark";
}

export function NoTasksMessage({ theme }: NoTasksMessageProps) {
  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300 flex justify-center">
      <div
        className={`p-4 rounded-lg border text-center ${
          theme === "dark"
            ? "bg-[#1a1a1a] border-[#2a2a2a]"
            : "bg-gray-50 border-gray-200"
        }`}
      >
        <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
        <h4 className="font-semibold mb-1 text-sm">
          ✅ Todas las tareas explicadas
        </h4>
        <p className="text-xs text-gray-500">
          No hay tareas pendientes por describir.
        </p>
      </div>
    </div>
  );
}

interface TypingIndicatorProps {
  theme: "light" | "dark";
}

function TypingIndicator({ theme }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
      <div
        className={`rounded-lg px-4 py-3 flex items-center gap-2 ${
          theme === "dark"
            ? "bg-[#2a2a2a] text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        <Bot className="w-4 h-4 text-[#6841ea]" />
        <div className="flex gap-1">
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-1.5 h-1.5 bg-[#6841ea] rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
