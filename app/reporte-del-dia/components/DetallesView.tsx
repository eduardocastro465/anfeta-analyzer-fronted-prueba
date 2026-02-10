import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  Hash,
  Calendar,
  Clock,
  User,
  Folder,
  File,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Timer,
  ArrowLeft,
  Eye,
  Play,
  Pause,
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Activity,
  Target,
  Percent,
  Users,
  CalendarDays,
  Sunrise,
  Sunset
} from "lucide-react";
import { ApiResponse, DetalleView, Usuario, Actividad, Pendiente } from "./types";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface DetallesViewProps {
  detalleView: DetalleView;
  datos: ApiResponse;
  selectedUser: Usuario | null;
  selectedActivity: Actividad | null;
  selectedTask: Pendiente | null;
  onBackToGeneral: () => void;
  onBackToUser: () => void;
  onViewActivity: (actividad: Actividad, usuario: Usuario) => void;
  onViewTask: (tarea: Pendiente, actividad: Actividad, usuario: Usuario) => void;
  onViewUser: (usuario: Usuario) => void;
  obtenerIniciales: (nombre: string) => string;
}

export default function DetallesView({
  detalleView,
  datos,
  selectedUser,
  selectedActivity,
  selectedTask,
  onBackToGeneral = () => console.warn("onBackToGeneral no proporcionado"),
  onBackToUser = () => console.warn("onBackToUser no proporcionado"),
  onViewActivity = () => console.warn("onViewActivity no proporcionado"),
  onViewTask = () => console.warn("onViewTask no proporcionado"),
  onViewUser = () => console.warn("onViewUser no proporcionado"),
  obtenerIniciales
}: DetallesViewProps) {
  const { toast } = useToast();
  const [detalleNotas, setDetalleNotas] = useState("");
  const [detalleEstado, setDetalleEstado] = useState<"pendiente" | "en_progreso" | "terminada" | "bloqueada">("pendiente");
  const [tareaSearch, setTareaSearch] = useState("");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [usuarioSearch, setUsuarioSearch] = useState("");

  const agregarNotaDetalle = () => {
    if (detalleNotas.trim()) {
      toast({
        title: "Nota agregada",
        description: "La nota se ha guardado correctamente",
      });
      setDetalleNotas("");
    }
  };

  const cambiarEstadoTarea = () => {
    toast({
      title: "Estado actualizado",
      description: `El estado ha sido cambiado a ${detalleEstado}`,
    });
  };

  // Función para detectar si un reporte es de mañana o tarde
  const detectarTurnoReporte = (horaInicio: string): 'mañana' | 'tarde' | 'indeterminado' => {
    const hora = parseInt(horaInicio.split(':')[0]);
    if (hora >= 0 && hora < 12) return 'mañana';
    if (hora >= 12 && hora < 24) return 'tarde';
    return 'indeterminado';
  };

  // Vista General de Detalles - LISTA DE USUARIOS CON TABLA COMPACTA
  if (detalleView === 'general') {
    const usuariosFiltrados = useMemo(() => {
      if (!usuarioSearch) return datos.data.usuarios;
      
      const searchTerm = usuarioSearch.toLowerCase();
      return datos.data.usuarios.filter(usuario =>
        usuario.nombre.toLowerCase().includes(searchTerm) ||
        usuario.email.toLowerCase().includes(searchTerm) ||
        usuario.odooUserId.toLowerCase().includes(searchTerm)
      );
    }, [datos.data.usuarios, usuarioSearch]);

    return (
      <div className="font-arial p-4 space-y-4">
        <Card className="bg-[#2a2a2a] border-none rounded-lg">
          <CardHeader className="p-4 pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-gray-100 text-lg">Reportes de Colaboradores</CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  Selecciona un colaborador para ver sus reportes
                </CardDescription>
              </div>
              
              <div className="relative w-full md:w-56">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Buscar colaborador..."
                  value={usuarioSearch}
                  onChange={(e) => setUsuarioSearch(e.target.value)}
                  className="pl-10 bg-gray-800 border-none text-gray-100 placeholder:text-gray-500 h-9 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-[#1a1a1a]">
                  <TableRow className="border-none">
                    <TableHead className="text-gray-300 font-medium text-sm py-3">Colaborador</TableHead>
                    <TableHead className="text-gray-300 font-medium text-sm py-3">Actividades</TableHead>
                    <TableHead className="text-gray-300 font-medium text-sm py-3">Tareas</TableHead>
                    <TableHead className="text-gray-300 font-medium text-sm py-3">Progreso</TableHead>
                    <TableHead className="text-gray-300 font-medium text-sm py-3 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.map((usuario) => {
                    const porcentaje = usuario.estadisticas.totalTareas > 0 
                      ? Math.round((usuario.estadisticas.tareasTerminadas / usuario.estadisticas.totalTareas) * 100)
                      : 0;
                    
                    return (
                      <TableRow 
                        key={usuario._id} 
                        className="bg-[#1a1a1a] hover:bg-[#1f1f1f] cursor-pointer"
                        onClick={() => onViewUser(usuario)}
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                                {obtenerIniciales(usuario.nombre)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-100 text-sm truncate">{usuario.nombre}</div>
                              <div className="text-xs text-gray-500 truncate">{usuario.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge className="bg-gray-800 text-gray-300 text-xs px-2">
                            {usuario.estadisticas.totalActividades}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col gap-1">
                            <Badge className="bg-gray-800 text-gray-300 text-xs px-2 w-fit">
                              {usuario.estadisticas.totalTareas}
                            </Badge>
                            {usuario.estadisticas.tareasTerminadas > 0 && (
                              <Badge className="bg-green-500/20 text-green-400 text-xs px-2 w-fit border-green-500/30">
                                {usuario.estadisticas.tareasTerminadas}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="w-28">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">{porcentaje}%</span>
                            </div>
                            <Progress 
                              value={porcentaje}
                              className="h-1.5 bg-gray-700"
                            >
                              <div className={`h-full rounded-full ${
                                porcentaje >= 100 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
                              }`} />
                            </Progress>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewUser(usuario);
                            }}
                            className="bg-[#6841ea] hover:bg-[#5a36d1] text-white h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {usuariosFiltrados.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">
                No se encontraron colaboradores que coincidan con la búsqueda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista Detalle de Usuario - ACTIVIDADES AGRUPADAS POR FECHA CON DETALLES DE TURNO
  if (detalleView === 'usuario' && selectedUser) {
    const actividadesPorFecha = useMemo(() => {
      return selectedUser.actividades.reduce((acc, actividad) => {
        const fecha = actividad.fecha;
        if (!acc[fecha]) {
          acc[fecha] = [];
        }
        acc[fecha].push(actividad);
        return acc;
      }, {} as Record<string, typeof selectedUser.actividades>);
    }, [selectedUser.actividades]);

    const fechasOrdenadas = Object.keys(actividadesPorFecha).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    const toggleDateExpand = (fecha: string) => {
      const newExpanded = new Set(expandedDates);
      if (newExpanded.has(fecha)) {
        newExpanded.delete(fecha);
      } else {
        newExpanded.add(fecha);
      }
      setExpandedDates(newExpanded);
    };

    // Función para obtener reportes de mañana y tarde
    const obtenerReportesPorTurno = (actividades: typeof selectedUser.actividades) => {
      const reportes = {
        mañana: [] as typeof actividades,
        tarde: [] as typeof actividades,
        indeterminado: [] as typeof actividades
      };

      actividades.forEach(actividad => {
        const turno = detectarTurnoReporte(actividad.horaInicio);
        reportes[turno].push(actividad);
      });

      return reportes;
    };

    return (
      <div className="p-4 space-y-4">
        {/* User Profile Card Compacta */}
        <Card className="bg-[#2a2a2a] border-none rounded-lg">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="shrink-0">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-lg">
                    {obtenerIniciales(selectedUser.nombre)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-xl font-bold text-gray-100">{selectedUser.nombre}</h2>
                    <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-purple-500/30 text-xs">
                      {selectedUser.fuente}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {selectedUser.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      ID: {selectedUser.odooUserId}
                    </span>
                  </div>
                </div>
                
                {/* Estadísticas Compactas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 bg-gray-800/30 rounded border border-gray-700/50">
                    <div className="flex items-center gap-1 mb-1">
                      <Activity className="w-3 h-3 text-purple-400" />
                      <p className="text-xs text-gray-400">Actividades</p>
                    </div>
                    <p className="text-lg font-bold text-gray-100">{selectedUser.estadisticas.totalActividades}</p>
                  </div>
                  <div className="p-2 bg-gray-800/30 rounded border border-gray-700/50">
                    <div className="flex items-center gap-1 mb-1">
                      <Target className="w-3 h-3 text-pink-400" />
                      <p className="text-xs text-gray-400">Tareas</p>
                    </div>
                    <p className="text-lg font-bold text-gray-100">{selectedUser.estadisticas.totalTareas}</p>
                  </div>
                  <div className="p-2 bg-gray-800/30 rounded border border-gray-700/50">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <p className="text-xs text-gray-400">Terminadas</p>
                    </div>
                    <p className="text-lg font-bold text-green-400">{selectedUser.estadisticas.tareasTerminadas}</p>
                  </div>
                  <div className="p-2 bg-gray-800/30 rounded border border-gray-700/50">
                    <div className="flex items-center gap-1 mb-1">
                      <Timer className="w-3 h-3 text-blue-400" />
                      <p className="text-xs text-gray-400">Tiempo</p>
                    </div>
                    <p className="text-lg font-bold text-blue-400">{selectedUser.estadisticas.tiempoTotalMinutos} min</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reportes por Fecha con Detalles de Turno */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-100">Reportes por Fecha</h3>
              <p className="text-xs text-gray-400">
                {selectedUser.actividades.length} reportes en {fechasOrdenadas.length} fechas
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {fechasOrdenadas.map((fecha) => {
              const actividades = actividadesPorFecha[fecha];
              const reportesPorTurno = obtenerReportesPorTurno(actividades);
              const tieneReporteManana = reportesPorTurno.mañana.length > 0;
              const tieneReporteTarde = reportesPorTurno.tarde.length > 0;
              const isExpanded = expandedDates.has(fecha);
              
              // Calcular estadísticas totales
              const totalActividades = actividades.length;
              const totalTareas = actividades.reduce((sum, a) => sum + a.pendientes.length, 0);
              const tareasTerminadas = actividades.reduce((sum, a) => 
                sum + a.pendientes.filter(t => t.terminada).length, 0);
              const tiempoTotal = actividades.reduce((sum, a) => 
                sum + a.pendientes.reduce((sumT, t) => sumT + t.duracionMin, 0), 0);
              const porcentaje = totalTareas > 0 ? Math.round((tareasTerminadas / totalTareas) * 100) : 0;
              
              return (
                <Card 
                  key={fecha}
                  className="bg-[#2a2a2a] border-none rounded-lg hover:border-pink-500/50 transition-colors"
                >
                  <CardContent className="p-4">
                    {/* Header compacto de fecha */}
                    <div 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer mb-2"
                      onClick={() => toggleDateExpand(fecha)}
                    >
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                          )}
                        </Button>
                        <div>
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-4 h-4 text-purple-400" />
                            <h4 className="font-semibold text-gray-100">
                              {new Date(fecha).toLocaleDateString('es-ES', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </h4>
                          </div>
                          {/* Indicadores de reportes de mañana y tarde */}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <Badge className={`text-xs px-2 ${tieneReporteManana ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-800 text-gray-400'}`}>
                                <Sunrise className="w-3 h-3 mr-1" />
                                {tieneReporteManana ? 'Con reporte mañana' : 'Sin reporte mañana'}
                              </Badge>
                              <Badge className={`text-xs px-2 ${tieneReporteTarde ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-gray-800 text-gray-400'}`}>
                                <Sunset className="w-3 h-3 mr-1" />
                                {tieneReporteTarde ? 'Con reporte tarde' : 'Sin reporte tarde'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">Progreso</span>
                            <span className="text-gray-300">{porcentaje}%</span>
                          </div>
                          <Progress 
                            value={porcentaje}
                            className="h-1.5 bg-gray-700"
                          >
                            <div className={`h-full rounded-full ${
                              porcentaje >= 100 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                : 'bg-gradient-to-r from-purple-500 to-pink-500'
                            }`} />
                          </Progress>
                        </div>
                      </div>
                    </div>
                    
                    {/* Detalles expandidos con turnos */}
                    {isExpanded && (
                      <div className="mt-4 space-y-4">
                        <Separator className="bg-gray-700" />
                        
                        {/* Reporte de Mañana */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Sunrise className="w-4 h-4 text-amber-400" />
                            <h5 className="font-medium text-gray-100">Reporte de Mañana</h5>
                            <Badge className={`text-xs ${tieneReporteManana ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                              {tieneReporteManana ? `${reportesPorTurno.mañana.length} actividades` : 'Sin reporte'}
                            </Badge>
                          </div>
                          
                          {tieneReporteManana ? (
                            <div className="space-y-2">
                              {reportesPorTurno.mañana.map((actividad) => (
                                <div 
                                  key={actividad.actividadId} 
                                  className="p-2 bg-[#1a1a1a] rounded border border-gray-700/50 hover:bg-[#1f1f1f] cursor-pointer"
                                  onClick={() => onViewActivity(actividad, selectedUser)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                      <div className="font-medium text-gray-100 text-sm truncate">
                                        {actividad.titulo}
                                      </div>
                                      <div className="text-xs text-gray-400 mt-1">
                                        {actividad.horaInicio} - {actividad.horaFin}
                                      </div>
                                    </div>
                                    <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-purple-500/30 text-xs">
                                      {actividad.pendientes.length} tareas
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 bg-[#1a1a1a] rounded border border-dashed border-gray-700/50 text-center">
                              <p className="text-gray-400 text-sm">No hay reporte de la mañana para esta fecha</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Reporte de Tarde */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Sunset className="w-4 h-4 text-blue-400" />
                            <h5 className="font-medium text-gray-100">Reporte de Tarde</h5>
                            <Badge className={`text-xs ${tieneReporteTarde ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-400'}`}>
                              {tieneReporteTarde ? `${reportesPorTurno.tarde.length} actividades` : 'Sin reporte'}
                            </Badge>
                          </div>
                          
                          {tieneReporteTarde ? (
                            <div className="space-y-2">
                              {reportesPorTurno.tarde.map((actividad) => (
                                <div 
                                  key={actividad.actividadId} 
                                  className="p-2 bg-[#1a1a1a] rounded border border-gray-700/50 hover:bg-[#1f1f1f] cursor-pointer"
                                  onClick={() => onViewActivity(actividad, selectedUser)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                      <div className="font-medium text-gray-100 text-sm truncate">
                                        {actividad.titulo}
                                      </div>
                                      <div className="text-xs text-gray-400 mt-1">
                                        {actividad.horaInicio} - {actividad.horaFin}
                                      </div>
                                    </div>
                                    <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-purple-500/30 text-xs">
                                      {actividad.pendientes.length} tareas
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 bg-[#1a1a1a] rounded border border-dashed border-gray-700/50 text-center">
                              <p className="text-gray-400 text-sm">No hay reporte de la tarde para esta fecha</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Resumen compacto */}
                        <div className="p-3 bg-[#1a1a1a] rounded border border-gray-700/50">
                          <h5 className="font-medium text-gray-200 mb-2 text-sm">Resumen del día</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <p className="text-xs text-gray-400">Actividades</p>
                              <p className="text-lg font-bold text-gray-100">{totalActividades}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Tareas totales</p>
                              <p className="text-lg font-bold text-purple-400">{totalTareas}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Tareas terminadas</p>
                              <p className="text-lg font-bold text-green-400">{tareasTerminadas}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Tiempo total</p>
                              <p className="text-lg font-bold text-blue-400">{tiempoTotal} min</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Vista Detalle de Actividad CON TABLA DE TAREAS COMPACTA
  if (detalleView === 'actividad' && selectedActivity && selectedUser) {
    const tareasFiltradas = useMemo(() => {
      return selectedActivity.pendientes.filter(tarea => {
        if (!tareaSearch) return true;
        const searchTerm = tareaSearch.toLowerCase();
        return (
          tarea.nombre.toLowerCase().includes(searchTerm) ||
          tarea.descripcion?.toLowerCase().includes(searchTerm) ||
          tarea.pendienteId?.toLowerCase().includes(searchTerm)
        );
      });
    }, [selectedActivity.pendientes, tareaSearch]);

    // Detectar turno de la actividad
    const turnoActividad = detectarTurnoReporte(selectedActivity.horaInicio);

    return (
      <div className="p-4 space-y-4">
        {/* Activity Header Card Compacta */}
        <Card className="bg-[#2a2a2a] border-none rounded-lg">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded ${turnoActividad === 'mañana' ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
                    {turnoActividad === 'mañana' ? (
                      <Sunrise className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Sunset className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-gray-100 truncate">{selectedActivity.titulo}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {selectedUser.nombre}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {selectedActivity.fecha}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedActivity.horaInicio} - {selectedActivity.horaFin}
                  </span>
                  <Badge className={`text-xs ${turnoActividad === 'mañana' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                    {turnoActividad === 'mañana' ? 'Reporte Mañana' : 'Reporte Tarde'}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  onClick={onBackToUser}
                  variant="outline"
                  size="sm"
                  className="border-none text-gray-300 hover:bg-gray-800 hover:text-white h-8 text-xs"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Volver
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Compactas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="bg-[#2a2a2a] border-none rounded-lg">
            <CardContent className="p-3 text-center">
              <div className="flex flex-col items-center">
                <Target className="w-5 h-5 text-gray-400 mb-1" />
                <p className="text-xs text-gray-400">Total Tareas</p>
                <p className="text-xl font-bold text-gray-100">{selectedActivity.pendientes.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2a2a2a] border-none rounded-lg">
            <CardContent className="p-3 text-center">
              <div className="flex flex-col items-center">
                <CheckCircle className="w-5 h-5 text-purple-400 mb-1" />
                <p className="text-xs text-gray-400">Terminadas</p>
                <p className="text-xl font-bold text-purple-400">
                  {selectedActivity.pendientes.filter(t => t.terminada).length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2a2a2a] border-none rounded-lg">
            <CardContent className="p-3 text-center">
              <div className="flex flex-col items-center">
                <CheckCircle className="w-5 h-5 text-blue-400 mb-1" />
                <p className="text-xs text-gray-400">Confirmadas</p>
                <p className="text-xl font-bold text-blue-400">
                  {selectedActivity.pendientes.filter(t => t.confirmada).length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2a2a2a] border-none rounded-lg">
            <CardContent className="p-3 text-center">
              <div className="flex flex-col items-center">
                <Timer className="w-5 h-5 text-green-400 mb-1" />
                <p className="text-xs text-gray-400">Tiempo total</p>
                <p className="text-xl font-bold text-green-400">
                  {selectedActivity.pendientes.reduce((sum, t) => sum + t.duracionMin, 0)} min
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Table Compacta */}
        <Card className="bg-[#2a2a2a] border-none rounded-lg">
          <CardHeader className="p-4 pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-gray-100 text-lg">Tareas del Reporte</CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  Haz clic en una tarea para ver detalles
                </CardDescription>
              </div>
              
              <div className="relative w-full md:w-56">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-500" />
                <Input
                  placeholder="Buscar tarea..."
                  value={tareaSearch}
                  onChange={(e) => setTareaSearch(e.target.value)}
                  className="pl-8 bg-gray-800 border-none text-gray-100 placeholder:text-gray-500 h-8 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-[#1a1a1a]">
                  <TableRow className="border-none">
                    <TableHead className="text-gray-300 font-medium text-sm py-2">Tarea</TableHead>
                    <TableHead className="text-gray-300 font-medium text-sm py-2">Estado</TableHead>
                    <TableHead className="text-gray-300 font-medium text-sm py-2">Duración</TableHead>
                    <TableHead className="text-gray-300 font-medium text-sm py-2 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tareasFiltradas.length > 0 ? (
                    tareasFiltradas.map((tarea, index) => (
                      <TableRow 
                        key={tarea.pendienteId || index} 
                        className="bg-[#1a1a1a] hover:bg-[#1f1f1f] cursor-pointer"
                        onClick={() => onViewTask(tarea, selectedActivity, selectedUser)}
                      >
                        <TableCell className="py-2">
                          <div>
                            <div className="font-medium text-gray-100 text-sm">{tarea.nombre}</div>
                            {tarea.descripcion && (
                              <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                                {tarea.descripcion}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col gap-1">
                            {tarea.terminada ? (
                              <Badge className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 w-fit">
                                <CheckCircle className="w-2.5 h-2.5 mr-1" />
                                Terminada
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 w-fit">
                                <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                                Pendiente
                              </Badge>
                            )}
                            {tarea.confirmada && (
                              <Badge className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 w-fit">
                                Confirmada
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            <Timer className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-300 text-sm">{tarea.duracionMin} min</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewTask(tarea, selectedActivity, selectedUser);
                            }}
                            className="bg-[#6841ea] hover:bg-[#5a36d1] text-white h-7 w-7 p-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-gray-400 text-sm">
                        {selectedActivity.pendientes.length === 0 
                          ? "No hay tareas en este reporte" 
                          : "No se encontraron tareas que coincidan con la búsqueda"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista Detalle de Tarea COMPACTA
  if (detalleView === 'tarea' && selectedTask && selectedActivity && selectedUser) {
    return (
      <div className="p-4 space-y-4">
        {/* Task Header Card Compacta */}
        <Card className="bg-[#2a2a2a] border-none rounded-lg">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded ${
                    selectedTask.terminada 
                      ? 'bg-green-500/20' 
                      : 'bg-amber-500/20'
                  }`}>
                    {selectedTask.terminada ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-gray-100 truncate">{selectedTask.nombre}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {selectedUser.nombre}
                  </span>
                  <span className="flex items-center gap-1">
                    <Folder className="w-3 h-3" />
                    {selectedActivity.titulo.substring(0, 30)}...
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  onClick={() => onViewActivity(selectedActivity, selectedUser)}
                  variant="outline"
                  size="sm"
                  className="border-none text-gray-300 hover:bg-gray-800 hover:text-white h-8 text-xs"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Volver
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Details Grid Compacta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="bg-[#2a2a2a] border-none rounded-lg">
            <CardContent className="p-3">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1.5">Estado</p>
                  <div className="flex flex-col gap-1.5">
                    {selectedTask.terminada ? (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs w-fit">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Terminada
                      </Badge>
                    ) : (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs w-fit">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Pendiente
                      </Badge>
                    )}
                    {selectedTask.confirmada ? (
                      <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs w-fit">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Confirmada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-none text-gray-400 text-xs w-fit">
                        <XCircle className="w-3 h-3 mr-1" />
                        Sin confirmar
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2a2a2a] border-none rounded-lg">
            <CardContent className="p-3">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">Duración</p>
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-pink-400" />
                    <span className="text-lg font-bold text-gray-100">{selectedTask.duracionMin} min</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">Fecha Creación</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-100">{new Date(selectedTask.fechaCreacion).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Description Compacta */}
        {selectedTask.descripcion && (
          <Card className="bg-[#2a2a2a] border-none rounded-lg">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-gray-100 text-sm flex items-center gap-2">
                <File className="w-4 h-4" />
                Explicación
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="p-3 bg-[#1a1a1a] rounded border border-none">
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedTask.descripcion}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Actions Compactas */}
        <Card className="bg-[#2a2a2a] border-none rounded-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-gray-100 text-sm">Gestión del Reporte</CardTitle>
            <CardDescription className="text-gray-400 text-xs">
              Acciones y observaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select value={detalleEstado} onValueChange={(value: any) => setDetalleEstado(value)}>
                  <SelectTrigger className="bg-gray-800 border-none text-gray-100 text-sm h-9">
                    <SelectValue placeholder="Cambiar estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-none text-gray-100">
                    <SelectItem value="pendiente" className="text-sm focus:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pendiente</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="en_progreso" className="text-sm focus:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <Play className="w-3.5 h-3.5 text-blue-400" />
                        <span>En progreso</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="terminada" className="text-sm focus:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        <span>Terminada</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="bloqueada" className="text-sm focus:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <Pause className="w-3.5 h-3.5 text-red-400" />
                        <span>Bloqueada</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={cambiarEstadoTarea}
                  className="bg-[#6841ea] hover:bg-[#5a36d1] text-white text-sm h-9"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  Actualizar
                </Button>
              </div>
              
              <div className="space-y-2">
                <Textarea
                  placeholder="Agregar observaciones..."
                  value={detalleNotas}
                  onChange={(e) => setDetalleNotas(e.target.value)}
                  className="bg-gray-800 border-none text-gray-100 placeholder:text-gray-500 text-sm min-h-[80px]"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={agregarNotaDetalle}
                    disabled={!detalleNotas.trim()}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm h-8"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}