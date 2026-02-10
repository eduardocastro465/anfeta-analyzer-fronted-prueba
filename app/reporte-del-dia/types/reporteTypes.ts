// types/reporteTypes.ts

export type DetalleView = 'dashboard' | 'general' | 'usuario' | 'actividad' | 'tarea';

export interface Pendiente {
  pendienteId: string;
  nombre: string;
  descripcion?: string;
  duracionMin: number;
  terminada: boolean;
  confirmada: boolean;
  fechaCreacion: string;
  fechaFinTerminada?: string;
}

export interface Actividad {
  actividadId: string;
  titulo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  status: 'activo' | 'completada' | 'pendiente';
  pendientes: Pendiente[];
  ultimaActualizacion: string;
}

export interface Usuario {
  _id: string;
  odooUserId: string;
  email: string;
  nombre: string;
  fuente: string;
  createdAt: string;
  actividades: Actividad[];
  estadisticas: {
    totalActividades: number;
    totalTareas: number;
    tareasTerminadas: number;
    tiempoTotalMinutos: number;
  };
}

export interface ApiResponse {
  estadisticas: {
    totalUsuarios: number;
    usuariosConActividades: number;
    totalTareas: number;
    totalTareasTerminadas: number;
    tiempoTotalFormateado: string;
    tiempoTotalMinutos: number;
    porcentajeTerminadas: number;
    porcentajeConfirmadas: number;
    porcentajeConActividades: number;
  };
  data: {
    usuarios: Usuario[];
  };
}

// Opcional: Tipo para actividad con usuario incluido
export interface ActividadConUsuario extends Actividad {
  usuario: Usuario;
}