"use client";

import React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  validateSession,
  obtenerActividadesConRevisiones,
  guardarReporteTarde,
  sendPendienteValidarYGuardar,
  chatGeneralIA,
  consultarIAProyecto,
  verificarCambiosAnfeta,
} from "@/lib/api";
import { wsService } from "@/lib/websocket.service";
import type {
  Message,
  AssistantAnalysis,
  ChatBotProps,
  ChatStep,
} from "@/lib/types";
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
import {
  Bot,
  LogOut,
  AlertCircle,
  PartyPopper,
  CheckCircle2,
  Brain,
  Check,
  Zap,
  Cpu,
  CalendarX,
} from "lucide-react";
import { getDisplayName } from "@/util/utils-chat";
import { useVoiceSynthesis } from "@/components/hooks/use-voice-synthesis";
import { ChatHeader } from "./ChatHeader";
import { VoiceGuidanceFlow } from "./VoiceGuidanceFlow";
import { useVoiceRecognition } from "@/components/hooks/useVoiceRecognition";
import { useVoiceMode } from "@/components/hooks/useVoiceMode";
import { useConversationHistory } from "@/components/hooks/useConversationHistory";
import {
  getCurrentActivity,
  getCurrentTask,
  cleanExplanationTranscript,
  validateExplanationLength,
} from "@/util/voiceModeLogic";
import { MessageList } from "./chat/MessageList";
import { messageTemplates } from "./chat/messageTemplates";
import { ChatInputBar } from "./chat/ChatInputBar";
import { useMessageRestoration } from "@/components/hooks/useMessageRestoration";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { useAutoSendVoice } from "@/components/Audio/UseAutoSendVoiceOptions";
import { useToast } from "@/hooks/use-toast";
import { isReportTime } from "@/util/Timeutils";
import { ChatThemeProvider } from "@/context/ThemeContext";
import { TurnoPanel } from "@/components/TurnoPanel";
import { useVoiceEngine, type VoiceEngine } from "./Voiceengineselector";
import { adaptarDatosAnalisis } from "@/util/adaptarAnalisis";

// ==================== TIPOS LOCALES ====================
interface ExtendedChatBotProps extends ChatBotProps {
  onOpenSidebar?: () => void;
  onEngineChange?: (engine: VoiceEngine) => void;
  onVoskStatusChange?: (status: "idle" | "loading" | "ready" | "error") => void;
  isMobile?: boolean;
  sidebarOpen?: boolean;
  engineOverride?: VoiceEngine;
  openPiPWindow?: () => void;
  closePiPWindow?: () => void;
  isPiPModeProp?: boolean;
  esConversacionDeHoy?: boolean;
}
// ==================== COMPONENTE PRINCIPAL ====================

export function ChatBot({
  colaborador,
  onLogout,
  theme: externalTheme,
  onToggleTheme: externalToggle,
  conversacionActiva,
  mensajesRestaurados,
  analisisRestaurado,
  onNuevaConversacion,
  onActualizarNombre,
  onActualizarTyping,
  onOpenSidebar,
  isMobile = false,
  sidebarOpen = true,
  preferencias,
  onGuardarPreferencias,
  onEngineChange: onEngineChangeProp,
  onVoskStatusChange,
  engineOverride,
  openPiPWindow,
  closePiPWindow,
  isPiPModeProp,
  esConversacionDeHoy = true,
}: ExtendedChatBotProps) {
  // ==================== REFS ====================
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const assistantAnalysisRef = useRef<AssistantAnalysis | null>(null);
  const initializationRef = useRef(false);
  const fetchingAnalysisRef = useRef(false);
  const welcomeSentRef = useRef(false);
  const actualizarDatosRef = useRef<() => Promise<void>>(async () => {});
  const panelRefreshedForRef = useRef<string | null>(null);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoSendPending, setIsAutoSendPending] = useState(false);
  const autoSendCancelledRef = useRef(false);
  const transcriptJustSetRef = useRef(false);

  // ==================== HOOKS ====================
  const router = useRouter();
  const { toast } = useToast();

  const isManuallyCancellingRef = useRef(false);
  const voskGuidedModeRef = useRef(false);
  const voiceRecognition = useVoiceRecognition(
    preferencias?.idiomaVoz ?? "es-MX",
  );
  const voiceMode = useVoiceMode();
  const conversationHistory = useConversationHistory();

  const resolverIA = (transcript: string, sessionId: string | null) => {
    return chatModeRef.current === "proyecto" && assistantAnalysisRef.current
      ? consultarIAProyecto(transcript, sessionId)
      : chatGeneralIA(transcript, sessionId);
  };
  const {
    speak: speakText,
    stop: stopVoice,
    isSpeaking,
    rate,
    changeRate: changeRateHook,
    changeLang,
  } = useVoiceSynthesis(
    preferencias?.velocidadVoz ?? 1.2,
    preferencias?.idiomaVoz ?? "es-MX",
  );
  const audioRecorder = useAudioRecorder();

  const { engine, setEngine, transcriptionService, voskRealtime, voskStatus } =
    useVoiceEngine({
      initialEngine: engineOverride ?? "groq",
      onVoskPartial: (text) => {
        // Solo actualizar el input del chat si NO estamos en modo guiado
        if (voskGuidedModeRef.current) return;
        if (botRespondingRef.current || isSpeaking) return;
        setUserInput(text);
      },
      onVoskFinal: async (transcript) => {
        if (voskGuidedModeRef.current) {
          voskGuidedModeRef.current = false;
          await processVoiceExplanation(transcript);
          return;
        }
        if (!transcript.trim()) return;
        if (botRespondingRef.current || isSpeaking) return;
        voskIsRecordingRef.current = false;
        transcriptJustSetRef.current = true;
        setUserInput(transcript);
        inputRef.current?.blur();
      },
    });

  // ==================== CONSTANTS ====================
  const displayName = getDisplayName(colaborador);

  // ==================== STATE ====================
  const [step, setStep] = useState<ChatStep>("welcome");
  const [userInput, setUserInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [assistantAnalysis, setAssistantAnalysis] =
    useState<AssistantAnalysis | null>(null);
  const [isLoadingIA, setIsLoadingIA] = useState(false);
  const [colaboradoresUnicos, setColaboradoresUnicos] = useState<string[]>([]);
  const theme = externalTheme ?? "dark";

  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const [horaInicioReporteMañana] = useState("9:00 AM");
  const [horaFinReporteMañana] = useState("5:30 PM");
  const [horaInicioReporte] = useState("5:31 PM");
  const [horaFinReporte] = useState("6:30 PM");

  const [chatMode, setChatMode] = useState<"proyecto" | "general">(() => {
    const modo = preferencias?.modoAsistenteIA;
    return modo === "proyecto" || modo === "general" ? modo : "proyecto";
  });
  const chatModeRef = useRef<"proyecto" | "general">(
    preferencias?.modoAsistenteIA === "general" ? "general" : "proyecto",
  );
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [isInPiPWindow, setIsInPiPWindow] = useState(false);

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [filteredActivitiesForVoice, setFilteredActivitiesForVoice] = useState<
    any[]
  >([]);
  const [turnoActual, setTurnoActual] = useState<"mañana" | "tarde">(() =>
    getTurnoActual(),
  );
  const pendingVoiceSummaryRef = useRef<{
    hayTareasSinExplicar: boolean;
    explicadasCount: number;
    saltadasCount: number;
    speechText: string;
  } | null>(null);

  const colaboradoresUnicosRef = useRef<string[]>([]);
  const turnoActualRef = useRef<"mañana" | "tarde">(turnoActual);
  const AUTO_SEND_DELAY_MS = 4000; // 4 segundos
  const [autoSendCountdown, setAutoSendCountdown] = useState(0);
  const voskIsRecordingRef = useRef(false);
  const botRespondingRef = useRef(false);

  useEffect(() => {
    panelRefreshedForRef.current = null;
  }, [conversacionActiva]);

  useEffect(() => {
    if (engine === "vosk" && voskStatus === "idle") {
      voskRealtime.loadModel();
    }
  }, [engine]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const canUserType =
    step !== "loading-analysis" && step !== "error" && !voiceMode.voiceMode;

  useEffect(() => {
    colaboradoresUnicosRef.current = colaboradoresUnicos;
  }, [colaboradoresUnicos]);

  useEffect(() => {
    turnoActualRef.current = turnoActual;
  }, [turnoActual]);

  useEffect(() => {
    onEngineChangeProp?.(engine);
  }, [engine]);

  useEffect(() => {
    onVoskStatusChange?.(voskStatus);
  }, [voskStatus]);

  useEffect(() => {
    if (preferencias?.velocidadVoz != null)
      changeRateHook(preferencias.velocidadVoz);
    if (preferencias?.idiomaVoz) changeLang(preferencias.idiomaVoz);
  }, [preferencias?.velocidadVoz, preferencias?.idiomaVoz]);

  useEffect(() => {
    const modo = preferencias?.modoAsistenteIA;
    if (!modo) return;
    const modoValido: "proyecto" | "general" =
      modo === "proyecto" ? "proyecto" : "general";
    if (modoValido !== chatModeRef.current) {
      setChatMode(modoValido);
      chatModeRef.current = modoValido;
    }
  }, [preferencias?.modoAsistenteIA]);
  useEffect(() => {
    if (engineOverride && engineOverride !== engine) {
      setEngine(engineOverride);
    }
  }, [engineOverride]);
  // ==================== HELPERS ====================
  function getTurnoActual(): "mañana" | "tarde" {
    if (isReportTime(horaInicioReporteMañana, horaFinReporteMañana))
      return "mañana";
    if (isReportTime(horaInicioReporte, horaFinReporte)) return "tarde";
    return "tarde";
  }

  const activitiesWithTasks = useMemo(() => {
    if (!assistantAnalysis?.data?.revisionesPorActividad) return [];
    return assistantAnalysis.data.revisionesPorActividad
      .filter((a) => a.tareasConTiempo.length > 0)
      .map((a) => ({
        actividadId: a.actividadId,
        actividadTitulo: a.actividadTitulo,
        actividadHorario: a.actividadHorario,
        colaboradores: a.colaboradores || [],
        tareas: a.tareasConTiempo.map((t) => ({
          ...t,
          actividadId: a.actividadId,
          actividadTitulo: a.actividadTitulo,
        })),
      }));
  }, [assistantAnalysis]);

  const addMessage = (
    type: Message["type"],
    content: string | React.ReactNode,
    voiceText?: string,
    isWide?: boolean,
  ) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      voiceText,
      isWide,
    };
    setMessages((prev) => {
      const updated = [...prev, newMessage];
      if (conversationHistory.conversacionActiva) {
        conversationHistory.actualizarCache(
          conversationHistory.conversacionActiva,
          updated,
        );
      }
      return updated;
    });
  };

  const addMessageWithTyping = async (
    type: Message["type"],
    content: string | React.ReactNode,
    delay = 800,
    isWide?: boolean,
  ) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, delay));
    setIsTyping(false);
    addMessage(type, content, undefined, isWide);
  };

  const extraerColaboradores = (data: any): string[] => {
    const colaboradores = [
      ...(data.colaboradoresInvolucrados || []),
      ...(data.data?.actividades?.flatMap((a: any) => a.colaboradores || []) ||
        []),
      ...(data.data?.revisionesPorActividad?.flatMap(
        (rev: any) => rev.colaboradores || [],
      ) || []),
    ];
    return [...new Set(colaboradores)].filter(Boolean);
  };

  const crearMensajePanel = (
    turno: "mañana" | "tarde",
    analysis: AssistantAnalysis,
    colabs: string[],
    esHistorial = false,
  ): React.ReactNode => (
    <TurnoPanel
      key={`turno-panel-${turno}`}
      turno={turno}
      colaboradoresUnicos={colabs}
      assistantAnalysis={analysis}
      userEmail={colaborador.email}
      onStartVoiceMode={handleStartVoiceMode}
      onStartVoiceModeWithTasks={handleStartVoiceModeWithTasks}
      onReportCompleted={async () => {
        await fetchAssistantAnalysis(turno === "mañana", false, true);
      }}
      onRefrescarDatos={async () => {
        await fetchAssistantAnalysis(false, false, true, true);
      }}
      stopVoice={stopVoice}
      isSpeaking={isSpeaking}
      speakText={speakText}
      rate={rate}
      engine={engine}
      transcriptionService={transcriptionService}
      audioRecorder={audioRecorder}
      esHistorial={esHistorial}
    />
  );

  // ==================== ACTUALIZAR PANEL EN MENSAJES ====================
  const actualizarPanelTurno = (
    nuevoTurno: "mañana" | "tarde",
    analysis?: AssistantAnalysis,
  ) => {
    const dataToUse = analysis || assistantAnalysis;
    if (!dataToUse) return;

    const nuevoContenido = crearMensajePanel(
      nuevoTurno,
      dataToUse,
      colaboradoresUnicosRef.current,
    );

    setMessages((prevMessages) => {
      const reversedMessages = [...prevMessages].reverse();
      const reversedIndex = reversedMessages.findIndex((msg) => {
        if (msg.type !== "bot" || msg.isWide !== true) return false;
        if (!React.isValidElement(msg.content)) return false;
        const content = msg.content as any;
        // Detectar si el mensaje contiene un TurnoPanel
        if (content.type === TurnoPanel) return true;
        // Retrocompatibilidad: buscar dentro de divs con hijos
        if (!content.props?.children) return false;
        const hasPanel = content.props.children.some?.((child: any) => {
          if (!React.isValidElement(child)) return false;
          const componentType = (child as any).type;
          return (
            componentType === TurnoPanel ||
            componentType?.name === "TasksPanelWithDescriptions" ||
            componentType?.displayName === "TasksPanelWithDescriptions" ||
            componentType?.name === "PanelReporteTareasTarde" ||
            componentType?.displayName === "PanelReporteTareasTarde"
          );
        });
        return hasPanel;
      });
      if (reversedIndex === -1) return prevMessages;

      // Actualizar el panel existente
      const lastPanelIndex = prevMessages.length - 1 - reversedIndex;
      const newMessages = [...prevMessages];
      newMessages[lastPanelIndex] = {
        ...newMessages[lastPanelIndex],
        content: nuevoContenido,
        timestamp: new Date(),
      };
      return newMessages;
    });
  };

  // ==================== WEBSOCKET ====================
  const actualizarDatosPorWebSocket = async () => {
    if (fetchingAnalysisRef.current) return;
    try {
      const data = await obtenerActividadesConRevisiones({
        email: colaborador.email,
        showAll: true,
      });
      const colabs = extraerColaboradores(data);
      setColaboradoresUnicos(colabs);
      colaboradoresUnicosRef.current = colabs;
      const adaptedData = adaptarDatosAnalisis(data);
      assistantAnalysisRef.current = adaptedData;
      setAssistantAnalysis(adaptedData);
      actualizarPanelTurno(turnoActualRef.current, adaptedData);
      toast({
        title: "Datos actualizados",
        description: "Se detectaron cambios en tus actividades",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error al actualizar datos:", error);
    }
  };

  actualizarDatosRef.current = actualizarDatosPorWebSocket;

  // DESPUÉS
  useEffect(() => {
    if (!colaborador?.email) return;
    wsService.conectar(colaborador.email);
    wsService.setOnConnectionError((message) => {
      toast({
        variant: "destructive",
        title: "Sin conexión en tiempo real",
        description: message,
        duration: 5000,
      });
    });
    const onCambiosTareas = () => {
      toast({
        title: "Actualizando datos",
        description: "Hay cambios en tus actividades",
        duration: 2000,
      });
      actualizarDatosRef.current();
    };
    const onExplicacionGuardada = () => {
      actualizarDatosRef.current();
    };

    wsService.on("cambios-tareas", onCambiosTareas);
    wsService.on("explicacion_guardada", onExplicacionGuardada);

    return () => {
      wsService.off("cambios-tareas", onCambiosTareas); // solo el suyo
      wsService.off("explicacion_guardada", onExplicacionGuardada); // solo el suyo
    };
  }, [colaborador?.email]);

  // ==================== MODO VOZ - NAVEGACIÓN ====================
  const speakActivityByIndex = (activityIndex: number) => {
    const activitiesToUse =
      filteredActivitiesForVoice.length > 0
        ? filteredActivitiesForVoice
        : activitiesWithTasks;
    if (activityIndex >= activitiesToUse.length) {
      voiceMode.setVoiceStep("summary");
      voiceMode.setExpectedInputType("confirmation");
      setTimeout(
        () =>
          speakText(
            "¡Perfecto! Has explicado todas las tareas. Presiona el botón de comenzar para iniciar tu jornada.",
          ),
        500,
      );
      return;
    }
    const activity = activitiesToUse[activityIndex];
    const activityText = `Actividad ${activityIndex + 1} de ${activitiesToUse.length}: ${activity.actividadTitulo}. Tiene ${activity.tareas.length} tarea${activity.tareas.length !== 1 ? "s" : ""}.`;
    voiceMode.setVoiceStep("activity-presentation");
    voiceMode.setExpectedInputType("none");
    setTimeout(() => {
      speakText(activityText);
      setTimeout(
        () => {
          voiceMode.setCurrentTaskIndex(0);
          speakTaskByIndices(activityIndex, 0);
        },
        activityText.length * 40 + 1000,
      );
    }, 100);
  };

  const speakTaskByIndices = (activityIndex: number, taskIndex: number) => {
    const activitiesToUse =
      filteredActivitiesForVoice.length > 0
        ? filteredActivitiesForVoice
        : activitiesWithTasks;
    if (activityIndex >= activitiesToUse.length) {
      voiceMode.setVoiceStep("summary");
      voiceMode.setExpectedInputType("confirmation");
      setTimeout(
        () =>
          speakText(
            "¡Perfecto! Has explicado todas las tareas. ¿Quieres enviar este reporte?",
          ),
        500,
      );
      return;
    }
    const activity = activitiesToUse[activityIndex];
    if (taskIndex >= activity.tareas.length) {
      const nextActivityIndex = activityIndex + 1;
      voiceMode.setCurrentActivityIndex(nextActivityIndex);
      voiceMode.setCurrentTaskIndex(0);
      setTimeout(() => speakTaskByIndices(nextActivityIndex, 0), 500);
      return;
    }
    const task = activity.tareas[taskIndex];
    const taskText = `Tarea ${taskIndex + 1} de ${activity.tareas.length}: ${task.nombre}. ¿Cómo planeas resolver esta tarea?`;
    voiceMode.setVoiceStep("task-presentation");
    voiceMode.setExpectedInputType("none");
    voiceMode.setCurrentListeningFor(`Tarea: ${task.nombre}`);
    setTimeout(() => {
      speakText(taskText);
      setTimeout(
        () => {
          voiceMode.setVoiceStep("waiting-for-explanation");
          voiceMode.setExpectedInputType("explanation");
        },
        taskText.length * 40 + 800,
      );
    }, 100);
  };

  // ==================== AUTO-SEND VOICE: CHAT GENERAL ====================
  const autoSendVoiceChat = useAutoSendVoice({
    // Descomentar para que funcione solo con groq
    // transcriptionService: transcribirAudioCliente,
    transcriptionService,
    stopRecording: audioRecorder.stopRecording,
    startRecording: audioRecorder.startRecording,
    enableRealtimeTranscription: true,
    onTranscriptionComplete: async (transcript) => {
      transcriptJustSetRef.current = true;
      setUserInput(transcript);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    onError: (error) => {
      if (isManuallyCancellingRef.current) return;
      addMessage(
        "system",
        <div className="text-xs text-red-500">
          {error.message || "Error al procesar el audio"}
        </div>,
      );
      toast({
        variant: "destructive",
        title: "Error de audio",
        description: error.message || "No se pudo procesar tu mensaje de voz.",
      });
    },
  });

  const handleCancelAutoSend = () => {
    autoSendCancelledRef.current = true;
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }
    setIsAutoSendPending(false);
  };

  // ==================== AUTO-SEND VOICE: MODO GUIADO ====================
  const autoSendVoiceGuided = useAutoSendVoice({
    // transcriptionService: transcribirAudioCliente, // Descomentar para que funcione solo con groq
    transcriptionService,
    stopRecording: audioRecorder.stopRecording,
    startRecording: audioRecorder.startRecording,
    silenceThreshold: 3000,
    speechThreshold: 10,
    enableRealtimeTranscription: true, // true para habilitar la transcripción en tiempo real (consume mucho mas tokens)
    onTranscriptionComplete: async (transcript) => {
      const trimmedTranscript = cleanExplanationTranscript(transcript);
      const validation = validateExplanationLength(trimmedTranscript);
      if (!validation.isValid) {
        speakText(validation.message!);
        setTimeout(() => {
          voiceMode.setVoiceStep("waiting-for-explanation");
          voiceMode.setExpectedInputType("explanation");
        }, 1000);
        return;
      }
      const activitiesToUse =
        filteredActivitiesForVoice.length > 0
          ? filteredActivitiesForVoice
          : activitiesWithTasks;
      const currentTask = getCurrentTask(
        voiceMode.currentActivityIndex,
        voiceMode.currentTaskIndex,
        activitiesToUse,
      );
      const currentActivity = getCurrentActivity(
        voiceMode.currentActivityIndex,
        activitiesToUse,
      );
      if (!currentTask || !currentActivity) return;
      voiceMode.setVoiceStep("processing-explanation");
      speakText("Validando tu explicación...");
      try {
        const response = await sendPendienteValidarYGuardar({
          actividadId: currentActivity.actividadId,
          actividadTitulo: currentActivity.actividadTitulo,
          nombrePendiente: currentTask.nombre,
          idPendiente: currentTask.id,
          explicacion: trimmedTranscript,
        });
        if (response.esValida) {
          voiceMode.setTaskExplanations((prev) => [
            ...prev.filter((exp) => exp.taskId !== currentTask.id),
            {
              taskId: currentTask.id,
              taskName: currentTask.nombre,
              activityTitle: currentActivity.actividadTitulo,
              explanation: trimmedTranscript,
              confirmed: true,
              priority: currentTask.prioridad,
              duration: currentTask.duracionMin,
              timestamp: new Date(),
            },
          ]);
          speakText(
            "Perfecto, explicación validada. Pasamos a la siguiente tarea.",
          );
          fetchAssistantAnalysis(true, false, true);
          setTimeout(() => {
            const nextTask = voiceMode.currentTaskIndex + 1;
            if (nextTask < currentActivity.tareas.length) {
              voiceMode.setCurrentTaskIndex(nextTask);
              voiceMode.setRetryCount(0);
              speakTaskByIndices(voiceMode.currentActivityIndex, nextTask);
            } else {
              const nextActivity = voiceMode.currentActivityIndex + 1;
              voiceMode.setCurrentActivityIndex(nextActivity);
              voiceMode.setCurrentTaskIndex(0);
              voiceMode.setRetryCount(0);
              if (nextActivity < activitiesToUse.length)
                speakActivityByIndex(nextActivity);
              else {
                voiceMode.setVoiceStep("summary");
                voiceMode.setExpectedInputType("confirmation");
                setTimeout(
                  () =>
                    speakText(
                      "¡Excelente! Has completado todas las tareas. ¿Quieres enviar el reporte?",
                    ),
                  1000,
                );
              }
            }
          }, 3000);
        } else {
          voiceMode.setRetryCount((prev) => prev + 1);
          speakText(
            response.razon ||
              "Por favor, explica con más detalle cómo resolverás esta tarea.",
          );
          setTimeout(() => {
            voiceMode.setVoiceStep("waiting-for-explanation");
            voiceMode.setExpectedInputType("explanation");
          }, 3000);
        }
      } catch {
        speakText("Hubo un error. Por favor, intenta de nuevo.");
        setTimeout(() => {
          voiceMode.setVoiceStep("waiting-for-explanation");
          voiceMode.setExpectedInputType("explanation");
        }, 2000);
      }
    },
    onError: (error) => {
      if (isManuallyCancellingRef.current) return;
      speakText(
        "Hubo un problema con la grabación. Por favor, intenta de nuevo.",
      );
      toast({
        variant: "destructive",
        title: "Error en grabación",
        description: "Hubo un problema con el audio. Intenta de nuevo.",
      });
      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
        voiceMode.setExpectedInputType("explanation");
      }, 1500);
    },
  });

  const handleStartRecording = async () => {
    if (engine === "vosk") {
      voskIsRecordingRef.current = true;
      // Asegurarse que el socket esté conectado antes de iniciar
      if (!wsService.estaConectado()) {
        wsService.conectar(colaborador.email);
        // Esperar un momento para que conecte
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await voskRealtime.startRealtime();
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      await autoSendVoiceChat.startVoiceRecording();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleStopRecording = async () => {
    if (engine === "vosk") {
      voskIsRecordingRef.current = false;
      await voskRealtime.stopRealtime();
    } else {
      await autoSendVoiceChat.processAndSendAudio();
    }
  };

  const handleCancelRecording = async () => {
    if (engine === "vosk") {
      voskIsRecordingRef.current = false;
      voskRealtime.cancelRealtime();
    } else {
      await autoSendVoiceChat.cancelVoiceRecording();
    }
    setUserInput("");
  };

  useEffect(() => {
    if (
      engine !== "vosk" &&
      !autoSendVoiceChat.isRecording &&
      !autoSendVoiceChat.isTranscribing
    ) {
      setUserInput(autoSendVoiceChat.transcript);
    }
  }, [
    autoSendVoiceChat.transcript,
    autoSendVoiceChat.isRecording,
    autoSendVoiceChat.isTranscribing,
  ]);

  const userInputRef = useRef(userInput);
  useEffect(() => {
    userInputRef.current = userInput;
  }, [userInput]);

  useEffect(() => {
    if (autoSendVoiceChat.isRecording || autoSendVoiceChat.isTranscribing)
      return;
    if (voskIsRecordingRef.current) return;
    if (botRespondingRef.current) return;
    if (!userInput.trim()) return;
    if (!transcriptJustSetRef.current) return;

    transcriptJustSetRef.current = false;

    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }

    autoSendCancelledRef.current = false;
    setIsAutoSendPending(true);
    setAutoSendCountdown(Math.ceil(AUTO_SEND_DELAY_MS / 1000));

    const countdownInterval = setInterval(() => {
      setAutoSendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    autoSendTimerRef.current = setTimeout(() => {
      clearInterval(countdownInterval);
      if (autoSendCancelledRef.current) {
        autoSendCancelledRef.current = false;
        setIsAutoSendPending(false);
        return;
      }

      setIsAutoSendPending(false);
      autoSendTimerRef.current = null;

      const input = userInputRef.current.trim();
      if (!input) return;

      setUserInput("");
      addMessage("user", input);
      setIsTyping(true);
      setIsLoadingIA(true);

      const sessionId =
        conversacionActiva || assistantAnalysis?.sessionId || null;
      resolverIA(input, sessionId)
        .then((response) => {
          if (response?.respuesta) {
            addMessage("bot", response.respuesta);
            speakText(response.respuesta);
            if (response.sessionId && !conversacionActiva) {
              onNuevaConversacion?.({
                sessionId: response.sessionId,
                userId: colaborador.email,
                estadoConversacion: "activa",
                createdAt: new Date().toISOString(),
                nombreConversacion:
                  response.nombreConversacion || "Nueva conversación",
              });
            }
            if (
              response.sessionId &&
              conversacionActiva &&
              response.nombreConversacion
            ) {
              onActualizarNombre?.(
                response.sessionId,
                response.nombreConversacion,
              );
            }
          } else {
            addMessage("bot", "Lo siento, no pude procesar tu mensaje.");
          }
        })
        .catch(() => {
          addMessage("bot", "Lo siento, hubo un error al procesar tu mensaje.");
        })
        .finally(() => {
          setIsLoadingIA(false);
          setIsTyping(false);
        });
    }, AUTO_SEND_DELAY_MS);

    return () => {
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
      setIsAutoSendPending(false);
    };
  }, [
    userInput,
    autoSendVoiceChat.isRecording,
    autoSendVoiceChat.isTranscribing,
  ]);

  const {
    isRecording,
    isTranscribing,
    audioLevel,
    startVoiceRecording,
    cancelVoiceRecording,
  } = autoSendVoiceChat;

  // ==================== INICIAR MODO VOZ ====================
  const handleStartVoiceModeWithTasks = (taskIds: string[]) => {
    if (!taskIds?.length) {
      speakText("No hay tareas seleccionadas para explicar.");
      return;
    }
    const analysis = assistantAnalysisRef.current;
    if (!analysis) {
      speakText("No hay actividades para explicar.");
      return;
    }

    const filteredActivities = analysis.data.revisionesPorActividad
      .map((actividad) => {
        const tareasFiltradas = actividad.tareasConTiempo
          .filter((t) => taskIds.includes(t.id))
          .map((t) => ({
            ...t,
            actividadId: actividad.actividadId,
            actividadTitulo: actividad.actividadTitulo,
          }));
        if (!tareasFiltradas.length) return null;
        return {
          actividadId: actividad.actividadId,
          actividadTitulo: actividad.actividadTitulo,
          actividadHorario: actividad.actividadHorario,
          colaboradores: actividad.colaboradores || [],
          tareas: tareasFiltradas,
        };
      })
      .filter((a): a is any => a !== null);

    if (!filteredActivities.length) {
      speakText("No se encontraron actividades con las tareas seleccionadas.");
      return;
    }

    setSelectedTaskIds(taskIds);
    setFilteredActivitiesForVoice(filteredActivities);
    voiceMode.setVoiceMode(true);
    voiceMode.setVoiceStep("confirm-start");
    voiceMode.setExpectedInputType("confirmation");
    voiceMode.setCurrentActivityIndex(0);
    voiceMode.setCurrentTaskIndex(0);
    voiceMode.setTaskExplanations([]);
    speakText(
      `Vamos a explicar ${taskIds.length} tarea${taskIds.length !== 1 ? "s" : ""} seleccionada${taskIds.length !== 1 ? "s" : ""} en ${filteredActivities.length} actividad${filteredActivities.length !== 1 ? "es" : ""}. ¿Listo para comenzar?`,
    );
  };

  const handleStartVoiceMode = () => {
    const analysis = assistantAnalysisRef.current;
    if (!analysis) {
      speakText("No hay actividades para explicar.");
      return;
    }

    const activitiesLocal = analysis.data.revisionesPorActividad
      .filter((a) => a.tareasConTiempo?.length > 0)
      .map((a) => ({
        actividadId: a.actividadId,
        actividadTitulo: a.actividadTitulo,
        actividadHorario: a.actividadHorario,
        colaboradores: a.colaboradores || [],
        tareas: a.tareasConTiempo.map((t) => ({
          ...t,
          actividadId: a.actividadId,
          actividadTitulo: a.actividadTitulo,
        })),
      }));

    if (!activitiesLocal.length) {
      speakText("No hay tareas con tiempo asignado para explicar.");
      return;
    }

    setSelectedTaskIds([]);
    setFilteredActivitiesForVoice([]);
    voiceMode.setVoiceMode(true);
    voiceMode.setVoiceStep("confirm-start");
    voiceMode.setExpectedInputType("confirmation");
    voiceMode.setCurrentActivityIndex(0);
    voiceMode.setCurrentTaskIndex(0);
    voiceMode.setTaskExplanations([]);
    speakText(
      `Vamos a explicar ${activitiesLocal.length} actividad${activitiesLocal.length !== 1 ? "es" : ""} con tareas programadas. ¿Listo para comenzar?`,
    );
  };

  // ==================== INICIALIZACIÓN ====================
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (initializationRef.current) return;
    const hayDatosRestauracion =
      (mensajesRestaurados && mensajesRestaurados.length > 1) ||
      analisisRestaurado;

    if (hayDatosRestauracion) {
      initializationRef.current = true;
      if (analisisRestaurado) {
        assistantAnalysisRef.current = analisisRestaurado;
        setAssistantAnalysis(analisisRestaurado);
        if (analisisRestaurado.colaboradoresInvolucrados) {
          setColaboradoresUnicos(analisisRestaurado.colaboradoresInvolucrados);
          colaboradoresUnicosRef.current =
            analisisRestaurado.colaboradoresInvolucrados;
        }
        setStep("ready");
        setIsTyping(false);
      }

      fetchAssistantAnalysis(false, false, true);

      return;
    }
    initializationRef.current = true;
    const init = async () => {
      const user = await validateSession();
      if (!user) {
        router.replace("/");
        return;
      }
      if (!welcomeSentRef.current) {
        welcomeSentRef.current = true;
        addMessageWithTyping(
          "bot",
          `¡Hola ${displayName}! Soy tu asistente.`,
          500,
        );
        addMessageWithTyping(
          "system",
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Brain className="w-4 h-4 text-[#6841ea]" />
            {"Obteniendo análisis de tus actividades..."}
          </div>,
        );
        await fetchAssistantAnalysis();
      }
    };
    init();
  }, []);

  // ==================== CAMBIO DE TURNO ====================
  useEffect(() => {
    const intervalo = setInterval(() => {
      const nuevoTurno = getTurnoActual();
      if (nuevoTurno !== turnoActualRef.current) {
        setTurnoActual(nuevoTurno);
        turnoActualRef.current = nuevoTurno;
        actualizarPanelTurno(nuevoTurno);
        toast({
          title: "Cambio de turno",
          description:
            nuevoTurno === "mañana"
              ? "Turno de mañana iniciado. Ahora puedes explicar las tareas con descripción."
              : "Turno de tarde iniciado. Es hora de reportar las tareas pendientes.",
          duration: 5000,
        });
      }
    }, 60000);
    return () => clearInterval(intervalo);
  }, [assistantAnalysis]);

  // ==================== RESTAURACIÓN DE MENSAJES ====================
  useMessageRestoration({
    conversacionActiva,
    mensajesRestaurados,
    analisisRestaurado,
    displayName,
    email: colaborador.email,
    onStartVoiceMode: handleStartVoiceMode,
    setMessages,
    setStep,
    setIsTyping,
    setAssistantAnalysis,
    assistantAnalysisRef,
    scrollRef,
    crearPanel: (analysis) =>
      crearMensajePanel(
        turnoActualRef.current,
        analysis,
        colaboradoresUnicosRef.current,
        true, // siempre readonly al restaurar
      ),
  });

  useEffect(() => {
    if (!conversacionActiva) return;
    if (!esConversacionDeHoy) return;
    if (panelRefreshedForRef.current === conversacionActiva) return;
    if (!assistantAnalysis) return; // ← STATE no ref, para re-ejecutar cuando llega
    if (!mensajesRestaurados || mensajesRestaurados.length <= 1) return;

    panelRefreshedForRef.current = conversacionActiva;

    const timer = setTimeout(() => {
      const freshAnalysis = assistantAnalysisRef.current;
      if (!freshAnalysis) return;

      const nuevoContenidoPanel = crearMensajePanel(
        turnoActualRef.current,
        freshAnalysis,
        colaboradoresUnicosRef.current,
      );

      setMessages((prev) => {
        const yaHayPanelFresco = prev.some(
          (msg) => msg.isWide && msg.id.startsWith("fresh-panel-"),
        );
        if (yaHayPanelFresco) return prev;

        return [
          ...prev,
          {
            id: `fresh-panel-${Date.now()}`,
            type: "bot" as const,
            content: nuevoContenidoPanel,
            timestamp: new Date(),
            isWide: true,
          },
        ];
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [conversacionActiva, esConversacionDeHoy, assistantAnalysis]); // ← agregar assistantAnalysis

  // ==================== AUTO-SCROLL ====================
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, voiceMode.voiceMode, voiceMode.voiceStep]);

  // ==================== FOCUS INPUT ====================
  useEffect(() => {
    if (
      inputRef.current &&
      step !== "loading-analysis" &&
      !voiceMode.voiceMode
    ) {
      inputRef.current.focus();
    }
  }, [step, voiceMode.voiceMode]);

  useEffect(() => {
    onActualizarTyping?.(isTyping);
  }, [isTyping, onActualizarTyping]);

  // ==================== PiP ====================
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("pip") === "true") {
      setIsInPiPWindow(true);
      document.title = "Asistente Anfeta";
      Object.assign(document.documentElement.style, { overflow: "hidden" });
      Object.assign(document.body.style, {
        margin: "0",
        padding: "0",
        overflow: "hidden",
        height: "100vh",
        width: "100vw",
      });
      if (window.opener) setIsPiPMode(true);
    }
    const handleBeforeUnload = () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed)
        pipWindowRef.current.close();
      voiceRecognition.stopRecording();
      stopVoice();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (pipWindowRef.current && !pipWindowRef.current.closed)
        pipWindowRef.current.close();
      voiceRecognition.stopRecording();
      stopVoice();
    };
  }, [stopVoice]);

  useEffect(() => {
    if (!voiceMode.voiceMode && pendingVoiceSummaryRef.current) {
      const s = pendingVoiceSummaryRef.current;
      pendingVoiceSummaryRef.current = null;

      addMessage(
        "bot",
        <div
          className={`p-4 rounded-lg border ${
            s.hayTareasSinExplicar
              ? "bg-yellow-500/10 border-yellow-500/20"
              : "bg-green-500/10 border-green-500/20"
          }`}
        >
          <div className="flex items-center gap-3">
            {s.hayTareasSinExplicar ? (
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            )}
            <div>
              <span className="font-medium">
                {s.hayTareasSinExplicar
                  ? "Tienes tareas sin reportar"
                  : "¡Jornada iniciada!"}
              </span>
              <p
                className={`text-sm mt-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
              >
                {s.hayTareasSinExplicar
                  ? `Eres el único responsable de ${s.saltadasCount} tarea${s.saltadasCount !== 1 ? "s" : ""} que saltaste.`
                  : `Has explicado ${s.explicadasCount} tarea${s.explicadasCount !== 1 ? "s" : ""} correctamente. ¡Mucho éxito!`}
              </p>
            </div>
          </div>
        </div>,
      );
      speakText(s.speechText);
    }
  }, [voiceMode.voiceMode]);

  // ==================== MODO VOZ - CONTROL ====================
  const finishVoiceMode = () => {
    // 1. Capture data BEFORE resetting state
    const explicadas = voiceMode.taskExplanations.filter(
      (e) => e.explanation !== "[Tarea saltada]",
    );
    const saltadas = voiceMode.taskExplanations.filter(
      (e) => e.explanation === "[Tarea saltada]",
    );
    const esSoloPersona = activitiesWithTasks.every(
      (act) => act.colaboradores.length <= 1,
    );
    const hayTareasSinExplicar = esSoloPersona && saltadas.length > 0;

    // 2. Store summary in ref so the useEffect can read it after the state flush
    pendingVoiceSummaryRef.current = {
      hayTareasSinExplicar,
      explicadasCount: explicadas.length,
      saltadasCount: saltadas.length,
      speechText: hayTareasSinExplicar
        ? `Atención: saltaste ${saltadas.length} tarea${saltadas.length !== 1 ? "s" : ""} y eres el único responsable.`
        : "¡Perfecto! Tu jornada ha comenzado. Mucho éxito con tus tareas.",
    };

    // 3. Reset ALL voice state in one batch — no addMessage/speakText here
    stopVoice();
    autoSendVoiceGuided.cancelVoiceRecording();
    voiceMode.setVoiceMode(false); // ← this is the gate for ChatInputBar
    voiceMode.setVoiceStep("idle");
    voiceMode.setExpectedInputType("none");
    voiceMode.setCurrentActivityIndex(0);
    voiceMode.setCurrentTaskIndex(0);
    voiceMode.setTaskExplanations([]);
    setSelectedTaskIds([]);
    setFilteredActivitiesForVoice([]);
  };

  const cancelVoiceMode = () => {
    isManuallyCancellingRef.current = true;
    voskGuidedModeRef.current = false;
    stopVoice();
    voiceRecognition.stopRecording();
    cancelVoiceRecording();
    autoSendVoiceGuided.cancelVoiceRecording();
    voskRealtime.cancelRealtime();
    voiceMode.cancelVoiceMode();
    setSelectedTaskIds([]);
    setFilteredActivitiesForVoice([]);
    setTimeout(() => {
      isManuallyCancellingRef.current = false;
    }, 500);
  };

  const confirmStartVoiceMode = () => {
    const activitiesToUse =
      filteredActivitiesForVoice.length > 0
        ? filteredActivitiesForVoice
        : activitiesWithTasks;
    if (!activitiesToUse.length) {
      speakText("No hay actividades con tareas para explicar.");
      setTimeout(() => voiceMode.cancelVoiceMode(), 1000);
      return;
    }
    voiceMode.setCurrentActivityIndex(0);
    voiceMode.setCurrentTaskIndex(0);
    setTimeout(() => speakTaskByIndices(0, 0), 300);
  };

  const startTaskExplanation = () => {
    const allowedStates = [
      "waiting-for-explanation",
      "confirmation",
      "task-presentation",
    ];
    if (!allowedStates.includes(voiceMode.voiceStep)) return;
    stopVoice();
    const activitiesToUse =
      filteredActivitiesForVoice.length > 0
        ? filteredActivitiesForVoice
        : activitiesWithTasks;
    const currentTask = getCurrentTask(
      voiceMode.currentActivityIndex,
      voiceMode.currentTaskIndex,
      activitiesToUse,
    );
    if (currentTask)
      voiceMode.setCurrentListeningFor(
        `Explicación para: ${currentTask.nombre}`,
      );
    voiceMode.setVoiceStep("listening-explanation");
    voiceMode.setExpectedInputType("explanation");

    if (engine === "vosk") {
      voskGuidedModeRef.current = true;
      setTimeout(() => voskRealtime.startRealtime(), 100);
    } else {
      setTimeout(() => autoSendVoiceGuided.startVoiceRecording(), 100);
    }
  };

  const processVoiceExplanation = async (transcript: string) => {
    const trimmedTranscript = cleanExplanationTranscript(transcript);
    const validation = validateExplanationLength(trimmedTranscript);
    if (!validation.isValid) {
      speakText(validation.message!);
      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
        voiceMode.setExpectedInputType("explanation");
      }, 1000);
      return;
    }
    const activitiesToUse =
      filteredActivitiesForVoice.length > 0
        ? filteredActivitiesForVoice
        : activitiesWithTasks;
    const currentTask = getCurrentTask(
      voiceMode.currentActivityIndex,
      voiceMode.currentTaskIndex,
      activitiesToUse,
    );
    const currentActivity = getCurrentActivity(
      voiceMode.currentActivityIndex,
      activitiesToUse,
    );
    if (!currentTask || !currentActivity) return;
    voiceMode.setVoiceStep("processing-explanation");
    speakText("Validando tu explicación...");
    try {
      const response = await sendPendienteValidarYGuardar({
        actividadId: currentActivity.actividadId,
        actividadTitulo: currentActivity.actividadTitulo,
        nombrePendiente: currentTask.nombre,
        idPendiente: currentTask.id,
        explicacion: trimmedTranscript,
        userEmail: colaborador.email,
      });
      if (response.esValida) {
        voiceMode.setTaskExplanations((prev) => [
          ...prev.filter((e) => e.taskId !== currentTask.id),
          {
            taskId: currentTask.id,
            taskName: currentTask.nombre,
            activityTitle: currentActivity.actividadTitulo,
            explanation: trimmedTranscript,
            confirmed: true,
            priority: currentTask.prioridad,
            duration: currentTask.duracionMin,
            timestamp: new Date(),
          },
        ]);
        speakText(
          "Perfecto, explicación validada. Pasamos a la siguiente tarea.",
        );
        setTimeout(() => {
          const nextTask = voiceMode.currentTaskIndex + 1;
          if (nextTask < currentActivity.tareas.length) {
            voiceMode.setCurrentTaskIndex(nextTask);
            voiceMode.setRetryCount(0);
            speakTaskByIndices(voiceMode.currentActivityIndex, nextTask);
          } else {
            const nextActivity = voiceMode.currentActivityIndex + 1;
            voiceMode.setCurrentActivityIndex(nextActivity);
            voiceMode.setCurrentTaskIndex(0);
            voiceMode.setRetryCount(0);
            if (nextActivity < activitiesToUse.length)
              speakActivityByIndex(nextActivity);
            else {
              voiceMode.setVoiceStep("summary");
              voiceMode.setExpectedInputType("confirmation");
              setTimeout(
                () =>
                  speakText(
                    "¡Excelente! Has completado todas las tareas. ¿Quieres enviar el reporte?",
                  ),
                1000,
              );
            }
          }
        }, 2000);
      } else {
        voiceMode.setRetryCount((prev) => prev + 1);
        speakText(
          response.razon ||
            "Por favor, explica con más detalle cómo resolverás esta tarea.",
        );
        setTimeout(() => {
          voiceMode.setVoiceStep("waiting-for-explanation");
          voiceMode.setExpectedInputType("explanation");
        }, 3000);
      }
    } catch {
      speakText("Hubo un error. Por favor, intenta de nuevo.");
      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
        voiceMode.setExpectedInputType("explanation");
      }, 2000);
    }
  };

  const retryExplanation = () => {
    const activitiesToUse =
      filteredActivitiesForVoice.length > 0
        ? filteredActivitiesForVoice
        : activitiesWithTasks;
    const currentTask = getCurrentTask(
      voiceMode.currentActivityIndex,
      voiceMode.currentTaskIndex,
      activitiesToUse,
    );
    if (!currentTask) return;
    voiceMode.setTaskExplanations((prev) =>
      prev.filter((e) => e.taskId !== currentTask.id),
    );
    voiceMode.setRetryCount((prev) => prev + 1);
    stopVoice();
    setTimeout(() => {
      speakText("Por favor, explica nuevamente cómo resolverás esta tarea.");
      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
        voiceMode.setExpectedInputType("explanation");
      }, 1000);
    }, 300);
  };

  const skipTask = () => {
    const activitiesToUse =
      filteredActivitiesForVoice.length > 0
        ? filteredActivitiesForVoice
        : activitiesWithTasks;
    const currentTask = getCurrentTask(
      voiceMode.currentActivityIndex,
      voiceMode.currentTaskIndex,
      activitiesToUse,
    );
    const currentActivity = getCurrentActivity(
      voiceMode.currentActivityIndex,
      activitiesToUse,
    );
    if (!currentTask || !currentActivity) return;
    voiceMode.setTaskExplanations((prev) => [
      ...prev.filter((e) => e.taskId !== currentTask.id),
      {
        taskId: currentTask.id,
        taskName: currentTask.nombre,
        activityTitle: currentActivity.actividadTitulo,
        explanation: "[Tarea saltada]",
        confirmed: true,
        priority: currentTask.prioridad,
        duration: currentTask.duracionMin,
        timestamp: new Date(),
      },
    ]);
    const nextTask = voiceMode.currentTaskIndex + 1;
    if (nextTask < currentActivity.tareas.length) {
      voiceMode.setCurrentTaskIndex(nextTask);
      voiceMode.resetForNextTask();
      setTimeout(
        () => speakTaskByIndices(voiceMode.currentActivityIndex, nextTask),
        500,
      );
    } else {
      const nextActivity = voiceMode.currentActivityIndex + 1;
      voiceMode.setCurrentActivityIndex(nextActivity);
      voiceMode.setCurrentTaskIndex(0);
      voiceMode.resetForNextTask();
      if (nextActivity < activitiesToUse.length)
        setTimeout(() => speakActivityByIndex(nextActivity), 500);
      else {
        voiceMode.setVoiceStep("summary");
        voiceMode.setExpectedInputType("confirmation");
        setTimeout(
          () =>
            speakText(
              "¡Perfecto! Has explicado todas las tareas. ¿Quieres enviar este reporte?",
            ),
          500,
        );
      }
    }
  };

  // ==================== MOSTRAR ANÁLISIS ====================
  const showAssistantAnalysis = async (
    analysis: AssistantAnalysis,
    isRestoration = false,
  ) => {
    if (isRestoration) return;

    await addMessageWithTyping(
      "bot",
      messageTemplates.welcome.userInfo({
        displayName,
        email: colaborador.email,
      }),
      400,
      false,
    );

    await addMessageWithTyping(
      "bot",
      messageTemplates.analysis.metrics({ analysis }),
      600,
      false,
    );

    const hayTareas = analysis.data.revisionesPorActividad.some(
      (r) => r.tareasConTiempo.length > 0,
    );

    if (hayTareas) {
      addMessage(
        "bot",
        crearMensajePanel(
          turnoActual,
          analysis,
          colaboradoresUnicosRef.current,
        ),
        undefined,
        true,
      );
    } else {
      addMessage(
        "bot",
        messageTemplates.tasks.noTasksFound({
          onRefrescar: () => fetchAssistantAnalysis(false, false, false, true),
        }),
      );
    }
  };

  const fetchAssistantAnalysis = async (
    showAll = false,
    isRestoration = false,
    silentUpdate = false,
    consultarAlApi = false,
  ) => {
    if (fetchingAnalysisRef.current) return;
    fetchingAnalysisRef.current = true;
    try {
      if (!silentUpdate) {
        setIsTyping(true);
        setStep("loading-analysis");
      }
      const data = await obtenerActividadesConRevisiones({
        email: colaborador.email,
        showAll,
        consultarAlApi,
      });

      console.log("data", data);

      const tieneActividades = Array.isArray(data?.data?.revisionesPorActividad)
        ? data.data.revisionesPorActividad.length > 0
        : Object.keys(data?.data?.revisionesPorActividad ?? {}).length > 0;

      if (!data?.success) {
        if (silentUpdate) {
          toast({
            variant: "destructive",
            title: "Sin conexión",
            description: "No se pudo actualizar, el servidor no responde.",
            duration: 3000,
          });
          return;
        }
        throw new Error("Sin datos válidos");
      }

      if (!tieneActividades) {
        setStep("ready");
        if (!silentUpdate) {
          addMessage(
            "bot",
            <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-2 border-b border-blue-500/15">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                  <CalendarX className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-blue-400">
                  Sin actividades hoy
                </span>
                <div className="ml-auto">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {new Date().toLocaleDateString("es-MX", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
              <div className="px-4 py-3 flex items-start gap-3">
                <div className="flex flex-col gap-1">
                  <p
                    className={`text-sm leading-relaxed ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
                  >
                    {data?.data?.answer ??
                      "No tienes actividades registradas en horario laboral (9am–6pm)."}
                  </p>
                  <p
                    className={`text-xs mt-1 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                  >
                    Puedes registrar nuevas actividades o volver a consultar más
                    tarde.
                  </p>
                </div>
              </div>
            </div>,
          );
        }
        return;
      }
      const colabs = extraerColaboradores(data);
      setColaboradoresUnicos(colabs);
      colaboradoresUnicosRef.current = colabs;
      const adaptedData = adaptarDatosAnalisis(data);
      assistantAnalysisRef.current = adaptedData;
      setAssistantAnalysis(adaptedData);
      setStep("ready");
      if (silentUpdate) {
        actualizarPanelTurno(turnoActualRef.current, adaptedData);
      } else {
        showAssistantAnalysis(adaptedData, isRestoration);
      }
    } catch (error) {
      if (!silentUpdate) {
        setIsTyping(false);
        setStep("error");
        addMessage(
          "bot",
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <span className="font-medium">
                  Error al obtener actividades
                </span>
                <p
                  className={`text-sm mt-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                >
                  Hubo un problema al obtener tus actividades. Por favor,
                  intenta nuevamente más tarde.
                </p>
              </div>
            </div>
          </div>,
        );
        toast({
          variant: "destructive",
          title: "Error de análisis",
          description: "No se pudieron obtener tus actividades del día.",
        });
      } else {
        console.error("❌ Error en actualización silenciosa:", error);
        toast({
          variant: "destructive",
          title: "Sin conexión",
          description: "No se pudo actualizar, el servidor no responde.",
          duration: 3000,
        });
      }
    } finally {
      if (!silentUpdate) setIsTyping(false);
      fetchingAnalysisRef.current = false;
    }
  };

  // ==================== CHAT ====================
  const toggleChatMode = () => {
    const newMode = chatMode === "proyecto" ? "general" : "proyecto";
    chatModeRef.current = newMode;
    setChatMode(newMode);
    onGuardarPreferencias?.({ ...preferencias, modoAsistenteIA: newMode });
    addMessage(
      "system",
      newMode === "proyecto" ? (
        <div
          className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#6841ea]/10 border-[#6841ea]/20" : "bg-purple-50 border-purple-200"}`}
        >
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#6841ea]" />
            <span className="text-sm font-medium text-[#6841ea]">
              Modo Asistente IA activado
            </span>
          </div>
          <p
            className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            Ahora puedes hacer preguntas sobre tus tareas y recibir ayuda
            personalizada.
          </p>
        </div>
      ) : (
        <div
          className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
        >
          Modo normal activado
        </div>
      ),
    );
  };

  const handleUserInput = async (e: React.FormEvent, value?: string) => {
    try {
      e.preventDefault();
      transcriptJustSetRef.current = false;
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
      setIsAutoSendPending(false);
      const inputValue =
        value?.trim() || userInput.trim() || userInputRef.current.trim();
      if (!inputValue) return;

      if (engine === "vosk" ? voskRealtime.isRecording : isRecording) {
        isManuallyCancellingRef.current = true;
        if (engine === "vosk") {
          voskRealtime.cancelRealtime();
        } else {
          autoSendVoiceChat.cancelVoiceRecording();
        }
        setTimeout(() => {
          isManuallyCancellingRef.current = false;
        }, 500);
      }

      const mensajeAEnviar = isRecording
        ? autoSendVoiceChat.transcript.trim()
        : inputValue; // <- usar inputValue en lugar de userInput.trim()

      if (!mensajeAEnviar) return;
      autoSendVoiceChat.cleanup();
      setUserInput("");
      addMessage("user", mensajeAEnviar);
      setIsTyping(true);
      setIsLoadingIA(true);
      const sessionId =
        conversacionActiva || assistantAnalysis?.sessionId || null;

      botRespondingRef.current = true;
      const response = await resolverIA(mensajeAEnviar, sessionId);

      if (response?.respuesta) {
        addMessage("bot", response.respuesta);
        speakText(response.respuesta);
        if (response.sessionId && !conversacionActiva) {
          onNuevaConversacion?.({
            sessionId: response.sessionId,
            userId: colaborador.email,
            estadoConversacion: "activa",
            createdAt: new Date().toISOString(),
            nombreConversacion:
              response.nombreConversacion || "Nueva conversación",
          });
        }
        if (
          response.sessionId &&
          conversacionActiva &&
          response.nombreConversacion
        ) {
          onActualizarNombre?.(response.sessionId, response.nombreConversacion);
        }
      } else {
        addMessage("bot", "Lo siento, no pude procesar tu mensaje.");
        speakText("Lo siento, no pude procesar tu mensaje.");
      }
    } catch {
      speakText("Lo siento, hubo un error al procesar tu mensaje.");
      addMessage("bot", "Lo siento, hubo un error al procesar tu mensaje.");
      toast({
        variant: "destructive",
        title: "Error de comunicación",
        description: "Ocurrió un error al contactar al asistente.",
      });
    } finally {
      botRespondingRef.current = false;
      setIsLoadingIA(false);
      setIsTyping(false);
    }
  };

  useEffect(() => {
    const isPastTenAM = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      return hours > 10 || (hours === 10 && minutes >= 0);
    };

    const pollingInterval = setInterval(async () => {
      if (!isPastTenAM()) return;
      if (turnoActualRef.current !== "mañana") return;
      if (fetchingAnalysisRef.current) return;

      try {
        const verificacion = await verificarCambiosAnfeta();
        if (!verificacion?.cambios) return;

        const data = await obtenerActividadesConRevisiones({
          email: colaborador.email,
          showAll: false,
          consultarAlApi: true,
        });

        const colabs = extraerColaboradores(data);
        setColaboradoresUnicos(colabs);
        colaboradoresUnicosRef.current = colabs;

        const adaptedData = adaptarDatosAnalisis(data);
        assistantAnalysisRef.current = adaptedData;
        setAssistantAnalysis(adaptedData);
        actualizarPanelTurno(turnoActualRef.current, adaptedData);
      } catch (error) {
        if (
          error instanceof TypeError ||
          (error as any)?.message?.includes("fetch") ||
          (error as any)?.message?.includes("conexión") ||
          (error as any)?.code === "ERR_CONNECTION_REFUSED"
        ) {
          return;
        }
        console.error("Error en polling:", error);
        toast({
          variant: "destructive",
          title: "Sin conexión",
          description: "No se pudo actualizar, el servidor no responde.",
          duration: 3000,
        });
      }
    }, 15_000); // cada 15 segundos

    return () => clearInterval(pollingInterval);
  }, [colaborador.email]);

  const handleVoiceMessageClick = (voiceText: string) => {
    setUserInput(voiceText);
    if (inputRef.current) inputRef.current.focus();
  };

  const toggleTheme = () => externalToggle?.();
  const changeRate = (newRate: number) => {
    changeRateHook(newRate);
    onGuardarPreferencias?.({ ...preferencias, velocidadVoz: newRate });
  };

  useEffect(() => {
    if (assistantAnalysis) {
      actualizarPanelTurno(turnoActual, assistantAnalysis);
    }
  }, [rate]);

  useEffect(() => {
    if (assistantAnalysis) {
      actualizarPanelTurno(turnoActual, assistantAnalysis);
    }
  }, [engine]);
  // ==================== RENDER ====================
  return (
    <ChatThemeProvider value={theme}>
      <div
        className={`flex flex-col h-screen min-w-0 ${
          theme === "dark"
            ? "bg-[#101010] text-white"
            : "bg-white text-gray-900"
        }`}
      >
        <ChatHeader
          isInPiPWindow={isPiPModeProp ?? isInPiPWindow}
          sidebarOpen={conversationHistory.sidebarOpen}
          setSidebarOpen={conversationHistory.setSidebarOpen}
          theme={theme}
          toggleTheme={toggleTheme}
          displayName={displayName}
          colaborador={colaborador}
          rate={rate}
          changeRate={changeRate}
          isSpeaking={isSpeaking}
          openPiPWindow={openPiPWindow ?? (() => {})}
          closePiPWindow={closePiPWindow ?? (() => {})}
          isPiPMode={isPiPModeProp ?? isPiPMode}
          setShowLogoutDialog={setShowLogoutDialog}
          onOpenSidebar={onOpenSidebar}
          isMobile={isMobile}
          isSidebarOpen={sidebarOpen}
        />

        <VoiceGuidanceFlow
          voiceMode={voiceMode.voiceMode}
          voiceStep={voiceMode.voiceStep}
          theme={theme}
          isSpeaking={isSpeaking}
          finishVoiceMode={finishVoiceMode}
          currentActivityIndex={voiceMode.currentActivityIndex}
          currentTaskIndex={voiceMode.currentTaskIndex}
          activitiesWithTasks={
            filteredActivitiesForVoice.length > 0
              ? filteredActivitiesForVoice
              : activitiesWithTasks
          }
          autoSendVoice={{
            isRecording: autoSendVoiceGuided.isRecording,
            isTranscribing: autoSendVoiceGuided.isTranscribing,
            audioLevel: autoSendVoiceGuided.audioLevel,
            silenceCountdown: autoSendVoiceGuided.silenceCountdown,
            startVoiceRecording: autoSendVoiceGuided.startVoiceRecording,
            cancelVoiceRecording: autoSendVoiceGuided.cancelVoiceRecording,
            processVoiceRecording: autoSendVoiceGuided.processAndSendAudio,
          }}
          taskExplanations={voiceMode.taskExplanations}
          voiceTranscript={autoSendVoiceGuided.transcript}
          voskRealtime={voskRealtime}
          currentListeningFor={voiceMode.currentListeningFor}
          retryCount={voiceMode.retryCount}
          voiceConfirmationText=""
          rate={rate}
          changeRate={changeRate}
          cancelVoiceMode={cancelVoiceMode}
          confirmStartVoiceMode={confirmStartVoiceMode}
          speakTaskByIndices={speakTaskByIndices}
          startTaskExplanation={startTaskExplanation}
          skipTask={skipTask}
          processVoiceExplanation={processVoiceExplanation}
          stopRecording={voiceRecognition.stopRecording}
          retryExplanation={retryExplanation}
          recognitionRef={voiceRecognition.recognitionRef}
          setIsRecording={() => {}}
          isVoskEngine={engine === "vosk"} // ← AGREGAR
          voskSilenceCountdown={voskRealtime?.silenceCountdown ?? null} // ← AGREGAR
          setIsListening={() => {}}
          setVoiceStep={voiceMode.setVoiceStep}
          setCurrentListeningFor={voiceMode.setCurrentListeningFor}
          selectedTaskIds={selectedTaskIds}
          voskStatus={voskStatus}
        />

        <div
          className={`flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            isInPiPWindow ? "pt-2" : "pt-3 sm:pt-4"
          } pb-4 sm:pb-6`}
        >
          <div className="w-full max-w-xl sm:max-w-2xl lg:max-w-5xl mx-auto px-2 sm:px-4">
            <MessageList
              messages={messages}
              isTyping={isTyping}
              theme={theme}
              onVoiceMessageClick={handleVoiceMessageClick}
              scrollRef={scrollRef}
              assistantAnalysis={assistantAnalysis}
              onStartVoiceMode={handleStartVoiceMode}
              onStartVoiceModeWithTasks={handleStartVoiceModeWithTasks}
              onReportCompleted={async () => {
                await fetchAssistantAnalysis(false, false);
              }}
              userEmail={colaborador.email}
            />
          </div>
        </div>
        <div className="relative">
          {/* Engine indicator */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                engine === "groq"
                  ? theme === "dark"
                    ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                    : "bg-orange-50 border-orange-200 text-orange-600"
                  : theme === "dark"
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : "bg-blue-50 border-blue-200 text-blue-600"
              }`}
            >
              {engine === "groq" ? (
                <Zap className="w-2.5 h-2.5" />
              ) : (
                <Cpu className="w-2.5 h-2.5" />
              )}
              {engine === "groq" ? "Groq" : "Vosk"}
              {engine === "vosk" && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    voskStatus === "ready"
                      ? "bg-emerald-400"
                      : voskStatus === "loading"
                        ? "bg-blue-400 animate-pulse"
                        : voskStatus === "error"
                          ? "bg-red-500"
                          : "bg-gray-400"
                  }`}
                />
              )}
            </div>
          </div>
          <ChatInputBar
            userInput={userInput}
            setUserInput={(v) => setUserInput(v)}
            onSubmit={handleUserInput}
            onVoiceClick={handleStartRecording}
            isRecording={
              engine === "vosk" ? voskRealtime.isRecording : isRecording
            }
            canUserType={canUserType}
            theme={theme}
            onStartRecording={handleStartRecording}
            onCancelRecording={handleCancelRecording}
            isTranscribing={engine === "vosk" ? false : isTranscribing}
            audioLevel={audioLevel}
            isLoadingIA={isLoadingIA}
            inputRef={inputRef}
            chatMode={chatMode}
            isSpeaking={isSpeaking}
            onToggleChatMode={toggleChatMode}
            onStopRecording={handleStopRecording}
            voiceTranscript={
              engine === "vosk" ? userInput : autoSendVoiceChat.transcript
            }
            isAutoSendPending={isAutoSendPending}
            onCancelAutoSend={handleCancelAutoSend}
            autoSendCountdown={autoSendCountdown}
          />
        </div>
        {/* Diálogo de éxito */}
        <AlertDialog
          open={showSuccessDialog}
          onOpenChange={setShowSuccessDialog}
        >
          <AlertDialogContent
            className={`max-w-sm mx-4 sm:max-w-md sm:mx-auto border ${
              theme === "dark"
                ? "bg-[#1a1a1a] text-white border-[#2a2a2a]"
                : "bg-white text-gray-900 border-gray-200"
            }`}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-[#6841ea] text-lg sm:text-xl">
                <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6" />
                ¡Análisis completado!
              </AlertDialogTitle>
              <AlertDialogDescription
                className={theme === "dark" ? "text-gray-300" : "text-gray-600"}
              >
                El análisis de tus actividades ha sido generado exitosamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={onLogout}
                className="bg-[#6841ea] hover:bg-[#5a36d4] text-white w-full sm:w-auto"
              >
                Cerrar sesión
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de logout */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent
            className={`font-['Arial'] max-w-sm mx-4 sm:max-w-md sm:mx-auto border ${
              theme === "dark"
                ? "bg-[#1a1a1a] text-white border-[#2a2a2a]"
                : "bg-white text-gray-900 border-gray-200"
            }`}
          >
            <AlertDialogHeader className="pt-4 sm:pt-6">
              <div className="mx-auto mb-3 sm:mb-4">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}
                >
                  <LogOut className="w-7 h-7 sm:w-8 sm:h-8 text-[#6841ea]" />
                </div>
              </div>
              <AlertDialogTitle className="text-center text-lg sm:text-xl font-bold font-['Arial']">
                ¿Cerrar sesión?
              </AlertDialogTitle>
              <AlertDialogDescription
                className={`text-center pt-3 pb-2 font-['Arial'] text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
              >
                <p>¿Estás seguro que deseas salir del asistente?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-6 font-['Arial']">
              <AlertDialogCancel
                className={`w-full sm:w-auto rounded-lg h-10 sm:h-11 font-['Arial'] border ${
                  theme === "dark"
                    ? "bg-[#2a2a2a] hover:bg-[#353535] text-white border-[#353535]"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200"
                }`}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onLogout}
                className="w-full sm:w-auto bg-[#6841ea] hover:bg-[#5a36d4] text-white rounded-lg h-10 sm:h-11 font-semibold font-['Arial']"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Confirmar salida
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ChatThemeProvider>
  );
}
