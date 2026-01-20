"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import Image from "next/image";
import { verify } from "crypto";

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
  const [assistantAnalysis, setAssistantAnalysis] =
    useState<AssistantAnalysis | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const welcomeSentRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const recognitionRef = useRef<any>(null);
  const displayName = getDisplayName(colaborador);

  const router = useRouter();

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
    };
  }, [isInPiPWindow]);

  const handleParentMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;

    if (event.data.type === "PARENT_CLOSING") {
      window.close();
    }
  };

  const handleChildMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;

    if (event.data.type === "CHILD_CLOSED") {
      console.log("Ventana PiP notificó su cierre");
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
          {showAll
            ? "Obteniendo todas tus actividades..."
            : "Obteniendo analisis de tus actividades..."}
        </div>,
      );

      const requestBody = {
        email: colaborador.email,
        showAll: showAll,
      };

      console.log("Enviando peticion a asistente:", requestBody);

      const response = await fetch(
        "http://localhost:4000/api/v1/assistant/actividades-con-revisiones",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.status}`);
      }

      const data: AssistantAnalysis = await response.json();

      console.log("Analisis recibido:", data);

      // VERIFICACION: Hay actividades?
      if (!data.success || !data.data || data.data.actividades.length === 0) {
        console.log("No hay actividades");

        setIsTyping(false);

        // Mostrar mensaje sin actividades
        addMessage(
          "bot",
          <div
            className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}
          >
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Sin actividades</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {showAll
                  ? "No tienes actividades registradas para hoy."
                  : "No tienes actividades registradas en el horario de 09:30 a 16:30."}
              </p>
              {!showAll && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchAssistantAnalysis(true)}
                  className="mt-2"
                >
                  Ver todas las actividades del dia
                </Button>
              )}
            </div>
          </div>,
        );

        setStep("finished");
        return;
      }

      // Si hay actividades, continuar con el analisis normal
      setAssistantAnalysis(data);
      showAssistantAnalysis(data);
    } catch (error) {
      console.error("Error al obtener analisis del asistente:", error);

      setIsTyping(false);

      addMessage(
        "system",
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="w-4 h-4" />
          Error al obtener el analisis
        </div>,
      );

      addMessage(
        "bot",
        <div
          className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}
        >
          <div className="text-center py-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h4 className="font-semibold mb-1">Error de conexion</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              No se pudo obtener el analisis en este momento. Puedes intentar
              nuevamente.
            </p>
            <div className="flex justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchAssistantAnalysis(showAll)}
              >
                Reintentar
              </Button>
              <Button
                size="sm"
                className="bg-[#6841ea] hover:bg-[#5a36d4]"
                onClick={onLogout}
              >
                Cerrar sesion
              </Button>
            </div>
          </div>
        </div>,
      );

      setStep("finished");
    } finally {
      setIsTyping(false);
    }
  };
  const showAssistantAnalysis = async (analysis: AssistantAnalysis) => {
    // Obtener las tareas planificadas
    const tareas = analysis.data.revisionesPorActividad[0]?.pendientes || [];
    const hayTareas = tareas.length > 0;

    // Mostrar información del usuario (más corta)
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

        {/* Encabezado del análisis - Más corto */}
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

    // Mostrar métricas principales (simplificadas)
    setTimeout(async () => {
      addMessageWithTyping(
        "bot",
        <div className="space-y-4">
          {/* Métricas principales - Solo las importantes */}
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
                {analysis.metrics.pendientesAltaPrioridad || 0}
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
                {analysis.metrics.totalPendientes || 0}
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

          {/* Respuesta CORTA del asistente */}
          {analysis.answer && (
            <div
              className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}
            >
              <div className="flex items-start gap-2">
                <Bot className="w-4 h-4 text-[#6841ea] mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {analysis.answer.split("\n\n")[0]}{" "}
                    {/* Solo primera parte */}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>,
        600,
      );

      // Mostrar las tareas según cantidad
      setTimeout(async () => {
        if (!hayTareas) {
          addMessageWithTyping(
            "bot",
            <div
              className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}
            >
              <div className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Sin tareas planificadas</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay tareas con tiempo estimado para hoy.
                </p>
              </div>
            </div>,
            800,
          );
        } else if (tareas.length <= 3) {
          // Mostrar como LISTA SIMPLE (1-3 tareas)
          addMessageWithTyping(
            "bot",
            <div
              className={`rounded-lg border overflow-hidden ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"}`}
            >
              <div className="p-3 border-b border-[#2a2a2a] bg-[#6841ea]/10">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Tareas para Hoy ({tareas.length})
                </h4>
              </div>

              <div className="p-3 space-y-2">
                {tareas.map((tarea, idx) => {
                  const diasPendiente = Math.floor(
                    (new Date().getTime() -
                      new Date(tarea.fechaCreacion).getTime()) /
                      (1000 * 60 * 60 * 24),
                  );

                  return (
                    <div
                      key={tarea.id}
                      className={`p-3 rounded-lg ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"} flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                        ${
                          tarea.prioridad === "ALTA"
                            ? "bg-red-500/20 text-red-500"
                            : tarea.prioridad === "MEDIA"
                              ? "bg-yellow-500/20 text-yellow-500"
                              : "bg-green-500/20 text-green-500"
                        }`}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {tarea.nombre}
                          </p>
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
                      <Badge
                        variant={
                          tarea.prioridad === "ALTA"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {tarea.prioridad}
                      </Badge>
                    </div>
                  );
                })}
              </div>

              {/* Resumen abajo */}
              <div
                className={`p-3 border-t ${theme === "dark" ? "border-[#2a2a2a] bg-[#252527]" : "border-gray-200 bg-gray-50"}`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Total tiempo:</span>
                  <span className="font-bold">
                    {analysis.metrics.tiempoEstimadoTotal}
                  </span>
                </div>
              </div>
            </div>,
            800,
          );
        } else {
          // Mostrar como TABLA (más de 3 tareas)
          addMessageWithTyping(
            "bot",
            <div
              className={`rounded-lg border overflow-hidden ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"}`}
            >
              <div className="p-3 border-b border-[#2a2a2a] bg-[#6841ea]/10">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Tareas Planificadas ({tareas.length})
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {analysis.metrics.tiempoEstimadoTotal}
                  </Badge>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-xs">
                  <thead
                    className={`sticky top-0 ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}
                  >
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
                        (new Date().getTime() -
                          new Date(tarea.fechaCreacion).getTime()) /
                          (1000 * 60 * 60 * 24),
                      );

                      return (
                        <tr
                          key={tarea.id}
                          className={`border-t ${theme === "dark" ? "border-[#2a2a2a] hover:bg-[#252527]" : "border-gray-200 hover:bg-gray-50"}`}
                        >
                          <td className="p-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                            ${
                              tarea.prioridad === "ALTA"
                                ? "bg-red-500/10 text-red-500"
                                : tarea.prioridad === "MEDIA"
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "bg-green-500/10 text-green-500"
                            }`}
                            >
                              {idx + 1}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="max-w-[180px]">
                              <p className="font-medium truncate">
                                {tarea.nombre}
                              </p>
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {tarea.duracionMin}min
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Badge
                              className={`text-xs ${
                                tarea.prioridad === "ALTA"
                                  ? "bg-red-500 hover:bg-red-600"
                                  : tarea.prioridad === "MEDIA"
                                    ? "bg-yellow-500 hover:bg-yellow-600"
                                    : "bg-green-500 hover:bg-green-600"
                              } text-white`}
                            >
                              {tarea.prioridad}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div
                              className={`px-2 py-1 rounded text-xs ${diasPendiente > 3 ? "bg-red-500/10 text-red-500" : "bg-gray-500/10 text-gray-500"}`}
                            >
                              {diasPendiente}d
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumen final */}
              <div
                className={`p-3 border-t ${theme === "dark" ? "border-[#2a2a2a] bg-[#252527]" : "border-gray-200 bg-gray-50"}`}
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-red-500" />
                      <span>
                        Alta: {analysis.metrics.pendientesAltaPrioridad}
                      </span>
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
            800,
          );
        }

        // Finalizar con mensaje corto
        setTimeout(async () => {
          await addMessageWithTyping(
            "bot",
            <div
              className={`p-3 rounded-lg ${theme === "dark" ? "bg-[#1a1a1a] border border-[#2a2a2a]" : "bg-gray-50 border border-gray-200"}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {hayTareas
                    ? "¿En cuál tarea te gustaría enfocarte primero?"
                    : "¿Necesitas ayuda para planificar nuevas tareas?"}
                </span>
              </div>
            </div>,
            600,
          );
          setStep("finished");
        }, 1000);
      }, 800);
    }, 800);
  };

  const startRecording = () => {
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

    setShowVoiceOverlay(true);
    setIsRecording(true);
    setIsListening(true);

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
      console.error("Error en reconocimiento de voz:", event.error);
      setIsListening(false);
      setIsRecording(false);
      setShowVoiceOverlay(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);

    setTimeout(() => {
      if (voiceTranscript.trim()) {
        const voiceMessage: Message = {
          id: `${Date.now()}-voice`,
          type: "voice",
          content: (
            <div className="flex items-start gap-2">
              <div className="bg-[#6841ea] text-white rounded-full p-1">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Voz reconocida</div>
                {/* <div className="text-sm">{voiceTranscript}</div> */}
              </div>
            </div>
          ),
          timestamp: new Date(),
          voiceText: voiceTranscript,
        };

        setMessages((prev) => [...prev, voiceMessage]);
        // setUserInput(voiceTranscript)
      }

      setShowVoiceOverlay(false);
      setVoiceTranscript("");

      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);
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
      "z-lock=yes",
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
          console.log("Ventana PiP cerrada");
        }
      }, 1000);
    } else {
      alert(
        "No se pudo abrir la ventana flotante. Por favor, permite ventanas emergentes para este sitio.",
      );
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
    voiceText?: string,
  ) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      voiceText,
    };
    setMessages((prev) => [...prev, newMessage]);
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
  }, [messages, isTyping]);

  useEffect(() => {
    if (inputRef.current && step !== "loading-analysis") {
      inputRef.current.focus();
    }
  }, [step]);

  useEffect(() => {
    if (welcomeSentRef.current) return;
    welcomeSentRef.current = true;

    const init = async () => {
      const user = await validateSession();

      if (!user) {
        router.replace("/"); // 🔁 sin sesión → home
        return;
      }

      setTimeout(() => {
        addMessageWithTyping(
          "bot",
          `¡Hola ${displayName}! 👋 Soy tu asistente.`,
          500,
        );

        setTimeout(() => {
          addMessage(
            "system",
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Mail className="w-4 h-4 text-[#6841ea]" />
              Buscando tus actividades para el día de hoy...
            </div>,
          );

          fetchAssistantAnalysis(false);
        }, 1500);
      }, 500);
    };

    init();
  }, [router]);

  const handleUserInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const input = userInput.trim();
    setUserInput("");

    addMessage("user", input);

    // En el estado "finished", el usuario puede hacer preguntas o comentarios
    if (step === "finished") {
      addMessage(
        "bot",
        <div className="text-gray-700 dark:text-gray-300">
          He recibido tu comentario. ¿Te gustaría cerrar sesión o tienes alguna
          pregunta sobre el análisis?
        </div>,
      );
    }
  };

  const canUserType = step !== "loading-analysis";

  const handleVoiceMessageClick = (voiceText: string) => {
    setUserInput(voiceText);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      className={`min-h-screen font-['Arial'] flex flex-col 
      ${theme === "dark" ? "bg-[#101010] text-white" : "bg-white text-gray-900"}`}
      style={{ height: "100vh" }}
    >
      {/* Overlay de reconocimiento de voz */}
      {showVoiceOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div
            className={`p-8 rounded-2xl max-w-md w-full mx-4 ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}
          >
            <div className="text-center">
              <div
                className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${isListening ? "bg-red-500 animate-pulse" : "bg-[#6841ea]"}`}
              >
                {isListening ? (
                  <Volume2 className="w-10 h-10 text-white animate-pulse" />
                ) : (
                  <MicOff className="w-10 h-10 text-white" />
                )}
              </div>

              <h3
                className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                {isListening ? " Escuchando..." : "Micrófono listo"}
              </h3>

              {/* <div className={`mb-6 p-4 rounded-lg min-h-20 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-100'}`}>
                {voiceTranscript ? (
                  <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {voiceTranscript}
                  </p>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </div> */}

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

      {/* Header fijo - Oculto en ventana PiP */}
      {!isInPiPWindow && (
        <div className="fixed top-0 left-0 right-0 z-50">
          {/* mejorar capas de arriba porfa que sea primero muy oscuro y abjao */}
          <div
            className={`
              pointer-events-none
              absolute top-0 left-0 right-0
              
              bg-gradient-to-b
              h-30
              ${
                theme === "dark"
                  ? "from-[#101010] via-[#101010]/90 to-transparent"
                  : "from-white/70 via-white/40 to-transparent"
              }
            `}
          />
          <div
            className={`
    pointer-events-none
    absolute
    top-0
    left-0
    right-0
    h-25
    bg-gradient-to-b
    ${
      theme === "dark"
        ? "from-[#101010]/90 via-[#101010]/90 to-transparent"
        : "from-white/70 via-white/40 to-transparent"
    }
  `}
          />

          <div className="relative max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full flex items-center justify-center animate-tilt">
                  <Image
                    src="/icono.webp"
                    alt="Chat"
                    width={80}
                    height={80}
                    className="
      object-contain
      rounded-full
      drop-shadow-[0_0_16px_rgba(168,139,255,0.9)]
    "
                  />

                  <style jsx>{`
                    @keyframes tilt {
                      /* quieto */
                      0%,
                      85%,
                      100% {
                        transform: rotate(0deg);
                      }

                      /* inclinación */
                      88% {
                        transform: rotate(-6deg);
                      }
                      91% {
                        transform: rotate(6deg);
                      }
                      94% {
                        transform: rotate(-4deg);
                      }
                      97% {
                        transform: rotate(4deg);
                      }
                    }

                    .animate-tilt {
                      display: inline-flex;
                      transform-origin: center;
                      animation: tilt 4s ease-in-out infinite;
                      will-change: transform;
                    }
                  `}</style>
                </div>

                <div>
                  <h1 className="text-lg font-bold">Asistente</h1>
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {displayName} • {colaborador.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isPiPMode ? (
                  <button
                    onClick={openPiPWindow}
                    className={`w-9 h-9 rounded-full flex items-center justify-center 
                      ${
                        theme === "dark"
                          ? "bg-[#2a2a2a] hover:bg-[#353535]"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    title="Abrir en ventana flotante (PiP)"
                  >
                    <PictureInPicture className="w-4 h-4 text-[#6841ea]" />
                  </button>
                ) : (
                  <button
                    onClick={closePiPWindow}
                    className={`w-9 h-9 rounded-full flex items-center justify-center 
                      ${
                        theme === "dark"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    title="Cerrar ventana flotante"
                  >
                    <Minimize2 className="w-4 h-4 text-white" />
                  </button>
                )}

                <button
                  onClick={toggleTheme}
                  className={`w-9 h-9 rounded-full flex items-center justify-center 
                    ${
                      theme === "dark"
                        ? "bg-[#2a2a2a] hover:bg-[#353535]"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                >
                  {theme === "light" ? (
                    <Moon className="w-4 h-4 text-gray-700" />
                  ) : (
                    <Sun className="w-4 h-4 text-gray-300" />
                  )}
                </button>

                <button
                  onClick={() => setShowLogoutDialog(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium 
                    ${
                      theme === "dark"
                        ? "bg-[#2a2a2a] hover:bg-[#353535] text-gray-300"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                >
                  <LogOut className="w-4 h-4 mr-2 inline" />
                  Salir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Encabezado minimalista para ventana PiP */}
      {isInPiPWindow && (
        <div
          className={`fixed top-0 left-0 right-0 z-50 
          ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}
        >
          <div className="max-w-full mx-auto p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center 
                    ${theme === "dark" ? "bg-[#252527]" : "bg-gray-100"}`}
                >
                  <Image
                    src="/icono.webp"
                    alt="Chat"
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                </div>

                <h2 className="text-sm font-bold truncate">Anfeta Asistente</h2>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={toggleTheme}
                  className={`w-7 h-7 rounded-full flex items-center justify-center 
                    ${
                      theme === "dark"
                        ? "bg-[#2a2a2a] hover:bg-[#353535]"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  title="Cambiar tema"
                >
                  {theme === "light" ? (
                    <Moon className="w-3 h-3" />
                  ) : (
                    <Sun className="w-3 h-3" />
                  )}
                </button>

                <button
                  onClick={() => window.close()}
                  className={`w-7 h-7 rounded-full flex items-center justify-center 
                    ${
                      theme === "dark"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                  title="Cerrar ventana"
                >
                  <span className="text-white text-xs font-bold">✕</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div
        className={`flex-1 overflow-y-auto ${isInPiPWindow ? "pt-16" : "pt-20"} ${!isInPiPWindow ? "pb-24" : "pb-20"}`}
      >
        <div className="max-w-4xl mx-auto w-full px-4">
          {/* Contenedor de mensajes */}
          <div className="space-y-3 py-4" ref={scrollRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex animate-in slide-in-from-bottom-2 duration-300 
                  ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-sm 
                    ${
                      message.type === "bot"
                        ? theme === "dark"
                          ? "bg-[#2a2a2a] text-white"
                          : "bg-gray-100 text-gray-900"
                        : message.type === "user"
                          ? "bg-[#6841ea] text-white"
                          : message.type === "voice"
                            ? `cursor-pointer hover:opacity-90 transition ${theme === "dark" ? "bg-[#252527]" : "bg-blue-50"}`
                            : theme === "dark"
                              ? "bg-[#2a2a2a] text-gray-300"
                              : "bg-gray-100 text-gray-700"
                    }`}
                  onClick={
                    message.type === "voice" && message.voiceText
                      ? () => handleVoiceMessageClick(message.voiceText!)
                      : undefined
                  }
                >
                  {message.content}

                  {/* Mostrar puntos animados para mensajes de voz recientes */}
                  {message.type === "voice" &&
                    Date.now() - message.timestamp.getTime() < 2000 && (
                      <div className="flex gap-1 mt-2">
                        <div
                          className="w-1 h-1 bg-[#6841ea] rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="w-1 h-1 bg-[#6841ea] rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="w-1 h-1 bg-[#6841ea] rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    )}
                </div>
              </div>
            ))}

            {/* Indicador de escritura */}
            {isTyping && (
              <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                <div
                  className={`rounded-lg px-3 py-2 
                  ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}
                >
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mostrar análisis del asistente si está disponible */}
          {assistantAnalysis && (
            <div
              className={`mt-4 rounded-lg p-4 border 
              ${
                theme === "dark"
                  ? "bg-[#1a1a1a] border-[#2a2a2a]"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-[#6841ea]" />
                <h3 className="font-bold text-sm">
                  Análisis Generado para: {colaborador.email}
                </h3>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input fijo en la parte inferior */}
      <div
        className={`
    fixed bottom-0 left-0 right-0 z-50
    // bg-gradient-to-t
    ${theme === "dark" ? "bg-[#101010]" : "bg-white"}
  `}
      >
        <div className="max-w-4xl mx-auto p-4">
          <form onSubmit={handleUserInput} className="flex gap-2 items-center">
            <Input
              ref={inputRef}
              type="text"
              placeholder={
                canUserType
                  ? "Escribe tu pregunta o comentario..."
                  : "Obteniendo análisis..."
              }
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              // disabled={!canUserType}
              className={`flex-1 h-12 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-[#6841ea]
                ${
                  theme === "dark"
                    ? "bg-[#2a2a2a] text-white placeholder:text-gray-500 border-[#353535] hover:border-[#6841ea]"
                    : "bg-gray-100 text-gray-900 placeholder:text-gray-500 border-gray-200 hover:border-[#6841ea]"
                }`}
            />

            {/* Botón de micrófono mejorado */}
            <Button
              type="button"
              onClick={startRecording}
              // disabled={!canUserType}
              className={`h-12 w-14 p-0 rounded-lg transition-all ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 animate-pulse"
                  : "bg-[#6841ea] hover:bg-[#5a36d4]"
              }`}
              title={
                isRecording
                  ? "Detener reconocimiento de voz"
                  : "Iniciar reconocimiento de voz"
              }
            >
              {isRecording ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-red-400 rounded-full animate-ping"></div>
                  <MicOff className="w-5 h-5 text-white relative z-10" />
                </div>
              ) : (
                <Mic className="w-5 h-5 text-white" />
              )}
            </Button>

            {/* Botón de enviar */}
            <Button
              type="submit"
              disabled={!canUserType || !userInput.trim()}
              className="h-12 px-5 bg-[#6841ea] hover:bg-[#5a36d4] text-white rounded-lg disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent
          className={`${
            theme === "dark"
              ? "bg-[#1a1a1a] text-white border-[#2a2a2a]"
              : "bg-white text-gray-900 border-gray-200"
          } border`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#6841ea] text-xl">
              <PartyPopper className="w-6 h-6" />
              ¡Análisis completado!
            </AlertDialogTitle>
            <AlertDialogDescription
              className={`${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
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

      {/* Logout Confirm Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent
          className={`${
            theme === "dark"
              ? "bg-[#1a1a1a] text-white border-[#2a2a2a]"
              : "bg-white text-gray-900 border-gray-200"
          } border max-w-md`}
        >
          <AlertDialogHeader className="pt-6">
            <div className="mx-auto mb-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"
                }`}
              >
                <LogOut className="w-8 h-8 text-[#6841ea]" />
              </div>
            </div>

            <AlertDialogTitle className="text-center text-xl font-bold">
              ¿Cerrar sesión?
            </AlertDialogTitle>

            <AlertDialogDescription
              className={`text-center pt-4 pb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              <p>¿Estás seguro que deseas salir del asistente?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
            <AlertDialogCancel
              className={`w-full sm:w-auto rounded-lg h-11 ${
                theme === "dark"
                  ? "bg-[#2a2a2a] hover:bg-[#353535] text-white border-[#353535]"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200"
              } border`}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onLogout}
              className="w-full sm:w-auto bg-[#6841ea] hover:bg-[#5a36d4] text-white rounded-lg h-11 font-semibold"
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
<style jsx>{`
  @keyframes shake-x {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-5px);
    }
    75% {
      transform: translateX(5px);
    }
  }
  .animate-shake-x {
    animation: shake-x 0.5s infinite;
  }
`}</style>;
