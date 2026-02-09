import axiosClient from "./axios";
import { ConversacionResponse, EliminarConversacionResponse, VerificarAnalisisResponse } from "./interface/historial.interface";

export const obtenerMensajesConversacion = async (
  sessionId: string
): Promise<ConversacionResponse> =>
  axiosClient.get(`/assistant/historial/sesion/${sessionId}`);

export const verificarAnalisisDelDia = async (): Promise<VerificarAnalisisResponse> =>
  axiosClient.get(`/assistant/analisis/verificar`);

export const obtenerSessionActual = async (): Promise<VerificarAnalisisResponse> =>
  axiosClient.get(`/assistant/session/actual`);

export const eliminarConversacion = async (sessionId: string): Promise<EliminarConversacionResponse> =>
  axiosClient.delete(`/assistant/historial/sesion/${sessionId}`);
