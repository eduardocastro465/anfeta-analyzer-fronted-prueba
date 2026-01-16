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
  Maximize2,
  MessageSquare,
  Minimize2,
  PictureInPicture,
  Mic,
  MicOff,
  Volume2,
} from "lucide-react"
import Image from "next/image"

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
  type: "bot" | "user" | "system" | "voice"
  content: string | React.ReactNode
  timestamp: Date
  voiceText?: string
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
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [isTyping, setIsTyping] = useState(false)
  const [isPiPMode, setIsPiPMode] = useState(false)
  const [isInPiPWindow, setIsInPiPWindow] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState("")
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false)
  const [voiceMessages, setVoiceMessages] = useState<Message[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const welcomeSentRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pipWindowRef = useRef<Window | null>(null)
  const recognitionRef = useRef<any>(null)

  const [selectedTasks, setSelectedTasks] = useState<Actividad[]>([])
  const [currentTaskPendientes, setCurrentTaskPendientes] = useState<Pendiente[]>([])
  const [selectedPendienteIds, setSelectedPendienteIds] = useState<string[]>([])
  const [currentTime, setCurrentTime] = useState<string>("")
  const [currentDescription, setCurrentDescription] = useState<string>("")

  const HORA_INICIO = 9
  const HORA_FIN = 24

  useEffect(() => {
    // Configurar tema oscuro por defecto
    document.documentElement.classList.add("dark")

    // Detectar si estamos en una ventana PiP
    const checkIfPiPWindow = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const isPiPWindow = urlParams.get("pip") === "true"
      setIsInPiPWindow(isPiPWindow)

      // Si estamos en ventana PiP, configurarla apropiadamente
      if (isPiPWindow) {
        document.title = "Asistente Anfeta"
        
        // Ocultar elementos del navegador y aplicar estilos minimalistas
        document.documentElement.style.overflow = "hidden"
        document.body.style.margin = "0"
        document.body.style.padding = "0"
        document.body.style.overflow = "hidden"
        document.body.style.height = "100vh"
        document.body.style.width = "100vw"

        // Configurar para manejo de ventana PiP
        if (window.opener) {
          setIsPiPMode(true)
          
          // Intentar hacer la ventana más minimalista
          try {
            // Solo intentar mover/redimensionar si es una ventana popup
            if (window.opener) {
              window.moveTo(window.screenX, window.screenY)
              window.resizeTo(400, 600)
            }
          } catch (e) {
            console.log("No se pueden aplicar ciertas restricciones de ventana")
          }
        }

        // Configurar listener para mensajes de la ventana principal
        window.addEventListener("message", handleParentMessage)
      }
    }

    checkIfPiPWindow()

    // Configurar listener para mensajes si no estamos en PiP (ventana principal)
    if (!isInPiPWindow) {
      window.addEventListener("message", handleChildMessage)
    }

    // Configurar interval para verificar estado de ventana PiP
    const checkPiPWindowInterval = setInterval(() => {
      if (pipWindowRef.current && pipWindowRef.current.closed) {
        console.log("Ventana PiP cerrada detectada")
        setIsPiPMode(false)
        pipWindowRef.current = null
      }
    }, 1000)

    // Manejar cierre de ventana PiP desde ventana principal
    const handleBeforeUnload = () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        // Notificar a la ventana PiP que se va a cerrar
        try {
          pipWindowRef.current.postMessage({ type: "PARENT_CLOSING" }, "*")
        } catch (e) {
          console.log("No se pudo notificar a la ventana PiP")
        }
        pipWindowRef.current.close()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    // Limpiar al desmontar
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("message", handleParentMessage)
      window.removeEventListener("message", handleChildMessage)
      clearInterval(checkPiPWindowInterval)
      
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close()
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [isInPiPWindow])

  // Manejar mensajes de la ventana principal (cuando estamos en PiP)
  const handleParentMessage = (event: MessageEvent) => {
    // Verificar origen para seguridad
    if (event.origin !== window.location.origin) return
    
    if (event.data.type === "PARENT_CLOSING") {
      window.close()
    }
  }

  // Manejar mensajes de la ventana hija (cuando somos la ventana principal)
  const handleChildMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return
    
    if (event.data.type === "CHILD_CLOSED") {
      console.log("Ventana PiP notificó su cierre")
      setIsPiPMode(false)
      pipWindowRef.current = null
    }
  }

  const startRecording = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Tu navegador no soporta reconocimiento de voz")
      return
    }

    if (isRecording) {
      stopRecording()
      return
    }

    setShowVoiceOverlay(true)
    setIsRecording(true)
    setIsListening(true)

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = "es-MX"
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognitionRef.current = recognition

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      let transcript = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript
        } else {
          transcript += event.results[i][0].transcript
        }
      }
      setVoiceTranscript(transcript)
    }

    recognition.onerror = (event: any) => {
      console.error("Error en reconocimiento de voz:", event.error)
      setIsListening(false)
      setIsRecording(false)
      setShowVoiceOverlay(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsRecording(false)
    setIsListening(false)

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
                <div className="text-sm">{voiceTranscript}</div>
              </div>
            </div>
          ),
          timestamp: new Date(),
          voiceText: voiceTranscript
        }

        setMessages(prev => [...prev, voiceMessage])
        setUserInput(voiceTranscript)
      }

      setShowVoiceOverlay(false)
      setVoiceTranscript("")

      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 500)
  }

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const openPiPWindow = () => {
    // Cerrar ventana PiP existente si hay una
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close()
      pipWindowRef.current = null
    }

    // Crear ventana PiP con características minimalistas
    const width = 400
    const height = 600
    const left = window.screenLeft + window.outerWidth - width
    const top = window.screenTop

    // Características optimizadas para ventana flotante minimalista
    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      "popup=yes", // Marcar como popup para mejor soporte
      "menubar=no",
      "toolbar=no",
      "location=no",
      "status=no",
      "resizable=yes",
      "scrollbars=no",
      "titlebar=no",
      "chrome=no", // Intentar ocultar elementos del navegador
      "dialog=yes", // Estilo de diálogo
      "modal=no",
      "alwaysRaised=yes", // Mantener siempre al frente
      "z-lock=yes"
    ].join(",")

    // Abrir ventana PiP con parámetro de identificación
    const pipUrl = `${window.location.origin}${window.location.pathname}?pip=true&timestamp=${Date.now()}`
    pipWindowRef.current = window.open(pipUrl, "anfeta_pip", features)

    if (pipWindowRef.current) {
      // Notificar a la ventana principal que se abrió PiP
      setIsPiPMode(true)

      // Configurar listener para cuando la ventana se cierre
      pipWindowRef.current.addEventListener("beforeunload", () => {
        // Notificar a la ventana principal que nos cerramos
        try {
          window.opener?.postMessage({ type: "CHILD_CLOSED" }, "*")
        } catch (e) {
          console.log("No se pudo notificar cierre a ventana principal")
        }
      })

      // Intentar enfocar la ventana
      setTimeout(() => {
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          try {
            pipWindowRef.current.focus()
          } catch (e) {
            console.log("No se pudo enfocar la ventana PiP")
          }
        }
      }, 100)

      // Configurar interval para verificar si la ventana sigue abierta
      const checkWindowClosed = setInterval(() => {
        if (pipWindowRef.current?.closed) {
          clearInterval(checkWindowClosed)
          setIsPiPMode(false)
          pipWindowRef.current = null
          console.log("Ventana PiP cerrada")
        }
      }, 1000)
    } else {
      alert("No se pudo abrir la ventana flotante. Por favor, permite ventanas emergentes para este sitio.")
    }
  }

  const closePiPWindow = () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close()
      pipWindowRef.current = null
    }
    setIsPiPMode(false)
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

  const addMessage = (type: Message["type"], content: string | React.ReactNode, voiceText?: string) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      voiceText
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
      <div className="space-y-3 mt-3">
        {actividadesEnHorario.map((task, idx) => (
          <div key={task.id} className="group p-4 rounded-xl transition-all duration-300 border 
            bg-gray-50 hover:bg-gray-100 border-gray-200
            dark:bg-[#1a1a1a] dark:hover:bg-[#252525] dark:border-[#2a2a2a]">
            <div className="flex items-start gap-3">
              <Badge className="shrink-0 bg-[#6841ea] text-white">
                {idx + 1}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">
                  {task.titulo}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs 
                    bg-gray-200 text-gray-700
                    dark:bg-[#2a2a2a] dark:text-gray-300">
                    {task.status || "Sin estado"}
                  </Badge>
                  {task.prioridad && task.prioridad !== "Sin prioridad" && (
                    <Badge className="text-xs bg-[#6841ea] text-white">
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
        <p className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
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
      <div className="flex items-center gap-2 text-[#6841ea]">
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
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <Sparkles className="w-4 h-4 text-[#6841ea]" />
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
      <div className="space-y-3 mt-3">
        {pendientes.map((p, idx) => (
          <div key={p.id || idx} className="p-4 rounded-lg flex gap-3 border 
            bg-gray-50 hover:bg-gray-100 border-gray-200
            dark:bg-[#1a1a1a] dark:hover:bg-[#252525] dark:border-[#2a2a2a]">
            <Badge className="shrink-0 bg-[#6841ea] text-white">
              {idx + 1}
            </Badge>
            <span className={`${p.checked ? "line-through" : ""} flex-1 
              ${p.checked ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
              {p.text}
            </span>
            {p.checked && (
              <Badge className="text-xs 
                bg-green-100 text-green-700
                dark:bg-green-900 dark:text-green-300">
                ✓
              </Badge>
            )}
          </div>
        ))}
      </div>
    )

    await addMessageWithTyping("bot", (
      <div>
        <p className="mb-3 text-gray-700 dark:text-gray-300">
          Esta tarea tiene <strong>{pendientes.length}</strong> pendiente{pendientes.length !== 1 ? "s" : ""}:
        </p>
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
        <div className="flex items-center gap-2 text-[#6841ea]">
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
        <div className="flex items-center gap-2 text-[#6841ea]">
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
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <Clock className="w-4 h-4 text-[#6841ea]" />
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
      <div className="flex items-center gap-2 text-[#6841ea]">
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
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <PartyPopper className="w-5 h-5 text-[#6841ea]" />
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
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
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
        <div className="flex items-center gap-2 text-[#6841ea]">
          <CheckCircle2 className="w-4 h-4" />
          <strong>Reporte enviado exitosamente</strong>
        </div>
      ))
    } catch (error) {
      addMessage("system", (
        <div className="flex items-center gap-2 text-red-500">
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

  const handleVoiceMessageClick = (voiceText: string) => {
    setUserInput(voiceText)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className={`min-h-screen font-['Arial'] flex flex-col 
      ${theme === "dark" ? "bg-[#101010] text-white" : "bg-white text-gray-900"}`}
      style={{ height: '100vh' }}>

      {/* Overlay de reconocimiento de voz */}
      {showVoiceOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className={`p-8 rounded-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${isListening ? 'bg-red-500 animate-pulse' : 'bg-[#6841ea]'}`}>
                {isListening ? (
                  <Volume2 className="w-10 h-10 text-white animate-pulse" />
                ) : (
                  <MicOff className="w-10 h-10 text-white" />
                )}
              </div>

              <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {isListening ? '🎤 Escuchando...' : 'Micrófono listo'}
              </h3>

              <div className={`mb-6 p-4 rounded-lg min-h-20 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-100'}`}>
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
              </div>

              <div className="flex gap-3">
                <button
                  onClick={stopRecording}
                  className="flex-1 bg-[#6841ea] text-white py-3 rounded-lg font-semibold hover:bg-[#5a36d4] transition"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => {
                    stopRecording()
                    setVoiceTranscript("")
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
          {/* Capa de blur + gradiente SOLO ARRIBA */}
          <div
            className={`
              pointer-events-none
              absolute top-0 left-0 right-0
              h-24
              bg-gradient-to-b
              ${theme === "dark"
                ? "from-[#101010]/90 via-[#101010]/90 to-transparent"
                : "from-white/70 via-white/40 to-transparent"}
            `}
          />

          <div className="relative max-w-4xl mx-auto p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full flex items-center justify-center">
                  <Image
                    src="/icono.webp"
                    alt="Chat"
                    width={80}
                    height={80}
                    className="
                      object-contain
                      rounded-full
                      drop-shadow-[0_0_6px_rgba(104,65,234,0.8)]
                      drop-shadow-[0_0_16px_rgba(168,139,255,0.9)]
                    "
                  />
                </div>

                <div>
                  <h1 className="text-lg font-bold">Asistente de Tareas</h1>
                  <p
                    className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                  >
                    {displayName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isPiPMode ? (
                  <button
                    onClick={openPiPWindow}
                    className={`w-9 h-9 rounded-full flex items-center justify-center 
                      ${theme === "dark"
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
                      ${theme === "dark"
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
                    ${theme === "dark"
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
                    ${theme === "dark"
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
        <div className={`fixed top-0 left-0 right-0 z-50 
          ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}>
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
                    ${theme === "dark"
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
                    ${theme === "dark"
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
      <div className={`flex-1 overflow-y-auto ${isInPiPWindow ? 'pt-16' : 'pt-20'} ${!isInPiPWindow ? 'pb-24' : 'pb-20'}`}>
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
                    ${message.type === "bot"
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
                  onClick={message.type === "voice" && message.voiceText ? () => handleVoiceMessageClick(message.voiceText!) : undefined}
                >
                  {message.content}

                  {/* Mostrar puntos animados para mensajes de voz recientes */}
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

            {/* Indicador de escritura */}
            {isTyping && (
              <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                <div className={`rounded-lg px-3 py-2 
                  ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resumen de tareas */}
          {taskReports.length > 0 && (
            <div className={`mt-4 rounded-lg p-4 border 
              ${theme === "dark"
                ? "bg-[#1a1a1a] border-[#2a2a2a]"
                : "bg-white border-gray-200"}`}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#6841ea]" />
                <h3 className="font-bold text-sm">Resumen del Reporte</h3>
              </div>

              <div className="space-y-2">
                {taskReports.map((report, idx) => (
                  <div
                    key={report.taskId}
                    className={`flex items-center justify-between text-sm py-2 px-3 rounded-lg border 
                      ${theme === "dark"
                        ? "bg-[#2a2a2a] border-[#353535]"
                        : "bg-gray-100 border-gray-200"}`}
                  >
                    <span className={`truncate flex-1 font-medium 
                      ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                      {idx + 1}. {report.titulo}
                    </span>
                    <Badge className="bg-[#6841ea] text-xs px-3 py-1">
                      {report.tiempoTrabajado} min
                    </Badge>
                  </div>
                ))}

                <div className={`flex items-center justify-between font-semibold pt-3 px-3 text-sm 
                  ${theme === "dark" ? "border-t border-[#353535]" : "border-t border-gray-200"}`}>
                  <span className={`flex items-center gap-2 
                    ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    <Clock className="w-4 h-4 text-[#6841ea]" />
                    Total:
                  </span>
                  <span className="text-[#6841ea]">
                    {taskReports.reduce((acc, t) => acc + t.tiempoTrabajado, 0)} minutos
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input fijo en la parte inferior */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t
        ${theme === "dark"
          ? "from-[#101010] via-[#101010] to-transparent"
          : "from-white/70 via-white/40 to-transparent"}
      `}>
        <div className="max-w-4xl mx-auto p-4">
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
              className={`flex-1 h-12 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-[#6841ea]
                ${theme === "dark"
                  ? "bg-[#2a2a2a] text-white placeholder:text-gray-500 border-[#353535] hover:border-[#6841ea]"
                  : "bg-gray-100 text-gray-900 placeholder:text-gray-500 border-gray-200 hover:border-[#6841ea]"
                }`}
            />

            {/* Botón de micrófono mejorado */}
            <Button
              type="button"
              onClick={startRecording}
              disabled={!canUserType}
              className={`h-12 w-14 p-0 rounded-lg transition-all ${isRecording
                ? "bg-red-600 hover:bg-red-700 animate-pulse"
                : "bg-[#6841ea] hover:bg-[#5a36d4]"
                }`}
              title={isRecording ? "Detener reconocimiento de voz" : "Iniciar reconocimiento de voz"}
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
        <AlertDialogContent className={`${theme === "dark"
          ? "bg-[#1a1a1a] text-white border-[#2a2a2a]"
          : "bg-white text-gray-900 border-gray-200"
          } border`}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#6841ea] text-xl">
              <PartyPopper className="w-6 h-6" />
              ¡Reporte enviado exitosamente!
            </AlertDialogTitle>
            <AlertDialogDescription className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}>
              Tu reporte ha sido enviado y registrado correctamente.
              <div className={`mt-4 p-4 rounded-lg border ${theme === "dark"
                ? "bg-[#2a2a2a] border-[#353535]"
                : "bg-gray-100 border-gray-200"
                }`}>
                <p className={`font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>Resumen:</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-[#6841ea]">
                    <CheckCircle2 className="w-4 h-4" />
                    {taskReports.length} tarea{taskReports.length !== 1 ? "s" : ""} registrada{taskReports.length !== 1 ? "s" : ""}
                  </li>
                  <li className="flex items-center gap-2 text-[#6841ea]">
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
              className="bg-[#6841ea] hover:bg-[#5a36d4] text-white"
            >
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Confirm Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className={`${theme === "dark"
          ? "bg-[#1a1a1a] text-white border-[#2a2a2a]"
          : "bg-white text-gray-900 border-gray-200"
          } border max-w-md`}>
          <AlertDialogHeader className="pt-6">
            <div className="mx-auto mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme === "dark"
                ? "bg-[#2a2a2a]"
                : "bg-gray-100"
                }`}>
                <LogOut className="w-8 h-8 text-[#6841ea]" />
              </div>
            </div>

            <AlertDialogTitle className="text-center text-xl font-bold">
              ¿Cerrar sesión?
            </AlertDialogTitle>

            <AlertDialogDescription className={`text-center pt-4 pb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}>
              {taskReports.length > 0 ? (
                <div className="space-y-3">
                  <p>
                    Tienes <strong className="text-[#6841ea]">{taskReports.length}</strong> tarea{taskReports.length !== 1 ? "s" : ""} registrada{taskReports.length !== 1 ? "s" : ""}.
                  </p>
                  <div className={`p-4 rounded-lg border ${theme === "dark"
                    ? "bg-[#2a2a2a] border-[#353535]"
                    : "bg-gray-100 border-gray-200"
                    }`}>
                    <p className="text-sm flex items-center justify-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 text-[#6841ea]" />
                      ¿Estás seguro que deseas salir?
                    </p>
                  </div>
                </div>
              ) : (
                <p>¿Estás seguro que deseas salir?</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
            <AlertDialogCancel className={`w-full sm:w-auto rounded-lg h-11 ${theme === "dark"
              ? "bg-[#2a2a2a] hover:bg-[#353535] text-white border-[#353535]"
              : "bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200"
              } border`}>
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
  )
}