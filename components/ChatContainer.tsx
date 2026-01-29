"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateSession, obtenerHistorialSidebar } from "@/lib/api";
import type { Colaborador } from "@/lib/types";
import { obtenerLabelDia } from "@/util/labelDia";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { ChatBot } from "./chat-bot";

interface ChatContainerProps {
  colaborador: Colaborador;
  actividades: any[];
  onLogout: () => void;
}

export type ConversacionSidebar = {
  sessionId: string;
  userId: string;
  nombreConversacion?: string;
  estadoConversacion: string;
  createdAt: string;
  updatedAt?: string;
};

function agruparPorDia(
  data: ConversacionSidebar[],
): Record<string, ConversacionSidebar[]> {
  return data.reduce(
    (acc, conv) => {
      const dia = obtenerLabelDia(conv.createdAt);
      acc[dia] ??= [];
      acc[dia].push(conv);
      return acc;
    },
    {} as Record<string, ConversacionSidebar[]>,
  );
}

export function ChatContainer({
  colaborador,
  actividades,
  onLogout,
}: ChatContainerProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversaciones, setConversaciones] = useState<ConversacionSidebar[]>(
    [],
  );
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(
    null,
  );
  const [sidebarCargando, setSidebarCargando] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const router = useRouter();

  const conversacionesAgrupadas = agruparPorDia(conversaciones);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    const init = async () => {
      const user = await validateSession();
      if (!user) {
        router.replace("/");
        return;
      }

      // Cargar historial del sidebar
      try {
        setSidebarCargando(true);
        const res = await obtenerHistorialSidebar();
        setConversaciones(res.data);
      } catch (error) {
        console.error("Error al cargar sidebar:", error);
        setConversaciones([]);
      } finally {
        setSidebarCargando(false);
      }
    };

    init();
  }, [router]);


  const seleccionarConversacion = (conv: ConversacionSidebar) => {
    setConversacionActiva(conv.sessionId);
  };

  return (
    <div
      className={`min-h-screen font-['Arial'] flex ${theme === "dark" ? "bg-[#101010] text-white" : "bg-white text-gray-900"}`}
    >
      {/* ========== SIDEBAR DE HISTORIAL ========== */}
      <aside
        className={`fixed left-0 top-0 h-screen z-30 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0"
        } ${
          theme === "dark"
            ? "bg-[#0a0a0a] border-r border-[#1a1a1a]"
            : "bg-gray-50 border-r border-gray-200"
        }`}
      >
        {sidebarOpen && (
          <>
            {/* Header del Sidebar */}
            <div
              className={`p-4 border-b ${
                theme === "dark" ? "border-[#1a1a1a]" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#6841ea]" />
                  <h2 className="font-semibold text-sm">Historial</h2>
                </div>
              </div>
            </div>

            {/* Lista de Conversaciones */}
            <ScrollArea className="flex-1 px-2 py-2">
              <div className="space-y-4">
                {Object.entries(conversacionesAgrupadas).map(([dia, convs]) => (
                  <div key={dia}>
                    {/* Label del día */}
                    <div
                      className={`px-2 py-1.5 text-xs font-medium uppercase tracking-wider ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {dia}
                    </div>
                    {/* Conversaciones del día */}
                    <div className="space-y-1">
                      {convs.map((conv) => (
                        <button
                          key={conv.sessionId}
                          onClick={() => seleccionarConversacion(conv)}
                          className={`w-full text-left p-2.5 rounded-lg transition-all group relative ${
                            conversacionActiva === conv.sessionId
                              ? theme === "dark"
                                ? "bg-[#6841ea]/20 border border-[#6841ea]/30"
                                : "bg-[#6841ea]/10 border border-[#6841ea]/20"
                              : theme === "dark"
                                ? "hover:bg-[#1a1a1a]"
                                : "hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <MessageSquare
                              className={`w-4 h-4 mt-0.5 shrink-0 ${
                                conversacionActiva === conv.sessionId
                                  ? "text-[#6841ea]"
                                  : theme === "dark"
                                    ? "text-gray-500"
                                    : "text-gray-400"
                              }`}
                            />

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {conv.nombreConversacion ||
                                  `${new Date(conv.createdAt).toLocaleDateString("es-MX")}`}
                              </p>

                              <p className="text-xs text-gray-500 mt-0.5">
                                {conv.updatedAt
                                  ? new Date(conv.updatedAt).toLocaleTimeString(
                                      "es-MX",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )
                                  : new Date(conv.createdAt).toLocaleTimeString(
                                      "es-MX",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                              </p>
                            </div>

                            {conversacionActiva === conv.sessionId &&
                              isTyping && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                  <Loader2 className="w-4 h-4 animate-spin text-[#6841ea]" />
                                </div>
                              )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {sidebarCargando && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-[#6841ea]" />
                    <span className="text-xs text-gray-500 ml-2">
                      Cargando historial...
                    </span>
                  </div>
                )}

                {!sidebarCargando && conversaciones.length === 0 && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500">
                      No hay conversaciones anteriores
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer del Sidebar */}
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
          </>
        )}
      </aside>

      {/* Botón para toggle del sidebar */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed z-40 top-1/2 -translate-y-1/2 transition-all duration-300 p-1.5 rounded-r-lg ${
          sidebarOpen ? "left-64" : "left-0"
        } ${
          theme === "dark"
            ? "bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white border-y border-r border-[#2a2a2a]"
            : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border-y border-r border-gray-200"
        }`}
        title={sidebarOpen ? "Cerrar sidebar" : "Abrir sidebar"}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* ========== COMPONENTE CHAT ========== */}
      <div
        className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}
      >
        <ChatBot
          colaborador={colaborador}
          actividades={actividades}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
}

