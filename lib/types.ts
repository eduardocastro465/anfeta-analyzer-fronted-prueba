export interface Project {
  id: string | null
  name: string
  estatusRevisionYPago: string
  url: string | null
  telegram: string | null
}

export interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  theme: 'light' | 'dark';
  onVoiceMessageClick: (voiceText: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  assistantAnalysis?: AssistantAnalysis | null; // ✅ NUEVO
  onOpenReport: () => void;
  onStartVoiceMode?: () => void;
  setStep?: (step: string) => void;
  reportConfig?: {
    horaInicio: number;
    minutoInicio: number;
    horaFin: number;
    minutoFin: number;
  };
}
export interface HeaderProps {
  isInPiPWindow: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  theme: string;
  toggleTheme: () => void;
  displayName: string;
  colaborador: { email: string };
  rate: number;
  changeRate: (rate: number) => void;
  isSpeaking: boolean;
  isPiPMode: boolean;
  openPiPWindow: () => void;
  closePiPWindow: () => void;
  setShowLogoutDialog: (show: boolean) => void;
}


export interface Actividad {
  id: string
  titulo: string
  project: Project
  assignees: string[]
  status: string
  prioridad: string
  tipo: string
  dueStart: string
  dueEnd: string
  tiempoReal: number
  anotaciones: string
  pasosYLinks: string
  documentoCompartido: string | null
  url: string
  destacado: boolean
  destacadoColor: string | null
  pendientes: string[]
  archivosAdjuntos: string[]
  avanceIA: string
  estatusMasterRollup: string
  grupoWhatsapp?: string
}

export interface Colaborador {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  collaboratorId?: string
  avatar?: string
}

export interface TaskReport {
  taskId: string
  titulo: string
  tiempoTrabajado: number
  descripcionTrabajo: string
  completada: boolean
}

export interface ReporteCompleto {
  colaborador: Colaborador
  fecha: string
  tareas: TaskReport[]
  totalTiempo: number
}

export interface UsersApiResponse {
  items: Colaborador[]
}

export interface ActividadesApiResponse {
  success: boolean
  data: Actividad[]
}
// export interface AssistantAnalysis {
//   success: boolean;
//   answer: string;
//   provider: string;
//   metrics: {
//     totalActividades: number;
//     totalPendientes: number;
//     pendientesAltaPrioridad: number;
//     tiempoEstimadoTotal: string;
//     actividadesConPendientes: number;
//   };
//   data: {
//     actividades: Array<{
//       id: string;
//       titulo: string;
//       horario: string;
//       status: string;
//       proyecto: string;
//       tieneRevisiones: boolean;
//     }>;
//     revisionesPorActividad: Array<{
//       actividadId: string;
//       actividadTitulo: string;
//       totalPendientes: number;
//       pendientesAlta: number;
//       tiempoTotal: number;
//       pendientes: Array<{
//         id: string;
//         nombre: string;
//         terminada: boolean;
//         confirmada: boolean;
//         duracionMin: number;
//         fechaCreacion: string;
//         fechaFinTerminada: string | null;
//         prioridad: string;
//       }>;
//     }>;
//   };
// }

interface HistorialMensaje {
  analisis: any
  role: "usuario" | "bot";
  contenido: string;
  timestamp: string;
  _id: string;
}


export interface HistorialSessionResponse {
  success: boolean;
  data: {
    _id: string;
    userId: string;
    sessionId: string;
    __v: number;
    createdAt: string;
    estadoAnterior: string | null;
    estadoConversacion: string;
    mensajes: HistorialMensaje[];
    updatedAt: string;
  } | null;
  proyectos: {
    _id: string;
    userId: string;
    nombre: string;
    actividades: Array<{
      ActividadId: string;
      estado: string;
      pendientes: Array<{
        pendienteId: string;
        nombre: string;
        descripcion: string;
        estado: string;
        _id: string;
      }>;
      _id: string;
    }>;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface PendienteDiario {
  pendienteId: string;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  terminada: boolean;
  motivoNoCompletado: string | null;
}

export interface ActividadDiaria {
  actividadId: string;
  titulo: string;
  tituloProyecto: string;
  horaInicio: string;
  horaFin: string;
  status: string;
  pendientes: PendienteDiario[];
}
export interface PendienteEstadoLocal extends PendienteDiario {
  actividadId: string;
  completadoLocal: boolean;
  motivoLocal: string;
}
// Agregar estos tipos a tu archivo @/lib/types.ts existente

export interface TaskExplanation {
  taskId: string;
  taskName: string;
  activityTitle: string;
  explanation: string;
  confirmed: boolean;
  priority: string;
  duration: number;
  timestamp: Date;
}



export interface ActividadConTareas {
  actividadId: string;
  actividadTitulo: string;
  actividadHorario: string;
  tareas: TareaConTiempo[];
}
export interface TareaConTiempo {
  id: string;
  nombre: string;
  terminada: boolean;
  confirmada: boolean;
  duracionMin: number;
  fechaCreacion: string;
  fechaFinTerminada: string | null;
  diasPendiente: number;
  prioridad: string;
  actividadId?: string;
  actividadTitulo?: string;
}
export interface ActividadBase {
  id: string;
  titulo: string;
  horario: string;
  status: string;
  proyecto: string;
  esHorarioLaboral: boolean;
  tieneRevisionesConTiempo: boolean;
}
export interface Message {
  id: string;
  type: "bot" | "user" | "system" | "voice" | "analysis";
  content: string | React.ReactNode;
  timestamp: Date;
  voiceText?: string;
   analisis?: any;
}

export type ConversacionSidebar = {
  sessionId: string;
  userId: string;
  nombreConversacion?: string;
  estadoConversacion: string;
  createdAt: string;
  updatedAt?: string;
};
export interface AssistantAnalysis {
  success: boolean;
  answer: string;
  provider: string;
  sessionId: string;
  proyectoPrincipal: string;
  metrics: {
    totalActividades: number;
    actividadesConTiempoTotal: number;
    actividadesFinales: number;
    tareasConTiempo: number;
    tareasAltaPrioridad: number;
    tiempoEstimadoTotal: string;
  };
  data: {
    actividades: Array<{
      id: string;
      titulo: string;
      horario: string;
      status: string;
      proyecto: string;
      esHorarioLaboral: boolean;
      tieneRevisionesConTiempo: boolean;
    }>;
    revisionesPorActividad: Array<{
      actividadId: string;
      actividadTitulo: string;
      actividadHorario: string;
      tareasConTiempo: Array<{
        id: string;
        nombre: string;
        terminada: boolean;
        confirmada: boolean;
        duracionMin: number;
        fechaCreacion: string;
        fechaFinTerminada: string | null;
        diasPendiente: number;
        prioridad: string;
      }>;
      totalTareasConTiempo: number;
      tareasAltaPrioridad: number;
      tiempoTotal: number;
      tiempoFormateado: string;
    }>;
  };
  multiActividad: boolean;
}

export  interface TaskExplanation {
  taskId: string;
  taskName: string;
  activityTitle: string;
  explanation: string;
  confirmed: boolean;
  priority: string;
  duration: number;
  timestamp: Date;
}
export interface ChatBotProps {
  colaborador: Colaborador;
  actividades: any[];
  onLogout: () => void;
}

export type ChatStep = "welcome" | "loading-analysis" | "show-analysis" | "finished";

export type VoiceModeStep =
  | "idle"
  | "confirm-start"
  | "activity-presentation"
  | "task-presentation"
  | "waiting-for-explanation"
  | "listening-explanation"
  | "processing-explanation"
  | "confirmation"
  | "summary"
  | "sending";

  interface Activity {
  actividadId: string;
  actividadTitulo: string;
  actividadHorario: string;
  tareas: Task[];
}

interface Task {
  id: string;
  nombre: string;
  prioridad: string;
  duracionMin: number;
  diasPendiente: number;
}



export interface VoiceGuidanceFlowProps {
  voiceMode: boolean;
  voiceStep: VoiceModeStep;
  theme: "light" | "dark";
  isSpeaking: boolean;
  currentActivityIndex: number;
  currentTaskIndex: number;
  activitiesWithTasks: Activity[];
  taskExplanations: TaskExplanation[];
  voiceTranscript: string;
  currentListeningFor: string;
  retryCount: number;
  voiceConfirmationText: string;
  rate: number;
  changeRate: (newRate: number) => void;
  cancelVoiceMode: () => void;
  confirmStartVoiceMode: () => void;
  speakTaskByIndices: (activityIndex: number, taskIndex: number) => void;
  startTaskExplanation: () => void;
  skipTask: () => void;
  stopRecording: () => void;
  confirmExplanation: () => void;
  retryExplanation: () => void;
  sendExplanationsToBackend: () => void;
  recognitionRef: React.MutableRefObject<any>;
  setIsRecording: (recording: boolean) => void;
  setIsListening: (listening: boolean) => void;
  setVoiceStep: (step: VoiceModeStep) => void;
  processVoiceExplanation?: (transcript: string) => void;
  setCurrentListeningFor: (text: string) => void;
}