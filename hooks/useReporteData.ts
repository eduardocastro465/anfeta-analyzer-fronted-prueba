// hooks/useReporteData.ts

// Función para obtener iniciales de un nombre
export function obtenerIniciales(nombre: string): string {
  if (!nombre) return '';
  return nombre
    .split(' ')
    .map(palabra => palabra[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Función para obtener fecha por días atrás
export function obtenerFechaPorDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString().split('T')[0];
}

// Función para formatear tiempo en minutos a horas:minutos
export function formatearTiempo(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${horas}h ${mins}m`;
}

// Función para calcular porcentaje
export function calcularPorcentaje(actual: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((actual / total) * 100);
}

// Hook para obtener datos de reporte
export function useReporteData() {
  const obtenerResumenPorFecha = (actividades: ActividadConUsuario[], fecha: string) => {
    const actividadesFecha = actividades.filter(a => a.fecha === fecha);
    
    return {
      totalActividades: actividadesFecha.length,
      totalTareas: actividadesFecha.reduce((sum, a) => sum + a.pendientes.length, 0),
      tareasTerminadas: actividadesFecha.reduce((sum, a) => 
        sum + a.pendientes.filter(t => t.terminada).length, 0),
      tareasConfirmadas: actividadesFecha.reduce((sum, a) => 
        sum + a.pendientes.filter(t => t.confirmada).length, 0),
      tiempoTotal: actividadesFecha.reduce((sum, a) => 
        sum + a.pendientes.reduce((sumT, t) => sumT + t.duracionMin, 0), 0),
      usuariosUnicos: new Set(actividadesFecha.map(a => a.usuario._id)).size
    };
  };

  const filtrarActividadesPorFecha = (
    actividades: ActividadConUsuario[], 
    filtro: string,
    fechaActual: string
  ) => {
    switch (filtro) {
      case "hoy":
        return actividades.filter(actividad =>
          actividad.fecha === fechaActual
        );

      case "ayer":
        const fechaAyer = obtenerFechaPorDias(1);
        return actividades.filter(actividad =>
          actividad.fecha === fechaAyer
        );

      case "ultima_semana":
        const fechaSemanaPasada = obtenerFechaPorDias(7);
        return actividades.filter(actividad =>
          new Date(actividad.fecha) >= new Date(fechaSemanaPasada)
        );

      case "ultimo_mes":
        const fechaMesPasado = obtenerFechaPorDias(30);
        return actividades.filter(actividad =>
          new Date(actividad.fecha) >= new Date(fechaMesPasado)
        );

      case "todos":
      default:
        return actividades;
    }
  };

  const agruparActividadesPorFecha = (actividades: ActividadConUsuario[]) => {
    return actividades.reduce((acc, actividad) => {
      const fecha = actividad.fecha;
      if (!acc[fecha]) {
        acc[fecha] = [];
      }
      acc[fecha].push(actividad);
      return acc;
    }, {} as Record<string, ActividadConUsuario[]>);
  };

  const ordenarActividadesRecientes = (actividades: ActividadConUsuario[]) => {
    return [...actividades]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 15);
  };

  return {
    obtenerIniciales,
    obtenerFechaPorDias,
    formatearTiempo,
    calcularPorcentaje,
    obtenerResumenPorFecha,
    filtrarActividadesPorFecha,
    agruparActividadesPorFecha,
    ordenarActividadesRecientes
  };
}