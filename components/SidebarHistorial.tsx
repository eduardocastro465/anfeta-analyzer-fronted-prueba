"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { ConversacionSidebar } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { obtenerHistorialSidebar } from "@/lib/api";

interface SidebarHistorialProps {
  conversacionActiva: string | null;
  onSeleccionarConversacion: (conversacion: ConversacionSidebar) => void;
  theme: "light" | "dark";
  // Prop opcional para forzar recarga desde el componente padre
  forceReload?: number;
}

// --- Utilidades de Fecha ---
const obtenerLabelDia = (fechaStr: string) => {
  const fecha = new Date(fechaStr);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  if (fecha.toDateString() === hoy.toDateString()) return "Hoy";
  if (fecha.toDateString() === ayer.toDateString()) return "Ayer";

  return fecha.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
  });
};

export const SidebarHistorial = ({
  conversacionActiva,
  onSeleccionarConversacion,
  theme,
  forceReload,
}: SidebarHistorialProps) => {
  const [conversaciones, setConversaciones] = useState<ConversacionSidebar[]>(
    [],
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar conversaciones al montar el componente
  useEffect(() => {
    cargarConversaciones();
  }, [forceReload]); // Recargar si cambia forceReload

  const cargarConversaciones = async () => {
    try {
      setCargando(true);
      setError(null);

      const response = await obtenerHistorialSidebar();

      if (response.success && response.data) {
        setConversaciones(response.data);
      } else {
        setConversaciones([]);
        setError("No se pudieron cargar las conversaciones");
      }
    } catch (err) {
      console.error("Error al cargar conversaciones del sidebar:", err);
      setConversaciones([]);
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  // Agrupar conversaciones por día (memoizado)
  const conversacionesAgrupadas = useMemo(() => {
    return conversaciones.reduce(
      (acc, conv) => {
        const dia = obtenerLabelDia(conv.createdAt);
        if (!acc[dia]) acc[dia] = [];
        acc[dia].push(conv);
        return acc;
      },
      {} as Record<string, ConversacionSidebar[]>,
    );
  }, [conversaciones]);

  const handleSeleccionar = (conv: ConversacionSidebar) => {
    onSeleccionarConversacion(conv);
  };

  // Estado de carga
  if (cargando) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 font-bold flex items-center gap-2 border-b border-zinc-800/50">
          <MessageSquare className="w-5 h-5 text-[#6841ea]" />
          <span>Historial</span>
        </div>
        <div className="p-4 flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 w-full animate-pulse bg-gray-200 dark:bg-zinc-800 rounded-md"
            />
          ))}
        </div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 font-bold flex items-center gap-2 border-b border-zinc-800/50">
          <MessageSquare className="w-5 h-5 text-[#6841ea]" />
          <span>Historial</span>
        </div>
        <div className="p-4">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={cargarConversaciones}
            className="mt-2 text-xs text-[#6841ea] hover:underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Estado vacío
  if (conversaciones.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 font-bold flex items-center gap-2 border-b border-zinc-800/50">
          <MessageSquare className="w-5 h-5 text-[#6841ea]" />
          <span>Historial</span>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-500 text-center">
            No hay conversaciones aún
          </p>
        </div>
      </div>
    );
  }

  // Renderizado normal
  return (
    <div
      className={`flex flex-col h-full ${theme === "dark" ? "bg-[#121212]" : "bg-white"}`}
    >
      <div className="p-4 font-bold flex items-center gap-2 border-b border-zinc-800/50">
        <MessageSquare className="w-5 h-5 text-[#6841ea]" />
        <span>Historial</span>
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-6">
          {Object.entries(conversacionesAgrupadas).map(([dia, items]) => (
            <div key={dia} className="space-y-1">
              <h3 className="px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                {dia}
              </h3>
              {items.map((conv) => (
                <button
                  key={conv.sessionId}
                  onClick={() => handleSeleccionar(conv)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all truncate ${
                    conversacionActiva === conv.sessionId
                      ? "bg-[#6841ea]/10 text-[#6841ea] border border-[#6841ea]/20"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                  }`}
                >
                  {conv.nombreConversacion || "Nueva conversación"}
                </button>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div
        className={`p-3 border-t ${
          theme === "dark" ? "border-[#1a1a1a]" : "border-gray-200"
        }`}
      >
        <p
          className={`text-xs text-center ${
            theme === "dark" ? "text-gray-600" : "text-gray-400"
          }`}
        >
          {new Date().toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
};
