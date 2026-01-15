"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Actividad, Colaborador, TaskReport, ReporteCompleto } from "@/lib/types"
import { sendReporte } from "@/lib/api"
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
} from "lucide-react"
import { Mic } from "lucide-react"
import { FloatingChatButton } from "@/components/FloatingChatButton"

interface ChatBotProps {
  colaborador: Colaborador
  actividades: Actividad[]
  onLogout: () => void
}

type ChatStep = 
  | "welcome" 
  | "show-tasks" 
  | "ask-task-selection"
  | "loading-pendientes"
  | "show-pendientes"
  | "ask-pendiente-selection"
  | "ask-time"
  | "ask-description"
  | "confirm-next"
  | "finished"
  | "sending"

interface Message {
  id: string
  type: "bot" | "user" | "system"
  content: string | React.ReactNode
  timestamp: Date
}

export interface Pendiente {
  id: string
  text: string
  checked: boolean
  updatedAt: string
  images: string[]
  bloque: number
}

const getDisplayName = (colaborador: Colaborador) => {
  if (colaborador.firstName || colaborador.lastName) {
    return `${colaborador.firstName || ""} ${colaborador.lastName || ""}`.trim()
  }
  return colaborador.email.split("@")[0]
}

export function ChatBot({ colaborador, actividades, onLogout }: ChatBotProps) {
  const [step, setStep] = useState<ChatStep>("welcome")
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0)
  const [taskReports, setTaskReports] = useState<TaskReport[]>([])
  const [userInput, setUserInput] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const welcomeSentRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [selectedTasks, setSelectedTasks] = useState<Actividad[]>([])
  const [currentTaskPendientes, setCurrentTaskPendientes] = useState<Pendiente[]>([])
  const [selectedPendienteIds, setSelectedPendienteIds] = useState<string[]>([])
  const [currentTime, setCurrentTime] = useState<string>("")
  const [currentDescription, setCurrentDescription] = useState<string>("")
  const [isRecording, setIsRecording] = useState(false);
const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const HORA_INICIO = 9
  const HORA_FIN = 24

  useEffect(() => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setTheme(isDark ? "dark" : "light")
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

const startRecording = async () => {
  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
    alert("Tu navegador no soporta reconocimiento de voz");
    return;
  }

  if (isRecording) {
    // Detener grabación
    mediaRecorder?.stop();
    return;
  }

  setIsRecording(true);
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "es-MX";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    setUserInput(transcript);
  };

  recognition.onend = () => {
    setIsRecording(false);
  };

  recognition.onerror = () => {
    setIsRecording(false);
  };
};


  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const actividadesEnHorario = actividades.filter((actividad) => {
    if (!actividad || !actividad.id || !actividad.titulo || actividad.titulo.trim() === "") {
      return false
    }
    if (!actividad.dueStart && !actividad.dueEnd) return false
    
    try {
      const startDate = new Date(actividad.dueStart || actividad.dueEnd)
      const endDate = new Date(actividad.dueEnd || actividad.dueStart)
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false
      
      const startHour = startDate.getHours()
      const endHour = endDate.getHours()
      
      const isDuranteHorario = 
        (startHour >= HORA_INICIO && startHour < HORA_FIN) ||
        (endHour > HORA_INICIO && endHour <= HORA_FIN) ||
        (startHour < HORA_INICIO && endHour > HORA_FIN)
      
      return isDuranteHorario
    } catch (error) {
      return false
    }
  }).filter(Boolean)

  const currentTask = selectedTasks[currentTaskIndex]
  const displayName = getDisplayName(colaborador)

  const addMessage = (type: Message["type"], content: string | React.ReactNode) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const addMessageWithTyping = async (type: Message["type"], content: string | React.ReactNode, delay = 800) => {
    setIsTyping(true)
    await new Promise(resolve => setTimeout(resolve, delay))
    setIsTyping(false)
    addMessage(type, content)
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  useEffect(() => {
    if (inputRef.current && step !== "loading-pendientes" && step !== "sending") {
      inputRef.current.focus()
    }
  }, [step])

  useEffect(() => {
    if (!welcomeSentRef.current) {
      welcomeSentRef.current = true
      
      setTimeout(() => {
        addMessageWithTyping("bot", `¡Hola ${displayName}! 👋 Soy tu asistente para registro de actividades.`, 500)
        setTimeout(() => {
          showTaskList()
        }, 1500)
      }, 500)
    }
  }, [])

  const showTaskList = async () => {
    const taskList = (
      <div className="space-y-2 mt-3">
        {actividadesEnHorario.map((task, idx) => (
          <div key={task.id} className="group p-3 bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950/20 dark:to-blue-950/20 rounded-xl border border-violet-100 dark:border-violet-900/30 hover:shadow-md transition-all duration-300">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="shrink-0 bg-white dark:bg-slate-800 border-violet-300 dark:border-violet-700">
                {idx + 1}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 dark:text-white">{task.titulo}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs bg-slate-200 dark:bg-slate-700">
                    {task.status}
                  </Badge>
                  {task.prioridad && task.prioridad !== "Sin prioridad" && (
                    <Badge className="text-xs bg-gradient-to-r from-violet-600 to-blue-600">
                      {task.prioridad}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
    
    await addMessageWithTyping("bot", (
      <div>
        <p className="mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          Tienes <strong>{actividadesEnHorario.length}</strong> tarea{actividadesEnHorario.length !== 1 ? "s" : ""} para hoy (9:00 AM - 12:00 AM):
        </p>
        {taskList}
      </div>
    ))
    
    setTimeout(async () => {
      await addMessageWithTyping("bot", "Escribe los números de las tareas que trabajarás hoy, separados por comas. Ejemplo: 1, 2, 3")
      setStep("ask-task-selection")
    }, 1000)
  }

  const handleTaskSelection = (input: string) => {
    const numbers = input
      .split(",")
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n) && n > 0 && n <= actividadesEnHorario.length)

    if (numbers.length === 0) {
      addMessage("bot", "No reconocí números válidos. Por favor, intenta nuevamente.")
      return
    }

    const selected = numbers.map(n => actividadesEnHorario[n - 1])

    addMessage("user", input)
    addMessage("system", (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        Seleccionadas: {selected.map(t => t.titulo).join(", ")}
      </div>
    ))

    setSelectedTasks(selected)
    setCurrentTaskIndex(0)

    setTimeout(() => {
      startTaskWorkflow(selected, 0)
    }, 500)
  }

  const startTaskWorkflow = async (
    tasks = selectedTasks,
    index = currentTaskIndex
  ) => {
    const task = tasks[index]

    if (!task) {
      console.error("No hay tarea seleccionada")
      addMessage("bot", "Hubo un problema al cargar la tarea.")
      return
    }

    await addMessageWithTyping("bot", (
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        Perfecto! Trabajaremos en: <strong>"{task.titulo}"</strong>
      </div>
    ))
    
    try {
      const response = await fetch(
        `https://wlserver-production.up.railway.app/api/actividades/${task.id}`
      )

      const result: {
        success: boolean
        data?: {
          pendientes?: Pendiente[]
        }
      } = await response.json()
      
      if (result.success && result.data?.pendientes) {
        setCurrentTaskPendientes(result.data.pendientes)

        if (result.data.pendientes.length > 0) {
          showPendientesList(result.data.pendientes)
        } else {
          noPendientes()
        }
      }
    } catch (error) {
      console.error("Error:", error)
      noPendientes()
    }
  }

  const showPendientesList = async (pendientes: any[]) => {
    const pendientesList = (
      <div className="space-y-2 mt-3">
        {pendientes.map((p, idx) => (
          <div key={p.id || idx} className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-lg flex gap-3 border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all">
            <Badge variant="outline" className="shrink-0 bg-white dark:bg-slate-900">
              {idx + 1}
            </Badge>
            <span className={p.checked ? "line-through text-muted-foreground flex-1" : "flex-1"}>
              {p.text}
            </span>
            {p.checked && (
              <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                ✓
              </Badge>
            )}
          </div>
        ))}
      </div>
    )
    
    await addMessageWithTyping("bot", (
      <div>
        <p className="mb-2">Esta tarea tiene <strong>{pendientes.length}</strong> pendiente{pendientes.length !== 1 ? "s" : ""}:</p>
        {pendientesList}
      </div>
    ))
    
    setTimeout(async () => {
      await addMessageWithTyping("bot", "Escribe los números de los pendientes en los que trabajaste, separados por comas. O escribe '0' si trabajaste en la tarea en general.")
      setStep("ask-pendiente-selection")
    }, 1000)
  }

  const noPendientes = async () => {
    await addMessageWithTyping("bot", "Esta tarea no tiene pendientes específicos.", 500)
    setTimeout(() => {
      askForTime()
    }, 700)
  }

  const handlePendienteSelection = (input: string) => {
    addMessage("user", input)
    
    if (input.trim() === "0") {
      addMessage("system", (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Trabajaste en la tarea en general
        </div>
      ))
      setSelectedPendienteIds([])
    } else {
      const numbers = input.split(",").map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0 && n <= currentTaskPendientes.length)
      
      if (numbers.length === 0) {
        addMessage("bot", "No reconocí números válidos. Escribe los números de los pendientes o '0' para ninguno.")
        return
      }

      const selected = numbers.map(n => currentTaskPendientes[n - 1].id || currentTaskPendientes[n - 1].text)
      setSelectedPendienteIds(selected)
      
      const selectedNames = numbers.map(n => currentTaskPendientes[n - 1].text).join(", ")
      addMessage("system", (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Pendientes: {selectedNames}
        </div>
      ))
    }
    
    setTimeout(() => {
      askForTime()
    }, 500)
  }

  const askForTime = async () => {
    await addMessageWithTyping("bot", (
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        ¿Cuántos minutos trabajaste en esta tarea?
      </div>
    ))
    setStep("ask-time")
  }

  const handleTimeInput = async (input: string) => {
    const minutes = parseInt(input.trim())
    
    if (isNaN(minutes) || minutes <= 0) {
      addMessage("bot", "Por favor escribe un número válido de minutos.")
      return
    }

    setCurrentTime(input)
    addMessage("user", `${minutes} minutos`)
    
    setTimeout(async () => {
      await addMessageWithTyping("bot", "Describe brevemente qué trabajaste en esta tarea:")
      setStep("ask-description")
    }, 500)
  }

  const handleDescriptionInput = async (input: string) => {
    if (!input.trim()) {
      addMessage("bot", "Por favor describe tu trabajo para continuar.")
      return
    }

    setCurrentDescription(input)
    addMessage("user", input)
    
    const report: TaskReport = {
      taskId: currentTask.id,
      titulo: currentTask.titulo,
      tiempoTrabajado: parseInt(currentTime),
      descripcionTrabajo: input.trim(),
      completada: true,
    }

    setTaskReports((prev) => [...prev, report])
    addMessage("system", (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
        <CheckCircle2 className="w-4 h-4" />
        <strong>Tarea registrada exitosamente</strong>
      </div>
    ))
    
    setTimeout(async () => {
      if (currentTaskIndex < selectedTasks.length - 1) {
        await addMessageWithTyping("bot", `Te quedan ${selectedTasks.length - currentTaskIndex - 1} tarea${selectedTasks.length - currentTaskIndex - 1 !== 1 ? "s" : ""}. ¿Continuamos con la siguiente? (sí/no)`)
        setStep("confirm-next")
      } else {
        finishAllTasks()
      }
    }, 500)
    
    setCurrentTime("")
    setCurrentDescription("")
    setSelectedPendienteIds([])
  }

  const handleConfirmNext = (input: string) => {
    const response = input.toLowerCase().trim()
    addMessage("user", input)
    
    if (response === "si" || response === "sí" || response === "s") {
      setCurrentTaskIndex((prev) => prev + 1)
      setTimeout(() => {
        startTaskWorkflow()
      }, 500)
    } else {
      finishAllTasks()
    }
  }

  const finishAllTasks = async () => {
    await addMessageWithTyping("bot", (
      <div className="flex items-center gap-2">
        <PartyPopper className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        ¡Excelente trabajo! Has registrado <strong>{taskReports.length}</strong> tarea{taskReports.length !== 1 ? "s" : ""} con un total de <strong>{taskReports.reduce((acc, t) => acc + t.tiempoTrabajado, 0)} minutos</strong>.
      </div>
    ))
    setTimeout(async () => {
      await addMessageWithTyping("bot", "¿Quieres enviar el reporte? (sí/no)")
      setStep("finished")
    }, 1000)
  }

  const handleSendConfirmation = async (input: string) => {
    const response = input.toLowerCase().trim()
    addMessage("user", input)
    
    if (response === "si" || response === "sí" || response === "s") {
      await sendReport()
    } else {
      addMessage("bot", "Entendido. Tu reporte no fue enviado. Puedes cerrar sesión cuando quieras.")
    }
  }

  const sendReport = async () => {
    setStep("sending")
    addMessage("system", (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Enviando reporte...
      </div>
    ))

    const reporte: ReporteCompleto = {
      colaborador,
      fecha: new Date().toISOString(),
      tareas: taskReports,
      totalTiempo: taskReports.reduce((acc, t) => acc + t.tiempoTrabajado, 0),
    }

    try {
      await sendReporte(reporte)
      setShowSuccessDialog(true)
      addMessage("system", (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          <strong>Reporte enviado exitosamente</strong>
        </div>
      ))
    } catch (error) {
      addMessage("system", (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          Error: {error instanceof Error ? error.message : "Error desconocido"}
        </div>
      ))
      addMessage("bot", "Hubo un error al enviar. ¿Quieres intentar nuevamente? (sí/no)")
      setStep("finished")
    }
  }

  const handleUserInput = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userInput.trim()) return

    const input = userInput.trim()
    setUserInput("")

    switch (step) {
      case "ask-task-selection":
        handleTaskSelection(input)
        break
      case "ask-pendiente-selection":
        handlePendienteSelection(input)
        break
      case "ask-time":
        handleTimeInput(input)
        break
      case "ask-description":
        handleDescriptionInput(input)
        break
      case "confirm-next":
        handleConfirmNext(input)
        break
      case "finished":
        handleSendConfirmation(input)
        break
      default:
        break
    }
  }

  const canUserType = ![
    "welcome",
    "show-tasks",
    "loading-pendientes",
    "show-pendientes",
    "sending"
  ].includes(step)

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-500">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-400/10 to-blue-400/10 dark:from-violet-600/5 dark:to-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-violet-400/10 dark:from-blue-600/5 dark:to-violet-600/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-20 dark:opacity-5" style={{
          backgroundImage: `radial-gradient(circle, rgba(139, 92, 246, 0.1) 1px, transparent 1px)`,
          backgroundSize: "32px 32px"
        }} />
      </div>

      {/* Botón de tema */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full w-10 h-10 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-violet-200 dark:border-violet-800 hover:scale-110 transition-all duration-300"
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4 text-violet-700 dark:text-violet-300" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
        </Button>
      </div>

      <div className="relative p-2 sm:p-4 max-w-full sm:max-w-4xl mx-auto space-y-4">

   {/* Header */}
<Card className="border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl overflow-hidden">
  <div className="h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-violet-500 animate-gradient bg-[length:200%_auto]" />
  <CardHeader className="flex flex-row items-center justify-between py-0"> {/* padding reducido */}
    <div className="flex flex-col sm:flex-row items-center sm:gap-3 gap-1">
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
        <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> {/* ícono más pequeño */}
        </div>
      </div>
      <div>
        <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-violet-600 to-blue-600 dark:from-violet-400 dark:to-blue-400 bg-clip-text text-transparent">
          Asistente de Tareas
        </CardTitle>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">{displayName}</p>
      </div>
    </div>
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => setShowLogoutDialog(true)}
      className="hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
    >
      <LogOut className="w-4 h-4 mr-1" /> {/* icono más compacto */}
      Salir
    </Button>
  </CardHeader>
</Card>

{/* Chat Area */}
<Card className="flex flex-col border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl w-full">
  {/* Mensajes */}
  <div
    className="overflow-y-auto p-2 sm:p-3 min-h-[50vh]"
    ref={scrollRef}
  >
    <div className="space-y-2">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex animate-in slide-in-from-bottom-2 duration-300 ${
            message.type === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm text-sm ${
              message.type === "bot"
                ? "bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
                : message.type === "user"
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md shadow-violet-300/50 dark:shadow-violet-900/50"
                  : "bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/30 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-900"
            }`}
          >
            {message.content}
          </div>
        </div>
      ))}

      {/* Indicador de escritura */}
      {isTyping && (
        <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl px-2 py-1.5 border border-slate-200 dark:border-slate-700">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  </div>

  {/* Input Area con Micrófono */}
<div className="p-2 border-t border-violet-200 dark:border-violet-900/50 bg-gradient-to-r from-violet-50/30 to-blue-50/30 dark:from-violet-950/20 dark:to-blue-950/20">
  <form onSubmit={handleUserInput} className="flex gap-2 items-center">
    <Input
      ref={inputRef}
      type="text"
      placeholder={
        canUserType
          ? "Escribe tu respuesta..."
          : "Espera a que el asistente termine..."
      }
      value={userInput}
      onChange={(e) => setUserInput(e.target.value)}
      disabled={!canUserType}
      className="flex-1 h-10 sm:h-11 border-2 border-violet-200 dark:border-violet-800 focus:border-violet-500 dark:focus:border-violet-500 rounded-lg bg-white dark:bg-slate-800 px-3 text-sm sm:text-base"
    />
{/* Botón de micrófono mejorado */}
<Button
  type="button"
  onClick={startRecording}
  disabled={!canUserType}
  className={`h-10 sm:h-12 w-12 sm:w-14 p-0 bg-gradient-to-br from-green-500 to-green-600 
              hover:from-green-600 hover:to-green-700 active:scale-95 rounded-full 
              shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center
              ${isRecording ? "animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.6)]" : ""}`}
>
  {isRecording ? (
    <Loader2 className="w-5 h-5 animate-spin text-white" />
  ) : (
    <Mic className="w-5 h-5 text-white" />
  )}
</Button>


{/* Botón de enviar */}
<Button 
  type="submit" 
  disabled={!canUserType || !userInput.trim()}
  className="h-10 sm:h-11 px-4 sm:px-5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
>
  <Send className="w-4 h-4" />
</Button>

  </form>
</div>

</Card>



     {taskReports.length > 0 && (
  <Card className="border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
    <div className="h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 animate-gradient bg-[length:200%_auto]" />
    
    <CardHeader className="py-2">
      <CardTitle className="text-sm flex items-center gap-2">
        <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        Resumen del Reporte
      </CardTitle>
    </CardHeader>
    
    <CardContent className="py-1 pb-3">
      <div className="space-y-1.5">
        {taskReports.map((report, idx) => (
          <div
            key={report.taskId}
            className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950/20 dark:to-blue-950/20 border border-violet-100 dark:border-violet-900/30"
          >
            <span className="truncate flex-1 font-medium">
              {idx + 1}. {report.titulo}
            </span>
            <Badge className="bg-gradient-to-r from-violet-600 to-blue-600 ml-1 text-xs px-2 py-0.5">
              {report.tiempoTrabajado} min
            </Badge>
          </div>
        ))}

        <div className="flex items-center justify-between font-semibold pt-2 px-2 text-sm border-t border-violet-200 dark:border-violet-800">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            Total:
          </span>
          <span className="text-violet-600 dark:text-violet-400">
            {taskReports.reduce((acc, t) => acc + t.tiempoTrabajado, 0)} minutos
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
)}

<FloatingChatButton/>

      </div>
      

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="border-2 border-green-200 dark:border-green-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xl">
              <PartyPopper className="w-6 h-6" />
              ¡Reporte enviado exitosamente!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Tu reporte ha sido enviado y registrado correctamente.
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <p className="font-semibold mb-2 text-green-900 dark:text-green-100">Resumen:</p>
                <ul className="space-y-1 text-green-800 dark:text-green-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {taskReports.length} tarea{taskReports.length !== 1 ? "s" : ""} registrada{taskReports.length !== 1 ? "s" : ""}
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {taskReports.reduce((acc, t) => acc + t.tiempoTrabajado, 0)} minutos totales
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={onLogout}
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
            >
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Confirm Dialog */}
    <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
  <AlertDialogContent className="border-0 shadow-2xl max-w-md overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
    {/* Borde superior decorativo con tema violeta/azul */}
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-violet-500 animate-gradient bg-[length:200%_auto]" />
    
    {/* Fondo decorativo */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-400/10 to-blue-400/10 dark:from-violet-600/5 dark:to-blue-600/5 rounded-full blur-3xl" />
    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-400/10 to-violet-400/10 dark:from-blue-600/5 dark:to-violet-600/5 rounded-full blur-3xl" />
    
    <AlertDialogHeader className="relative pt-6">
      {/* Icono con efecto */}
      <div className="mx-auto mb-4 relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
        <div className="relative w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300">
          <LogOut className="w-8 h-8 text-white" />
        </div>
      </div>
      
      <AlertDialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 dark:from-violet-400 dark:to-blue-400 bg-clip-text text-transparent">
        ¿Cerrar sesión?
      </AlertDialogTitle>
      
      <AlertDialogDescription className="text-center pt-4 pb-2">
        {taskReports.length > 0 ? (
          <div className="space-y-3">
            <p className="text-base text-slate-700 dark:text-slate-300">
              Tienes <strong className="text-violet-600 dark:text-violet-400">{taskReports.length}</strong> tarea{taskReports.length !== 1 ? "s" : ""} registrada{taskReports.length !== 1 ? "s" : ""}.
            </p>
            <div className="p-4 bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950/30 dark:to-blue-950/30 rounded-xl border-2 border-violet-200 dark:border-violet-800">
              <p className="text-sm text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                ¿Estás seguro que deseas salir?
              </p>
            </div>
          </div>
        ) : (
          <p className="text-base text-slate-700 dark:text-slate-300">
            ¿Estás seguro que deseas salir?
          </p>
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    
    <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
      <AlertDialogCancel className="w-full sm:w-auto border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 rounded-xl h-11 font-medium hover:scale-105 active:scale-95">
        Cancelar
      </AlertDialogCancel>
      <AlertDialogAction 
        onClick={onLogout}
        className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-violet-400/50 dark:hover:shadow-violet-900/50 transition-all duration-300 transform hover:scale-105 active:scale-95 rounded-xl h-11 font-semibold"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Confirmar salida
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  )
}