"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateSession, obtenerHistorialSidebar } from "@/lib/api";
import type {
  AssistantAnalysis,
  ChatContainerProps,
  ConversacionSidebar,
} from "@/lib/types";
import type { MensajeHistorial } from "@/lib/interface/historial.interface";
import { obtenerLabelDia } from "@/util/labelDia";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  MoreVertical,
  AlertTriangle,
  Info,
} from "lucide-react";
import { ChatBot } from "./chat-bot";
import {
  obtenerMensajesConversacion,
  obtenerSessionActual,
  eliminarConversacion,
} from "@/lib/historial.service";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


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

  // Estados para restauración
  const [mensajesRestaurados, setMensajesRestaurados] = useState<
    MensajeHistorial[]
  >([]);
  const [analisisRestaurado, setAnalisisRestaurado] =
    useState<AssistantAnalysis | null>(null);
  const [cargandoConversacion, setCargandoConversacion] = useState(false);

  // Estados para eliminar
  const [conversacionAEliminar, setConversacionAEliminar] =
    useState<ConversacionSidebar | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [verificandoConversacion, setVerificandoConversacion] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  // Agrupar conversaciones por día
  const conversacionesAgrupadas = conversaciones.reduce(
    (acc, conv) => {
      const dia = obtenerLabelDia(conv.createdAt);
      acc[dia] ??= [];
      acc[dia].push(conv);
      return acc;
    },
    {} as Record<string, ConversacionSidebar[]>,
  );

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    }
  };

  // Dark mode inicial
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

      try {
        setSidebarCargando(true);

        const sessionRes = await obtenerSessionActual();

        if (!sessionRes.success) {
          toast({
            variant: "destructive",
            title: "Error de sesión",
            description: "No se pudo obtener la sesión actual",
          });
          throw new Error("No se pudo obtener la sesión actual");
        }

        const { sessionId, existe } = sessionRes;
        const historialRes = await obtenerHistorialSidebar();

        if (historialRes.success && historialRes.data) {
          const conversacionesOrdenadas = [...historialRes.data].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          setConversaciones(conversacionesOrdenadas);
          setConversacionActiva(sessionId);

          if (existe) {
            await restaurarConversacion(sessionId);
            toast({
              variant: "info",
              title: "Conversación restaurada",
              description: "Continúa donde lo dejaste",
            });
          } else {
            setMensajesRestaurados([]);
            setAnalisisRestaurado(null);
            toast({
              variant: "success",
              title: "Nueva conversación",
              description: "¡Comienza a chatear!",
            });
          }
        } else {
          toast({
            variant: "info",
            title: "Sin historial",
            description: "Esta es tu primera conversación",
          });
          setConversaciones([]);
          setConversacionActiva(sessionId);
          setMensajesRestaurados([]);
          setAnalisisRestaurado(null);
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error al inicializar",
          description:
            "Hubo un problema al cargar el chat. Intenta recargar la página.",
        });
        setConversaciones([]);
        setMensajesRestaurados([]);
        setAnalisisRestaurado(null);
        setConversacionActiva(null);
      } finally {
        setSidebarCargando(false);
      }
    };

    init();
  }, [router, toast]);

  const restaurarConversacion = async (sessionId: string) => {
    try {
      setCargandoConversacion(true);

      const response = await obtenerMensajesConversacion(sessionId);

      if (response.success && response.data) {
        const { data } = response;

        if (!data.mensajes || data.mensajes.length <= 1) {
          setMensajesRestaurados([]);
          setAnalisisRestaurado(null);
          setConversacionActiva(sessionId);
          return;
        }

        setMensajesRestaurados(data.mensajes || []);
        setAnalisisRestaurado(data.ultimoAnalisis || null);
        setConversacionActiva(sessionId);

        if (data.nombreConversacion) {
          const convIndex = conversaciones.findIndex(
            (c) => c.sessionId === sessionId,
          );
          if (
            convIndex !== -1 &&
            conversaciones[convIndex].nombreConversacion !==
              data.nombreConversacion
          ) {
            actualizarNombreConversacion(sessionId, data.nombreConversacion);
          }
        }
      } else {
        toast({
          variant: "warning",
          title: "Conversación vacía",
          description: "Esta conversación no tiene mensajes",
        });
        setMensajesRestaurados([]);
        setAnalisisRestaurado(null);
        setConversacionActiva(sessionId);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al cargar conversación",
        description: "No se pudieron cargar los mensajes anteriores",
      });
      setMensajesRestaurados([]);
      setAnalisisRestaurado(null);
      setConversacionActiva(sessionId);
    } finally {
      setCargandoConversacion(false);
    }
  };

  const seleccionarConversacion = async (conv: ConversacionSidebar) => {
    if (conversacionActiva === conv.sessionId) return;
    await restaurarConversacion(conv.sessionId);
  };

  const agregarNuevaConversacion = (nuevaConv: ConversacionSidebar) => {
    const yaExiste = conversaciones.some(
      (conv) => conv.sessionId === nuevaConv.sessionId,
    );

    if (yaExiste) {
      setConversacionActiva(nuevaConv.sessionId);
      return;
    }

    setConversaciones((prev) => [nuevaConv, ...prev]);
    setConversacionActiva(nuevaConv.sessionId);
  };

  const actualizarNombreConversacion = (
    sessionId: string,
    nuevoNombre: string,
  ) => {
    setConversaciones((prev) =>
      prev.map((conv) =>
        conv.sessionId === sessionId
          ? {
              ...conv,
              nombreConversacion: nuevoNombre,
              updatedAt: new Date().toISOString(),
            }
          : conv,
      ),
    );
  };

  // ==================== FUNCIONES DE ELIMINACIÓN MEJORADAS ====================

  /**
   * Verifica si una conversación tiene mensajes reales (no solo análisis)
   */
  const verificarConversacionTieneMensajes = async (
    sessionId: string,
  ): Promise<boolean> => {
    try {
      const response = await obtenerMensajesConversacion(sessionId);

      if (response.success && response.data) {
        const { mensajes } = response.data;

        // Verificar si hay mensajes reales (más de 1, ya que el primero es solo el análisis)
        return mensajes && mensajes.length > 1;
      }

      return false;
    } catch (error) {
      console.error("Error al verificar conversación:", error);
      return false;
    }
  };

  const handleOpenDeleteDialog = async (
    conv: ConversacionSidebar,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();

    // Verificar si la conversación tiene mensajes antes de mostrar el diálogo
    setVerificandoConversacion(true);

    try {
      const tieneMensajes = await verificarConversacionTieneMensajes(
        conv.sessionId,
      );

      if (!tieneMensajes) {
        // Si solo tiene el análisis, eliminar directamente sin confirmación
        toast({
          variant: "info",
          title: "Conversación vacía",
          description: "Esta conversación no tiene mensajes para eliminar",
        });

        // Eliminar silenciosamente
        await handleDeleteEmptyConversation(conv.sessionId);
        return;
      }

      // Si tiene mensajes, mostrar el diálogo de confirmación
      setConversacionAEliminar(conv);
      setShowDeleteDialog(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo verificar la conversación",
      });
    } finally {
      setVerificandoConversacion(false);
    }
  };

  const handleDeleteEmptyConversation = async (sessionId: string) => {
    try {
      const response = await eliminarConversacion(sessionId);

      if (response.success) {
        const conversacionesRestantes = conversaciones.filter(
          (c) => c.sessionId !== sessionId,
        );

        setConversaciones(conversacionesRestantes);

        // Si era la activa, crear una nueva
        if (conversacionActiva === sessionId) {
          await manejarTransicionConversacion();
        }
      }
    } catch (error) {
      console.error("Error al eliminar conversación vacía:", error);
    }
  };


  const manejarTransicionConversacion = async () => {
    // Primero limpiar el estado actual para forzar re-render
    setConversacionActiva(null);
    setMensajesRestaurados([]);
    setAnalisisRestaurado(null);

    // Pequeño delay para asegurar que el componente se desmonta
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Siempre crear una nueva sesión vacía
    try {
      const sessionRes = await obtenerSessionActual();
      if (sessionRes.success) {
        const { sessionId, userId } = sessionRes;

        // Crear objeto de nueva conversación para el sidebar
        const nuevaConversacion: ConversacionSidebar = {
          sessionId: sessionId,
          userId: userId,
          nombreConversacion: undefined,
          estadoConversacion: "activa",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Agregar al inicio de la lista de conversaciones
        setConversaciones((prev) => [nuevaConversacion, ...prev]);

        // Establecer como activa
        setConversacionActiva(sessionId);

        toast({
          variant: "success",
          title: "Nueva conversación iniciada",
          description: "Comienza a chatear desde cero",
        });
      }
    } catch (error) {
      console.error("Error al crear nueva sesión:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear una nueva conversación",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!conversacionAEliminar) return;

    try {
      setEliminando(true);

      const response = await eliminarConversacion(
        conversacionAEliminar.sessionId,
      );

      if (response.success) {
        // Obtener conversaciones restantes (excluyendo la eliminada)
        const conversacionesRestantes = conversaciones.filter(
          (c) => c.sessionId !== conversacionAEliminar.sessionId,
        );

        // Actualizar la lista
        setConversaciones(conversacionesRestantes);

        // Si era la conversación activa, crear una nueva
        if (conversacionActiva === conversacionAEliminar.sessionId) {
          // Cerrar el diálogo inmediatamente
          setShowDeleteDialog(false);
          setConversacionAEliminar(null);
          setEliminando(false);

          // Crear nueva conversación vacía
          await manejarTransicionConversacion();
        } else {
          // No era la activa, solo mostrar toast
          toast({
            variant: "success",
            title: "Conversación eliminada",
            description: "La conversación se eliminó correctamente",
          });
        }
      } else {
        throw new Error(response.message || "Error al eliminar");
      }
    } catch (error: any) {
      console.error("Error al eliminar conversación:", error);
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description:
          error.message ||
          "No se pudo eliminar la conversación. Intenta de nuevo.",
      });
    } finally {
      setEliminando(false);
      setShowDeleteDialog(false);
      setConversacionAEliminar(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setConversacionAEliminar(null);
  };

  return (
    <div
      className={`min-h-screen font-['Arial'] flex ${
        theme === "dark" ? "bg-[#101010] text-white" : "bg-white text-gray-900"
      }`}
    >
      {/* ========== SIDEBAR DE HISTORIAL - RESPONSIVO ========== */}
      <aside
        className={`
          fixed left-0 top-0 h-screen z-30 flex flex-col 
          transition-all duration-300
          ${sidebarOpen ? "w-64 sm:w-72 md:w-80" : "w-0"}
          ${
            theme === "dark"
              ? "bg-[#0a0a0a] border-r border-[#1a1a1a]"
              : "bg-gray-50 border-r border-gray-200"
          }
        `}
      >
        {sidebarOpen && (
          <>
            {/* Header del Sidebar - Responsivo */}
            <div
              className={`
                p-3 sm:p-4 border-b
                ${theme === "dark" ? "border-[#1a1a1a]" : "border-gray-200"}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 sm:w-5 sm:h-5 text-[#6841ea]" />
                  <h2 className="font-semibold text-xs sm:text-sm">
                    Historial
                  </h2>
                </div>
              </div>
            </div>

            {/* Lista de Conversaciones - Responsivo */}
            <ScrollArea className="flex-1 px-2 py-2">
              <div className="space-y-3 sm:space-y-4">
                {Object.entries(conversacionesAgrupadas).map(([dia, convs]) => (
                  <div key={dia}>
                    {/* Label del día */}
                    <div
                      className={`
                        px-2 py-1 sm:py-1.5 
                        text-[10px] sm:text-xs 
                        font-medium uppercase tracking-wider
                        ${theme === "dark" ? "text-gray-500" : "text-gray-400"}
                      `}
                    >
                      {dia}
                    </div>
                    {/* Conversaciones del día */}
                    <div className="space-y-1">
                      {convs.map((conv) => (
                        <div
                          key={conv.sessionId}
                          className={`
                            relative group
                            rounded-lg transition-all
                            ${
                              conversacionActiva === conv.sessionId
                                ? theme === "dark"
                                  ? "bg-[#6841ea]/20 border border-[#6841ea]/30"
                                  : "bg-[#6841ea]/10 border border-[#6841ea]/20"
                                : theme === "dark"
                                  ? "hover:bg-[#1a1a1a]"
                                  : "hover:bg-gray-100"
                            }
                          `}
                        >
                          <button
                            onClick={() => seleccionarConversacion(conv)}
                            disabled={cargandoConversacion}
                            className={`
                              w-full text-left 
                              p-2 sm:p-2.5 
                              rounded-lg transition-all
                              ${cargandoConversacion ? "opacity-50" : ""}
                            `}
                          >
                            <div className="flex items-start gap-2 pr-8">
                              <MessageSquare
                                className={`
                                  w-3 h-3 sm:w-4 sm:h-4 
                                  mt-0.5 shrink-0
                                  ${
                                    conversacionActiva === conv.sessionId
                                      ? "text-[#6841ea]"
                                      : theme === "dark"
                                        ? "text-gray-500"
                                        : "text-gray-400"
                                  }
                                `}
                              />

                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium truncate">
                                  {conv.nombreConversacion ||
                                    `Chat ${new Date(conv.createdAt).toLocaleDateString("es-MX")}`}
                                </p>

                                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                                  {conv.updatedAt
                                    ? new Date(
                                        conv.updatedAt,
                                      ).toLocaleTimeString("es-MX", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : new Date(
                                        conv.createdAt,
                                      ).toLocaleTimeString("es-MX", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                </p>
                              </div>
                            </div>

                            {/* Indicador de conversación activa */}
                            {conversacionActiva === conv.sessionId && (
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 sm:w-1 bg-[#6841ea] rounded-r-full" />
                            )}
                          </button>

                          {/* Botón de opciones (eliminar) */}
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={verificandoConversacion}
                                  className={`
                                    p-1 rounded-md transition-colors
                                    ${
                                      theme === "dark"
                                        ? "hover:bg-[#2a2a2a] text-gray-400 hover:text-white"
                                        : "hover:bg-gray-200 text-gray-600 hover:text-gray-900"
                                    }
                                    ${verificandoConversacion ? "opacity-50 cursor-not-allowed" : ""}
                                  `}
                                >
                                  {verificandoConversacion ? (
                                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                  ) : (
                                    <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4" />
                                  )}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className={`
                                  ${
                                    theme === "dark"
                                      ? "bg-[#1a1a1a] border-[#2a2a2a]"
                                      : "bg-white border-gray-200"
                                  }
                                `}
                              >
                                <DropdownMenuItem
                                  onClick={(e) =>
                                    handleOpenDeleteDialog(conv, e)
                                  }
                                  className={`
                                    text-red-500 focus:text-red-600 focus:bg-red-500/10 cursor-pointer
                                  `}
                                >
                                  <Trash2 className="w-3 h-3 mr-2" />
                                  <span className="text-xs">Eliminar</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Indicador de carga o typing */}
                          {cargandoConversacion && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-[#6841ea]" />
                            </div>
                          )}

                          {conversacionActiva === conv.sessionId &&
                            isTyping &&
                            !cargandoConversacion && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-[#6841ea]" />
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {sidebarCargando && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-[#6841ea]" />
                    <span className="text-[10px] sm:text-xs text-gray-500 ml-2">
                      Cargando historial...
                    </span>
                  </div>
                )}

                {!sidebarCargando && conversaciones.length === 0 && (
                  <div className="p-3 sm:p-4 text-center">
                    <p className="text-[10px] sm:text-xs text-gray-500">
                      No hay conversaciones anteriores
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer del Sidebar - Responsivo */}
            <div
              className={`
                p-2 sm:p-3 border-t
                ${theme === "dark" ? "border-[#1a1a1a]" : "border-gray-200"}
              `}
            >
              <p
                className={`
                  text-[10px] sm:text-xs text-center
                  ${theme === "dark" ? "text-gray-600" : "text-gray-400"}
                `}
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

      {/* Botón para toggle del sidebar - Responsivo */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`
          fixed z-40 
          top-1/2 -translate-y-1/2 
          transition-all duration-300 
          p-1 sm:p-1.5 
          rounded-r-lg
          ${sidebarOpen ? "left-64 sm:left-72 md:left-80" : "left-0"}
          ${
            theme === "dark"
              ? "bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white border-y border-r border-[#2a2a2a]"
              : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border-y border-r border-gray-200"
          }
          touch-manipulation
        `}
        title={sidebarOpen ? "Cerrar sidebar" : "Abrir sidebar"}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        ) : (
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
        )}
      </button>

      {/* ========== COMPONENTE CHAT - RESPONSIVO ========== */}
      <div
        className={`
          flex-1 transition-all duration-300
          ${sidebarOpen ? "ml-64 sm:ml-72 md:ml-80" : "ml-0"}
        `}
      >
        <ChatBot
          key={conversacionActiva || "nueva"}
          colaborador={colaborador}
          actividades={actividades}
          onLogout={onLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
          conversacionActiva={conversacionActiva}
          mensajesRestaurados={mensajesRestaurados}
          analisisRestaurado={analisisRestaurado}
          onNuevaConversacion={agregarNuevaConversacion}
          onActualizarNombre={actualizarNombreConversacion}
          onActualizarTyping={setIsTyping}
        />
      </div>

      {/* ========== DIALOG DE CONFIRMACIÓN DE ELIMINACIÓN ========== */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          className={`
            font-['Arial'] max-w-md
            ${
              theme === "dark"
                ? "bg-[#1a1a1a] text-white border-[#2a2a2a]"
                : "bg-white text-gray-900 border-gray-200"
            }
          `}
        >
          <AlertDialogHeader className="pt-6">
            <div className="mx-auto mb-4">
              <div
                className={`
                  w-16 h-16 rounded-full flex items-center justify-center
                  ${theme === "dark" ? "bg-red-900/20" : "bg-red-100"}
                `}
              >
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold">
              ¿Eliminar conversación?
            </AlertDialogTitle>
            <AlertDialogDescription
              className={`
                text-center pt-4 pb-2
                ${theme === "dark" ? "text-gray-300" : "text-gray-600"}
              `}
            >
              <p className="mb-2">
                Esta acción eliminará permanentemente la conversación:
              </p>
              <p className="font-semibold text-sm">
                "{conversacionAEliminar?.nombreConversacion || "Sin nombre"}"
              </p>
              <p className="mt-2 text-sm">Esta acción no se puede deshacer.</p>

              {/* Info: siempre se crea nueva conversación */}
              {conversacionActiva === conversacionAEliminar?.sessionId && (
                <div
                  className={`
                  mt-4 p-3 rounded-lg flex items-start gap-2 text-left
                  ${theme === "dark" ? "bg-blue-900/20" : "bg-blue-50"}
                `}
                >
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Se creará una nueva conversación vacía automáticamente
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
            <AlertDialogCancel
              onClick={handleCancelDelete}
              disabled={eliminando}
              className={`
                w-full sm:w-auto rounded-lg h-11
                ${
                  theme === "dark"
                    ? "bg-[#2a2a2a] hover:bg-[#353535] text-white border-[#353535]"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200"
                }
              `}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={eliminando}
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white rounded-lg h-11 font-semibold"
            >
              {eliminando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
