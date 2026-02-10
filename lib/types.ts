import { MensajeHistorial } from "./interface/historial.interface";

export interface Project {
  id: string | null;
  name: string;
  estatusRevisionYPago: string;
  url: string | null;
  telegram: string | null;
}

export interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  theme: "light" | "dark";
  // AÑADE ESTA LÍNEA
  userEmail?: string;
  onVoiceMessageClick: (voiceText: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  assistantAnalysis?: AssistantAnalysis | null; // NUEVO
  onOpenReport: () => void;
  onStartVoiceMode?: () => void;
  setStep?: (step: string) => void;
  reportConfig?: {
    horaInicio: string;
    horaFin: string;
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
  // Nueva prop opcional para reportes
  onViewReports?: () => void;
}

export interface Actividad {
  id: string;
  titulo: string;
  project: Project;
  assignees: string[];
  status: string;
  prioridad: string;
  tipo: string;
  dueStart: string;
  dueEnd: string;
  tiempoReal: number;
  anotaciones: string;
  pasosYLinks: string;
  documentoCompartido: string | null;
  url: string;
  destacado: boolean;
  destacadoColor: string | null;
  pendientes: string[];
  archivosAdjuntos: string[];
  avanceIA: string;
  estatusMasterRollup: string;
  grupoWhatsapp?: string;
}

export interface Colaborador {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  collaboratorId: string;
  avatar?: string;
}

export interface TaskReport {
  taskId: string;
  titulo: string;
  tiempoTrabajado: number;
  descripcionTrabajo: string;
  completada: boolean;
}

export interface ReporteCompleto {
  colaborador: Colaborador;
  fecha: string;
  tareas: TaskReport[];
  totalTiempo: number;
}

export interface UsersApiResponse {
  items: Colaborador[];
}

export interface ActividadesApiResponse {
  success: boolean;
  data: Actividad[];
}

interface HistorialMensaje {
  analisis: any;
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
  descripcion?: string;
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
  descripcion?: string;
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
  isWide?: boolean;
}

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
      colaboradores?: string[];
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
        descripcion?: string;
        duracionMin: number;
        fechaCreacion: string;
        fechaFinTerminada: string | null;
        diasPendiente: number;
        prioridad: string;
        colaboradores?: string[];
      }>;
      totalTareasConTiempo: number;
      tareasAltaPrioridad: number;
      tiempoTotal: number;
      tiempoFormateado: string;
      colaboradores?: string[];
      assigneesOriginales?: string[];
    }>;
  };
  multiActividad: boolean;
  colaboradoresInvolucrados?: string[]; // AÑADIDO: Para TasksPanel
}

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

export interface ChatBotProps {
  colaborador: Colaborador;
  actividades?: any[];
  onLogout: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  conversacionActiva?: string | null;
  mensajesRestaurados?: MensajeHistorial[];
  analisisRestaurado?: AssistantAnalysis | null;
  onNuevaConversacion?: (conv: ConversacionSidebar) => void;
  onActualizarNombre?: (sessionId: string, nombre: string) => void;
  onActualizarTyping?: (isTyping: boolean) => void;
  memoriasUsuario?: string[];
  showLogoutDialog: boolean;
  setShowLogoutDialog: (show: boolean) => void;
  onViewReports?: () => void;
}

export type ChatStep =
  | "welcome"
  | "loading-analysis"
  | "show-analysis"
  | "finished"
  | "ready"
  | "error";

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
  finishVoiceMode: () => void;
  rate: number;
  changeRate: (newRate: number) => void;
  cancelVoiceMode: () => void;
  confirmStartVoiceMode: () => void;
  speakTaskByIndices: (activityIndex: number, taskIndex: number) => void;
  startTaskExplanation: () => void;
  skipTask: () => void;
  stopRecording: () => void;
  retryExplanation: () => void;
  sendExplanationsToBackend: () => void;
  recognitionRef: React.MutableRefObject<any>;
  setIsRecording: (recording: boolean) => void;
  setIsListening: (listening: boolean) => void;
  setVoiceStep: (step: VoiceModeStep) => void;
  processVoiceExplanation?: (transcript: string) => void;
  setCurrentListeningFor: (text: string) => void;
  setCurrentActivityIndex?: (index: number) => void;
  setCurrentTaskIndex?: (index: number) => void;
  setTaskExplanations?: (value: any[] | ((prev: any[]) => any[])) => void;
}

export interface ExtendedVoiceGuidanceFlowProps extends VoiceGuidanceFlowProps {
  autoSendVoice: {
    isRecording: boolean;
    isTranscribing: boolean;
    audioLevel: number;
    startVoiceRecording: () => Promise<void>;
    cancelVoiceRecording: () => Promise<void>;
  };
}

export interface ConsultarIAPayload {
  pregunta: string;
  pendienteNombre?: string;
  actividadTitulo?: string;
}

export interface ChatGeneralIAPayload {
  mensaje: string;
  historial?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface IAResponse {
  success: boolean;
  respuesta?: string;
  timestamp?: Date;
  error?: string;
}

export interface ChatContainerProps {
  colaborador: Colaborador;
  actividades: any[];
  onLogout: () => void;
}

export type ConversacionSidebar = {
  sessionId: string;
  userId: string;
  nombreConversacion?: string;
  estadoConversacion: string;
  createdAt: string;
  updatedAt?: string;
};

// AÑADIDO: Tipo para TasksPanel
export interface TasksPanelProps {
  actividadesConTareasPendientes: Array<{
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
      colaboradores?: string[];
    }>;
    totalTareasConTiempo: number;
    tareasAltaPrioridad: number;
    tiempoTotal: number;
    tiempoFormateado: string;
    colaboradores?: string[];
  }>;
  totalTareasPendientes: number;
  esHoraReporte: boolean;
  theme: "light" | "dark";
  assistantAnalysis: AssistantAnalysis;
  onOpenReport?: () => void;
  onStartVoiceMode?: () => void;
  // Props para manejar selección
  tareasSeleccionadas?: Set<string>;
  onToggleTarea?: (tareaId: string) => void;
  onSeleccionarTodas?: () => void;
  onDeseleccionarTodas?: () => void;
  // Función para explicar tareas seleccionadas
  onExplicarTareasSeleccionadas?: () => void;
}

// AÑADIDO: Tipo para NoTasksMessage
export interface NoTasksMessageProps {
  theme: "light" | "dark";
}

// AÑADIDO: Tipo para ActivityItem
export interface ActivityItemProps {
  revision: any;
  actividad: any;
  index: number;
  theme: "light" | "dark";
  tareasSeleccionadas: Set<string>;
  onToggleTarea: (tareaId: string) => void;
  todosColaboradores: string[];
}

// AÑADIDO: Tipo para TaskItem
export interface TaskItemProps {
  tarea: any;
  theme: "light" | "dark";
  estaSeleccionada: boolean;
  onToggleSeleccion: () => void;
}

// AÑADIDO: Tipo para TasksPanelFooter
export interface TasksPanelFooterProps {
  totalTareasPendientes: number;
  esHoraReporte: boolean;
  theme: "light" | "dark";
  onOpenReport?: () => void;
  onStartVoiceMode?: () => void;
  todosColaboradores: string[];
  // Nuevos props
  tareasSeleccionadas: Set<string>;
  onSeleccionarTodas: () => void;
  onDeseleccionarTodas: () => void;
  onExplicarTareasSeleccionadas: () => void;
}

// AÑADIDO: Tipo para TypingIndicator
export interface TypingIndicatorProps {
  theme: "light" | "dark";
}
