// En /lib/types.ts - Agregar estos tipos
import { AssistantAnalysis } from "../types";

export interface MensajeHistorial {
  _id?: string;
  role: "usuario" | "bot";
  contenido: string;
  timestamp: Date | string;
  tipoMensaje?:
    | "texto"
    | "analisis_inicial"
    | "respuesta_ia"
    | "error"
    | "sistema";
  analisis?: AssistantAnalysis | null;
}

export interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}

export interface EstadoTarea {
  taskId: string;
  taskName: string;
  actividadTitulo: string;
  explicada: boolean;
  explicacion: string;
  validada: boolean;
  ultimoIntento: Date | null;
}

// ✅ Esta es la estructura interna (lo que viene en response.data)
export interface HistorialData {
  _id: string;
  sessionId: string;
  userId: string;
  nombreConversacion?: string;
  mensajes: MensajeHistorial[];
  ultimoAnalisis: AssistantAnalysis | null;
  tareasEstado: EstadoTarea[];
  estadoConversacion?:
    | "inicio"
    | "esperando_usuario"
    | "esperando_bot"
    | "mostrando_actividades"
    | "esperando_descripcion_pendientes"
    | "esperando_confirmacion_pendientes"
    | "motivo_pendiente_resagado"
    | "finalizado";
  createdAt: string;
  updatedAt?: string;
  __v?: number;
}

// ✅ Esta es la respuesta completa del backend
export interface ConversacionResponse {
  success: boolean;
  data: HistorialData; // ← Los datos vienen aquí
  actividades?: {
    odooUserId: string;
    ultimaSincronizacion: string;
    actividades: any[];
  };
  cache?: {
    disponible: boolean;
    ultimaSincronizacion: string | null;
    totalActividades: number;
  };
  meta?: {
    userId: string;
    sessionId: string;
    timestamp: string;
  };
}

export interface VerificarAnalisisResponse {
  success: boolean;
  tieneAnalisis: boolean;
  userId: string;
  sessionId: string;
  analisis?: AssistantAnalysis;
  mensajes?: MensajeHistorial[];
  existe: boolean;
}

export interface EliminarConversacionResponse {
  success: boolean;
  message: string;
}
