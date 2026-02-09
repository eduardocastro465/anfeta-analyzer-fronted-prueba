"use client";

import React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  validateSession,
  obtenerHistorialSidebar,
  actualizarEstadoPendientes,
  validarReportePendiente,
  obtenerActividadesConRevisiones,
  guardarReporteTarde,
  sendPendienteValidarYGuardar,
  chatGeneralIA,
  consultarIAProyecto,
} from "@/lib/api";
import type {
  ActividadDiaria,
  PendienteEstadoLocal,
  Message,
  ConversacionSidebar,
  AssistantAnalysis,
  TaskExplanation,
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
  isClearCommand,
  cleanExplanationTranscript,
  validateExplanationLength,
} from "@/util/voiceModeLogic";
import { MessageList, NoTasksMessage, TasksPanel } from "./chat/MessageList";
import { messageTemplates } from "./chat/messageTemplates";
import { ChatInputBar } from "./chat/ChatInputBar";
import { ReporteActividadesModal } from "./ReporteActividadesModal";
import { useMessageRestoration } from "@/components/hooks/useMessageRestoration";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { transcribirAudioCliente } from "@/lib/transcription";
import { isReportTime } from "@/util/Timeutils";
import { useAutoSendVoice } from "@/components/Audio/UseAutoSendVoiceOptions";
import { useToast } from "@/hooks/use-toast";

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
}: ChatBotProps) {
  // ==================== REFS ====================
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const explanationProcessedRef = useRef<boolean>(false);
  const assistantAnalysisRef = useRef<AssistantAnalysis | null>(null);
  const initializationRef = useRef(false);
  const fetchingAnalysisRef = useRef(false);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");

  // ==================== CONSTANTES ====================
  const displayName = getDisplayName(colaborador);
  const router = useRouter();
  const { toast } = useToast();

  // ==================== ESTADOS: CHAT PRINCIPAL ====================
  const [step, setStep] = useState<ChatStep>("welcome");
  const [userInput, setUserInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [assistantAnalysis, setAssistantAnalysis] =
    useState<AssistantAnalysis | null>(null);
  const [isLoadingIA, setIsLoadingIA] = useState(false);

  // ==================== ESTADOS: DIÁLOGOS Y MODALS ====================
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [mostrarModalReporte, setMostrarModalReporte] = useState(false);

  // ==================== ESTADOS: SIDEBAR ====================
  const [sidebarCargado, setSidebarCargado] = useState(false);
  const [sidebarCargando, setSidebarCargando] = useState(true);
  const [data, setData] = useState<ConversacionSidebar[]>([]);

  // ==================== ESTADOS: REPORTE DE ACTIVIDADES ====================
  const [actividadesDiarias, setActividadesDiarias] = useState<
    ActividadDiaria[]
  >([]);
  const [pendientesReporte, setPendientesReporte] = useState<
    PendienteEstadoLocal[]
  >([]);
  const [guardandoReporte, setGuardandoReporte] = useState(false);

  // ==================== ESTADOS: MODAL VOZ REPORTE ====================
  const [indicePendienteActual, setIndicePendienteActual] = useState(0);
  const [pasoModalVoz, setPasoModalVoz] = useState<
    "esperando" | "escuchando" | "procesando"
  >("esperando");
  const [isUserEditing, setIsUserEditing] = useState(false);

  // ==================== ESTADOS: HORARIOS REPORTE ====================
  const [horaInicioReporte] = useState("4:30 PM");
  const [horaFinReporte] = useState("11:59 PM");

  // ==================== ESTADOS: PiP ====================
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [isInPiPWindow, setIsInPiPWindow] = useState(false);

  // ==================== ESTADOS: TEMA ====================
  const [internalTheme, setInternalTheme] = useState<"light" | "dark">("dark");
  const theme = externalTheme ?? internalTheme;

  // ==================== ESTADOS: MODO CHAT ====================
  const [chatMode, setChatMode] = useState<"normal" | "ia">("ia");

  // ==================== HOOKS PERSONALIZADOS ====================
  const voiceRecognition = useVoiceRecognition();
  const voiceMode = useVoiceMode();
  const conversationHistory = useConversationHistory();
  const {
    speak: speakText,
    stop: stopVoice,
    isSpeaking,
    rate,
    changeRate,
  } = useVoiceSynthesis();

  // ==================== AUDIO RECORDER ====================
  const audioRecorder = useAudioRecorder();

  // ==================== VALORES COMPUTADOS ====================
  const canUserType =
    step !== "loading-analysis" && step !== "error" && !voiceMode.voiceMode;

  const activitiesWithTasks = useMemo(() => {
    if (!assistantAnalysis?.data?.revisionesPorActividad) {
      return [];
    }

    return assistantAnalysis.data.revisionesPorActividad
      .filter((actividad) => actividad.tareasConTiempo.length > 0)
      .map((actividad) => ({
        actividadId: actividad.actividadId,
        actividadTitulo: actividad.actividadTitulo,
        actividadHorario: actividad.actividadHorario,
        tareas: actividad.tareasConTiempo.map((tarea) => ({
          ...tarea,
          actividadId: actividad.actividadId,
          actividadTitulo: actividad.actividadTitulo,
        })),
      }));
  }, [assistantAnalysis]);

  // ==================== FUNCIONES AUXILIARES (DECLARADAS ANTES DE LOS HOOKS) ====================
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

  // ==================== FUNCIONES: MODO VOZ (ANTES DE LOS HOOKS) ====================
  const speakActivityByIndex = (activityIndex: number) => {
    if (activityIndex >= activitiesWithTasks.length) {
      voiceMode.setVoiceStep("summary");
      voiceMode.setExpectedInputType("confirmation");

      setTimeout(() => {
        speakText(
          "¡Perfecto! Has explicado todas las tareas. presiona el boton de comenzar para iniciar tu jornada para comenzar a trabajar.",
        );
      }, 500);
      return;
    }

    const activity = activitiesWithTasks[activityIndex];
    const activityText = `Actividad ${activityIndex + 1} de ${activitiesWithTasks.length}: ${activity.actividadTitulo}. Tiene ${activity.tareas.length} tarea${activity.tareas.length !== 1 ? "s" : ""}.`;

    voiceMode.setVoiceStep("activity-presentation");
    voiceMode.setExpectedInputType("none");

    setTimeout(() => {
      speakText(activityText);

      const estimatedSpeechTime = activityText.length * 40 + 1000;

      setTimeout(() => {
        voiceMode.setCurrentTaskIndex(0);
        speakTaskByIndices(activityIndex, 0);
      }, estimatedSpeechTime);
    }, 100);
  };

  const speakTaskByIndices = (activityIndex: number, taskIndex: number) => {
    if (activityIndex >= activitiesWithTasks.length) {
      voiceMode.setVoiceStep("summary");
      voiceMode.setExpectedInputType("confirmation");

      setTimeout(() => {
        speakText(
          "¡Perfecto! Has explicado todas las tareas. ¿Quieres enviar este reporte?",
        );
      }, 500);
      return;
    }

    const activity = activitiesWithTasks[activityIndex];

    if (taskIndex >= activity.tareas.length) {
      const nextActivityIndex = activityIndex + 1;
      voiceMode.setCurrentActivityIndex(nextActivityIndex);
      voiceMode.setCurrentTaskIndex(0);

      setTimeout(() => {
        speakActivityByIndex(nextActivityIndex);
      }, 500);
      return;
    }

    const task = activity.tareas[taskIndex];
    const taskText = `Tarea ${taskIndex + 1} de ${activity.tareas.length}: ${task.nombre}. ¿Cómo planeas resolver esta tarea?`;

    voiceMode.setVoiceStep("task-presentation");
    voiceMode.setExpectedInputType("none");
    voiceMode.setCurrentListeningFor(`Tarea: ${task.nombre}`);

    setTimeout(() => {
      speakText(taskText);

      const estimatedSpeechTime = taskText.length * 40 + 800;

      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
        voiceMode.setExpectedInputType("explanation");
      }, estimatedSpeechTime);
    }, 100);
  };

  // ==================== AUTO-SEND VOICE PARA CHAT GENERAL ====================
  const autoSendVoiceChat = useAutoSendVoice({
    transcriptionService: transcribirAudioCliente,
    stopRecording: audioRecorder.stopRecording,
    startRecording: audioRecorder.startRecording,
    onTranscriptionComplete: async (transcript) => {
      addMessage("user", transcript);
      setIsTyping(true);
      setIsLoadingIA(true);

      try {
        const sessionId =
          conversacionActiva || assistantAnalysis?.sessionId || null;

        const response = await chatGeneralIA(transcript, sessionId);

        if (response.respuesta) {
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
        }
      } catch (error) {
        speakText("Lo siento, hubo un error al procesar tu mensaje.");
        addMessage("bot", "Lo siento, hubo un error al procesar tu mensaje.");
      } finally {
        setIsLoadingIA(false);
        setIsTyping(false);
      }
    },
    onError: (error) => {
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

  // ==================== AUTO-SEND VOICE PARA MODO VOZ GUIADO ====================
  const autoSendVoiceGuided = useAutoSendVoice({
    transcriptionService: transcribirAudioCliente,
    stopRecording: audioRecorder.stopRecording,
    startRecording: audioRecorder.startRecording,
    silenceThreshold: 3000,
    speechThreshold: 10,
    onTranscriptionComplete: async (transcript) => {
      console.log("✅ Explicación completada automáticamente:", transcript);

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

      const currentTask = getCurrentTask(
        voiceMode.currentActivityIndex,
        voiceMode.currentTaskIndex,
        activitiesWithTasks,
      );
      const currentActivity = getCurrentActivity(
        voiceMode.currentActivityIndex,
        activitiesWithTasks,
      );

      if (!currentTask || !currentActivity) {
        return;
      }

      voiceMode.setVoiceStep("processing-explanation");
      speakText("Validando tu explicación...");

      try {
        const payload = {
          actividadId: currentActivity.actividadId,
          actividadTitulo: currentActivity.actividadTitulo,
          nombrePendiente: currentTask.nombre,
          idPendiente: currentTask.id,
          explicacion: trimmedTranscript,
        };

        const response = await sendPendienteValidarYGuardar(payload);

        if (response.esValida) {
          const newExplanation: TaskExplanation = {
            taskId: currentTask.id,
            taskName: currentTask.nombre,
            activityTitle: currentActivity.actividadTitulo,
            explanation: trimmedTranscript,
            confirmed: true,
            priority: currentTask.prioridad,
            duration: currentTask.duracionMin,
            timestamp: new Date(),
          };

          voiceMode.setTaskExplanations((prev) => [
            ...prev.filter((exp) => exp.taskId !== currentTask.id),
            newExplanation,
          ]);

          speakText(
            "Perfecto, explicación validada. Pasamos a la siguiente tarea.",
          );

          setTimeout(() => {
            const nextTaskIndex = voiceMode.currentTaskIndex + 1;

            if (nextTaskIndex < currentActivity.tareas.length) {
              voiceMode.setCurrentTaskIndex(nextTaskIndex);
              voiceMode.setRetryCount(0);
              speakTaskByIndices(voiceMode.currentActivityIndex, nextTaskIndex);
            } else {
              const nextActivityIndex = voiceMode.currentActivityIndex + 1;
              voiceMode.setCurrentActivityIndex(nextActivityIndex);
              voiceMode.setCurrentTaskIndex(0);
              voiceMode.setRetryCount(0);

              if (nextActivityIndex < activitiesWithTasks.length) {
                speakActivityByIndex(nextActivityIndex);
              } else {
                voiceMode.setVoiceStep("summary");
                voiceMode.setExpectedInputType("confirmation");
                setTimeout(() => {
                  speakText(
                    "¡Excelente! Has completado todas las tareas. ¿Quieres enviar el reporte?",
                  );
                }, 1000);
              }
            }
          }, 2000);
        } else {
          voiceMode.setRetryCount((prev) => prev + 1);
          speakText(
            `${response.razon || "Por favor, explica con más detalle cómo resolverás esta tarea."}`,
          );

          setTimeout(() => {
            voiceMode.setVoiceStep("waiting-for-explanation");
            voiceMode.setExpectedInputType("explanation");
          }, 3000);
        }
      } catch (error) {
        console.error("❌ Error en validación:", error);
        speakText("Hubo un error. Por favor, intenta de nuevo.");

        setTimeout(() => {
          voiceMode.setVoiceStep("waiting-for-explanation");
          voiceMode.setExpectedInputType("explanation");
        }, 2000);
      }
    },
    onError: (error) => {
      console.error("❌ Error en grabación de voz:", error);
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

  // ==================== DESTRUCTURING DE AUTO-SEND ====================
  const {
    isRecording,
    isTranscribing,
    audioLevel,
    startVoiceRecording,
    cancelVoiceRecording,
  } = autoSendVoiceChat;

  // ==================== EFECTOS ====================
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("dark");

    if (initializationRef.current) {
      return;
    }

    const hayDatosRestauracion =
      (mensajesRestaurados && mensajesRestaurados.length > 1) ||
      analisisRestaurado;

    if (hayDatosRestauracion) {
      initializationRef.current = true;

      if (analisisRestaurado) {
        assistantAnalysisRef.current = analisisRestaurado;
        setAssistantAnalysis(analisisRestaurado);

        console.log("analisisRestaurado", analisisRestaurado);

        setStep("ready");
        setIsTyping(false);
      }

      return;
    }

    initializationRef.current = true;

    const init = async () => {
      const user = await validateSession();
      if (!user) {
        router.replace("/");
        return;
      }

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
    };

    init();
  }, []);

  useEffect(() => {
    const handlePiPMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      switch (event.data.type) {
        case "INIT_PIP":
          if (event.data.data.messages) {
            setMessages(event.data.data.messages);
          }
          if (event.data.data.assistantAnalysis) {
            setAssistantAnalysis(event.data.data.assistantAnalysis);
            assistantAnalysisRef.current = event.data.data.assistantAnalysis;
          }
          break;

        case "SYNC_MESSAGES":
          if (isInPiPWindow && event.data.messages) {
            setMessages(event.data.messages);
          }
          break;

        case "SYNC_ANALYSIS":
          if (isInPiPWindow && event.data.analysis) {
            setAssistantAnalysis(event.data.analysis);
            assistantAnalysisRef.current = event.data.analysis;
          }
          break;

        case "CLOSE_PIP":
          if (isInPiPWindow) {
            window.close();
          }
          break;

        case "THEME_CHANGED":
          if (isInPiPWindow && event.data.theme) {
            setInternalTheme(event.data.theme);
          }
          break;
      }
    };

    window.addEventListener("message", handlePiPMessage);

    return () => {
      window.removeEventListener("message", handlePiPMessage);
    };
  }, [isInPiPWindow]);

  useEffect(() => {
    if (
      isPiPMode &&
      pipWindowRef.current &&
      !pipWindowRef.current.closed &&
      !isInPiPWindow
    ) {
      try {
        pipWindowRef.current.postMessage(
          {
            type: "SYNC_MESSAGES",
            messages,
          },
          window.location.origin,
        );
      } catch (error) {
        console.error("Error sincronizando mensajes:", error);
      }
    }
  }, [messages, isPiPMode, isInPiPWindow]);

  useEffect(() => {
    if (
      isPiPMode &&
      pipWindowRef.current &&
      !pipWindowRef.current.closed &&
      !isInPiPWindow
    ) {
      try {
        pipWindowRef.current.postMessage(
          {
            type: "SYNC_ANALYSIS",
            analysis: assistantAnalysis,
          },
          window.location.origin,
        );
      } catch (error) {
        console.error("Error sincronizando análisis:", error);
      }
    }
  }, [assistantAnalysis, isPiPMode, isInPiPWindow]);

  useEffect(() => {
    if (
      isPiPMode &&
      pipWindowRef.current &&
      !pipWindowRef.current.closed &&
      !isInPiPWindow
    ) {
      try {
        pipWindowRef.current.postMessage(
          {
            type: "THEME_CHANGED",
            theme: theme,
          },
          window.location.origin,
        );
      } catch (error) {
        console.error("Error sincronizando tema:", error);
      }
    }
  }, [theme, isPiPMode, isInPiPWindow]);

  useEffect(() => {
    onActualizarTyping?.(isTyping);
  }, [isTyping, onActualizarTyping]);

  useEffect(() => {
    if (!voiceRecognition.voiceTranscript) {
      return;
    }

    if (!voiceMode.voiceMode) {
      return;
    }

    processVoiceCommand(voiceRecognition.voiceTranscript);
  }, [voiceRecognition.voiceTranscript, voiceMode.voiceMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("dark");

    const checkIfPiPWindow = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isPiPWindow = urlParams.get("pip") === "true";
      setIsInPiPWindow(isPiPWindow);

      if (isPiPWindow) {
        document.title = "Asistente Anfeta";
        document.documentElement.style.overflow = "hidden";
        document.body.style.margin = "0";
        document.body.style.padding = "0";
        document.body.style.overflow = "hidden";
        document.body.style.height = "100vh";
        document.body.style.width = "100vw";

        if (window.opener) {
          setIsPiPMode(true);
          try {
            window.moveTo(window.screenX, window.screenY);
            window.resizeTo(400, 600);
          } catch (e) {}
        }

        window.addEventListener("message", handleParentMessage);
      }
    };

    checkIfPiPWindow();

    if (!isInPiPWindow) {
      window.addEventListener("message", handleChildMessage);
    }

    const checkPiPWindowInterval = setInterval(() => {
      if (pipWindowRef.current && pipWindowRef.current.closed) {
        setIsPiPMode(false);
        pipWindowRef.current = null;
      }
    }, 1000);

    const handleBeforeUnload = () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        try {
          pipWindowRef.current.postMessage({ type: "PARENT_CLOSING" }, "*");
        } catch (e) {}
        pipWindowRef.current.close();
      }
      voiceRecognition.stopRecording();
      stopVoice();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("message", handleParentMessage);
      window.removeEventListener("message", handleChildMessage);
      clearInterval(checkPiPWindowInterval);

      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
      voiceRecognition.stopRecording();
      stopVoice();
    };
  }, [isInPiPWindow, stopVoice]);

  useEffect(() => {
    if (!assistantAnalysis) return;
    if (sidebarCargado) return;

    setSidebarCargando(true);
    obtenerHistorialSidebar()
      .then((res) => {
        setData(res.data);
        setSidebarCargado(true);
      })
      .catch((error) => {
        setData([]);
      })
      .finally(() => setSidebarCargando(false));
  }, [assistantAnalysis, sidebarCargado]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, voiceMode.voiceMode, voiceMode.voiceStep]);

  useEffect(() => {
    if (
      inputRef.current &&
      step !== "loading-analysis" &&
      !voiceMode.voiceMode
    ) {
      inputRef.current.focus();
    }
  }, [step, voiceMode.voiceMode]);

  // ==================== FUNCIONES: MODO VOZ (CONTINUACIÓN) ====================
  const handleStartVoiceMode = () => {
    const analysis = assistantAnalysisRef.current;
    if (!analysis) {
      speakText("No hay actividades para explicar.");
      return;
    }

    const activitiesWithTasksLocal = analysis.data.revisionesPorActividad
      .filter(
        (actividad) =>
          actividad.tareasConTiempo && actividad.tareasConTiempo.length > 0,
      )
      .map((actividad) => ({
        actividadId: actividad.actividadId,
        actividadTitulo: actividad.actividadTitulo,
        actividadHorario: actividad.actividadHorario,
        tareas: actividad.tareasConTiempo.map((tarea) => ({
          ...tarea,
          actividadId: actividad.actividadId,
          actividadTitulo: actividad.actividadTitulo,
        })),
      }));

    if (activitiesWithTasksLocal.length === 0) {
      speakText("No hay tareas con tiempo asignado para explicar.");
      return;
    }

    voiceMode.setVoiceMode(true);
    voiceMode.setVoiceStep("confirm-start");
    voiceMode.setExpectedInputType("confirmation");
    voiceMode.setCurrentActivityIndex(0);
    voiceMode.setCurrentTaskIndex(0);
    voiceMode.setTaskExplanations([]);

    const mensaje = `Vamos a explicar ${activitiesWithTasksLocal.length} actividad${activitiesWithTasksLocal.length !== 1 ? "es" : ""} con tareas programadas. ¿Listo para comenzar?`;
    speakText(mensaje);
  };

  useMessageRestoration({
    conversacionActiva,
    mensajesRestaurados,
    analisisRestaurado,
    theme,
    displayName,
    email: colaborador.email,
    onOpenReport: () => setMostrarModalReporte(true),
    onStartVoiceMode: handleStartVoiceMode,
    setMessages,
    setStep,
    setIsTyping,
    setAssistantAnalysis,
    assistantAnalysisRef,
    scrollRef,
  });

  const finishVoiceMode = () => {
    stopVoice();

    voiceMode.setVoiceMode(false);
    voiceMode.setVoiceStep("idle");
    voiceMode.setExpectedInputType("none");
    voiceMode.setCurrentActivityIndex(0);
    voiceMode.setCurrentTaskIndex(0);

    addMessage(
      "bot",
      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <div>
            <span className="font-medium">¡Jornada iniciada!</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              Has explicado{" "}
              {
                voiceMode.taskExplanations.filter(
                  (exp) => exp.explanation !== "[Tarea saltada]",
                ).length
              }{" "}
              tareas correctamente. ¡Mucho éxito!
            </p>
          </div>
        </div>
      </div>,
    );

    speakText(
      "¡Perfecto! Tu jornada ha comenzado. Mucho éxito con tus tareas.",
    );
  };

  const cancelVoiceMode = () => {
    stopVoice();
    voiceRecognition.stopRecording();
    cancelVoiceRecording();
    voiceMode.cancelVoiceMode();
  };

  const confirmStartVoiceMode = () => {
    if (activitiesWithTasks.length === 0) {
      speakText("No hay actividades con tareas para explicar.");
      setTimeout(() => voiceMode.cancelVoiceMode(), 1000);
      return;
    }

    voiceMode.setVoiceStep("activity-presentation");
    voiceMode.setExpectedInputType("none");

    setTimeout(() => {
      speakActivityByIndex(0);
    }, 300);
  };

  const startTaskExplanation = () => {
    const allowedStates = [
      "waiting-for-explanation",
      "confirmation",
      "task-presentation",
    ];

    if (!allowedStates.includes(voiceMode.voiceStep)) {
      return;
    }

    stopVoice();

    const currentTask = getCurrentTask(
      voiceMode.currentActivityIndex,
      voiceMode.currentTaskIndex,
      activitiesWithTasks,
    );

    if (currentTask) {
      voiceMode.setCurrentListeningFor(
        `Explicación para: ${currentTask.nombre}`,
      );
    }

    voiceMode.setVoiceStep("listening-explanation");
    voiceMode.setExpectedInputType("explanation");

    setTimeout(() => {
      startRecordingWrapper();
    }, 100);
  };

  const startRecordingWrapper = () => {
    voiceRecognition.startRecording(undefined, (error) => {
      console.error("Error en reconocimiento de voz:", error);
      speakText("Hubo un error con el micrófono. Por favor, intenta de nuevo.");
    });
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

    const currentTask = getCurrentTask(
      voiceMode.currentActivityIndex,
      voiceMode.currentTaskIndex,
      activitiesWithTasks,
    );
    const currentActivity = getCurrentActivity(
      voiceMode.currentActivityIndex,
      activitiesWithTasks,
    );

    if (!currentTask || !currentActivity) {
      return;
    }

    voiceMode.setVoiceStep("processing-explanation");
    speakText("Validando tu explicación...");

    try {
      const payload = {
        actividadId: currentActivity.actividadId,
        actividadTitulo: currentActivity.actividadTitulo,
        nombrePendiente: currentTask.nombre,
        idPendiente: currentTask.id,
        explicacion: trimmedTranscript,
      };

      const response = await sendPendienteValidarYGuardar(payload);

      if (response.esValida) {
        const newExplanation: TaskExplanation = {
          taskId: currentTask.id,
          taskName: currentTask.nombre,
          activityTitle: currentActivity.actividadTitulo,
          explanation: trimmedTranscript,
          confirmed: true,
          priority: currentTask.prioridad,
          duration: currentTask.duracionMin,
          timestamp: new Date(),
        };

        voiceMode.setTaskExplanations((prev) => [
          ...prev.filter((exp) => exp.taskId !== currentTask.id),
          newExplanation,
        ]);

        speakText(
          "Perfecto, explicación validada. Pasamos a la siguiente tarea.",
        );

        setTimeout(() => {
          const nextTaskIndex = voiceMode.currentTaskIndex + 1;

          if (nextTaskIndex < currentActivity.tareas.length) {
            voiceMode.setCurrentTaskIndex(nextTaskIndex);
            voiceMode.setRetryCount(0);
            speakTaskByIndices(voiceMode.currentActivityIndex, nextTaskIndex);
          } else {
            const nextActivityIndex = voiceMode.currentActivityIndex + 1;
            voiceMode.setCurrentActivityIndex(nextActivityIndex);
            voiceMode.setCurrentTaskIndex(0);
            voiceMode.setRetryCount(0);

            if (nextActivityIndex < activitiesWithTasks.length) {
              speakActivityByIndex(nextActivityIndex);
            } else {
              voiceMode.setVoiceStep("summary");
              voiceMode.setExpectedInputType("confirmation");
              setTimeout(() => {
                speakText(
                  "¡Excelente! Has completado todas las tareas. ¿Quieres enviar el reporte?",
                );
              }, 1000);
            }
          }
        }, 2000);
      } else {
        voiceMode.setRetryCount((prev) => prev + 1);
        speakText(
          `${response.razon || "Por favor, explica con más detalle cómo resolverás esta tarea."}`,
        );

        setTimeout(() => {
          voiceMode.setVoiceStep("waiting-for-explanation");
          voiceMode.setExpectedInputType("explanation");
        }, 3000);
      }
    } catch (error) {
      console.error("❌ Error en validación:", error);
      speakText("Hubo un error. Por favor, intenta de nuevo.");

      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
        voiceMode.setExpectedInputType("explanation");
      }, 2000);
    }
  };

  const retryExplanation = () => {
    const currentTask = getCurrentTask(
      voiceMode.currentActivityIndex,
      voiceMode.currentTaskIndex,
      activitiesWithTasks,
    );

    if (!currentTask) return;

    voiceMode.setTaskExplanations((prev) =>
      prev.filter((exp) => exp.taskId !== currentTask.id),
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
    const currentTask = getCurrentTask(
      voiceMode.currentActivityIndex,
      voiceMode.currentTaskIndex,
      activitiesWithTasks,
    );
    const currentActivity = getCurrentActivity(
      voiceMode.currentActivityIndex,
      activitiesWithTasks,
    );

    if (!currentTask || !currentActivity) return;

    const explanation: TaskExplanation = {
      taskId: currentTask.id,
      taskName: currentTask.nombre,
      activityTitle: currentActivity.actividadTitulo,
      explanation: "[Tarea saltada]",
      confirmed: true,
      priority: currentTask.prioridad,
      duration: currentTask.duracionMin,
      timestamp: new Date(),
    };

    voiceMode.setTaskExplanations((prev) => [
      ...prev.filter((exp) => exp.taskId !== currentTask.id),
      explanation,
    ]);

    const nextTaskIndex = voiceMode.currentTaskIndex + 1;

    if (nextTaskIndex < currentActivity.tareas.length) {
      voiceMode.setCurrentTaskIndex(nextTaskIndex);
      voiceMode.resetForNextTask();
      setTimeout(
        () => speakTaskByIndices(voiceMode.currentActivityIndex, nextTaskIndex),
        500,
      );
    } else {
      const nextActivityIndex = voiceMode.currentActivityIndex + 1;
      voiceMode.setCurrentActivityIndex(nextActivityIndex);
      voiceMode.setCurrentTaskIndex(0);
      voiceMode.resetForNextTask();

      if (nextActivityIndex < activitiesWithTasks.length) {
        setTimeout(() => speakActivityByIndex(nextActivityIndex), 500);
      } else {
        voiceMode.setVoiceStep("summary");
        voiceMode.setExpectedInputType("confirmation");
        setTimeout(() => {
          speakText(
            "¡Perfecto! Has explicado todas las tareas. ¿Quieres enviar este reporte?",
          );
        }, 500);
      }
    }
  };

  const processVoiceCommand = (transcript: string) => {
    if (!transcript.trim()) return;

    const lowerTranscript = transcript.toLowerCase().trim();

    if (!voiceMode.voiceMode) return;

    switch (voiceMode.expectedInputType) {
      case "confirmation":
        if (
          isClearCommand(lowerTranscript, ["sí", "si", "confirmar", "correcto"])
        ) {
          sendExplanationsToBackend();
          return;
        }

        if (isClearCommand(lowerTranscript, ["no", "corregir", "cambiar"])) {
          if (voiceMode.voiceStep === "confirmation") {
            retryExplanation();
          }
          return;
        }
        break;

      case "explanation":
        if (voiceMode.voiceStep === "listening-explanation") {
          if (isClearCommand(lowerTranscript, ["terminar", "listo", "fin"])) {
            if (voiceRecognition.voiceTranscript.trim()) {
              processVoiceExplanation(voiceRecognition.voiceTranscript);
              return;
            }
          }
        }
        break;
    }

    if (isClearCommand(lowerTranscript, ["saltar", "skip"])) {
      skipTask();
      return;
    }

    if (isClearCommand(lowerTranscript, ["cancelar", "salir"])) {
      cancelVoiceMode();
      return;
    }
  };

  const sendExplanationsToBackend = async () => {
    if (!assistantAnalysis) {
      return;
    }

    try {
      voiceMode.setVoiceStep("sending");
      voiceMode.setExpectedInputType("none");
      speakText("Enviando tu reporte...");

      const payload = {
        sessionId: assistantAnalysis.sessionId,
        userId: colaborador.email,
        projectId: assistantAnalysis.proyectoPrincipal,
        explanations: voiceMode.taskExplanations
          .filter((exp) => exp.explanation !== "[Tarea saltada]")
          .map((exp) => ({
            taskId: exp.taskId,
            taskName: exp.taskName,
            activityTitle: exp.activityTitle,
            explanation: exp.explanation,
            priority: exp.priority,
            duration: exp.duration,
            recordedAt: exp.timestamp.toISOString(),
            confirmed: exp.confirmed,
          })),
      };

      const response = await guardarReporteTarde(payload);

      if (response.ok) {
        speakText("¡Correcto! Tu reporte ha sido enviado.");
        toast({
          title: "Reporte guardado",
          description: "Tus actividades han sido registradas con éxito.",
        });
      } else {
        speakText("Hubo un error al enviar tu reporte.");
        toast({
          variant: "destructive",
          title: "Error al enviar",
          description: "No se pudo guardar el reporte en este momento.",
        });
      }

      setTimeout(() => {
        voiceMode.setVoiceStep("idle");
        voiceMode.setVoiceMode(false);
        voiceMode.setExpectedInputType("none");

        addMessage(
          "bot",
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <span className="font-medium">Actividades guardadas</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  Has explicado{" "}
                  {
                    voiceMode.taskExplanations.filter(
                      (exp) => exp.explanation !== "[Tarea saltada]",
                    ).length
                  }{" "}
                  tareas.
                </p>
              </div>
            </div>
          </div>,
        );
      }, 1000);
    } catch (error) {
      speakText("Hubo un error al enviar tu reporte.");
      voiceMode.setVoiceStep("summary");
      voiceMode.setExpectedInputType("confirmation");
    }
  };

  // ==================== FUNCIONES: REPORTE ====================
  const preguntarPendiente = (index: number) => {
    if (index >= pendientesReporte.length) {
      speakText("Terminamos. ¿Quieres guardar el reporte?");
      return;
    }

    const p = pendientesReporte[index];
    setIndicePendienteActual(index);

    const texto = `Tarea ${index + 1}: ${p.nombre}. ¿La completaste y qué hiciste? O si no, ¿por qué no?`;
    speakText(texto);

    setTimeout(() => {
      voiceRecognition.startRecording(
        (transcript) => {
          if (transcript.trim()) {
            procesarRespuestaReporte(transcript);
          }
        },
        (error) => {
          speakText("Error con el micrófono.");
        },
      );
    }, texto.length * 50);
  };

  const procesarRespuestaReporte = async (transcript: string) => {
    const trimmedTranscript = transcript.trim();
    explanationProcessedRef.current = true;

    if (!trimmedTranscript || trimmedTranscript.length < 5) {
      speakText("Tu respuesta es muy corta. Por favor, da más detalles.");
      setTimeout(() => {
        setPasoModalVoz("esperando");
        explanationProcessedRef.current = false;
      }, 1000);
      return;
    }

    const p = pendientesReporte[indicePendienteActual];
    if (!p) return;

    setPasoModalVoz("procesando");
    speakText("Validando...");

    try {
      const data = await validarReportePendiente(
        p.pendienteId,
        p.actividadId,
        trimmedTranscript,
      );

      const fueCompletado = data.terminada;

      setPendientesReporte((prev) =>
        prev.map((item) =>
          item.pendienteId === p.pendienteId
            ? {
                ...item,
                completadoLocal: fueCompletado,
                motivoLocal: fueCompletado ? "" : trimmedTranscript,
              }
            : item,
        ),
      );

      speakText(
        data.terminada ? "Ok, completada." : "Entendido, no completada.",
      );

      setTimeout(() => {
        setPasoModalVoz("esperando");
        explanationProcessedRef.current = false;
        setIndicePendienteActual((prev) => prev + 1);

        if (indicePendienteActual + 1 < pendientesReporte.length) {
          setTimeout(() => preguntarPendiente(indicePendienteActual + 1), 500);
        }
      }, 1500);
    } catch (error) {
      speakText("Error. Intenta de nuevo.");
      setTimeout(() => {
        setPasoModalVoz("esperando");
        explanationProcessedRef.current = false;
      }, 1500);
    }
  };

  const guardarReporteDiario = async () => {
    try {
      setGuardandoReporte(true);

      const pendientesSinMotivo = pendientesReporte.filter(
        (p) =>
          !p.completadoLocal &&
          (!p.motivoLocal || p.motivoLocal.trim().length < 5),
      );

      if (pendientesSinMotivo.length > 0) {
        speakText(
          "Por favor, explica por qué no completaste todas las tareas marcadas como incompletas.",
        );
        setGuardandoReporte(false);
        return;
      }

      const pendientesParaEnviar = pendientesReporte.map((p) => ({
        pendienteId: p.pendienteId,
        actividadId: p.actividadId,
        completado: p.completadoLocal,
        motivoNoCompletado:
          !p.completadoLocal && p.motivoLocal ? p.motivoLocal : undefined,
      }));

      const response = await actualizarEstadoPendientes(pendientesParaEnviar);

      if (response.success) {
        setMostrarModalReporte(false);
        setIndicePendienteActual(0);
        setPasoModalVoz("esperando");

        addMessage(
          "bot",
          <div
            className={`p-4 rounded-lg border ${
              theme === "dark"
                ? "bg-green-900/20 border-green-500/20"
                : "bg-green-50 border-green-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <span className="font-medium">Reporte guardado</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  Se actualizaron {response.actualizados} tareas correctamente.
                  ¡Buen trabajo hoy!
                </p>
              </div>
            </div>
          </div>,
        );

        speakText(
          `Reporte guardado. Se actualizaron ${response.actualizados} tareas. Buen trabajo hoy.`,
        );
        toast({
          title: "Reporte finalizado",
          description: `Se actualizaron ${response.actualizados} tareas correctamente.`,
        });
      }
    } catch (error) {
      addMessage(
        "bot",
        <div
          className={`p-4 rounded-lg border ${
            theme === "dark"
              ? "bg-red-900/20 border-red-500/20"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span>Error al guardar el reporte. Intenta nuevamente.</span>
          </div>
        </div>,
      );
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudo actualizar el estado de tus tareas.",
      });
    } finally {
      setGuardandoReporte(false);
    }
  };

  const openPiPWindow = () => {
    if (isPiPMode) return;

    try {
      const width = 400;
      const height = 600;
      const left = window.screen.width - width - 20;
      const top = 20;

      const pipWindow = window.open(
        `${window.location.origin}${window.location.pathname}?pip=true`,
        "PiPChat",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`,
      );

      if (pipWindow) {
        pipWindowRef.current = pipWindow;
        setIsPiPMode(true);

        const transferState = () => {
          if (pipWindow.closed) return;

          try {
            pipWindow.postMessage(
              {
                type: "INIT_PIP",
                data: {
                  messages,
                  assistantAnalysis,
                  conversacionActiva,
                  theme,
                },
              },
              window.location.origin,
            );
          } catch (error) {
            console.error("Error transfiriendo estado:", error);
          }
        };

        setTimeout(transferState, 500);

        const checkClosed = setInterval(() => {
          if (pipWindow.closed) {
            clearInterval(checkClosed);
            setIsPiPMode(false);
            pipWindowRef.current = null;
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error al abrir ventana PiP:", error);
      toast({
        variant: "destructive",
        title: "Error PiP",
        description:
          "No se pudo abrir la ventana flotante. Revisa los permisos de ventanas emergentes.",
      });
    }
  };

  const closePiPWindow = () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      try {
        pipWindowRef.current.postMessage(
          { type: "CLOSE_PIP" },
          window.location.origin,
        );
        pipWindowRef.current.close();
      } catch (error) {
        console.error("Error al cerrar ventana PiP:", error);
      }
    }

    setIsPiPMode(false);
    pipWindowRef.current = null;
  };

  const handleParentMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data.type === "PARENT_CLOSING") {
      window.close();
    }
  };

  const handleChildMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data.type === "CHILD_CLOSED") {
      setIsPiPMode(false);
      pipWindowRef.current = null;
    }
  };

  // ==================== FUNCIONES: ANÁLISIS ====================
  const showAssistantAnalysis = async (
    analysis: AssistantAnalysis,
    isRestoration = false,
  ) => {
    if (!isRestoration) {
      addMessageWithTyping(
        "bot",
        messageTemplates.welcome.userInfo({
          theme,
          displayName,
          email: colaborador.email,
        }),
        400,
        true,
      );

      setTimeout(async () => {
        addMessageWithTyping(
          "bot",
          messageTemplates.analysis.metrics({
            theme,
            analysis,
          }),
          600,
          false,
        );

        setTimeout(() => {
          const hayTareas = analysis.data.revisionesPorActividad.some(
            (r) => r.tareasConTiempo.length > 0,
          );

          if (hayTareas) {
            const actividadesConTareas =
              analysis.data.revisionesPorActividad.filter(
                (r) => r.tareasConTiempo.length > 0,
              );
            const totalTareas = actividadesConTareas.reduce(
              (sum, r) => sum + r.tareasConTiempo.length,
              0,
            );

            const esHoraReporte = isReportTime(
              horaInicioReporte,
              horaFinReporte,
            );

            addMessage(
              "bot",
              <TasksPanel
                actividadesConTareasPendientes={actividadesConTareas}
                totalTareasPendientes={totalTareas}
                esHoraReporte={esHoraReporte}
                theme={theme}
                assistantAnalysis={analysis}
                onOpenReport={() => setMostrarModalReporte(true)}
                onStartVoiceMode={handleStartVoiceMode}
              />,
            );
          } else {
            addMessage("bot", <NoTasksMessage theme={theme} />);
          }
        }, 1400);
      }, 800);
    }
  };

  const fetchAssistantAnalysis = async (
    showAll = false,
    isRestoration = false,
  ) => {
    if (fetchingAnalysisRef.current) {
      return;
    }

    fetchingAnalysisRef.current = true;

    try {
      setIsTyping(true);
      setStep("loading-analysis");

      const requestBody = {
        email: colaborador.email,
        showAll: showAll,
      };

      const data = await obtenerActividadesConRevisiones(requestBody);

      const adaptedData: AssistantAnalysis = {
        success: data.success,
        answer: data.answer,
        provider: data.provider || "Gemini",
        sessionId: data.sessionId,
        proyectoPrincipal: data.proyectoPrincipal || "Sin proyecto principal",
        metrics: {
          totalActividades: data.metrics?.totalActividadesProgramadas || 0,
          actividadesConTiempoTotal:
            data.metrics?.actividadesConTiempoTotal || 0,
          actividadesFinales: data.metrics?.actividadesFinales || 0,
          tareasConTiempo: data.metrics?.tareasConTiempo || 0,
          tareasAltaPrioridad: data.metrics?.tareasAltaPrioridad || 0,
          tiempoEstimadoTotal: data.metrics?.tiempoEstimadoTotal || "0h 0m",
        },
        data: {
          actividades: (data.data?.actividades || []).map((a: any) => ({
            id: a.id,
            titulo: a.titulo,
            horario: a.horario,
            status: a.status,
            proyecto: a.proyecto,
            esHorarioLaboral: a.esHorarioLaboral || false,
            tieneRevisionesConTiempo: a.tieneRevisionesConTiempo || false,
          })),

          revisionesPorActividad: (data.data?.revisionesPorActividad || []).map(
            (act: any) => {
              const tareasMapeadas = (act.tareasConTiempo || []).map(
                (t: any) => ({
                  id: t.id,
                  nombre: t.nombre,
                  terminada: t.terminada || false,
                  confirmada: t.confirmada || false,
                  duracionMin: t.duracionMin || 0,
                  descripcion: t.descripcion || "",
                  fechaCreacion: t.fechaCreacion,
                  fechaFinTerminada: t.fechaFinTerminada || null,
                  diasPendiente: t.diasPendiente || 0,
                  prioridad: t.prioridad || "BAJA",
                }),
              );

              return {
                actividadId: act.actividadId,
                actividadTitulo: act.actividadTitulo,
                actividadHorario: act.actividadHorario,
                tareasConTiempo: tareasMapeadas,
                totalTareasConTiempo: act.totalTareasConTiempo || 0,
                tareasAltaPrioridad: act.tareasAltaPrioridad || 0,
                tiempoTotal: act.tiempoTotal || 0,
                tiempoFormateado: act.tiempoFormateado || "0h 0m",
              };
            },
          ),
        },
        multiActividad: data.multiActividad || false,
      };

      const actividadesConvertidas: ActividadDiaria[] =
        adaptedData.data.revisionesPorActividad.map((revision) => ({
          actividadId: revision.actividadId,
          titulo: revision.actividadTitulo,
          tituloProyecto: adaptedData.proyectoPrincipal,
          horaInicio: revision.actividadHorario.split(" - ")[0] || "",
          horaFin: revision.actividadHorario.split(" - ")[1] || "",
          status: "activa",
          fecha: new Date().toISOString().split("T")[0],
          pendientes: revision.tareasConTiempo.map((tarea) => ({
            pendienteId: tarea.id,
            nombre: tarea.nombre,
            descripcion: tarea.descripcion || "",
            terminada: tarea.terminada,
            confirmada: tarea.confirmada,
            duracionMin: tarea.duracionMin,
            fechaCreacion: tarea.fechaCreacion,
            fechaFinTerminada: tarea.fechaFinTerminada || null,
            motivoNoCompletado: null,
          })),
          ultimaActualizacion: new Date(),
        }));

      assistantAnalysisRef.current = adaptedData;
      setActividadesDiarias(actividadesConvertidas);
      setAssistantAnalysis(adaptedData);
      setStep("ready");
      showAssistantAnalysis(adaptedData, isRestoration);
    } catch (error) {
      setIsTyping(false);
      setStep("error");

      addMessage(
        "bot",
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <span className="font-medium">Error al obtener actividades</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                Hubo un problema al obtener tus actividades. Por favor, intenta
                nuevamente más tarde.
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
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        fetchingAnalysisRef.current = false;
      }, 1000);
    }
  };

  // ==================== FUNCIONES: TEMA ====================
  const toggleTheme = () => {
    if (externalToggle) {
      externalToggle();
    } else {
      const newTheme = internalTheme === "light" ? "dark" : "light";
      setInternalTheme(newTheme);
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    }
  };

  // ==================== FUNCIONES: CHAT ====================
  const toggleChatMode = () => {
    const newMode = chatMode === "normal" ? "ia" : "normal";
    setChatMode(newMode);

    if (newMode === "ia") {
      addMessage(
        "system",
        <div
          className={`p-3 rounded-lg border ${
            theme === "dark"
              ? "bg-[#6841ea]/10 border-[#6841ea]/20"
              : "bg-purple-50 border-purple-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#6841ea]" />
            <span className="text-sm font-medium text-[#6841ea]">
              Modo Asistente IA activado
            </span>
          </div>
          <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
            Ahora puedes hacer preguntas sobre tus tareas y recibir ayuda
            personalizada.
          </p>
        </div>,
      );
    } else {
      addMessage(
        "system",
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Modo normal activado
        </div>,
      );
    }
  };

  const handleUserInputChange = (value: string) => {
    setUserInput(value);

    if (
      value !== lastTranscriptRef.current &&
      voiceRecognition.voiceTranscript
    ) {
      setIsUserEditing(true);

      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
    }
  };

  const handleUserInput = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      if (!userInput.trim()) return;

      const mensajeAEnviar = userInput.trim();

      addMessage("user", mensajeAEnviar);
      setUserInput("");
      setIsTyping(true);
      setIsLoadingIA(true);

      const sessionId =
        conversacionActiva || assistantAnalysis?.sessionId || null;

      let response;
      if (chatMode === "ia" && assistantAnalysis) {
        response = await consultarIAProyecto(mensajeAEnviar, sessionId);
      } else {
        response = await chatGeneralIA(mensajeAEnviar, sessionId);
      }

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

      setIsLoadingIA(false);
      setIsTyping(false);
    } catch (error) {
      speakText("Lo siento, hubo un error al procesar tu mensaje.");

      setIsTyping(false);
      setIsLoadingIA(false);
      addMessage("bot", "Lo siento, hubo un error al procesar tu mensaje.");
      toast({
        variant: "destructive",
        title: "Error de comunicación",
        description: "Ocurrió un error al contactar al asistente.",
      });
    }
  };

  const handleVoiceMessageClick = (voiceText: string) => {
    setUserInput(voiceText);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // ==================== RENDER ====================
  return (
    <div
      className={`flex flex-col h-screen ${theme === "dark" ? "bg-[#101010] text-white" : "bg-white text-gray-900"}`}
    >
      <ChatHeader
        isInPiPWindow={isInPiPWindow}
        sidebarOpen={conversationHistory.sidebarOpen}
        setSidebarOpen={conversationHistory.setSidebarOpen}
        theme={theme}
        toggleTheme={toggleTheme}
        displayName={displayName}
        colaborador={colaborador}
        rate={rate}
        changeRate={changeRate}
        isSpeaking={isSpeaking}
        isPiPMode={isPiPMode}
        openPiPWindow={() => {
          openPiPWindow();
        }}
        closePiPWindow={() => {
          closePiPWindow();
        }}
        setShowLogoutDialog={setShowLogoutDialog}
      />

      <VoiceGuidanceFlow
        voiceMode={voiceMode.voiceMode}
        voiceStep={voiceMode.voiceStep}
        theme={theme}
        isSpeaking={isSpeaking}
        finishVoiceMode={finishVoiceMode}
        currentActivityIndex={voiceMode.currentActivityIndex}
        currentTaskIndex={voiceMode.currentTaskIndex}
        activitiesWithTasks={activitiesWithTasks}
        taskExplanations={voiceMode.taskExplanations}
        voiceTranscript={voiceRecognition.voiceTranscript}
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
        sendExplanationsToBackend={sendExplanationsToBackend}
        recognitionRef={voiceRecognition.recognitionRef}
        setIsRecording={() => {}}
        setIsListening={() => {}}
        setVoiceStep={voiceMode.setVoiceStep}
        setCurrentListeningFor={voiceMode.setCurrentListeningFor}
        autoSendVoice={autoSendVoiceGuided}
      />

      <div
        className={`flex-1 overflow-y-auto
          [scrollbar-width:none]
          [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden
          ${isInPiPWindow ? "pt-2" : "pt-4"}
          pb-6
        `}
      >
        <div className="max-w-[75%] mx-auto w-full">
          <MessageList
            messages={messages}
            isTyping={isTyping}
            theme={theme}
            onVoiceMessageClick={handleVoiceMessageClick}
            scrollRef={scrollRef}
            assistantAnalysis={assistantAnalysis}
            onOpenReport={() => setMostrarModalReporte(true)}
            onStartVoiceMode={handleStartVoiceMode}
            reportConfig={{
              horaInicio: horaInicioReporte,
              horaFin: horaFinReporte,
            }}
          />
        </div>
      </div>

      {isTranscribing && (
        <div
          className="fixed bottom-24 left-1/2 transform -translate-x-1/2 
                        bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg
                        flex items-center gap-2 z-50"
        >
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Transcribiendo audio...</span>
        </div>
      )}

      <ReporteActividadesModal
        isOpen={mostrarModalReporte}
        onOpenChange={setMostrarModalReporte}
        theme={theme}
        actividadesDiarias={actividadesDiarias}
        stopVoice={stopVoice}
        speakText={speakText}
        isSpeaking={isSpeaking}
        onGuardarReporte={guardarReporteDiario}
        guardandoReporte={guardandoReporte}
      />

      {!voiceMode.voiceMode && (
        <ChatInputBar
          onStartRecording={startVoiceRecording}
          onCancelRecording={cancelVoiceRecording}
          userInput={userInput}
          setUserInput={handleUserInputChange}
          onSubmit={handleUserInput}
          onVoiceClick={startVoiceRecording}
          isRecording={isRecording}
          canUserType={canUserType}
          theme={theme}
          audioLevel={audioLevel}
          isLoadingIA={isLoadingIA}
          inputRef={inputRef}
          chatMode={chatMode}
          isSpeaking={isSpeaking}
          onToggleChatMode={toggleChatMode}
        />
      )}

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent
          className={`${theme === "dark" ? "bg-[#1a1a1a] text-white border-[#2a2a2a]" : "bg-white text-gray-900 border-gray-200"} border`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#6841ea] text-xl">
              <PartyPopper className="w-6 h-6" />
              ¡Análisis completado!
            </AlertDialogTitle>
            <AlertDialogDescription
              className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
            >
              El análisis de tus actividades ha sido generado exitosamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={onLogout}
              className="bg-[#6841ea] hover:bg-[#5a36d4] text-white"
            >
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent
          className={`font-['Arial'] ${theme === "dark" ? "bg-[#1a1a1a] text-white border-[#2a2a2a]" : "bg-white text-gray-900 border-gray-200"} border max-w-md`}
        >
          <AlertDialogHeader className="pt-6">
            <div className="mx-auto mb-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}
              >
                <LogOut className="w-8 h-8 text-[#6841ea]" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold font-['Arial']">
              ¿Cerrar sesión?
            </AlertDialogTitle>
            <AlertDialogDescription
              className={`text-center pt-4 pb-2 font-['Arial'] ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
            >
              <p>¿Estás seguro que deseas salir del asistente?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6 font-['Arial']">
            <AlertDialogCancel
              className={`w-full sm:w-auto rounded-lg h-11 font-['Arial'] ${theme === "dark" ? "bg-[#2a2a2a] hover:bg-[#353535] text-white border-[#353535]" : "bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200"} border`}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onLogout}
              className="w-full sm:w-auto bg-[#6841ea] hover:bg-[#5a36d4] text-white rounded-lg h-11 font-semibold font-['Arial']"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Confirmar salida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
