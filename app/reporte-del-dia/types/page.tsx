"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import LoadingScreen from "../components/LoadingScreen";
import ErrorScreen from "../components/ErrorScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Download, 
  RefreshCw, 
  Search, 
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  FileText,
  ListChecks,
  Eye,
  EyeOff,
  Mic,
  X,
  Play
} from "lucide-react";
import {
  useActividadesData,
  obtenerFechaPorDias,
} from "@/app/reporte-del-dia/hooks/useReporteData";
import { Actividad, Tarea } from "../components/types";

// Modal de confirmación de dictado por voz
const ModalConfirmacionDictado = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  actividad,
  tareas
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (tareasSeleccionadas: Tarea[]) => void;
  actividad: Actividad | null;
  tareas: Tarea[];
}) => {
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Debug: Ver qué datos llegan
  useEffect(() => {
    if (isOpen && actividad) {
      console.log('🎤 Modal abierto - Actividad:', {
        id: actividad.actividadId,
        titulo: actividad.titulo,
        totalTareas: actividad.totalTareas,
        tareasConExplicacion: actividad.tareasConExplicacion,
        tareas: actividad.tareas.map(t => ({
          id: t.pendienteId,
          nombre: t.nombre,
          tieneExplicacion: t.tieneExplicacion,
          explicacion: t.explicacionActual?.texto?.substring(0, 50) + '...'
        }))
      });
    }
  }, [isOpen, actividad]);

  // Inicializar selección cuando se abre el modal
  useEffect(() => {
    if (isOpen && tareas.length > 0) {
      // Seleccionar automáticamente las tareas con explicación
      const tareasConExplicacion = tareas
        .filter(t => t.tieneExplicacion === true)
        .map(t => t.pendienteId);
      
      console.log('📋 Tareas con explicación encontradas:', tareasConExplicacion.length);
      setTareasSeleccionadas(new Set(tareasConExplicacion));
    } else {
      setTareasSeleccionadas(new Set());
    }
  }, [isOpen, tareas]);

  if (!isOpen || !actividad) return null;

  const totalTareasConExplicacion = tareas.filter(t => t.tieneExplicacion === true).length;
  const tareasSeleccionadasArray = Array.from(tareasSeleccionadas);

  const toggleTarea = (tareaId: string) => {
    const newSelection = new Set(tareasSeleccionadas);
    if (newSelection.has(tareaId)) {
      newSelection.delete(tareaId);
    } else {
      newSelection.add(tareaId);
    }
    setTareasSeleccionadas(newSelection);
  };

  const seleccionarTodas = () => {
    setTareasSeleccionadas(new Set(
      tareas
        .filter(t => t.tieneExplicacion === true)
        .map(t => t.pendienteId)
    ));
    toast({
      title: "✅ Seleccionadas todas",
      description: `${totalTareasConExplicacion} tareas seleccionadas`,
      duration: 2000
    });
  };

  const limpiarSeleccion = () => {
    setTareasSeleccionadas(new Set());
    toast({
      title: "🧹 Selección limpiada",
      description: "No hay tareas seleccionadas",
      duration: 2000
    });
  };

  const handleConfirm = () => {
    if (tareasSeleccionadas.size === 0) {
      toast({
        title: "❌ No hay tareas seleccionadas",
        description: "Selecciona al menos una tarea para dictar",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    const tareasAConfirmar = tareas.filter(t => tareasSeleccionadas.has(t.pendienteId));
    console.log('🎤 Confirmando dictado para:', tareasAConfirmar.length, 'tareas');
    onConfirm(tareasAConfirmar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111] border border-[#00ff00]/30 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl shadow-[#00ff00]/20">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gradient-to-r from-[#1a1a1a] to-[#111]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#00ff00]/10 rounded-lg animate-pulse">
              <Mic className="w-6 h-6 text-[#00ff00]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Confirmar dictado por voz
                <span className="text-xs bg-[#00ff00] text-black px-2 py-1 rounded-full font-medium">
                  {tareasSeleccionadas.size} de {totalTareasConExplicacion}
                </span>
              </h2>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <span className="max-w-md truncate">{actividad.titulo}</span>
                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                <span>{actividad.fecha}</span>
                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                <span>{actividad.proyecto || "Sin proyecto"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {/* Info bar */}
          <div className="bg-[#1a1a1a] border border-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-400">Total tareas:</span>
                <span className="text-white font-medium">{tareas.length}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">Con explicación:</span>
                <span className="text-[#00ff00] font-medium">{totalTareasConExplicacion}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">Seleccionadas:</span>
                <span className="text-[#00ff00] font-medium">{tareasSeleccionadas.size}</span>
              </div>
            </div>
          </div>

          {/* Acciones masivas */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[#00ff00]" />
              Tareas disponibles
            </h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={seleccionarTodas}
                disabled={totalTareasConExplicacion === 0}
                className="h-8 px-3 text-xs text-gray-400 hover:text-white border border-white/5 rounded-lg disabled:opacity-50"
              >
                Seleccionar todas
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={limpiarSeleccion}
                className="h-8 px-3 text-xs text-gray-400 hover:text-white border border-white/5 rounded-lg"
              >
                Limpiar
              </Button>
            </div>
          </div>

          {/* Lista de tareas */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {tareas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay tareas en esta actividad
              </div>
            ) : (
              tareas.map((tarea, index) => {
                const tieneExplicacion = tarea.tieneExplicacion === true;
                const estaSeleccionada = tareasSeleccionadas.has(tarea.pendienteId);
                
                return (
                  <div
                    key={tarea.pendienteId}
                    className={`
                      border rounded-lg transition-all duration-200
                      ${tieneExplicacion 
                        ? estaSeleccionada
                          ? 'border-[#00ff00] bg-[#00ff00]/5'
                          : 'border-white/5 bg-[#1a1a1a] hover:border-white/10'
                        : 'border-white/5 bg-[#1a1a1a]/50 opacity-50'
                      }
                    `}
                  >
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={estaSeleccionada}
                            onChange={() => toggleTarea(tarea.pendienteId)}
                            disabled={!tieneExplicacion}
                            className="w-4 h-4 rounded border-white/20 bg-[#111] text-[#00ff00] focus:ring-[#00ff00] focus:ring-offset-0 disabled:opacity-50"
                          />
                        </div>

                        {/* Número de orden */}
                        <div className="flex-shrink-0 w-6 h-6 bg-[#111] border border-white/5 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-400">{index + 1}</span>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">
                              {tarea.nombre}
                            </span>
                            {tarea.prioridad && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                tarea.prioridad === 'ALTA' ? 'bg-red-500/10 text-red-400' :
                                tarea.prioridad === 'MEDIA' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-blue-500/10 text-blue-400'
                              }`}>
                                {tarea.prioridad}
                              </span>
                            )}
                          </div>

                          {/* Metadatos */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                            {tarea.duracionMin > 0 && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {tarea.duracionMin} min
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span className={tarea.terminada ? 'text-green-400' : 'text-yellow-400'}>
                              {tarea.terminada ? 'Completada' : 'Pendiente'}
                            </span>
                            {tieneExplicacion && (
                              <>
                                <span>•</span>
                                <span className="text-[#00ff00] flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Con explicación
                                </span>
                              </>
                            )}
                          </div>

                          {/* Explicación */}
                          {tarea.explicacionActual && (
                            <div className="bg-[#111] border border-[#00ff00]/10 rounded-lg p-3 mt-2">
                              <p className="text-sm text-gray-300 mb-2">
                                {tarea.explicacionActual.texto}
                              </p>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">
                                  {tarea.explicacionActual.email?.split('@')[0] || 'Usuario'}
                                </span>
                                <span className="text-gray-600">
                                  {new Date(tarea.explicacionActual.fecha).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-white/5 bg-[#1a1a1a]">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span>Se dictarán {tareasSeleccionadas.size} tarea{tareasSeleccionadas.size !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-10 px-4 text-sm text-gray-400 hover:text-white border border-white/5 rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={tareasSeleccionadas.size === 0}
              className={`
                h-10 px-5 text-sm font-medium rounded-lg transition-all duration-300
                ${tareasSeleccionadas.size > 0
                  ? 'bg-[#00ff00] hover:bg-[#00dd00] text-black shadow-[0_0_20px_#00ff00]'
                  : 'bg-gray-800 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar dictado ({tareasSeleccionadas.size})
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default function PanelAdminActividades() {
  const { toast } = useToast();

  const {
    actividades,
    loading,
    error,
    refreshing,
    totalActividades,
    totalTareas,
    cargarActividades,
  } = useActividadesData();

  // Estados para filtros
  const [filtroFecha, setFiltroFecha] = useState<string>("todos");
  const [filtroProyecto, setFiltroProyecto] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busquedaTexto, setBusquedaTexto] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  
  // Estados para ordenamiento
  const [ordenarPor, setOrdenarPor] = useState<string>("fecha");
  const [ordenAsc, setOrdenAsc] = useState<boolean>(false);
  
  // Estados para expansión
  const [actividadExpandida, setActividadExpandida] = useState<string | null>(null);
  const [tareaExpandida, setTareaExpandida] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  
  // Estado para controlar visibilidad de botones de acción
  const [mostrarAcciones, setMostrarAcciones] = useState(false);
  
  // Estados para dictado
  const [modalDictadoAbierto, setModalDictadoAbierto] = useState(false);
  const [actividadParaDictado, setActividadParaDictado] = useState<Actividad | null>(null);

  const fechaActual = new Date().toISOString().split("T")[0];

  // Debug: Ver actividades cargadas
  useEffect(() => {
    if (actividades.length > 0) {
      console.log('📊 Actividades cargadas:', {
        total: actividades.length,
        primeraActividad: actividades[0] ? {
          id: actividades[0].actividadId,
          titulo: actividades[0].titulo,
          tareasConExplicacion: actividades[0].tareasConExplicacion,
          totalTareas: actividades[0].totalTareas
        } : null
      });
    }
  }, [actividades]);

  // Función para abrir modal de confirmación de dictado
  const abrirConfirmacionDictado = (actividad: Actividad) => {
    console.log('🎤 Abriendo dictado para actividad:', {
      id: actividad.actividadId,
      titulo: actividad.titulo,
      tareasConExplicacion: actividad.tareasConExplicacion,
      totalTareas: actividad.totalTareas
    });

    // Verificar si hay tareas con explicación
    if (actividad.tareasConExplicacion === 0) {
      toast({
        title: "❌ No hay tareas para dictar",
        description: "Esta actividad no tiene tareas con explicaciones",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    setActividadParaDictado(actividad);
    setModalDictadoAbierto(true);
    
    toast({
      title: "🎤 Preparando dictado",
      description: `Se encontraron ${actividad.tareasConExplicacion} tareas con explicaciones`,
      duration: 3000
    });
  };

  // Función para iniciar el dictado después de confirmar
  const iniciarDictadoConfirmado = (tareasSeleccionadas: Tarea[]) => {
    setModalDictadoAbierto(false);
    
    console.log('🎤 Iniciando dictado con tareas:', tareasSeleccionadas);
    
    toast({
      title: "🎤 Dictado iniciado",
      description: `Comenzando con ${tareasSeleccionadas.length} tarea${tareasSeleccionadas.length !== 1 ? 's' : ''}`,
      duration: 3000
    });

    // Aquí iría la lógica real de dictado
    setTimeout(() => {
      toast({
        title: "✅ Dictado completado",
        description: "Se han procesado todas las tareas seleccionadas",
        duration: 4000
      });
    }, 2000);
  };

  // Obtener valores únicos
  const proyectosUnicos = useMemo(() => {
    if (!actividades) return [];
    const proyectos = new Set(actividades.map(a => a.proyecto).filter(Boolean));
    return Array.from(proyectos).sort();
  }, [actividades]);

  const statusUnicos = useMemo(() => {
    if (!actividades) return [];
    const status = new Set(actividades.map(a => a.status).filter(Boolean));
    return Array.from(status).sort();
  }, [actividades]);

  // Filtrado
  const actividadesFiltradas = useMemo(() => {
    if (!actividades) return [];
    return actividades.filter(act => {
      // Filtro fecha
      if (filtroFecha !== "todos") {
        const fechaAct = new Date(act.fecha);
        switch (filtroFecha) {
          case "hoy": if (act.fecha !== fechaActual) return false; break;
          case "ayer": if (act.fecha !== obtenerFechaPorDias(1)) return false; break;
          case "ultima_semana": {
            const semanaPasada = new Date(); semanaPasada.setDate(semanaPasada.getDate() - 7);
            if (fechaAct < semanaPasada) return false; break;
          }
          case "ultimo_mes": {
            const mesPasado = new Date(); mesPasado.setDate(mesPasado.getDate() - 30);
            if (fechaAct < mesPasado) return false; break;
          }
          case "rango":
            if (fechaInicio && act.fecha < fechaInicio) return false;
            if (fechaFin && act.fecha > fechaFin) return false; break;
        }
      }
      
      // Filtro proyecto
      if (filtroProyecto !== "todos" && act.proyecto !== filtroProyecto) return false;
      
      // Filtro status
      if (filtroStatus !== "todos" && act.status !== filtroStatus) return false;
      
      // Búsqueda texto
      if (busquedaTexto) {
        const t = busquedaTexto.toLowerCase();
        if (!act.titulo.toLowerCase().includes(t) && 
            !act.tareas.some(ta => 
              ta.nombre.toLowerCase().includes(t) || 
              (ta.descripcion && ta.descripcion.toLowerCase().includes(t)) ||
              (ta.explicacionActual?.texto.toLowerCase().includes(t))
            )) return false;
      }
      return true;
    });
  }, [actividades, filtroFecha, filtroProyecto, filtroStatus, busquedaTexto, fechaInicio, fechaFin, fechaActual]);

  // Ordenamiento
  const actividadesOrdenadas = useMemo(() => {
    return [...actividadesFiltradas].sort((a, b) => {
      let cmp = 0;
      if (ordenarPor === "fecha") cmp = a.fecha.localeCompare(b.fecha);
      else if (ordenarPor === "proyecto") cmp = (a.proyecto||"").localeCompare(b.proyecto||"");
      else if (ordenarPor === "titulo") cmp = a.titulo.localeCompare(b.titulo);
      else if (ordenarPor === "tareas") cmp = (a.totalTareas||0) - (b.totalTareas||0);
      else if (ordenarPor === "explicaciones") cmp = (a.tareasConExplicacion||0) - (b.tareasConExplicacion||0);
      return ordenAsc ? cmp : -cmp;
    });
  }, [actividadesFiltradas, ordenarPor, ordenAsc]);

  // Exportar CSV
  const exportarACSV = () => {
    if (!actividades?.length) return;
    
    // ... (código de exportación igual)
  };

  const toggleOrden = (c: string) => {
    if (ordenarPor === c) setOrdenAsc(!ordenAsc);
    else { setOrdenarPor(c); setOrdenAsc(false); }
  };

  const limpiarFiltros = () => {
    setBusquedaTexto(""); 
    setFiltroFecha("todos"); 
    setFiltroProyecto("todos"); 
    setFiltroStatus("todos");
    setFechaInicio(""); 
    setFechaFin("");
    toast({ 
      title: "Filtros limpiados", 
      description: "Todos los filtros han sido restablecidos",
      duration: 2000
    });
  };

  if (loading) return <LoadingScreen />;
  if (error || !actividades) return <ErrorScreen onRetry={() => cargarActividades(true)} />;

  return (
    <div className="font-['Inter',sans-serif] min-h-screen bg-[#0a0a0a] text-gray-100 p-6">
      {/* Modal de confirmación de dictado */}
      <ModalConfirmacionDictado 
        isOpen={modalDictadoAbierto}
        onClose={() => setModalDictadoAbierto(false)}
        onConfirm={iniciarDictadoConfirmado}
        actividad={actividadParaDictado}
        tareas={actividadParaDictado?.tareas || []}
      />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">
              Panel de Actividades
            </h1>
            <p className="text-sm text-gray-500">
              {actividadesOrdenadas.length} actividades · {totalTareas} tareas · {
                actividades.reduce((acc, act) => acc + act.tareasConExplicacion, 0)
              } explicaciones
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMostrarAcciones(!mostrarAcciones)}
              className="h-9 px-3 text-gray-400 hover:text-white border border-white/10 rounded-lg"
            >
              {mostrarAcciones ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {mostrarAcciones ? 'Ocultar' : 'Mostrar'} acciones
            </Button>

            <Button
              size="sm"
              onClick={() => cargarActividades(true)}
              disabled={refreshing}
              className="h-9 px-3 bg-[#6841ea] hover:bg-[#7a4cf5] text-white rounded-lg"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Tabla principal */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#111] border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1a1a1a] border-b border-white/5">
                <tr>
                  <th className="px-3 py-3 w-6"></th>
                  <th className="px-3 py-3 text-left">Fecha</th>
                  <th className="px-3 py-3 text-left">Proyecto</th>
                  <th className="px-3 py-3 text-left">Actividad</th>
                  <th className="px-3 py-3 text-left">Tareas</th>
                  <th className="px-3 py-3 text-left">Explicaciones</th>
                  <th className="px-3 py-3 text-left">Colaboradores</th>
                  {mostrarAcciones && (
                    <th className="px-3 py-3 text-center">Acciones</th>
                  )}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-white/5">
                {actividadesOrdenadas.map((act) => (
                  <React.Fragment key={act.actividadId}>
                    {/* Fila actividad */}
                    <tr 
                      className="hover:bg-white/5 cursor-pointer"
                      onClick={() => setActividadExpandida(actividadExpandida === act.actividadId ? null : act.actividadId)}
                    >
                      <td className="px-3 py-3">
                        {actividadExpandida === act.actividadId ? 
                          <ChevronUp className="w-4 h-4 text-[#6841ea]" /> : 
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        }
                      </td>
                      <td className="px-3 py-3">{act.fecha}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-1 bg-[#1a1a1a] border border-white/5 text-xs">
                          {act.proyecto}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-white">{act.titulo}</div>
                        <div className="text-xs text-gray-500">{act.status}</div>
                      </td>
                      <td className="px-3 py-3">
                        {act.totalTareas}
                        {act.totalTareas > 0 && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({Math.round((act.tareasConExplicacion / act.totalTareas) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {act.tareasConExplicacion > 0 ? (
                          <span className="text-green-400 font-medium">{act.tareasConExplicacion}</span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex -space-x-2">
                          {act.colaboradores?.slice(0, 3).map((email, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-xs font-medium text-gray-300"
                              title={email}
                            >
                              {email.charAt(0).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </td>
                      
                      {mostrarAcciones && (
                        <td className="px-3 py-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirConfirmacionDictado(act);
                            }}
                            disabled={act.tareasConExplicacion === 0}
                            className={`
                              h-8 px-2 text-xs transition-all rounded-lg
                              ${act.tareasConExplicacion > 0
                                ? 'text-[#00ff00] hover:text-white hover:bg-[#00ff00]/20 border border-[#00ff00]/30'
                                : 'text-gray-600 cursor-not-allowed'
                              }
                            `}
                            title={act.tareasConExplicacion > 0 
                              ? `Dictar ${act.tareasConExplicacion} tareas` 
                              : "No hay tareas con explicación"
                            }
                          >
                            <Mic className="w-3.5 h-3.5 mr-1" />
                            {act.tareasConExplicacion}
                          </Button>
                        </td>
                      )}
                    </tr>

                    {/* Tareas expandidas */}
                    {actividadExpandida === act.actividadId && (
                      <tr>
                        <td colSpan={mostrarAcciones ? 8 : 7} className="p-0 bg-[#1a1a1a]">
                          <div className="border-t border-white/5 p-4">
                            <h4 className="text-sm font-medium text-white mb-3">
                              Tareas ({act.tareas.length})
                            </h4>
                            
                            <div className="space-y-2">
                              {act.tareas.map((t) => (
                                <div
                                  key={t.pendienteId}
                                  className="bg-[#111] border border-white/5 rounded-lg p-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-white">
                                          {t.nombre}
                                        </span>
                                        {t.prioridad && (
                                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            t.prioridad === 'ALTA' ? 'bg-red-500/10 text-red-400' :
                                            'bg-yellow-500/10 text-yellow-400'
                                          }`}>
                                            {t.prioridad}
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                        {t.duracionMin > 0 && (
                                          <>
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {t.duracionMin} min
                                            </span>
                                            <span>•</span>
                                          </>
                                        )}
                                        <span className={t.terminada ? 'text-green-400' : 'text-yellow-400'}>
                                          {t.terminada ? 'Completada' : 'Pendiente'}
                                        </span>
                                        {t.tieneExplicacion && (
                                          <>
                                            <span>•</span>
                                            <span className="text-green-400 flex items-center gap-1">
                                              <CheckCircle className="w-3 h-3" />
                                              Con explicación
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}