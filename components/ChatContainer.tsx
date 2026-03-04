"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { validateSession, obtenerHistorialSidebar } from "@/lib/api";
import type {
  AssistantAnalysis,
  ChatContainerProps,
  ConversacionSidebar,
} from "@/lib/types";
import type { MensajeHistorial } from "@/lib/interface/historial.interface";
import { obtenerLabelDia } from "@/util/labelDia";
import {
  History,
  MessageSquare,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  MoreVertical,
  AlertTriangle,
  Info,
  Settings,
} from "lucide-react";
import {
  eliminarConversacion,
  obtenerSessionActual,
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
import { ChatBot } from "./chat-bot";
import { obtenerMensajesConversacion } from "@/lib/historial.service";
import { applyThemeToDom, resolveTheme } from "@/util/theme";
import { AccountSettingsModal } from "./Accountsettingsmodal";
import { VoiceEngine } from "./Voiceengineselector";

type ViewMode = "chat" | "reportes";

export function ChatContainer({
  colaborador,
  actividades,
  onLogout,
  onViewReports,
  preferencias,
  onGuardarPreferencias,
}: ChatContainerProps) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return resolveTheme(preferencias?.tema ?? "AUTO");
  });

  // Inicializar sidebar cerrado en móvil
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });

  const [conversaciones, setConversaciones] = useState<ConversacionSidebar[]>(
    [],
  );
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(
    null,
  );
  const [sidebarCargando, setSidebarCargando] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");

  // Detectar si es móvil para el overlay
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  const [mensajesRestaurados, setMensajesRestaurados] = useState<
    MensajeHistorial[]
  >([]);
  const [analisisRestaurado, setAnalisisRestaurado] =
    useState<AssistantAnalysis | null>(null);
  const [cargandoConversacionId, setCargandoConversacionId] = useState<
    string | null
  >(null);

  // Estados para eliminar
  const [conversacionAEliminar, setConversacionAEliminar] =
    useState<ConversacionSidebar | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [verificandoConversacion, setVerificandoConversacion] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [engine, setEngine] = useState<VoiceEngine>("vosk");
  const [voskStatus, setVoskStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  const [isPiPMode, setIsPiPMode] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const [showPiPOverlay, setShowPiPOverlay] = useState(false);
  const isAdmin = colaborador.email === "jjohn@pprin.com";

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    applyThemeToDom(theme);
  }, []);

  // Escuchar cambios de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-cerrar sidebar al reducir a móvil
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cerrar sidebar al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen && isMobile) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen, isMobile]);

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
    applyThemeToDom(newTheme);
    onGuardarPreferencias?.({ ...preferencias, tema: newTheme });
  };

  const openPiPWindow = () => {
    if (isMobile) {
      // Móvil: overlay flotante
      setShowPiPOverlay(true);
      setIsPiPMode(true);
    } else {
      // Desktop: ventana nueva
      const pipUrl = `${window.location.pathname}?pip=true`;
      const w = window.open(
        pipUrl,
        "pip-window",
        "width=400,height=600,resizable=yes,scrollbars=no",
      );
      if (w) {
        pipWindowRef.current = w;
        setIsPiPMode(true);
      }
    }
  };

  const closePiPWindow = () => {
    if (isMobile) {
      setShowPiPOverlay(false);
    } else {
      if (pipWindowRef.current && !pipWindowRef.current.closed)
        pipWindowRef.current.close();
      pipWindowRef.current = null;
    }
    setIsPiPMode(false);
  };

  useEffect(() => {
    if (!preferencias?.tema) return;
    const resolved = resolveTheme(preferencias.tema);
    setTheme(resolved);
    applyThemeToDom(resolved);
  }, [preferencias?.tema]);

  useEffect(() => {
    const init = async () => {
      const user = await validateSession();
      if (!user) {
        console.log("No hay usuario");
        await onLogout();
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

  const refrescarHistorial = async () => {
    try {
      setSidebarCargando(true);
      const historialRes = await obtenerHistorialSidebar();
      if (historialRes.success && historialRes.data) {
        const conversacionesOrdenadas = [...historialRes.data].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setConversaciones(conversacionesOrdenadas);

        // Si hay una conversación activa, también la refrescamos
        if (conversacionActiva) {
          await restaurarConversacion(conversacionActiva);
        }

        toast({
          title: "Historial actualizado",
          description: "Las conversaciones se han recargado correctamente",
        });
      }
    } catch (error) {
      console.error("Error al refrescar:", error);
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: "No se pudo sincronizar el historial",
      });
    } finally {
      setSidebarCargando(false);
    }
  };

  const restaurarConversacion = async (sessionId: string) => {
    try {
      setCargandoConversacionId(sessionId);

      const response = await obtenerMensajesConversacion(sessionId);

      console.log("response", response);
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
      setCargandoConversacionId(null);
    }
  };

  const seleccionarConversacion = async (conv: ConversacionSidebar) => {
    if (conversacionActiva === conv.sessionId) {
      // En móvil, cerrar sidebar al seleccionar
      if (isMobile) setSidebarOpen(false);
      return;
    }
    await restaurarConversacion(conv.sessionId);
    setViewMode("chat");
    // En móvil, cerrar sidebar al seleccionar conversación
    if (isMobile) setSidebarOpen(false);
  };

  // ✅ REEMPLAZAR agregarNuevaConversacion completo
  const agregarNuevaConversacion = (nuevaConv: ConversacionSidebar) => {
    setConversaciones((prev) => {
      const yaExiste = prev.some(
        (conv) => conv.sessionId === nuevaConv.sessionId,
      );

      if (yaExiste) {
        // Solo actualizar el nombre si llegó uno nuevo
        if (!nuevaConv.nombreConversacion) return prev;
        return prev.map((conv) =>
          conv.sessionId === nuevaConv.sessionId
            ? {
                ...conv,
                nombreConversacion: nuevaConv.nombreConversacion,
                updatedAt: new Date().toISOString(),
              }
            : conv,
        );
      }

      // Nueva de verdad → agregar al inicio
      return [nuevaConv, ...prev];
    });

    setConversacionActiva(nuevaConv.sessionId);
    setViewMode("chat");
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

  const verificarConversacionTieneMensajes = async (
    sessionId: string,
  ): Promise<boolean> => {
    try {
      const response = await obtenerMensajesConversacion(sessionId);
      if (response.success && response.data) {
        const { mensajes } = response.data;
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
    setVerificandoConversacion(true);

    try {
      const tieneMensajes = await verificarConversacionTieneMensajes(
        conv.sessionId,
      );

      if (!tieneMensajes) {
        toast({
          variant: "info",
          title: "Conversación vacía",
          description: "Esta conversación no tiene mensajes para eliminar",
        });
        await handleDeleteEmptyConversation(conv.sessionId);
        return;
      }

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
        if (conversacionActiva === sessionId) {
          await manejarTransicionConversacion();
        }
      }
    } catch (error) {
      console.error("Error al eliminar conversación vacía:", error);
    }
  };

  const manejarTransicionConversacion = async () => {
    setConversacionActiva(null);
    setMensajesRestaurados([]);
    setAnalisisRestaurado(null);

    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const sessionRes = await obtenerSessionActual();
      if (sessionRes.success) {
        const { sessionId, userId } = sessionRes;

        // ✅ Solo agregar si realmente no existe ya en la lista
        setConversaciones((prev) => {
          const yaExiste = prev.some((c) => c.sessionId === sessionId);
          if (yaExiste) return prev; // no duplicar

          const nuevaConversacion: ConversacionSidebar = {
            sessionId,
            userId,
            nombreConversacion: undefined,
            estadoConversacion: "activa",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return [nuevaConversacion, ...prev];
        });

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
        const conversacionesRestantes = conversaciones.filter(
          (c) => c.sessionId !== conversacionAEliminar.sessionId,
        );

        setConversaciones(conversacionesRestantes);

        if (conversacionActiva === conversacionAEliminar.sessionId) {
          setShowDeleteDialog(false);
          setConversacionAEliminar(null);
          setEliminando(false);
          await manejarTransicionConversacion();
        } else {
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
      className={`min-h-screen font-['Arial'] flex overflow-hidden ${
        theme === "dark" ? "bg-[#101010] text-white" : "bg-white text-gray-900"
      }`}
    >
      {/* Overlay móvil */}
      {isMobile && sidebarOpen && !isAdmin && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`
          ${isAdmin ? "hidden" : ""}
          fixed left-0 top-0 h-screen z-30 flex flex-col
          transition-all duration-300 ease-in-out
          ${
            isMobile
              ? sidebarOpen
                ? "w-72 translate-x-0"
                : "w-72 -translate-x-full"
              : sidebarOpen
                ? "w-64 sm:w-72 md:w-80"
                : "w-0"
          }
          ${
            theme === "dark"
              ? "bg-[#0a0a0a] border-r border-[#1a1a1a]"
              : "bg-gray-50 border-r border-gray-200"
          }
          overflow-hidden
        `}
      >
        {/* Header sidebar */}
        <div
          className={`p-3 sm:p-4 border-b flex-shrink-0 ${
            theme === "dark" ? "border-[#1a1a1a]" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 sm:w-5 sm:h-5 text-[#6841ea]" />
              <h2 className="font-semibold text-xs sm:text-sm">Historial</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={refrescarHistorial}
                disabled={sidebarCargando}
                className={`p-1.5 rounded-lg transition-colors ${
                  theme === "dark"
                    ? "hover:bg-[#2a2a2a] text-gray-400"
                    : "hover:bg-gray-200 text-gray-500"
                }`}
                title="Recargar historial"
              >
                <RefreshCw
                  className={`w-4 h-4 ${sidebarCargando ? "animate-spin" : ""}`}
                />
              </button>
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    theme === "dark"
                      ? "hover:bg-[#2a2a2a] text-gray-400"
                      : "hover:bg-gray-200 text-gray-500"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista conversaciones */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-3 sm:space-y-4">
            {Object.entries(conversacionesAgrupadas).map(([dia, convs]) => (
              <div key={dia}>
                <div
                  className={`px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium uppercase tracking-wider ${
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  {dia}
                </div>
                <div className="space-y-1">
                  {convs.map((conv) => (
                    <div
                      key={conv.sessionId}
                      className={`
                        relative group rounded-lg transition-all
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
                        disabled={cargandoConversacionId === conv.sessionId}
                        className={`w-full text-left p-2 sm:p-2.5 rounded-lg transition-all ${
                          cargandoConversacionId === conv.sessionId
                            ? "opacity-50"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-2 pr-8">
                          <MessageSquare
                            className={`w-3 h-3 sm:w-4 sm:h-4 mt-0.5 shrink-0 ${
                              conversacionActiva === conv.sessionId
                                ? "text-[#6841ea]"
                                : theme === "dark"
                                  ? "text-gray-500"
                                  : "text-gray-400"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">
                              {conv.nombreConversacion ||
                                `Chat ${new Date(conv.createdAt).toLocaleDateString("es-MX")}`}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
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
                        </div>

                        {conversacionActiva === conv.sessionId && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 sm:w-1 bg-[#6841ea] rounded-r-full" />
                        )}
                      </button>

                      {/* Opciones */}
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              disabled={verificandoConversacion}
                              className={`p-1 rounded-md transition-colors ${
                                theme === "dark"
                                  ? "hover:bg-[#2a2a2a] text-gray-400 hover:text-white"
                                  : "hover:bg-gray-200 text-gray-600 hover:text-gray-900"
                              } ${verificandoConversacion ? "opacity-50 cursor-not-allowed" : ""}`}
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
                            className={
                              theme === "dark"
                                ? "bg-[#1a1a1a] border-[#2a2a2a]"
                                : "bg-white border-gray-200"
                            }
                          >
                            <DropdownMenuItem
                              onClick={(e) => handleOpenDeleteDialog(conv, e)}
                              className="text-red-500 focus:text-red-600 focus:bg-red-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              <span className="text-xs">Eliminar</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {cargandoConversacionId === conv.sessionId && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-[#6841ea]" />
                        </div>
                      )}

                      {conversacionActiva === conv.sessionId &&
                        isTyping &&
                        !cargandoConversacionId && (
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
        </div>

        {/* Footer sidebar */}
        <div
          className={`p-2 sm:p-3 border-t flex-shrink-0 ${theme === "dark" ? "border-[#1a1a1a]" : "border-gray-200"}`}
        >
          <button
            onClick={() => setShowSettings(true)} // si el modal vive en ChatContainer
            // onClick={onOpenSettings}                    // si el modal vive en ChatBot
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors group ${
              theme === "dark"
                ? "hover:bg-[#1a1a1a] text-gray-400 hover:text-white"
                : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            }`}
          >
            {(() => {
              const avatarUrl =
                typeof colaborador.avatar === "string"
                  ? colaborador.avatar
                  : colaborador.avatar?.url;
              return avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={colaborador.firstName ?? colaborador.email}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#6841ea] flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-bold">
                    {colaborador.firstName
                      ? colaborador.firstName
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : colaborador.email.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              );
            })()}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium truncate">
                {colaborador.firstName ?? colaborador.email}
              </p>
              <p
                className={`text-[10px] truncate ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
              >
                {new Date().toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            </div>
            <Settings className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <AccountSettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          theme={theme}
          onToggleTheme={toggleTheme}
          rate={preferencias?.velocidadVoz ?? 1.2}
          onChangeRate={(newRate) =>
            onGuardarPreferencias?.({ ...preferencias, velocidadVoz: newRate })
          }
          idiomaVoz={preferencias?.idiomaVoz ?? "es-MX"}
          onChangeIdioma={(idioma) =>
            onGuardarPreferencias?.({ ...preferencias, idiomaVoz: idioma })
          }
          engine={engine}
          onEngineChange={(eng) => setEngine(eng)}
          voskStatus={voskStatus}
          colaborador={{
            nombre: colaborador.firstName,
            email: colaborador.email,
            avatar: colaborador.avatar,
          }}
          onGuardarPreferencias={onGuardarPreferencias}
        />
      </aside>

      {/* Botón toggle desktop */}
      {!isMobile && !isAdmin && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          tabIndex={showSettings ? -1 : 0}
          className={`
      fixed z-40 top-1/2 -translate-y-1/2
      transition-[left] duration-300 p-1.5 rounded-r-lg
      hidden md:flex items-center justify-center
      ${showSettings ? "opacity-0 pointer-events-none" : "opacity-100"}
      ${sidebarOpen ? "left-64 sm:left-72 md:left-80" : "left-0"}
            ${
              theme === "dark"
                ? "bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white border-y border-r border-[#2a2a2a]"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border-y border-r border-gray-200"
            }
          `}
          title={sidebarOpen ? "Cerrar sidebar" : "Abrir sidebar"}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      )}

      <div
        className={`
    flex-1 min-w-0 max-w-full overflow-hidden
    transition-all duration-300
    ${isAdmin ? "ml-0" : isMobile ? "ml-0" : sidebarOpen ? "ml-64 sm:ml-72 md:ml-80" : "ml-0"}
  `}
      >
        {/* Si es admin, muestra el Reporte del Día en iframe */}
        {colaborador.email === "jjohn@pprin.com" ? (
          <iframe
            src="/reporte-del-dia"
            className="w-full h-full border-0"
            title="Reporte del Día"
            style={{ minHeight: "100vh" }}
          />
        ) : (
          <ChatBot
            onViewReports={onViewReports}
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
            onOpenSidebar={() => setSidebarOpen(true)}
            isMobile={isMobile}
            sidebarOpen={sidebarOpen}
            preferencias={preferencias}
            onGuardarPreferencias={onGuardarPreferencias}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            onEngineChange={setEngine}
            onVoskStatusChange={setVoskStatus}
            engineOverride={engine}
            openPiPWindow={openPiPWindow}
            closePiPWindow={closePiPWindow}
            esConversacionDeHoy={
              conversaciones.find((c) => c.sessionId === conversacionActiva)
                ? new Date(
                    conversaciones.find(
                      (c) => c.sessionId === conversacionActiva,
                    )!.createdAt,
                  ).toDateString() === new Date().toDateString()
                : true // si no encontró (nueva conv), asumir que es de hoy
            }
          />
        )}
      </div>

      {/* ── Dialog eliminar ──────────────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          className={`
            font-['Arial'] max-w-sm mx-4 sm:max-w-md sm:mx-auto
            ${
              theme === "dark"
                ? "bg-[#1a1a1a] text-white border-[#2a2a2a]"
                : "bg-white text-gray-900 border-gray-200"
            }
          `}
        >
          <AlertDialogHeader className="pt-4 sm:pt-6">
            <div className="mx-auto mb-3 sm:mb-4">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center ${
                  theme === "dark" ? "bg-red-900/20" : "bg-red-100"
                }`}
              >
                <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-lg sm:text-xl font-bold">
              ¿Eliminar conversación?
            </AlertDialogTitle>
            <AlertDialogDescription
              className={`text-center pt-3 pb-2 text-sm ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              <p className="mb-2">
                Esta acción eliminará permanentemente la conversación:
              </p>
              <p className="font-semibold text-sm">
                "{conversacionAEliminar?.nombreConversacion || "Sin nombre"}"
              </p>
              <p className="mt-2 text-sm">Esta acción no se puede deshacer.</p>

              {conversacionActiva === conversacionAEliminar?.sessionId && (
                <div
                  className={`mt-3 p-2.5 rounded-lg flex items-start gap-2 text-left ${
                    theme === "dark" ? "bg-blue-900/20" : "bg-blue-50"
                  }`}
                >
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Se creará una nueva conversación vacía automáticamente
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-6">
            <AlertDialogCancel
              onClick={handleCancelDelete}
              disabled={eliminando}
              className={`w-full sm:w-auto rounded-lg h-10 sm:h-11 ${
                theme === "dark"
                  ? "bg-[#2a2a2a] hover:bg-[#353535] text-white border-[#353535]"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200"
              } border`}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={eliminando}
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white rounded-lg h-10 sm:h-11 font-semibold"
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
