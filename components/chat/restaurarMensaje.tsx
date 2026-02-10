import React from "react";
import type { Message, AssistantAnalysis } from "@/lib/types";
import type { MensajeHistorial } from "@/lib/interface/historial.interface";
import { messageTemplates } from "@/components/chat/messageTemplates";
import { useMessageRestoration } from "@/components/hooks/useMessageRestoration";
import { TasksPanel, NoTasksMessage } from "@/components/chat/Taskspanelcontent";

/**
 * Convierte mensajes del historial a mensajes con componentes React
 * Mantiene el diseño visual original
 */
export function restaurarMensajesConComponentes(
  mensajesHistorial: MensajeHistorial[],
  analisisRestaurado: AssistantAnalysis | null,
  theme: "light" | "dark",
  displayName: string,
  email: string,
  onOpenReport?: () => void,
  onStartVoiceMode?: () => void
): Message[] {
  if (!mensajesHistorial || mensajesHistorial.length === 0) {
    return [];
  }

  const mensajesRestaurados: Message[] = [];

  for (let i = 0; i < mensajesHistorial.length; i++) {
    const msg = mensajesHistorial[i];
    const esUsuario = msg.role === "usuario";

    // ========== MENSAJE DE USUARIO ==========
    if (esUsuario) {
      mensajesRestaurados.push({
        id: msg._id || `${Date.now()}-${Math.random()}`,
        type: "user",
        content: msg.contenido,
        timestamp: new Date(msg.timestamp),
      });
      continue;
    }

    // ========== MENSAJE DEL BOT ==========

    // Verificar si es un mensaje de análisis inicial
    const esAnalisisInicial = msg.tipoMensaje === "analisis_inicial";
    const tieneAnalisis = msg.analisis && msg.analisis.success;

    if (esAnalisisInicial && tieneAnalisis && analisisRestaurado) {
      // ✅ RECONSTRUIR MENSAJES CON COMPONENTES ORIGINALES

      // 1. Mensaje de bienvenida con info del usuario
      mensajesRestaurados.push({
        id: `${msg._id}-welcome`,
        type: "bot",
        content: messageTemplates.welcome.userInfo({
          theme,
          displayName,
          email,
        }),
        timestamp: new Date(msg.timestamp),
        isWide: true,
      });

      // 2. Mensaje con métricas del análisis
      mensajesRestaurados.push({
        id: `${msg._id}-metrics`,
        type: "bot",
        content: messageTemplates.analysis.metrics({
          theme,
          analysis: analisisRestaurado,
        }),
        timestamp: new Date(msg.timestamp),
        isWide: false,
      });

      // 3. Panel de tareas o mensaje de "sin tareas"
      const hayTareas = analisisRestaurado.data.revisionesPorActividad.some(
        (r) => r.tareasConTiempo.length > 0
      );

      if (hayTareas) {
        const actividadesConTareas =
          analisisRestaurado.data.revisionesPorActividad.filter(
            (r) => r.tareasConTiempo.length > 0
          );
        const totalTareas = actividadesConTareas.reduce(
          (sum, r) => sum + r.tareasConTiempo.length,
          0
        );

        mensajesRestaurados.push({
          id: `${msg._id}-tasks`,
          type: "bot",
          content: (
            <TasksPanel
              actividadesConTareasPendientes={actividadesConTareas}
              totalTareasPendientes={totalTareas}
              esHoraReporte={false}
              theme={theme}
              assistantAnalysis={analisisRestaurado}
              onOpenReport={onOpenReport}
              onStartVoiceMode={onStartVoiceMode}
            />
          ),
          timestamp: new Date(msg.timestamp),
        });
      } else {
        mensajesRestaurados.push({
          id: `${msg._id}-no-tasks`,
          type: "bot",
          content: <NoTasksMessage theme={theme} />,
          timestamp: new Date(msg.timestamp),
        });
      }
    } else {
      // ✅ MENSAJE DE BOT NORMAL (sin análisis)
      mensajesRestaurados.push({
        id: msg._id || `${Date.now()}-${Math.random()}`,
        type: "bot",
        content: msg.contenido,
        timestamp: new Date(msg.timestamp),
      });
    }
  }

  return mensajesRestaurados;
}

/**
 * Detecta si un mensaje del historial debe renderizarse como componente
 */
export function esMensajeConComponente(
  msg: MensajeHistorial,
  analisisRestaurado: AssistantAnalysis | null
): boolean {
  return (
    msg.tipoMensaje === "analisis_inicial" &&
    msg.analisis?.success === true &&
    analisisRestaurado !== null
  );
}

/**
 * Obtiene el análisis desde el historial si está disponible
 */
export function extraerAnalisisDeHistorial(
  mensajes: MensajeHistorial[]
): AssistantAnalysis | null {
  const mensajeConAnalisis = mensajes.find(
    (m) =>
      m.tipoMensaje === "analisis_inicial" &&
      m.analisis &&
      m.analisis.success === true
  );

  if (!mensajeConAnalisis?.analisis) {
    return null;
  }

  return mensajeConAnalisis.analisis as AssistantAnalysis;
}