"use client";

import React, { useCallback } from "react";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  validateSession,
  sendTaskValidation,
  obtenerHistorialSidebar,
  obtenerActividadesConTiempoHoy,
  actualizarEstadoPendientes,
  validarReportePendiente,
  obtenerPendientesHoy,
  obtenerActividadesConRevisiones,
  guardarExplicaciones,
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
  FileText,
  LogOut,
  AlertCircle,
  PartyPopper,
  Clock,
  CheckCircle2,
  Brain,
  Target,
  User,
  Mail,
  Check,
} from "lucide-react";
import { getDisplayName } from "@/util/utils-chat";
import { useVoiceSynthesis } from "@/components/hooks/use-voice-synthesis";
import { SidebarHistorial } from "./SidebarHistorial";
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
import { MessageList } from "./chat/MessageList";
import { ChatInputBar } from "./chat/ChatInputBar";
import { ReporteActividadesModal } from "./ReporteActividadesModal";

export function ChatBot({ colaborador, onLogout }: ChatBotProps) {
  // ==================== REFS ====================
  const scrollRef = useRef<HTMLDivElement>(null);
  const welcomeSentRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const voiceTranscriptRef = useRef<string>("");
  const explanationProcessedRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

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

  // ==================== CONSTANTES ====================
  const displayName = getDisplayName(colaborador);
  const router = useRouter();

  // ==================== ESTADOS: CHAT PRINCIPAL ====================
  const [step, setStep] = useState<ChatStep>("welcome");
  const [userInput, setUserInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [assistantAnalysis, setAssistantAnalysis] =
    useState<AssistantAnalysis | null>(null);

  // ==================== ESTADOS: DIÁLOGOS Y MODALS ====================
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [mostrarModalReporte, setMostrarModalReporte] = useState(false);

  // ==================== ESTADOS: SIDEBAR ====================
  const [sidebarCargado, setSidebarCargado] = useState(false);
  const [sidebarCargando, setSidebarCargando] = useState(true);
  const [data, setData] = useState<ConversacionSidebar[]>([]);
  const [conversaciones, setConversaciones] = useState<ConversacionSidebar[]>(
    [],
  );

  // ==================== ESTADOS: VOICE RECOGNITION (MODAL REPORTE) ====================
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  // ==================== ESTADOS: REPORTE DE ACTIVIDADES ====================
  const [actividadesDiarias, setActividadesDiarias] = useState<
    ActividadDiaria[]
  >([]);
  const [pendientesReporte, setPendientesReporte] = useState<
    PendienteEstadoLocal[]
  >([]);
  const [guardandoReporte, setGuardandoReporte] = useState(false);
  const [yaSeVerificoHoy, setYaSeVerificoHoy] = useState(false);
  const [isCheckingAfterHours, setIsCheckingAfterHours] = useState(false);

  // ==================== ESTADOS: MODAL VOZ REPORTE ====================
  const [modoVozReporte, setModoVozReporte] = useState(false);
  const [indicePendienteActual, setIndicePendienteActual] = useState(0);
  const [pasoModalVoz, setPasoModalVoz] = useState<
    "esperando" | "escuchando" | "procesando"
  >("esperando");

  // ==================== ESTADOS: HORARIOS REPORTE ====================
  const [horaInicioReporte] = useState(0); // a que hora empieza el reporte
  const [minutoInicioReporte] = useState(30);
  const [horaFinReporte] = useState(17); // a que hora termina el reporte
  const [minutoFinReporte] = useState(30);

  // ==================== ESTADOS: HORARIOS ====================
  const [horaFinJornada] = useState(17); // a que hora termina la jornada
  const [minutoFinJornada] = useState(30); // a que minuto termina la jornada

  // ==================== ESTADOS: PiP (PICTURE-IN-PICTURE) ====================
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [isInPiPWindow, setIsInPiPWindow] = useState(false);

  // ==================== VALORES COMPUTADOS ====================
  const canUserType = step !== "loading-analysis" && !voiceMode.voiceMode;

  // ==================== ESTADOS: CONFIGURACIÓN REPORTE ====================
  const reportConfig = useMemo(
    () => ({
      horaInicio: 0,
      minutoInicio: 30,
      horaFin: 17,
      minutoFin: 30,
      horaFinJornada: 17,
      minutoFinJornada: 30,
    }),
    [],
  );

  // ==================== FUNCIONES ====================

  const isReportTimeWindow = useCallback(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes =
      reportConfig.horaInicio * 60 + reportConfig.minutoInicio;
    const endMinutes = reportConfig.horaFin * 60 + reportConfig.minutoFin;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }, [reportConfig]);

  const cargarActividadesParaReporte = async () => {
    try {
      const response = await obtenerActividadesConTiempoHoy();

      if (response.success && response.data && response.data.length > 0) {
        setActividadesDiarias(response.data);

        const todosLosPendientes: PendienteEstadoLocal[] = [];
        response.data.forEach((actividad: ActividadDiaria) => {
          actividad.pendientes.forEach((pendiente) => {
            todosLosPendientes.push({
              ...pendiente,
              actividadId: actividad.actividadId,
              completadoLocal: false,
              motivoLocal: "",
            });
          });
        });

        setPendientesReporte(todosLosPendientes);
        setYaSeVerificoHoy(true);
      } else {
        console.log("No hay actividades para reportar hoy");
        setYaSeVerificoHoy(true);
      }
    } catch (error) {
      console.error("Error al cargar actividades para reporte:", error);
    }
  };

  // Función para marcar/desmarcar como completado
  const handleToggleCompletado = useCallback((pendienteId: string) => {
    setPendientesReporte((prev) =>
      prev.map((p) =>
        p.pendienteId === pendienteId
          ? { ...p, completadoLocal: !p.completadoLocal }
          : p,
      ),
    );
  }, []);

  // Función para actualizar la explicación de por qué no se terminó
  const handleExplicacionChange = (
    pendienteId: string,
    nuevaExplicacion: string,
  ) => {
    setPendientesReporte((prev) =>
      prev.map((p) =>
        p.pendienteId === pendienteId
          ? { ...p, motivoLocal: nuevaExplicacion }
          : p,
      ),
    );
  };

  const iniciarModoVoz = () => {
    setModoVozReporte(true);
    setIndicePendienteActual(0);
    speakText(
      `Vamos a reportar ${pendientesReporte.length} tareas. Comenzamos con la primera.`,
    );
    setTimeout(() => preguntarPendiente(0), 2000);
  };
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
      setIsRecording(true);
      setIsListening(true);
      startRecording();
    }, texto.length * 50);
  };

  const iniciarGrabacionEnModal = () => {
    if (typeof window === "undefined") return;

    if (
      !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      speakText("Tu navegador no soporta reconocimiento de voz.");
      return;
    }

    setPasoModalVoz("escuchando");
    setIsRecording(true);
    setIsListening(true);
    setVoiceTranscript("");
    voiceTranscriptRef.current = "";
    explanationProcessedRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setPasoModalVoz("escuchando");
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const fullTranscript = (finalTranscript + interimTranscript).trim();
      voiceTranscriptRef.current = fullTranscript;
      setVoiceTranscript(fullTranscript);

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      if (fullTranscript.length > 0) {
        silenceTimerRef.current = setTimeout(() => {
          if (
            !explanationProcessedRef.current &&
            voiceTranscriptRef.current.trim().length > 0
          ) {
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
            procesarRespuestaReporte(voiceTranscriptRef.current);
          }
        }, 3000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Error:", event.error);
      setIsListening(false);
      setIsRecording(false);
      setPasoModalVoz("esperando");
      speakText("Hubo un error. Intenta de nuevo.");
    };

    recognition.onend = () => {
      console.log("Reconocimiento terminado");
      setIsListening(false);
      setIsRecording(false);
    };

    recognition.start();
  };
  const procesarRespuestaReporte = async (transcript: string) => {
    const trimmedTranscript = transcript.trim();
    explanationProcessedRef.current = true;

    console.log("📝 Procesando:", trimmedTranscript);

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

      console.log("📝 Validado:", data);

      const fueCompletado = data.terminada;
      console.log("📝 Fue completado:", fueCompletado);

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
        setVoiceTranscript("");
        voiceTranscriptRef.current = "";
        setIndicePendienteActual((prev) => prev + 1);

        // Si hay más tareas, preguntarlas
        if (indicePendienteActual + 1 < pendientesReporte.length) {
          setTimeout(() => preguntarPendiente(indicePendienteActual + 1), 500);
        }
      }, 1500);
    } catch (error) {
      console.error("Error:", error);
      speakText("Error. Intenta de nuevo.");
      setTimeout(() => {
        setPasoModalVoz("esperando");
        explanationProcessedRef.current = false;
      }, 1500);
    }
  };

  const handleStartVoiceMode = () => {
    if (!assistantAnalysis) {
      speakText("No hay actividades para explicar.");
      return;
    }

    const activitiesWithTasks =
      assistantAnalysis.data.revisionesPorActividad.filter(
        (actividad) => actividad.tareasConTiempo.length > 0,
      );

    if (activitiesWithTasks.length === 0) {
      speakText("No hay tareas con tiempo asignado para explicar.");
      return;
    }

    // Activar modo voz
    voiceMode.setVoiceMode(true);
    voiceMode.setVoiceStep("confirm-start");
    voiceMode.setExpectedInputType("confirmation");
    voiceMode.setCurrentActivityIndex(0);
    voiceMode.setCurrentTaskIndex(0);
    voiceMode.setTaskExplanations([]);

    // Mensaje de bienvenida
    speakText(
      `Vamos a explicar ${activitiesWithTasks.length} actividades con tareas programadas. ¿Listo para comenzar?`,
    );
  };

  const guardarReporteDiario = async () => {
    try {
      setGuardandoReporte(true);

      // Validar que las tareas no completadas tengan motivo
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
        setModoVozReporte(false);
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
                <span className="font-medium">✅ Reporte guardado</span>
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
      }
    } catch (error) {
      console.error("Error al guardar reporte:", error);
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
    } finally {
      setGuardandoReporte(false);
    }
  };

  const checkTimeAndVerifyActivities = useCallback(() => {
    if (checkIfAfterHours()) {
      checkEndOfDayActivities();
    }
    if (isReportTimeWindow() && !yaSeVerificoHoy) {
      cargarActividadesParaReporte();
    }
  }, [yaSeVerificoHoy]);

  useEffect(() => {
    checkTimeAndVerifyActivities();
    const interval = setInterval(checkTimeAndVerifyActivities, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkTimeAndVerifyActivities]);

  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        setYaSeVerificoHoy(false);
        console.log("🌙 Medianoche - Reseteando verificación diaria");
      }
    };

    const midnightInterval = setInterval(checkMidnight, 60 * 1000);
    return () => clearInterval(midnightInterval);
  }, []);

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

  const checkIfAfterHours = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const finJornadaMinutes = horaFinJornada * 60 + minutoFinJornada;

    return currentTotalMinutes >= finJornadaMinutes;
  };

  const checkEndOfDayActivities = async () => {
    try {
      setIsCheckingAfterHours(true);

      const data = await obtenerPendientesHoy({
        email: colaborador.email,
        timestamp: new Date().toISOString(),
      });

      if (data.success && data.todasValidadas) {
        addMessage(
          "bot",
          <div
            className={`p-4 rounded-lg border ${theme === "dark" ? "bg-green-900/20 border-green-500/20" : "bg-green-50 border-green-200"}`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <span className="font-medium">¡Jornada completada! </span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  Todas tus actividades han sido revisadas y validadas
                  correctamente. ¡Buen trabajo! Puedes cerrar sesión.
                </p>
              </div>
            </div>
          </div>,
        );

        speakText(
          "¡Perfecto! Todas tus actividades han sido revisadas y validadas. Buen trabajo, puedes cerrar sesión.",
        );
      }

      setIsCheckingAfterHours(false);
    } catch (error) {
      console.error("Error al verificar actividades finalizadas:", error);
      setIsCheckingAfterHours(false);
    }
  };

  const cancelVoiceMode = () => {
    stopVoice();
    voiceRecognition.stopRecording();
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
  const speakActivityByIndex = (activityIndex: number) => {
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

  const startTaskExplanation = () => {
    const allowedStates = [
      "waiting-for-explanation",
      "confirmation",
      "task-presentation",
    ];

    if (!allowedStates.includes(voiceMode.voiceStep)) {
      console.log("Estado no permitido para explicar");
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
    voiceRecognition.startRecording(
      (transcript) => {
        console.log("Transcripción completa:", transcript);

        if (voiceMode.voiceMode) {
          processVoiceCommand(transcript);
        }
      },
      (error) => {
        console.error("Error en reconocimiento de voz:", error);
        speakText(
          "Hubo un error con el micrófono. Por favor, intenta de nuevo.",
        );
      },
    );
  };

  const processVoiceExplanation = async (transcript: string) => {
    console.log("========== PROCESANDO EXPLICACIÓN DE VOZ ==========");
    console.log("📝 Transcripción recibida:", transcript);

    const trimmedTranscript = cleanExplanationTranscript(transcript);
    console.log("🧹 Transcripción limpia:", trimmedTranscript);

    const validation = validateExplanationLength(trimmedTranscript);
    console.log("✅ Validación de longitud:", validation);

    if (!validation.isValid) {
      console.warn("❌ Explicación muy corta");
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

    console.log("📋 Tarea actual:", currentTask);
    console.log("📂 Actividad actual:", currentActivity);

    if (!currentTask || !currentActivity) {
      console.error("❌ No hay tarea o actividad actual");
      return;
    }

    // ✅ CAMBIAR ESTADO A "processing-explanation"
    voiceMode.setVoiceStep("processing-explanation");
    speakText("Validando tu explicación...");

    try {
      console.log("📡 Enviando al backend...");

      const payload = {
        taskId: currentTask.id,
        taskName: currentTask.nombre,
        activityTitle: currentActivity.actividadTitulo,
        explanation: trimmedTranscript,
        confirmed: true,
        priority: currentTask.prioridad,
        duration: currentTask.duracionMin,
      };

      console.log("📦 Payload:", payload);

      // ✅ ENVIAR AL BACKEND PARA VALIDAR
      const response = await sendTaskValidation(payload);

      console.log("📡 Respuesta del backend:", response);

      if (response.valida) {
        console.log("✅ EXPLICACIÓN VÁLIDA");

        // ✅ EXPLICACIÓN VÁLIDA - GUARDAR Y CONTINUAR
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

        // ✅ PASAR A LA SIGUIENTE TAREA
        setTimeout(() => {
          const nextTaskIndex = voiceMode.currentTaskIndex + 1;

          if (nextTaskIndex < currentActivity.tareas.length) {
            console.log("➡️ Siguiente tarea en la misma actividad");
            voiceMode.setCurrentTaskIndex(nextTaskIndex);
            voiceMode.setRetryCount(0);
            speakTaskByIndices(voiceMode.currentActivityIndex, nextTaskIndex);
          } else {
            console.log("➡️ Siguiente actividad");
            const nextActivityIndex = voiceMode.currentActivityIndex + 1;
            voiceMode.setCurrentActivityIndex(nextActivityIndex);
            voiceMode.setCurrentTaskIndex(0);
            voiceMode.setRetryCount(0);

            if (nextActivityIndex < activitiesWithTasks.length) {
              speakActivityByIndex(nextActivityIndex);
            } else {
              console.log("🎉 Todas las actividades completadas");
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
        console.warn("❌ EXPLICACIÓN NO VÁLIDA:", response.razon);

        // ❌ EXPLICACIÓN NO VÁLIDA - PEDIR CORRECCIÓN
        voiceMode.setRetryCount((prev) => prev + 1);
        speakText(
          `La explicación no es suficiente. ${response.razon || "Por favor, explica con más detalle cómo resolverás esta tarea."}`,
        );

        setTimeout(() => {
          voiceMode.setVoiceStep("waiting-for-explanation");
          voiceMode.setExpectedInputType("explanation");
        }, 3000);
      }
    } catch (error) {
      console.error("❌ Error en validación:", error);
      speakText("Hubo un error de conexión. Por favor, intenta de nuevo.");

      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
        voiceMode.setExpectedInputType("explanation");
      }, 2000);
    }
  };

  const confirmExplanation = async () => {
    console.log("========== CONFIRMANDO Y ENVIANDO EXPLICACIÓN ==========");

    if (
      voiceMode.voiceStep !== "confirmation" ||
      voiceMode.expectedInputType !== "confirmation"
    ) {
      console.log("ERROR: No se puede confirmar en este estado");
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

    const explanationToSend = voiceMode.taskExplanations.find(
      (exp) => exp.taskId === currentTask?.id,
    );

    if (!currentTask || !currentActivity || !explanationToSend) {
      console.error("ERROR: Faltan datos para el envío");
      return;
    }

    voiceMode.setVoiceStep("processing-explanation");
    speakText("Validando tu explicación, un momento...");

    try {
      const response = await sendTaskValidation({
        taskId: currentTask.id,
        taskName: currentTask.nombre,
        activityTitle: currentActivity.actividadTitulo,
        explanation: explanationToSend.explanation,
        confirmed: true,
        priority: currentTask.prioridad,
        duration: currentTask.duracionMin,
      });

      if (response.valida) {
        voiceMode.setTaskExplanations((prev) =>
          prev.map((exp) =>
            exp.taskId === currentTask.id ? { ...exp, confirmed: true } : exp,
          ),
        );

        speakText("Excelente. Explicación validada correctamente.");

        const nextTaskIndex = voiceMode.currentTaskIndex + 1;

        if (nextTaskIndex < currentActivity.tareas.length) {
          voiceMode.setCurrentTaskIndex(nextTaskIndex);
          voiceMode.setRetryCount(0);
          setTimeout(() => {
            speakTaskByIndices(voiceMode.currentActivityIndex, nextTaskIndex);
          }, 1500);
        } else {
          const nextActivityIndex = voiceMode.currentActivityIndex + 1;
          voiceMode.setCurrentActivityIndex(nextActivityIndex);
          voiceMode.setCurrentTaskIndex(0);
          voiceMode.setRetryCount(0);

          if (nextActivityIndex < activitiesWithTasks.length) {
            setTimeout(() => {
              speakActivityByIndex(nextActivityIndex);
            }, 1500);
          } else {
            voiceMode.setVoiceStep("summary");
            voiceMode.setExpectedInputType("confirmation");
            setTimeout(() => {
              speakText(
                "¡Perfecto! Has terminado de validar todas las tareas.",
              );
            }, 1000);
          }
        }
      } else {
        voiceMode.setVoiceStep("waiting-for-explanation");
        voiceMode.setExpectedInputType("explanation");
        speakText(
          `La explicación no fue suficiente. ${response.razon || "Por favor, intenta dar más detalles."}`,
        );
      }
    } catch (error) {
      console.error("Error en el flujo de validación:", error);
      voiceMode.setVoiceStep("confirmation");
      speakText(
        "Hubo un problema de conexión al validar. ¿Quieres intentar confirmarlo de nuevo?",
      );
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
    console.log("Procesando comando de voz:", lowerTranscript);

    if (!voiceMode.voiceMode) return;

    // Procesar comandos según el tipo de input esperado
    switch (voiceMode.expectedInputType) {
      case "confirmation":
        if (
          isClearCommand(lowerTranscript, ["sí", "si", "confirmar", "correcto"])
        ) {
          if (voiceMode.voiceStep === "confirmation") {
            confirmExplanation();
          } else if (voiceMode.voiceStep === "summary") {
            sendExplanationsToBackend();
          }
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

    // Comandos globales
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
    console.log("========== ENVIANDO EXPLICACIONES AL BACKEND ==========");

    if (!assistantAnalysis) {
      console.log("ERROR: No hay análisis de asistente");
      return;
    }

    try {
      // ✅ CORRECTO - Usa voiceMode
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

      const response = await guardarExplicaciones(payload);

      if (response.ok) {
        speakText("¡Correcto! Tu reporte ha sido enviado.");
      } else {
        speakText("Hubo un error al enviar tu reporte.");
      }

      setTimeout(() => {
        voiceMode.setVoiceStep("idle");
        voiceMode.setVoiceMode(false); // ✅ CORRECTO
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
      console.error("Error al enviar explicaciones:", error);
      speakText("Hubo un error al enviar tu reporte.");
      voiceMode.setVoiceStep("summary");
      voiceMode.setExpectedInputType("confirmation");
    }
  };

  useEffect(() => {
    if (!voiceRecognition.voiceTranscript) {
      return;
    }

    console.log(
      "EFECTO: Procesando voiceTranscript:",
      voiceRecognition.voiceTranscript,
    );
    console.log("voiceMode activo?:", voiceMode.voiceMode);

    if (!voiceMode.voiceMode) {
      return;
    }

    processVoiceCommand(voiceRecognition.voiceTranscript);
  }, [voiceRecognition.voiceTranscript, voiceMode.voiceMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log(
        "Voces disponibles:",
        voices.map((v) => `${v.name} (${v.lang})`),
      );
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
          } catch (e) {
            console.log(
              "No se pueden aplicar ciertas restricciones de ventana",
            );
          }
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
        console.log("Ventana PiP cerrada detectada");
        setIsPiPMode(false);
        pipWindowRef.current = null;
      }
    }, 1000);

    const handleBeforeUnload = () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        try {
          pipWindowRef.current.postMessage({ type: "PARENT_CLOSING" }, "*");
        } catch (e) {
          console.log("No se pudo notificar a la ventana PiP");
        }
        pipWindowRef.current.close();
      }
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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopVoice();
    };
  }, [isInPiPWindow, stopVoice]);

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

  const showAssistantAnalysis = async (
    analysis: AssistantAnalysis,
    isRestoration = false,
  ) => {
    if (!isRestoration) {
      addMessageWithTyping(
        "bot",
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#6841ea]/5 border border-[#6841ea]/10">
            <div className="p-2 rounded-full bg-[#6841ea]/10">
              <User className="w-5 h-5 text-[#6841ea]" />
            </div>
            <div>
              <p className="font-medium text-sm">Hola, {displayName}!</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {colaborador.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="p-2 rounded-full bg-[#6841ea]/10">
              <Brain className="w-5 h-5 text-[#6841ea]" />
            </div>
            <div>
              <h3 className="font-bold text-md">📋 Resumen de tu día</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString("es-MX", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>,
        400,
      );

      setTimeout(async () => {
        addMessageWithTyping(
          "bot",
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div
                className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-3 h-3 text-red-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Alta
                  </span>
                </div>
                <div className="text-xl font-bold text-red-500">
                  {analysis.metrics.tareasAltaPrioridad || 0}
                </div>
              </div>
              <div
                className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3 h-3 text-green-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Total
                  </span>
                </div>
                <div className="text-xl font-bold">
                  {analysis.metrics.tareasConTiempo || 0}
                </div>
              </div>
              <div
                className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Tiempo
                  </span>
                </div>
                <div className="text-xl font-bold text-yellow-500">
                  {analysis.metrics.tiempoEstimadoTotal || "0h 0m"}
                </div>
              </div>
            </div>

            {analysis.answer && (
              <div
                className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}
              >
                <div className="flex items-start gap-2">
                  <Bot className="w-4 h-4 text-[#6841ea] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {analysis.answer.split("\n\n")[0]}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>,
          600,
        );
      }, 800);
    }
  };

  const fetchAssistantAnalysis = async (
    showAll = false,
    isRestoration = false,
  ) => {
    try {
      setIsTyping(true);
      setStep("loading-analysis");

      if (!isRestoration) {
        addMessage(
          "system",
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Brain className="w-4 h-4 text-[#6841ea]" />
            {showAll
              ? "Obteniendo todas tus actividades..."
              : "Obteniendo análisis de tus actividades..."}
          </div>,
        );
      }

      const requestBody = {
        email: colaborador.email,
        showAll: showAll,
      };

      const data = await obtenerActividadesConRevisiones(requestBody);

      console.log("Respuesta del endpoint con revisiones:", data);

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
          actividades:
            data.data?.actividades?.map((a: any) => ({
              id: a.id,
              titulo: a.titulo,
              horario: a.horario,
              status: a.status,
              proyecto: a.proyecto,
              esHorarioLaboral: a.esHorarioLaboral || false,
              tieneRevisionesConTiempo: a.tieneRevisionesConTiempo || false,
            })) || [],
          revisionesPorActividad:
            data.data?.revisionesPorActividad?.map((act: any) => ({
              actividadId: act.actividadId,
              actividadTitulo: act.actividadTitulo,
              actividadHorario: act.actividadHorario,
              tareasConTiempo:
                act.tareasConTiempo?.map((t: any) => ({
                  id: t.id,
                  nombre: t.nombre,
                  terminada: t.terminada || false,
                  confirmada: t.confirmada || false,
                  duracionMin: t.duracionMin || 0,
                  fechaCreacion: t.fechaCreacion,
                  fechaFinTerminada: t.fechaFinTerminada || null,
                  diasPendiente: t.diasPendiente || 0,
                  prioridad: t.prioridad || "BAJA",
                })) || [],
              totalTareasConTiempo: act.totalTareasConTiempo || 0,
              tareasAltaPrioridad: act.tareasAltaPrioridad || 0,
              tiempoTotal: act.tiempoTotal || 0,
              tiempoFormateado: act.tiempoFormateado || "0h 0m",
            })) || [],
        },
        multiActividad: data.multiActividad || false,
      };

      setAssistantAnalysis(adaptedData);
      showAssistantAnalysis(adaptedData, isRestoration);
    } catch (error) {
      console.error("Error al obtener análisis del asistente:", error);
      setIsTyping(false);
      // sin datos de ejemplo ni estatico
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
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (!assistantAnalysis) return;
    if (sidebarCargado) return;

    setSidebarCargando(true); // ✅ Ahora existe
    obtenerHistorialSidebar()
      .then((res) => {
        console.log("Historial del sidebar cargado:", res.data);
        setData(res.data); // ✅ Ahora existe
        setConversaciones(res.data); // ✅ Ahora existe
        setSidebarCargado(true);
      })
      .catch((error) => {
        console.error("Error al cargar sidebar:", error);
        setData([]); // ✅ Ahora existe
      })
      .finally(() => setSidebarCargando(false)); // ✅ Ahora existe
  }, [assistantAnalysis, sidebarCargado]);

  const startRecording = () => {
    if (typeof window === "undefined") return;
    if (
      !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      alert("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    window.speechSynthesis.cancel();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (e) {
        console.log("Error al detener reconocimiento previo:", e);
      }
    }

    setIsRecording(true);
    setIsListening(true);
    setVoiceTranscript("");
    voiceTranscriptRef.current = "";

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log("✅ Reconocimiento de voz INICIADO");
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      // Acumular TODOS los resultados para evitar pérdida al pausar
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const fullTranscript = (finalTranscript + interimTranscript).trim();
      voiceTranscriptRef.current = fullTranscript;
      setVoiceTranscript(fullTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn("⚠️ SpeechRecognition error:", event.error);

      if (event.error === "aborted") {
        console.log("🔄 Abortado intencionalmente");
        setIsListening(false);
        setIsRecording(false);

        return;
      }

      setIsListening(false);
      setIsRecording(false);
    };

    recognition.onend = () => {
      console.log("🛑 Reconocimiento de voz FINALIZADO");
      setIsListening(false);
      setIsRecording(false);
    };

    setTimeout(() => {
      try {
        recognition.start();
        console.log(" Iniciando reconocimiento...");
      } catch (error) {
        console.error("❌ Error al iniciar reconocimiento:", error);
        setIsListening(false);
        setIsRecording(false);

        setTimeout(() => {
          try {
            recognition.start();
          } catch (retryError) {
            console.error("❌ Error en reintento:", retryError);
            alert(
              "No se pudo acceder al micrófono. Por favor, verifica los permisos.",
            );
          }
        }, 300);
      }
    }, 100);
  };

  const stopRecording = () => {
    console.log("========== DETENIENDO GRABACIÓN ==========");

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);

    const currentTranscript = voiceTranscriptRef.current;
    console.log("📝 Transcripción capturada:", currentTranscript);

    // ✅ VALIDAR QUE ESTEMOS EN MODO VOZ Y EN EL PASO CORRECTO
    if (
      voiceMode.voiceMode &&
      voiceMode.voiceStep === "listening-explanation" &&
      currentTranscript.trim()
    ) {
      console.log("✅ Procesando explicación de voz...");
      processVoiceExplanation(currentTranscript);
    } else if (
      voiceMode.voiceMode &&
      voiceMode.voiceStep === "listening-explanation" &&
      !currentTranscript.trim()
    ) {
      console.warn("⚠️ No hay transcripción para procesar");
      speakText("No escuché tu explicación. Por favor, intenta de nuevo.");
      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
      }, 1000);
    }

    // Lógica del modal de reporte
    if (modoVozReporte && voiceTranscriptRef.current.trim()) {
      procesarRespuestaReporte(voiceTranscriptRef.current);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    }
  };

  const addMessage = (
    type: Message["type"],
    content: string | React.ReactNode,
    voiceText?: string,
  ) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      voiceText,
    };

    setMessages((prev) => {
      const updated = [...prev, newMessage];

      // Actualizar caché de conversación
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
  ) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, delay));
    setIsTyping(false);
    addMessage(type, content);
  };

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

  useEffect(() => {
    if (welcomeSentRef.current) return;
    welcomeSentRef.current = true;

    const init = async () => {
      const user = await validateSession();
      if (!user) {
        router.replace("/");
        return;
      }

      // Inicializar la aplicación...
      addMessageWithTyping(
        "bot",
        `¡Hola ${displayName}! 👋 Soy tu asistente.`,
        500,
      );

      fetchAssistantAnalysis();
    };

    init();
  }, []);

  const handleUserInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const input = userInput.trim();
    setUserInput("");
    addMessage("user", input);
  };

  const handleVoiceMessageClick = (voiceText: string) => {
    setUserInput(voiceText);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      className={`min-h-screen font-['Arial'] flex ${theme === "dark" ? "bg-[#101010] text-white" : "bg-white text-gray-900"}`}
    >
      {!isInPiPWindow && (
        <aside
          className={`fixed left-0 top-0 h-screen z-50 transition-all duration-300 ${conversationHistory.sidebarOpen ? "w-64" : "w-0"} ${theme === "dark" ? "bg-[#0a0a0a] border-r border-[#1a1a1a]" : "bg-gray-50 border-r border-gray-200"} overflow-hidden`}
        >
          <SidebarHistorial
            conversacionActiva={conversationHistory.conversacionActiva}
            onSeleccionarConversacion={(conv) =>
              conversationHistory.seleccionarConversacion(
                conv,
                setMessages,
                setIsTyping,
                addMessage,
              )
            }
            theme={theme}
          />
        </aside>
      )}

      <div
        className={`flex-1 flex flex-col min-w-0 h-screen transition-all  scrollbar-hide duration-300 relative  ${!isInPiPWindow && conversationHistory.sidebarOpen ? "ml-64" : "ml-0"}`}
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
          openPiPWindow={() => {}} // Implementar si necesitas PiP
          closePiPWindow={() => {}}
          setShowLogoutDialog={setShowLogoutDialog}
        />

        <VoiceGuidanceFlow
          voiceMode={voiceMode.voiceMode}
          voiceStep={voiceMode.voiceStep}
          theme={theme}
          isSpeaking={isSpeaking}
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
          confirmExplanation={confirmExplanation}
          retryExplanation={retryExplanation}
          sendExplanationsToBackend={sendExplanationsToBackend}
          recognitionRef={voiceRecognition.recognitionRef}
          setIsRecording={() => {}}
          setIsListening={() => {}}
          setVoiceStep={voiceMode.setVoiceStep}
          setCurrentListeningFor={voiceMode.setCurrentListeningFor}
        />

        {/* CONTENIDO DE MENSAJES - PADDING AJUSTADO */}
        <div
          className={`flex-1 overflow-y-auto
    [scrollbar-width:none]
    [-ms-overflow-style:none]
    [&::-webkit-scrollbar]:hidden
    ${isInPiPWindow ? "pt-2" : "pt-4"}
    pb-6
  `}
        >
          <div className="max-w-4xl mx-auto w-full">
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
                minutoInicio: minutoInicioReporte,
                horaFin: horaFinReporte,
                minutoFin: minutoFinReporte,
              }}
            />
          </div>
        </div>

        {/* INPUT BAR - Z-INDEX AJUSTADO */}
        {!voiceMode.voiceMode && (
          <ChatInputBar
            userInput={userInput}
            setUserInput={setUserInput}
            onSubmit={handleUserInput}
            onVoiceClick={startRecordingWrapper}
            isRecording={voiceRecognition.isRecording}
            canUserType={canUserType}
            theme={theme}
            inputRef={inputRef}
          />
        )}
      </div>

      {/* Modal de Reporte de Actividades Diarias */}
      <ReporteActividadesModal
        isOpen={mostrarModalReporte}
        onOpenChange={setMostrarModalReporte}
        theme={theme}
        modoVoz={modoVozReporte}
        setModoVoz={setModoVozReporte}
        isListening={isListening}
        isSpeaking={isSpeaking}
        indiceActual={indicePendienteActual}
        totalPendientes={pendientesReporte.length}
        voiceTranscript={voiceTranscript}
        actividadesDiarias={actividadesDiarias}
        pendientesReporte={pendientesReporte}
        onToggleCompletado={handleToggleCompletado}
        onExplicacionChange={handleExplicacionChange}
        iniciarModoVoz={iniciarModoVoz}
        stopVoice={stopVoice}
        recognitionRef={recognitionRef}
        pasoModalVoz={pasoModalVoz} // ✅ AGREGADO
        iniciarGrabacionEnModal={iniciarGrabacionEnModal}
        voiceTranscriptRef={voiceTranscriptRef} // ✅ AGREGADO
        procesarRespuestaReporte={procesarRespuestaReporte}
        guardarReporteDiario={guardarReporteDiario} // ✅ AGREGADO
        guardandoReporte={guardandoReporte} // ✅ AGREGADO
        setPasoModalVoz={setPasoModalVoz} // ✅ AGREGADO
        setIndicePendienteActual={setIndicePendienteActual} // ✅ AGREGADO
      />
      {/* ========== FIN CONTENIDO PRINCIPAL ========== */}

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
