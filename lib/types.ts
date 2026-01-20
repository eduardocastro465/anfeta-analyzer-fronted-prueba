export interface Project {
  id: string | null
  name: string
  estatusRevisionYPago: string
  url: string | null
  telegram: string | null
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
export interface AssistantAnalysis {
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