// hooks/useConversationHistory.ts
import { useState, useCallback } from 'react';
import type { ConversacionSidebar, Message } from '@/lib/types';
import { obtenerHistorialSidebar, obtenerHistorialSession } from '@/lib/api';

export function useConversationHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
  const [conversaciones, setConversaciones] = useState<ConversacionSidebar[]>([]);
  const [conversacionesCache, setConversacionesCache] = useState<Record<string, Message[]>>({});
  const [sidebarCargando, setSidebarCargando] = useState(true);
  const [sidebarCargado, setSidebarCargado] = useState(false);

  const cargarSidebar = useCallback(async () => {
    if (sidebarCargado) return;
    
    setSidebarCargando(true);
    try {
      const res = await obtenerHistorialSidebar();
      console.log("Historial del sidebar cargado:", res.data);
      setConversaciones(res.data);
      setSidebarCargado(true);
    } catch (error) {
      console.error("Error al cargar sidebar:", error);
      setConversaciones([]);
    } finally {
      setSidebarCargando(false);
    }
  }, [sidebarCargado]);

  const seleccionarConversacion = useCallback(async (
    conv: ConversacionSidebar,
    setMessages: (messages: Message[]) => void,
    setIsTyping: (isTyping: boolean) => void,
    addMessage: (type: Message["type"], content: string | React.ReactNode) => void
  ) => {
    setConversacionActiva(conv.sessionId);

    // Verificar caché primero
    if (conversacionesCache[conv.sessionId]?.length > 0) {
      console.log("✅ CACHÉ HIT - Usando datos locales");
      setMessages(conversacionesCache[conv.sessionId]);
      return;
    }

    // Si no hay caché, cargar desde el servidor
    setIsTyping(true);
    try {
      const data = await obtenerHistorialSession(conv.sessionId);

      if (data.success && data.data?.mensajes && Array.isArray(data.data.mensajes)) {
        setMessages(data.data.mensajes);

        // Guardar en caché
        if (data.data.mensajes.length > 0) {
          setConversacionesCache((prev) => ({
            ...prev,
            [conv.sessionId]: data.data.mensajes,
          }));
        }
      } else {
        setMessages([]);
        addMessage("bot", "No se encontraron mensajes para esta conversación.");
      }
    } catch (error) {
      console.error("❌ Error al cargar conversación:", error);
      addMessage("bot", "Error al cargar la conversación.");
    } finally {
      setIsTyping(false);
    }
  }, [conversacionesCache]);

  const actualizarCache = useCallback((sessionId: string, messages: Message[]) => {
    if (sessionId) {
      setConversacionesCache((cache) => ({
        ...cache,
        [sessionId]: messages,
      }));
    }
  }, []);

  return {
    sidebarOpen,
    setSidebarOpen,
    conversacionActiva,
    setConversacionActiva,
    conversaciones,
    conversacionesCache,
    sidebarCargando,
    sidebarCargado,
    cargarSidebar,
    seleccionarConversacion,
    actualizarCache,
  };
}