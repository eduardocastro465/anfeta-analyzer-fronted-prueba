"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { validateSession } from "../lib/api";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import type { Colaborador } from "@/lib/types";
import {
  Bot,
  FileText,
  Send,
  LogOut,
  AlertCircle,
  Loader2,
  PartyPopper,
  Clock,
  CheckCircle2,
  Sparkles,
  Moon,
  Sun,
  Minimize2,
  PictureInPicture,
  Mic,
  MicOff,
  Volume2,
  Brain,
  Calendar,
  Target,
  Zap,
  BarChart3,
  User,
  Mail,
  CalendarDays,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Check,
  X,
  Headphones,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";

interface ChatBotProps {
  colaborador: Colaborador;
  actividades: any[];
  onLogout: () => void;
}

type ChatStep = "welcome" | "loading-analysis" | "show-analysis" | "finished";

interface Message {
  id: string;
  type: "bot" | "user" | "system" | "voice" | "analysis";
  content: string | React.ReactNode;
  timestamp: Date;
  voiceText?: string;
}

interface AssistantAnalysis {
  success: boolean;
  answer: string;
  provider: string;
  sessionId: string;
  proyectoPrincipal: string;
  metrics: {
    totalActividades: number;
    totalPendientes: number;
    pendientesAltaPrioridad: number;
    tiempoEstimadoTotal: string;
    actividadesConPendientes: number;
  };
  data: {
    actividades: Array<{
      id: string;
      titulo: string;
      horario: string;
      status: string;
      proyecto: string;
      tieneRevisiones: boolean;
    }>;
    revisionesPorActividad: Array<{
      actividadId: string;
      actividadTitulo: string;
      totalPendientes: number;
      pendientesAlta: number;
      tiempoTotal: number;
      pendientes: Array<{
        id: string;
        nombre: string;
        terminada: boolean;
        confirmada: boolean;
        duracionMin: number;
        fechaCreacion: string;
        fechaFinTerminada: string | null;
        prioridad: string;
      }>;
    }>;
  };
}

// ========== MÁQUINA DE ESTADOS MEJORADA ==========
type VoiceModeStep =
  | "idle"
  | "confirm-start"
  | "task-presentation"
  | "waiting-for-explanation"
  | "listening-explanation"
  | "processing-explanation"
  | "confirmation"
  | "summary"
  | "sending";

interface TaskExplanation {
  taskId: string;
  taskName: string;
  explanation: string;
  confirmed: boolean;
  priority: string;
  duration: number;
  timestamp: Date;
}

// ========== Hook de síntesis de voz FEMENINA (default) ==========
const useVoiceSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string, rate = 0.9, pitch = 1.15) => {
    if (!("speechSynthesis" in window)) {
      console.warn("Tu navegador no soporta síntesis de voz");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-MX";
    utterance.rate = rate;   // Velocidad natural
    utterance.pitch = pitch; // Más juvenil/femenino
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    // 1️⃣ PRIORIDAD ABSOLUTA: Microsoft Sabina (MX)
    let selectedVoice =
      voices.find(v => v.name.includes("Microsoft Sabina")) ||

      // 2️⃣ Google español femenino
      voices.find(v =>
        v.name.includes("Google español") &&
        !v.name.toLowerCase().includes("male")
      ) ||

      // 3️⃣ Cualquier voz en español
      voices.find(v => v.lang.startsWith("es"));

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log(" Voz seleccionada:", selectedVoice.name);
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
};


const getDisplayName = (colaborador: Colaborador) => {
  if (colaborador.firstName || colaborador.lastName) {
    return `${colaborador.firstName || ""} ${colaborador.lastName || ""}`.trim();
  }
  return colaborador.email.split("@")[0];
};

export function ChatBot({ colaborador, onLogout }: ChatBotProps) {
  const [step, setStep] = useState<ChatStep>("welcome");
  const [userInput, setUserInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isTyping, setIsTyping] = useState(false);
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [isInPiPWindow, setIsInPiPWindow] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [assistantAnalysis, setAssistantAnalysis] = useState<AssistantAnalysis | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const welcomeSentRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const recognitionRef = useRef<any>(null);

  // ========== NUEVO: Estados para Modo Voz Mejorado ==========
  const [voiceMode, setVoiceMode] = useState<boolean>(false);
  const [voiceStep, setVoiceStep] = useState<VoiceModeStep>("idle");
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const [taskExplanations, setTaskExplanations] = useState<TaskExplanation[]>([]);
  const [voiceConfirmationText, setVoiceConfirmationText] = useState<string>("");
  const [showVoiceSummary, setShowVoiceSummary] = useState<boolean>(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [pendingRetry, setPendingRetry] = useState<boolean>(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<boolean>(false);
  const [expectedInputType, setExpectedInputType] = useState<"explanation" | "confirmation" | "none">("none");

  const displayName = getDisplayName(colaborador);
  const router = useRouter();
  const { speak: speakText, stop: stopVoice, isSpeaking } = useVoiceSynthesis();

  // ========== NUEVO: Filtrado y ordenamiento de tareas ==========
  const { uniqueTasks, sortedTasks } = useMemo(() => {
    if (!assistantAnalysis?.data?.revisionesPorActividad?.[0]?.pendientes) {
      return { uniqueTasks: [], sortedTasks: [] };
    }

    const allTasks = assistantAnalysis.data.revisionesPorActividad[0].pendientes;

    const taskMap = new Map();
    allTasks.forEach(task => {
      if (!taskMap.has(task.id)) {
        taskMap.set(task.id, task);
      }
    });

    const uniqueTasks = Array.from(taskMap.values());

    const priorityOrder = { ALTA: 0, MEDIA: 1, BAJA: 2 };
    const sortedTasks = [...uniqueTasks].sort((a, b) => {
      const priorityDiff = priorityOrder[a.prioridad] - priorityOrder[b.prioridad];
      if (priorityDiff !== 0) return priorityDiff;

      return b.duracionMin - a.duracionMin;
    });

    return { uniqueTasks, sortedTasks };
  }, [assistantAnalysis]);

  // ========== NUEVO: MÁQUINA DE ESTADOS MEJORADA ==========
  const startVoiceMode = () => {
    console.log("Iniciando modo voz");
    setVoiceMode(true);
    setVoiceStep("confirm-start");
    setExpectedInputType("none");
    speakText("explica tus tareas usando el modo guiado por voz.");
  };

  const cancelVoiceMode = () => {
    console.log("Cancelando modo voz");
    stopVoice();
    stopRecording();
    setVoiceMode(false);
    setVoiceStep("idle");
    setCurrentTaskIndex(0);
    setTaskExplanations([]);
    setRetryCount(0);
    setPendingRetry(false);
    setPendingConfirmation(false);
    setExpectedInputType("none");
  };

  const confirmStartVoiceMode = () => {
    console.log("Confirmando inicio modo voz");
    setVoiceStep("task-presentation");
    setExpectedInputType("none");

    // IMPORTANTE: Iniciar con índice 0 explícitamente
    setTimeout(() => {
      speakTaskByIndex(0); // Usar la nueva función
    }, 300);
  };

  // ========== FUNCIÓN CORREGIDA: speakTaskByIndex ==========
  const speakTaskByIndex = useCallback((taskIndex: number) => {
    console.log("========== speakTaskByIndex ==========");
    console.log("Índice recibido:", taskIndex);
    console.log("Total tareas:", sortedTasks?.length);
    console.log("voiceStep actual:", voiceStep);

    // Verificar que tenemos tareas
    if (!sortedTasks || sortedTasks.length === 0) {
      console.error("ERROR: No hay tareas para hablar");
      return;
    }

    // Verificar que el índice es válido
    if (taskIndex < 0 || taskIndex >= sortedTasks.length) {
      console.log("Índice fuera de rango, mostrando resumen");
      setVoiceStep("summary");
      setExpectedInputType("confirmation");

      setTimeout(() => {
        speakText("¡Perfecto! Has explicado todas tus tareas. Aquí tienes un resumen de lo que comentaste. ¿Quieres enviar este reporte?");
      }, 500);
      return;
    }

    // Asegurarnos de que la tarea existe
    const task = sortedTasks[taskIndex];
    if (!task) {
      console.error(`ERROR: No se encontró la tarea en índice ${taskIndex}`);
      return;
    }

    const diasPendiente = Math.floor(
      (new Date().getTime() - new Date(task.fechaCreacion).getTime()) / (1000 * 60 * 60 * 24)
    );

    const taskText = `Tarea ${taskIndex + 1} de ${sortedTasks.length}: ${task.nombre}. 
                    Prioridad ${task.prioridad}, ${task.duracionMin} minutos, 
                    ${diasPendiente} días pendiente. 
                    ¿Cómo planeas resolver esta tarea?`;

    console.log("Texto a hablar:", taskText);

    // Primero actualizar el paso visual
    setVoiceStep("task-presentation");
    setExpectedInputType("none");

    // Esperar un momento para que la UI se actualice antes de hablar
    setTimeout(() => {
      speakText(taskText);

      // Calcular el tiempo de habla más preciso
      const estimatedSpeechTime = taskText.length * 50 + 1000;

      // Después de terminar de hablar, cambiar al estado de espera
      setTimeout(() => {
        console.log("Habla completada, cambiando a waiting-for-explanation");
        setVoiceStep("waiting-for-explanation");
        setExpectedInputType("explanation");
      }, estimatedSpeechTime);
    }, 100);
  }, [sortedTasks, speakText]);

  // ========== speakNextTask corregida para usar índice ==========
  const speakNextTask = useCallback(() => {
    console.log("========== speakNextTask ==========");
    console.log("currentTaskIndex:", currentTaskIndex);

    // Usar speakTaskByIndex con el índice actual
    speakTaskByIndex(currentTaskIndex);
  }, [currentTaskIndex, speakTaskByIndex]);

  const startTaskExplanation = () => {
    console.log("========== INICIANDO startTaskExplanation ==========");
    console.log("Estado actual al iniciar:");
    console.log("   • voiceStep:", voiceStep);
    console.log("   • isSpeaking:", isSpeaking);
    console.log("   • voiceMode:", voiceMode);
    console.log("   • expectedInputType:", expectedInputType);
    console.log("   • currentTaskIndex:", currentTaskIndex);

    // Permitir desde más estados
    const allowedStates = ["waiting-for-explanation", "confirmation", "task-presentation"];

    if (!allowedStates.includes(voiceStep)) {
      console.log("ERROR: Estado no permitido para explicar.");
      console.log("Estado actual:", voiceStep);
      console.log("Estados permitidos:", allowedStates);
      return;
    }

    console.log("OK: Estado correcto, iniciando explicación...");
    // Detener cualquier síntesis en curso
    stopVoice();

    // Detener grabación global si está activa
    if (isRecording) {
      console.log("Deteniendo grabación global activa");
      stopRecording();
    }

    // Cambiar al estado de escucha
    setVoiceStep("listening-explanation");
    setExpectedInputType("explanation");
    setVoiceTranscript("");

    console.log("Estado actualizado: voiceStep = 'listening-explanation'");
    console.log("Estado actualizado: expectedInputType = 'explanation'");

    // Pequeño delay para asegurar que React ha actualizado el estado
    setTimeout(() => {
      console.log("Iniciando grabación para explicación...");
      startRecordingForExplanation();
    }, 100);
  };

  const startRecordingForExplanation = () => {
    console.log("Iniciando grabación específica para explicación...");

    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      console.error("ERROR: Navegador no soporta reconocimiento de voz");
      speakText("Tu navegador no soporta reconocimiento de voz. Por favor, usa el teclado.");
      setTimeout(() => {
        setVoiceStep("waiting-for-explanation");
      }, 1000);
      return;
    }

    setIsRecording(true);
    setIsListening(true);
    setVoiceTranscript("");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log("OK: Reconocimiento de voz iniciado para explicación");
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      console.log("Transcripción recibida:", transcript);
      setVoiceTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("ERROR en reconocimiento de voz:", event.error);
      setIsListening(false);
      setIsRecording(false);

      if (event.error === "no-speech") {
        console.log("No se detectó voz");
        speakText("No escuché tu explicación. Por favor, intenta de nuevo.");
      } else {
        console.log("Error de micrófono");
        speakText("Hubo un error con el micrófono. Por favor, intenta de nuevo.");
      }

      setTimeout(() => {
        setVoiceStep("waiting-for-explanation");
      }, 1000);
    };

    recognition.onend = () => {
      console.log("Reconocimiento de voz finalizado");
      console.log("Transcripción final:", voiceTranscript);
      setIsListening(false);
      setIsRecording(false);

      // IMPORTANTE: NO procesar automáticamente aquí
      // Solo cambiar el estado si no hay transcripción
      if (!voiceTranscript.trim()) {
        console.log("No hay transcripción, volviendo a estado anterior");
        setTimeout(() => {
          setVoiceStep("waiting-for-explanation");
        }, 500);
      }
      // Si hay transcripción, mantenerla en pantalla para que el usuario confirme
    };

    console.log("Iniciando reconocimiento de voz...");
    recognition.start();

    // NO detener automáticamente después de tiempo
    // Dejar que el usuario hable el tiempo que necesite
  };

  const processVoiceExplanation = (transcript: string) => {
    const trimmedTranscript = transcript.trim();
    console.log("Procesando explicación de voz:", trimmedTranscript);
    console.log("Longitud del texto:", trimmedTranscript.length);

    // **MEJORA**: Filtrar comandos comunes que puedan aparecer en explicaciones
    const cleanedTranscript = trimmedTranscript
      .replace(/\b(terminar|listo|fin|confirmar|sí|si|no)\b/gi, '')
      .trim();

    if (!cleanedTranscript || cleanedTranscript.length < 10) {
      console.log("Transcripción muy corta o solo contiene comandos, volviendo a esperar explicación");

      // Verificar si realmente era un comando "terminar"
      if (isClearCommand(trimmedTranscript.toLowerCase(), ["terminar", "listo", "fin"])) {
        // Si realmente era un comando, procesarlo
        console.log("Es realmente un comando TERMINAR, procesando explicación");
        // Continuar con la explicación actual
      } else {
        speakText("La explicación es muy corta. Por favor, da más detalles sobre cómo resolverás esta tarea.");
        setTimeout(() => {
          setVoiceStep("waiting-for-explanation");
          setExpectedInputType("explanation");
        }, 1000);
        return;
      }
    }

    const task = sortedTasks[currentTaskIndex];

    // Eliminar explicación anterior si existe
    const updatedExplanations = taskExplanations.filter(exp => exp.taskId !== task.id);

    // **IMPORTANTE**: Guardar el transcript original, no el limpiado
    const explanation: TaskExplanation = {
      taskId: task.id,
      taskName: task.nombre,
      explanation: trimmedTranscript, // Usar el transcript original
      confirmed: false,
      priority: task.prioridad,
      duration: task.duracionMin,
      timestamp: new Date()
    };

    console.log("Explicación guardada (sin confirmar):", explanation);

    setTaskExplanations([...updatedExplanations, explanation]);
    setVoiceConfirmationText(trimmedTranscript);

    // Cambiar directamente a confirmación
    setVoiceStep("confirmation");
    setExpectedInputType("confirmation");

    // **MEJORA**: Crear un resumen más corto para la confirmación
    const maxLength = 80;
    const confirmationText = trimmedTranscript.length > maxLength
      ? `Tu explicación: "${trimmedTranscript.substring(0, maxLength)}..."`
      : `Tu explicación: "${trimmedTranscript}"`;

    const fullConfirmation = `${confirmationText}. ¿Confirmas que esta es tu estrategia?`;

    console.log("Preguntando confirmación");
    speakText(fullConfirmation);
  };
  const confirmExplanation = () => {
    console.log("========== CONFIRMANDO EXPLICACIÓN ==========");
    console.log("Estado actual: voiceStep =", voiceStep, "expectedInputType =", expectedInputType);

    // Solo permitir si estamos en estado de confirmación
    if (voiceStep !== "confirmation" || expectedInputType !== "confirmation") {
      console.log("ERROR: No se puede confirmar en este estado");
      return;
    }

    const task = sortedTasks[currentTaskIndex];
    console.log("Confirmando tarea:", task.nombre);

    // Marcar la explicación como confirmada
    setTaskExplanations(prev =>
      prev.map(exp =>
        exp.taskId === task.id ? { ...exp, confirmed: true } : exp
      )
    );

    // Avanzar a la siguiente tarea
    const nextIndex = currentTaskIndex + 1;
    console.log("Nuevo índice de tarea:", nextIndex);

    // IMPORTANTE: Actualizar el índice primero
    setCurrentTaskIndex(nextIndex);
    setRetryCount(0);
    setPendingConfirmation(false);

    // Primero verificar si ya completamos todas las tareas
    if (nextIndex >= sortedTasks.length) {
      console.log("Todas las tareas completadas, mostrando resumen");
      setVoiceStep("summary");
      setExpectedInputType("confirmation");

      setTimeout(() => {
        speakText("¡Perfecto! Has explicado todas tus tareas. Aquí tienes un resumen de lo que comentaste. ¿Quieres enviar este reporte ?");
      }, 500);
    } else {
      // Si hay más tareas, mostrar la siguiente
      console.log("Pasando a la siguiente tarea...");
      setVoiceStep("task-presentation");
      setExpectedInputType("none");

      // IMPORTANTE: Usar speakTaskByIndex con el nuevo índice
      setTimeout(() => {
        speakTaskByIndex(nextIndex); // ← CORRECCIÓN: Usar nextIndex explícitamente
      }, 1000);
    }
  };

  const retryExplanation = () => {
    console.log("========== REINTENTANDO EXPLICACIÓN ==========");
    console.log("Estado actual: voiceStep =", voiceStep, "expectedInputType =", expectedInputType);

    // Solo permitir si estamos en estado de confirmación
    if (voiceStep !== "confirmation" || expectedInputType !== "confirmation") {
      console.log("ERROR: No se puede reintentar en este estado");
      return;
    }

    const task = sortedTasks[currentTaskIndex];

    // Eliminar la explicación actual
    setTaskExplanations(prev => prev.filter(exp => exp.taskId !== task.id));
    setRetryCount(prev => prev + 1);

    console.log("Reintento número:", retryCount + 1);

    // Detener cualquier síntesis en curso
    stopVoice();

    // Cambiar a estado de espera para nueva explicación
    setTimeout(() => {
      speakText("Por favor, explica nuevamente cómo resolverás esta tarea.");
      setTimeout(() => {
        setVoiceStep("waiting-for-explanation");
        setExpectedInputType("explanation");
      }, 1000);
    }, 300);
  };

  const skipTask = () => {
    console.log("========== SALTANDO TAREA ==========");
    console.log("Estado actual: voiceStep =", voiceStep);

    // Solo permitir en estados apropiados
    if (!["task-presentation", "waiting-for-explanation", "confirmation"].includes(voiceStep)) {
      console.log("ERROR: No se puede saltar en este estado");
      return;
    }

    const task = sortedTasks[currentTaskIndex];
    console.log("Saltando tarea:", task.nombre);

    const explanation: TaskExplanation = {
      taskId: task.id,
      taskName: task.nombre,
      explanation: "[Tarea saltada]",
      confirmed: true,
      priority: task.prioridad,
      duration: task.duracionMin,
      timestamp: new Date()
    };

    const updatedExplanations = taskExplanations.filter(exp => exp.taskId !== task.id);
    setTaskExplanations([...updatedExplanations, explanation]);

    const nextIndex = currentTaskIndex + 1;
    setCurrentTaskIndex(nextIndex);
    setRetryCount(0);
    setPendingConfirmation(false);

    // Verificar si ya completamos todas las tareas
    if (nextIndex >= sortedTasks.length) {
      console.log("Todas las tareas completadas, mostrando resumen");
      setVoiceStep("summary");
      setExpectedInputType("confirmation");

      setTimeout(() => {
        speakText("¡Perfecto! Has explicado todas tus tareas. Aquí tienes un resumen de lo que comentaste. ¿Quieres enviar este reporte?");
      }, 500);
    } else {
      setVoiceStep("task-presentation");
      setExpectedInputType("none");

      setTimeout(() => {
        speakTaskByIndex(nextIndex); // ← CORRECCIÓN: Usar nextIndex explícitamente
      }, 500);
    }
  };

  const processVoiceCommand = (transcript: string) => {
    if (!transcript.trim()) return;

    const lowerTranscript = transcript.toLowerCase().trim();
    console.log("Procesando comando de voz:", lowerTranscript);
    console.log("Estado actual - voiceMode:", voiceMode, "voiceStep:", voiceStep, "expectedInputType:", expectedInputType);

    // ========== PRIMERO: Procesar comandos del modo voz guiado ==========
    if (voiceMode) {
      console.log("Modo voz guiado ACTIVO - procesando comando específico");

      // Procesar según el estado actual y tipo de entrada esperado
      switch (expectedInputType) {
        case "confirmation":
          console.log("Estado: confirmation - voiceStep:", voiceStep);
          if (voiceStep === "confirmation" || voiceStep === "summary") {
            // Comandos de confirmación para explicaciones de tareas
            if (lowerTranscript.includes("sí") ||
              lowerTranscript.includes("si ") ||
              lowerTranscript.includes("confirm") ||
              lowerTranscript.includes("correcto") ||
              lowerTranscript.includes("vale") ||
              lowerTranscript.includes("ok") ||
              lowerTranscript.includes("de acuerdo")) {

              console.log("Comando de CONFIRMACION detectado");

              if (voiceStep === "confirmation") {
                console.log("Confirmando explicación actual");
                confirmExplanation();
              } else if (voiceStep === "summary") {
                console.log("Enviando explicaciones al backend");
                sendExplanationsToBackend();
              }
              return true;
            }

            // Comandos para corregir
            if (lowerTranscript.includes("no") ||
              lowerTranscript.includes("corregir") ||
              lowerTranscript.includes("cambiar") ||
              lowerTranscript.includes("otra vez")) {

              console.log("Comando de CORRECCION detectado");

              if (voiceStep === "confirmation") {
                console.log("Reintentando explicación");
                retryExplanation();
              }
              return true;
            }
          }
          break;

        case "explanation":
          console.log("Estado: explanation - voiceStep:", voiceStep);
          // **MODIFICACIÓN IMPORTANTE**: Sólo procesar "terminar" cuando sea un comando claro y aislado
          if (voiceStep === "listening-explanation") {
            // Verificar si es realmente un comando "terminar" y no parte de una frase
            if (isClearCommand(lowerTranscript, ["terminar", "listo", "fin"])) {
              console.log("Comando TERMINAR explicación detectado");
              if (voiceTranscript.trim()) {
                processVoiceExplanation(voiceTranscript);
                return true;
              }
            }
          }
          break;

        case "none":
          console.log("No se espera input específico");
          break;
      }

      // Comandos globales que funcionan en cualquier estado del modo voz
      if (isClearCommand(lowerTranscript, ["saltar", "skip"])) {
        console.log("Comando SALTAR tarea detectado");
        skipTask();
        return true;
      }

      if (isClearCommand(lowerTranscript, ["cancelar", "salir"])) {
        console.log("Comando CANCELAR modo voz detectado");
        cancelVoiceMode();
        return true;
      }

      // Comando especial para empezar a explicar
      if ((voiceStep === "waiting-for-explanation" || voiceStep === "confirmation") &&
        isClearCommand(lowerTranscript, ["explicar", "empezar", "comenzar"])) {
        console.log("Comando INICIAR explicación detectado");
        startTaskExplanation();
        return true;
      }

      console.log("Comando no reconocido en modo voz guiado");
    } else {
      console.log("Modo voz guiado INACTIVO - procesando comandos globales");
    }

    console.log("Comando no procesado");
    return false;
  };

  // ========== NUEVA FUNCIÓN: Detectar comandos claros ==========
  const isClearCommand = (transcript: string, commands: string[]) => {
    const lowerTranscript = transcript.toLowerCase().trim();

    // Si el transcript es largo, probablemente no es un comando aislado
    if (lowerTranscript.length > 30) return false;

    // Verificar si el transcript coincide exactamente con algún comando
    const isExactMatch = commands.some(cmd =>
      lowerTranscript === cmd ||
      lowerTranscript === ` ${cmd}` ||
      lowerTranscript === `${cmd} ` ||
      lowerTranscript === ` ${cmd} ` ||
      // Verificar con puntuación común
      lowerTranscript === `${cmd}.` ||
      lowerTranscript === `${cmd},` ||
      lowerTranscript === `${cmd}!`
    );

    if (isExactMatch) return true;

    // Verificar si termina con un comando (última palabra)
    const words = lowerTranscript.split(/\s+/);
    const lastWord = words[words.length - 1];

    return commands.some(cmd =>
      // Comparar con la última palabra exacta
      lastWord === cmd ||
      // También considerar si termina con puntuación
      lastWord === `${cmd}.` ||
      lastWord === `${cmd},` ||
      lastWord === `${cmd}!`
    );
  };
  const sendExplanationsToBackend = async () => {
    console.log("========== ENVIANDO EXPLICACIONES AL BACKEND ==========");

    if (!assistantAnalysis) {
      console.log("ERROR: No hay análisis de asistente");
      return;
    }

    try {
      setVoiceStep("sending");
      setExpectedInputType("none");
      speakText("Enviando tu reporte...");

      const payload = {
        sessionId: assistantAnalysis.sessionId,
        userId: colaborador.email,
        projectId: assistantAnalysis.proyectoPrincipal,
        explanations: taskExplanations
          .filter(exp => exp.explanation !== "[Tarea saltada]")
          .map(exp => ({
            taskId: exp.taskId,
            taskName: exp.taskName,
            explanation: exp.explanation,
            priority: exp.priority,
            duration: exp.duration,
            recordedAt: exp.timestamp.toISOString(),
            confirmed: exp.confirmed
          }))
      };

      console.log("Payload a enviar:", payload);

      await new Promise(resolve => setTimeout(resolve, 1500));

      speakText("¡Correcto! Tu reporte ha sido enviado. Gracias, puedes comenzar tu día.");

      setTimeout(() => {
        setVoiceStep("idle");
        setVoiceMode(false);
        setShowVoiceSummary(false);
        setExpectedInputType("none");

        addMessage(
          "bot",
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <span className="font-medium">Actividades guardadas</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  Has explicado {taskExplanations.filter(exp => exp.explanation !== "[Tarea saltada]").length} tareas.
                  El reporte ha sido enviado a tu equipo.
                </p>
              </div>
            </div>
          </div>
        );
      }, 1000);

    } catch (error) {
      console.error("Error al enviar explicaciones:", error);
      speakText("Hubo un error al enviar tu reporte. Puedes intentar nuevamente.");
      setVoiceStep("summary");
      setExpectedInputType("confirmation");
    }
  };

  // ========== NUEVO: Efecto para manejar comandos de voz MEJORADO ==========
  useEffect(() => {
    if (!voiceTranscript) {
      return;
    }

    console.log("========================================");
    console.log("EFECTO: Procesando voiceTranscript:", voiceTranscript);
    console.log("voiceMode activo?:", voiceMode);
    console.log("voiceStep actual:", voiceStep);

    if (!voiceMode) {
      return;
    }

    // Procesar el comando de voz en el modo guiado
    const processed = processVoiceCommand(voiceTranscript);

    if (processed) {
      console.log("Comando procesado exitosamente");
      setVoiceTranscript(""); // Limpiar transcript después de procesar
    } else {
      console.log("Comando NO fue procesado");
    }
  }, [voiceTranscript, voiceMode]);

  // ========== NUEVO: Cargar voces al iniciar ==========
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log("Voces disponibles:", voices.map(v => `${v.name} (${v.lang})`));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // ========== Efecto principal ==========
  useEffect(() => {
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
            console.log("No se pueden aplicar ciertas restricciones de ventana");
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

  const fetchAssistantAnalysis = async (showAll = false) => {
    try {
      setIsTyping(true);
      setStep("loading-analysis");

      addMessage(
        "system",
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Brain className="w-4 h-4 text-[#6841ea]" />
          {showAll ? "Obteniendo todas tus actividades..." : "Obteniendo análisis de tus actividades..."}
        </div>
      );

      const requestBody = {
        email: colaborador.email,
        showAll: showAll
      };

      const response = await fetch(
        "http://localhost:4000/api/v1/assistant/actividades-con-revisiones",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data: AssistantAnalysis = await response.json();

      if (!data.success || !data.data || data.data.actividades.length === 0) {
        setIsTyping(false);
        addMessage(
          "bot",
          <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Sin actividades</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {showAll ? "No tienes actividades registradas para hoy." : "No tienes actividades registradas en el horario de 09:30 a 16:30."}
              </p>
              {!showAll && (
                <Button size="sm" variant="outline" onClick={() => fetchAssistantAnalysis(true)} className="mt-2">
                  Ver todas las actividades del día
                </Button>
              )}
            </div>
          </div>
        );
        setStep("finished");
        return;
      }

      setAssistantAnalysis(data);
      showAssistantAnalysis(data);
    } catch (error) {
      console.error("Error al obtener análisis del asistente:", error);
      setIsTyping(false);
      addMessage(
        "system",
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="w-4 h-4" />
          Error al obtener el análisis
        </div>
      );
      addMessage(
        "bot",
        <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
          <div className="text-center py-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h4 className="font-semibold mb-1">Error de conexión</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              No se pudo obtener el análisis en este momento.
            </p>
            <div className="flex justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => fetchAssistantAnalysis(showAll)}>
                Reintentar
              </Button>
              <Button size="sm" className="bg-[#6841ea] hover:bg-[#5a36d4]" onClick={onLogout}>
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      );
      setStep("finished");
    } finally {
      setIsTyping(false);
    }
  };

  const showAssistantAnalysis = async (analysis: AssistantAnalysis) => {
    const tareas = analysis.data.revisionesPorActividad[0]?.pendientes || [];
    const hayTareas = tareas.length > 0;

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
                day: "numeric"
              })}
            </p>
          </div>
        </div>
      </div>,
      400
    );

    setTimeout(async () => {
      addMessageWithTyping(
        "bot",
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-3 h-3 text-red-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Alta</span>
              </div>
              <div className="text-xl font-bold text-red-500">{analysis.metrics.pendientesAltaPrioridad || 0}</div>
            </div>
            <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-3 h-3 text-green-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
              </div>
              <div className="text-xl font-bold">{analysis.metrics.totalPendientes || 0}</div>
            </div>
            <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3 text-yellow-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tiempo</span>
              </div>
              <div className="text-xl font-bold text-yellow-500">{analysis.metrics.tiempoEstimadoTotal || "0h 0m"}</div>
            </div>
          </div>

          {analysis.answer && (
            <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
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
        600
      );

      setTimeout(async () => {
        if (!hayTareas) {
          addMessageWithTyping(
            "bot",
            <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
              <div className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Sin tareas planificadas</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">No hay tareas con tiempo estimado para hoy.</p>
              </div>
            </div>,
            800
          );
        } else if (tareas.length <= 3) {
          addMessageWithTyping(
            "bot",
            <div className={`rounded-lg border overflow-hidden ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"}`}>
              <div className="p-3 border-b border-[#2a2a2a] bg-[#6841ea]/10">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Tareas para Hoy ({tareas.length})
                </h4>
              </div>
              <div className="p-3 space-y-2">
                {tareas.map((tarea, idx) => {
                  const diasPendiente = Math.floor(
                    (new Date().getTime() - new Date(tarea.fechaCreacion).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div key={tarea.id} className={`p-3 rounded-lg ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"} flex items-center justify-between`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                          ${tarea.prioridad === "ALTA" ? "bg-red-500/20 text-red-500" :
                            tarea.prioridad === "MEDIA" ? "bg-yellow-500/20 text-yellow-500" :
                              "bg-green-500/20 text-green-500"}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{tarea.nombre}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {tarea.duracionMin} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {diasPendiente}d
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={tarea.prioridad === "ALTA" ? "destructive" : "secondary"} className="text-xs">
                        {tarea.prioridad}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              <div className={`p-3 border-t ${theme === "dark" ? "border-[#2a2a2a] bg-[#252527]" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Total tiempo:</span>
                  <span className="font-bold">{analysis.metrics.tiempoEstimadoTotal}</span>
                </div>
              </div>
            </div>,
            800
          );
        } else {
          addMessageWithTyping(
            "bot",
            <div className={`rounded-lg border overflow-hidden ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"}`}>
              <div className="p-3 border-b border-[#2a2a2a] bg-[#6841ea]/10">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Tareas Planificadas ({tareas.length})
                  </h4>
                  <Badge variant="outline" className="text-xs">{analysis.metrics.tiempoEstimadoTotal}</Badge>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-xs">
                  <thead className={`sticky top-0 ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
                    <tr>
                      <th className="p-2 text-left font-medium">#</th>
                      <th className="p-2 text-left font-medium">Tarea</th>
                      <th className="p-2 text-left font-medium">Tiempo</th>
                      <th className="p-2 text-left font-medium">Prioridad</th>
                      <th className="p-2 text-left font-medium">Días</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tareas.map((tarea, idx) => {
                      const diasPendiente = Math.floor(
                        (new Date().getTime() - new Date(tarea.fechaCreacion).getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <tr key={tarea.id} className={`border-t ${theme === "dark" ? "border-[#2a2a2a] hover:bg-[#252527]" : "border-gray-200 hover:bg-gray-50"}`}>
                          <td className="p-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                              ${tarea.prioridad === "ALTA" ? "bg-red-500/10 text-red-500" :
                                tarea.prioridad === "MEDIA" ? "bg-yellow-500/10 text-yellow-500" :
                                  "bg-green-500/10 text-green-500"}`}>
                              {idx + 1}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="max-w-[180px]">
                              <p className="font-medium truncate">{tarea.nombre}</p>
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className="font-mono text-xs">{tarea.duracionMin}min</Badge>
                          </td>
                          <td className="p-2">
                            <Badge className={`text-xs ${tarea.prioridad === "ALTA" ? "bg-red-500 hover:bg-red-600" :
                              tarea.prioridad === "MEDIA" ? "bg-yellow-500 hover:bg-yellow-600" :
                                "bg-green-500 hover:bg-green-600"} text-white`}>
                              {tarea.prioridad}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div className={`px-2 py-1 rounded text-xs ${diasPendiente > 3 ? "bg-red-500/10 text-red-500" : "bg-gray-500/10 text-gray-500"}`}>
                              {diasPendiente}d
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={`p-3 border-t ${theme === "dark" ? "border-[#2a2a2a] bg-[#252527]" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-red-500" />
                      <span>Alta: {analysis.metrics.pendientesAltaPrioridad}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-green-500" />
                      <span>Total: {tareas.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-bold">
                    <Clock className="w-3 h-3 text-yellow-500" />
                    <span>{analysis.metrics.tiempoEstimadoTotal}</span>
                  </div>
                </div>
              </div>
            </div>,
            800
          );
        }

        setTimeout(async () => {
          await addMessageWithTyping(
            "bot",
            <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-[#1a1a1a] border border-[#2a2a2a]" : "bg-gray-50 border border-gray-200"}`}>
              <div className="space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {hayTareas
                    ? "explica tus tareas usando el modo guiado por voz"
                    : "¿Necesitas ayuda para planificar nuevas tareas?"}
                </p>
                {hayTareas && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={startVoiceMode}
                      className="bg-[#6841ea] hover:bg-[#5a36d4] flex items-center gap-2"
                    >
                      <Headphones className="w-4 h-4" />
                      Modo Voz Guiado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStep("finished")}
                    >
                      Continuar en chat
                    </Button>
                  </div>
                )}
              </div>
            </div>,
            600
          );
          setStep("finished");
        }, 1000);
      }, 800);
    }, 800);
  };

  const startRecording = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    // Detener cualquier síntesis de voz activa
    window.speechSynthesis.cancel();

    // Detener reconocimiento previo si existe
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (e) {
        console.log("Error al detener reconocimiento previo:", e);
      }
    }

    setShowVoiceOverlay(true);
    setIsRecording(true);
    setIsListening(true);
    setVoiceTranscript("");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // GUARDAR la referencia ANTES de asignar listeners
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log("✅ Reconocimiento de voz INICIADO");
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        } else {
          transcript += event.results[i][0].transcript;
        }
      }
      setVoiceTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      console.warn("⚠️ SpeechRecognition error:", event.error);

      // IGNORAR errores de "aborted" - son normales cuando detenemos manualmente
      if (event.error === "aborted") {
        console.log("🔄 Abortado intencionalmente (cambio de estado/tarea)");
        setIsListening(false);
        setIsRecording(false);
        setShowVoiceOverlay(false);
        return; // ← NO procesar como error real
      }

      if (event.error === "no-speech") {
        console.log("🔇 No se detectó voz");
      } else if (event.error === "audio-capture") {
        console.log("🎤 Error de captura de audio");
      } else if (event.error === "not-allowed") {
        console.log("🚫 Permiso de micrófono denegado");
      }

      setIsListening(false);
      setIsRecording(false);
      setShowVoiceOverlay(false);

      // Solo mostrar alerta para errores graves (no "aborted")
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.error("Error en reconocimiento de voz:", event.error);
      }
    };

    recognition.onend = () => {
      console.log("🛑 Reconocimiento de voz FINALIZADO");
      setIsListening(false);
      setIsRecording(false);
      setShowVoiceOverlay(false);
    };

    // Pequeño delay para asegurar que todo está listo
    setTimeout(() => {
      try {
        recognition.start();
        console.log("🎤 Iniciando reconocimiento...");
      } catch (error) {
        console.error("❌ Error al iniciar reconocimiento:", error);
        setIsListening(false);
        setIsRecording(false);
        setShowVoiceOverlay(false);

        // Si falla, volver a intentar una vez
        setTimeout(() => {
          try {
            recognition.start();
          } catch (retryError) {
            console.error("❌ Error en reintento:", retryError);
            alert("No se pudo acceder al micrófono. Por favor, verifica los permisos.");
          }
        }, 300);
      }
    }, 100);
  };

  const stopRecording = () => {
    console.log("========== DETENIENDO GRABACIÓN ==========");
    console.log("voiceMode:", voiceMode);
    console.log("voiceStep:", voiceStep);
    console.log("voiceTranscript:", voiceTranscript);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);
    setShowVoiceOverlay(false);

    // IMPORTANTE: Solo procesar si estamos en modo voz guiado y tenemos transcripción
    if (voiceMode && voiceStep === "listening-explanation" && voiceTranscript.trim()) {
      console.log("Procesando explicación después de detener grabación");
      processVoiceExplanation(voiceTranscript);
    } else if (voiceMode && voiceStep === "listening-explanation" && !voiceTranscript.trim()) {
      // Si no hay transcripción, volver a esperar
      console.log("No hay transcripción, volviendo a waiting-for-explanation");
      speakText("No escuché tu explicación. Por favor, intenta de nuevo.");
      setTimeout(() => {
        setVoiceStep("waiting-for-explanation");
      }, 1000);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const openPiPWindow = () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }

    const width = 400;
    const height = 600;
    const left = window.screenLeft + window.outerWidth - width;
    const top = window.screenTop;

    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      "popup=yes",
      "menubar=no",
      "toolbar=no",
      "location=no",
      "status=no",
      "resizable=yes",
      "scrollbars=no",
      "titlebar=no",
      "chrome=no",
      "dialog=yes",
      "modal=no",
      "alwaysRaised=yes",
      "z-lock=yes"
    ].join(",");

    const pipUrl = `${window.location.origin}${window.location.pathname}?pip=true&timestamp=${Date.now()}`;
    pipWindowRef.current = window.open(pipUrl, "anfeta_pip", features);

    if (pipWindowRef.current) {
      setIsPiPMode(true);
      pipWindowRef.current.addEventListener("beforeunload", () => {
        try {
          window.opener?.postMessage({ type: "CHILD_CLOSED" }, "*");
        } catch (e) {
          console.log("No se pudo notificar cierre a ventana principal");
        }
      });

      setTimeout(() => {
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          try {
            pipWindowRef.current.focus();
          } catch (e) {
            console.log("No se pudo enfocar la ventana PiP");
          }
        }
      }, 100);

      const checkWindowClosed = setInterval(() => {
        if (pipWindowRef.current?.closed) {
          clearInterval(checkWindowClosed);
          setIsPiPMode(false);
          pipWindowRef.current = null;
        }
      }, 1000);
    } else {
      alert("No se pudo abrir la ventana flotante. Por favor, permite ventanas emergentes para este sitio.");
    }
  };

  const closePiPWindow = () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }
    setIsPiPMode(false);
  };

  const addMessage = (
    type: Message["type"],
    content: string | React.ReactNode,
    voiceText?: string
  ) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      voiceText
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const addMessageWithTyping = async (
    type: Message["type"],
    content: string | React.ReactNode,
    delay = 800
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
  }, [messages, isTyping, voiceMode, voiceStep]);

  useEffect(() => {
    if (inputRef.current && step !== "loading-analysis" && !voiceMode) {
      inputRef.current.focus();
    }
  }, [step, voiceMode]);

  useEffect(() => {
    if (welcomeSentRef.current) return;
    welcomeSentRef.current = true;

    const init = async () => {
      const user = await validateSession();
      if (!user) {
        router.replace("/");
        return;
      }

      setTimeout(() => {
        addMessageWithTyping("bot", `¡Hola ${displayName}! 👋 Soy tu asistente.`, 500);
        setTimeout(() => {
          addMessage(
            "system",
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Mail className="w-4 h-4 text-[#6841ea]" />
              Buscando tus actividades para el día de hoy...
            </div>
          );
          fetchAssistantAnalysis(false);
        }, 1500);
      }, 500);
    };

    init();
  }, [router, displayName]);

  const handleUserInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const input = userInput.trim();
    setUserInput("");
    addMessage("user", input);

    if (step === "finished") {
      addMessage(
        "bot",
        <div className="text-gray-700 dark:text-gray-300">
          He recibido tu comentario. ¿Te gustaría cerrar sesión o tienes alguna pregunta sobre el análisis?
        </div>
      );
    }
  };

  const canUserType = step !== "loading-analysis" && !voiceMode;

  const handleVoiceMessageClick = (voiceText: string) => {
    setUserInput(voiceText);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // ========== Componente VoiceGuidanceFlow Mejorado ==========
  const VoiceGuidanceFlow = () => {
    if (!voiceMode) return null;

    const currentTask = sortedTasks[currentTaskIndex];
    const totalTasks = sortedTasks.length;
    const progressPercentage = totalTasks > 0 ? (currentTaskIndex / totalTasks) * 100 : 0;

    // Obtener la ÚLTIMA explicación para la tarea actual usando useMemo
    const currentExplanation = useMemo(() => {
      if (!currentTask?.id) return null;

      // Filtrar todas las explicaciones para esta tarea
      const explanationsForTask = taskExplanations.filter(exp => exp.taskId === currentTask.id);

      // Si no hay explicaciones, retornar null
      if (explanationsForTask.length === 0) return null;

      // Tomar la última explicación (la más reciente)
      const lastExplanation = explanationsForTask[explanationsForTask.length - 1];

      // Retornar null si la tarea fue saltada, de lo contrario retornar la explicación
      return lastExplanation.explanation === "[Tarea saltada]" ? null : lastExplanation;
    }, [currentTask?.id, taskExplanations]);

    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme === "dark" ? "bg-black/80" : "bg-white/95"}`}>
        <div className={`max-w-2xl w-full mx-4 rounded-xl overflow-hidden shadow-2xl ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}>
          {/* Header */}
          <div className={`p-4 border-b ${theme === "dark" ? "border-[#2a2a2a] bg-[#252527]" : "border-gray-200 bg-gray-50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${theme === "dark" ? "bg-[#6841ea]/20" : "bg-[#6841ea]/10"}`}>
                  <Headphones className="w-5 h-5 text-[#6841ea]" />
                </div>
                <div>
                  <h3 className="font-bold">Modo Voz Guiado</h3>
                  <p className="text-xs text-gray-500">
                    {isSpeaking ? "Asistente hablando..." :
                      voiceStep === "confirm-start" ? "Confirmar inicio" :
                        voiceStep === "task-presentation" ? `Tareas ${currentTaskIndex + 1} de ${totalTasks}` :
                          voiceStep === "waiting-for-explanation" ? "Esperando explicación" :
                            voiceStep === "listening-explanation" ? "Escuchando tu explicación" :
                              voiceStep === "processing-explanation" ? "Procesando explicación" :
                                voiceStep === "confirmation" ? "Confirmar explicación" :
                                  voiceStep === "summary" ? "Resumen final" :
                                    voiceStep === "sending" ? "Enviando..." : "Listo"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSpeaking && (
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-[#6841ea] rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
                    <div className="w-1 h-6 bg-[#6841ea] rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
                    <div className="w-1 h-5 bg-[#6841ea] rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
                    <div className="w-1 h-7 bg-[#6841ea] rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={cancelVoiceMode}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            {totalTasks > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Tarea {currentTaskIndex + 1} de {totalTasks}</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className={`h-1 rounded-full ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-200"}`}>
                  <div
                    className="h-full bg-[#6841ea] rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {voiceStep === "confirm-start" && (
              <div className="text-center space-y-4">
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${theme === "dark" ? "bg-[#6841ea]/20" : "bg-[#6841ea]/10"}`}>
                  <Headphones className="w-8 h-8 text-[#6841ea]" />
                </div>
                <h4 className="text-lg font-bold">Modo voz guiado</h4>
                <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  Te acompañaré tarea por tarea para que expliques tu plan de acción.
                </p>
                <div className="flex gap-3 justify-center pt-4">
                  <Button
                    onClick={confirmStartVoiceMode}
                    className="bg-[#6841ea] hover:bg-[#5a36d4] px-6"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Empezar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelVoiceMode}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {(voiceStep === "task-presentation" || voiceStep === "waiting-for-explanation") && currentTask && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${currentTask.prioridad === "ALTA" ? "bg-red-500/20 text-red-500" :
                            currentTask.prioridad === "MEDIA" ? "bg-yellow-500/20 text-yellow-500" :
                              "bg-green-500/20 text-green-500"}`}>
                          {currentTaskIndex + 1}
                        </div>
                        <h4 className="font-bold">{currentTask.nombre}</h4>
                      </div>
                      <div className="flex gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {currentTask.prioridad}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {currentTask.duracionMin} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {Math.floor((new Date().getTime() - new Date(currentTask.fechaCreacion).getTime()) / (1000 * 60 * 60 * 24))} días
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={currentTask.prioridad === "ALTA" ? "destructive" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {currentTask.prioridad}
                    </Badge>
                  </div>

                  {/* Mostrar la última explicación si existe y no es "[Tarea saltada]" */}
                  {currentExplanation && (
                    <div className={`mt-3 p-3 rounded ${theme === "dark" ? "bg-green-900/20 border border-green-500/20" : "bg-green-50 border border-green-200"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Explicación guardada</span>
                      </div>
                      <p className="text-sm opacity-75">{currentExplanation.explanation}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      console.log("BOTON CLICKEADO - Estado actual:", voiceStep);
                      console.log("isSpeaking:", isSpeaking);
                      console.log("currentTaskIndex:", currentTaskIndex);
                      console.log("Total tareas:", sortedTasks.length);
                      startTaskExplanation();
                    }}
                    className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4] h-12"
                    disabled={isSpeaking || voiceStep === "listening-explanation"}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    {/* Mostrar "Corregir explicación" si ya existe una, "Explicar esta tarea" si no */}
                    {currentExplanation ? "Corregir explicación" : "Explicar esta tarea"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={skipTask}
                    className="h-12"
                    disabled={isSpeaking || voiceStep === "listening-explanation"}
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                {voiceStep === "waiting-for-explanation" && (
                  <div className="text-center text-sm text-gray-500">
                    Presiona el botón para empezar a explicar, o di "saltar" para omitir esta tarea
                  </div>
                )}
              </div>
            )}

            {voiceStep === "listening-explanation" && (
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full mx-auto bg-red-500/20 flex items-center justify-center animate-pulse">
                    <Mic className="w-10 h-10 text-red-500" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="absolute w-24 h-24 rounded-full border-2 border-red-500 animate-ping"
                        style={{ animationDelay: `${i * 0.2}s`, opacity: 0.5 - (i * 0.1) }}
                      />
                    ))}
                  </div>
                </div>
                <h4 className="text-lg font-bold">Escuchando...</h4>
                <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  {retryCount > 0 ? "Corrige tu explicación, por favor." : "Por favor, explica cómo resolverás esta tarea."}
                </p>
                {voiceTranscript && (
                  <div className={`p-3 rounded ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}>
                    <p className="text-sm mb-2">{voiceTranscript}</p>
                    <p className="text-xs text-gray-500">Cuando termines de hablar, haz clic en "Terminar y Confirmar"</p>
                  </div>
                )}
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={stopRecording}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Terminar y Confirmar
                  </Button>
                  <Button
                    onClick={() => {
                      // Cancelar grabación sin procesar
                      if (recognitionRef.current) {
                        recognitionRef.current.stop();
                      }
                      setIsRecording(false);
                      setIsListening(false);
                      setVoiceStep("waiting-for-explanation");
                    }}
                    variant="outline"
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {voiceStep === "confirmation" && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-blue-900/20 border border-blue-500/20" : "bg-blue-50 border border-blue-200"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Tu explicación</span>
                  </div>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    {voiceConfirmationText}
                  </p>
                </div>
                <p className={`text-sm text-center ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  ¿Estás de acuerdo con esta estrategia?
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={confirmExplanation}
                    className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4]"
                    disabled={isSpeaking}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Sí, confirmar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={retryExplanation}
                    className="flex-1"
                    disabled={isSpeaking}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    No, corregir
                  </Button>
                </div>
              </div>
            )}

            {voiceStep === "summary" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${theme === "dark" ? "bg-green-900/20" : "bg-green-100"}`}>
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h4 className="text-lg font-bold mt-3">¡Todas las tareas explicadas!</h4>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"} mt-1`}>
                    Has completado {taskExplanations.filter(exp => exp.explanation !== "[Tarea saltada]").length} de {totalTasks} tareas.
                  </p>
                </div>

                <div className={`max-h-60 overflow-y-auto rounded-lg border ${theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200"}`}>
                  {taskExplanations
                    .filter(exp => exp.explanation !== "[Tarea saltada]")
                    .map((exp, idx) => (
                      <div
                        key={exp.taskId}
                        className={`p-3 border-b ${theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200"} ${idx % 2 === 0 ? (theme === "dark" ? "bg-[#252527]" : "bg-gray-50") : ""}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Check className={`w-3 h-3 ${exp.confirmed ? "text-green-500" : "text-yellow-500"}`} />
                          <span className="font-medium text-sm truncate">{exp.taskName}</span>
                          <Badge variant="outline" className="text-xs">{exp.priority}</Badge>
                        </div>
                        <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                          {exp.explanation}
                        </p>
                      </div>
                    ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={sendExplanationsToBackend}
                    className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4]"
                    disabled={isSpeaking}
                  >
                    Comenzar jornada
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowVoiceSummary(false);
                      setVoiceStep("idle");
                      setVoiceMode(false);
                      setExpectedInputType("none");
                    }}
                    disabled={isSpeaking}
                  >
                    Ver más tarde
                  </Button>
                </div>
              </div>
            )}

            {voiceStep === "sending" && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-[#6841ea] animate-spin" />
                  </div>
                </div>
                <h4 className="text-lg font-bold">guardando...</h4>
                <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  Tu reporte está siendo enviado.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen font-['Arial'] flex flex-col ${theme === "dark" ? "bg-[#101010] text-white" : "bg-white text-gray-900"}`}>
      {/* Modo Voz Guiado Overlay */}
      <VoiceGuidanceFlow />

      {/* Overlay de reconocimiento de voz */}
      {showVoiceOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className={`p-8 rounded-2xl max-w-md w-full mx-4 ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}>
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${isListening ? "bg-red-500 animate-pulse" : "bg-[#6841ea]"}`}>
                {isListening ? (
                  <Volume2 className="w-10 h-10 text-white animate-pulse" />
                ) : (
                  <MicOff className="w-10 h-10 text-white" />
                )}
              </div>

              <h3 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {isListening ? "Escuchando..." : "Micrófono listo"}
              </h3>

              <div className="flex gap-3">
                <button
                  onClick={stopRecording}
                  className="flex-1 bg-[#6841ea] text-white py-3 rounded-lg font-semibold hover:bg-[#5a36d4] transition"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => {
                    stopRecording();
                    setVoiceTranscript("");
                  }}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header fijo */}
      {!isInPiPWindow && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className={`absolute top-0 left-0 right-0 h-25 bg-gradient-to-b ${theme === "dark" ? "from-[#101010]/90 via-[#101010]/90 to-transparent" : "from-white/70 via-white/40 to-transparent"}`} />
          <div className="relative max-w-4xl mx-auto">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full flex items-center justify-center animate-tilt">
                  <Image src="/icono.webp" alt="Chat" width={80} height={80} className="object-contain rounded-full drop-shadow-[0_0_16px_rgba(168,139,255,0.9)]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Asistente</h1>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    {displayName} • {colaborador.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isPiPMode ? (
                  <button onClick={openPiPWindow} className={`w-9 h-9 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a] hover:bg-[#353535]" : "bg-gray-100 hover:bg-gray-200"}`} title="Abrir en ventana flotante">
                    <PictureInPicture className="w-4 h-4 text-[#6841ea]" />
                  </button>
                ) : (
                  <button onClick={closePiPWindow} className={`w-9 h-9 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"}`} title="Cerrar ventana flotante">
                    <Minimize2 className="w-4 h-4 text-white" />
                  </button>
                )}
                <button onClick={toggleTheme} className={`w-9 h-9 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a] hover:bg-[#353535]" : "bg-gray-100 hover:bg-gray-200"}`}>
                  {theme === "light" ? <Moon className="w-4 h-4 text-gray-700" /> : <Sun className="w-4 h-4 text-gray-300" />}
                </button>
                <button onClick={() => setShowLogoutDialog(true)} className={`px-4 py-2 rounded-lg text-sm font-medium ${theme === "dark" ? "bg-[#2a2a2a] hover:bg-[#353535] text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
                  <LogOut className="w-4 h-4 mr-2 inline" />
                  Salir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Encabezado para ventana PiP */}
      {isInPiPWindow && (
        <div className={`fixed top-0 left-0 right-0 z-50 ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}>
          <div className="max-w-full mx-auto p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#252527]" : "bg-gray-100"}`}>
                  <Image src="/icono.webp" alt="Chat" width={16} height={16} className="object-contain" />
                </div>
                <h2 className="text-sm font-bold truncate">Anfeta Asistente</h2>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={toggleTheme} className={`w-7 h-7 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a] hover:bg-[#353535]" : "bg-gray-100 hover:bg-gray-200"}`} title="Cambiar tema">
                  {theme === "light" ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                </button>
                <button onClick={() => window.close()} className={`w-7 h-7 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"}`} title="Cerrar ventana">
                  <span className="text-white text-xs font-bold">✕</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className={`flex-1 overflow-y-auto ${isInPiPWindow ? "pt-16" : "pt-20"} ${!isInPiPWindow ? "pb-24" : "pb-20"}`}>
        <div className="max-w-4xl mx-auto w-full px-4">
          <div className="space-y-3 py-4" ref={scrollRef}>
            {messages.map((message) => (
              <div key={message.id} className={`flex animate-in slide-in-from-bottom-2 duration-300 ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${message.type === "bot" ? theme === "dark" ? "bg-[#2a2a2a] text-white" : "bg-gray-100 text-gray-900" : message.type === "user" ? "bg-[#6841ea] text-white" : message.type === "voice" ? `cursor-pointer hover:opacity-90 transition ${theme === "dark" ? "bg-[#252527]" : "bg-blue-50"}` : theme === "dark" ? "bg-[#2a2a2a] text-gray-300" : "bg-gray-100 text-gray-700"}`} onClick={message.type === "voice" && message.voiceText ? () => handleVoiceMessageClick(message.voiceText!) : undefined}>
                  {message.content}
                  {message.type === "voice" && Date.now() - message.timestamp.getTime() < 2000 && (
                    <div className="flex gap-1 mt-2">
                      <div className="w-1 h-1 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1 h-1 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1 h-1 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                <div className={`rounded-lg px-3 py-2 ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botón para activar modo voz si hay tareas */}
          {step === "finished" && assistantAnalysis && sortedTasks.length > 0 && !voiceMode && (
            <div className={`mt-4 rounded-lg p-4 border ${theme === "dark" ? "bg-[#1a1a1a] border-[#6841ea]/30" : "bg-white border-[#6841ea]/20"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${theme === "dark" ? "bg-[#6841ea]/20" : "bg-[#6841ea]/10"}`}>
                    <Headphones className="w-5 h-5 text-[#6841ea]" />
                  </div>
                  <div>
                    <h4 className="font-bold">¿Explicar tus tareas?</h4>
                    <p className="text-sm text-gray-500">Usa el modo guiado por voz para explicar cada tarea</p>
                  </div>
                </div>
                <Button onClick={startVoiceMode} className="bg-[#6841ea] hover:bg-[#5a36d4]">
                  <Play className="w-4 h-4 mr-2" />
                  Activar Modo Voz
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input (oculto en modo voz) */}
      {!voiceMode && (
        <div className={`fixed bottom-0 left-0 right-0 z-50 ${theme === "dark" ? "bg-[#101010]" : "bg-white"}`}>
          <div className="max-w-4xl mx-auto p-4">
            <form onSubmit={handleUserInput} className="flex gap-2 items-center">
              <Input
                ref={inputRef}
                type="text"
                placeholder={canUserType ? "Escribe tu pregunta o comentario..." : "Obteniendo análisis..."}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className={`flex-1 h-12 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-[#6841ea] ${theme === "dark" ? "bg-[#2a2a2a] text-white placeholder:text-gray-500 border-[#353535] hover:border-[#6841ea]" : "bg-gray-100 text-gray-900 placeholder:text-gray-500 border-gray-200 hover:border-[#6841ea]"}`}
              />
              <Button type="button" onClick={startRecording} className={`h-12 w-14 p-0 rounded-lg transition-all ${isRecording ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-[#6841ea] hover:bg-[#5a36d4]"}`} title={isRecording ? "Detener reconocimiento de voz" : "Iniciar reconocimiento de voz"}>
                {isRecording ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-400 rounded-full animate-ping"></div>
                    <MicOff className="w-5 h-5 text-white relative z-10" />
                  </div>
                ) : (
                  <Mic className="w-5 h-5 text-white" />
                )}
              </Button>
              <Button type="submit" disabled={!canUserType || !userInput.trim()} className="h-12 px-5 bg-[#6841ea] hover:bg-[#5a36d4] text-white rounded-lg disabled:opacity-50">
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Diálogos de confirmación */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className={`${theme === "dark" ? "bg-[#1a1a1a] text-white border-[#2a2a2a]" : "bg-white text-gray-900 border-gray-200"} border`}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#6841ea] text-xl">
              <PartyPopper className="w-6 h-6" />
              ¡Análisis completado!
            </AlertDialogTitle>
            <AlertDialogDescription className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              El análisis de tus actividades ha sido generado exitosamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={onLogout} className="bg-[#6841ea] hover:bg-[#5a36d4] text-white">
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
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}>
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

      <style jsx>{`
        @keyframes tilt {
          0%, 85%, 100% { transform: rotate(0deg); }
          88% { transform: rotate(-6deg); }
          91% { transform: rotate(6deg); }
          94% { transform: rotate(-4deg); }
          97% { transform: rotate(4deg); }
        }
        .animate-tilt {
          display: inline-flex;
          transform-origin: center;
          animation: tilt 4s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>
    </div>
  );
}