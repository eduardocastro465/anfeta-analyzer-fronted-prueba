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
  CalendarDays
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
  onBackToGeneral,
  onBackToUser,
  onViewActivity,
  onViewTask,
  onViewUser,
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

  // Vista General de Detalles - LISTA DE USUARIOS CON TABLA
  if (detalleView === 'general') {
    // Filtrar usuarios por búsqueda
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
      <div className="font-arial p-6 space-y-6">
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-purple-500/50 transition-colors">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-gray-100">Reportes de Colaboradores</CardTitle>
                <CardDescription className="text-gray-400">
                  Selecciona un colaborador para ver sus reportes detallados
                </CardDescription>
              </div>
              
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Buscar colaborador..."
                  value={usuarioSearch}
                  onChange={(e) => setUsuarioSearch(e.target.value)}
                  className="pl-10 bg-gray-800 border-none text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-none overflow-hidden">
              <Table>
                <TableHeader className="bg-[#1a1a1a]">
                  <TableRow className="hover:bg-gray-800 border-none">
                    <TableHead className="text-gray-300 font-medium">Colaborador</TableHead>
                    <TableHead className="text-gray-300 font-medium">Actividades</TableHead>
                    <TableHead className="text-gray-300 font-medium">Tareas</TableHead>
                    <TableHead className="text-gray-300 font-medium">Progreso</TableHead>
                    <TableHead className="text-gray-300 font-medium">Última Actividad</TableHead>
                    <TableHead className="text-gray-300 font-medium text-right">Acciones</TableHead>
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
                        className="bg-[#1a1a1a] border-[#141414] hover:bg-[#1f1f1f] cursor-pointer"
                        onClick={() => onViewUser(usuario)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                {obtenerIniciales(usuario.nombre)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-100">{usuario.nombre}</div>
                              <div className="text-sm text-gray-500">{usuario.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-gray-800 text-gray-300">
                            {usuario.estadisticas.totalActividades}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className="bg-gray-800 text-gray-300 w-fit">
                              {usuario.estadisticas.totalTareas} total
                            </Badge>
                            {usuario.estadisticas.tareasTerminadas > 0 && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 w-fit">
                                {usuario.estadisticas.tareasTerminadas} terminadas
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
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
                        <TableCell>
                          <div className="text-sm text-gray-300">
                            {usuario.actividades.length > 0 
                              ? new Date(usuario.actividades[usuario.actividades.length - 1].fecha).toLocaleDateString()
                              : 'Sin actividades'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewUser(usuario);
                            }}
                            className="bg-[#6841ea] hover:bg-[#5a36d1] text-white"
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
              <div className="text-center py-8 text-gray-400">
                No se encontraron colaboradores que coincidan con la búsqueda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista Detalle de Usuario - ACTIVIDADES AGRUPADAS POR FECHA CON TABLA
  if (detalleView === 'usuario' && selectedUser) {
    // Agrupar actividades por fecha
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

    // Ordenar fechas de más reciente a más antigua
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

    // Calcular estadísticas por fecha
    const calcularEstadisticasFecha = (actividades: typeof selectedUser.actividades) => {
      return {
        totalActividades: actividades.length,
        totalTareas: actividades.reduce((sum, a) => sum + a.pendientes.length, 0),
        tareasTerminadas: actividades.reduce((sum, a) => 
          sum + a.pendientes.filter(t => t.terminada).length, 0),
        tareasConfirmadas: actividades.reduce((sum, a) => 
          sum + a.pendientes.filter(t => t.confirmada).length, 0),
        tiempoTotal: actividades.reduce((sum, a) => 
          sum + a.pendientes.reduce((sumT, t) => sumT + t.duracionMin, 0), 0)
      };
    };

    return (
      <div className="p-6 space-y-6">
        {/* User Profile Card */}
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-transparent border-none hover:border-purple-500/50 transition-colors">
          <CardContent>
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="shrink-0">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-2xl">
                    {obtenerIniciales(selectedUser.nombre)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-100">{selectedUser.nombre}</h2>
                    <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-purple-500/30">
                      {selectedUser.fuente}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {selectedUser.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-4 h-4" />
                      ID: {selectedUser.odooUserId}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Registro: {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {/* Estadísticas en Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-4 h-4 text-purple-400" />
                      <p className="text-sm text-gray-400">Actividades</p>
                    </div>
                    <p className="text-xl font-bold text-gray-100">{selectedUser.estadisticas.totalActividades}</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-pink-400" />
                      <p className="text-sm text-gray-400">Tareas</p>
                    </div>
                    <p className="text-xl font-bold text-gray-100">{selectedUser.estadisticas.totalTareas}</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <p className="text-sm text-gray-400">Terminadas</p>
                    </div>
                    <p className="text-xl font-bold text-green-400">{selectedUser.estadisticas.tareasTerminadas}</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Timer className="w-4 h-4 text-blue-400" />
                      <p className="text-sm text-gray-400">Tiempo</p>
                    </div>
                    <p className="text-xl font-bold text-blue-400">{selectedUser.estadisticas.tiempoTotalMinutos} min</p>
                  </div>
                </div>
                
                {/* Progreso General */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-400">Progreso general</span>
                    </div>
                    <span className="text-gray-300">
                      {selectedUser.estadisticas.totalTareas > 0 
                        ? Math.round((selectedUser.estadisticas.tareasTerminadas / selectedUser.estadisticas.totalTareas) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={(selectedUser.estadisticas.tareasTerminadas / selectedUser.estadisticas.totalTareas) * 100}
                    className="h-2 bg-gray-700"
                  >
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" />
                  </Progress>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actividades por Fecha CON TABLAS EXPANDIBLES */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-100">Reportes por Fecha</h3>
              <p className="text-sm text-gray-400">
                {selectedUser.actividades.length} reportes en {fechasOrdenadas.length} fechas diferentes
              </p>
            </div>
            <Badge className="bg-gray-800 text-gray-300">
              {fechasOrdenadas.length} fechas
            </Badge>
          </div>
          
          <div className="space-y-4">
            {fechasOrdenadas.map((fecha) => {
              const actividades = actividadesPorFecha[fecha];
              const estadisticas = calcularEstadisticasFecha(actividades);
              const porcentaje = estadisticas.totalTareas > 0 
                ? Math.round((estadisticas.tareasTerminadas / estadisticas.totalTareas) * 100)
                : 0;
              const isExpanded = expandedDates.has(fecha);
              
              return (
                <Card 
                  key={fecha}
                  className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-pink-500/50 transition-colors"
                >
                  <CardContent className="p-0 px-6">
                    {/* Header de fecha */}
                    <div 
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 cursor-pointer"
                      onClick={() => toggleDateExpand(fecha)}
                    >
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                        <div>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-purple-400" />
                            <h4 className="text-lg font-semibold text-gray-100">
                              {new Date(fecha).toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 mt-1">
                            <Badge className="bg-gray-800 text-gray-300">
                              {actividades.length} actividades
                            </Badge>
                            <Badge className="bg-purple-500/20 text-purple-400">
                              {estadisticas.totalTareas} tareas
                            </Badge>
                            <Badge className="bg-green-500/20 text-green-400">
                              {estadisticas.tareasTerminadas} terminadas
                            </Badge>
                            <Badge className="bg-blue-500/20 text-blue-400">
                              {estadisticas.tiempoTotal} min
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="w-32">
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
                        
                        <Badge className={`${
                          porcentaje === 100 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-purple-500/30'
                        }`}>
                          {porcentaje === 100 ? 'Completado' : 'En progreso'}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Tabla de actividades (expandible) */}
                    {isExpanded && (
                      <div className="mt-6">
                        <div className="mb-4">
                          <h5 className="text-lg font-semibold text-gray-100 mb-2">Actividades del día</h5>
                          <Separator className="bg-gray-700" />
                        </div>
                        
                        <div className="rounded-lg border-none overflow-hidden">
                          <Table>
                            <TableHeader className="bg-[#1a1a1a]">
                              <TableRow className="hover:bg-gray-800 border-none">
                                <TableHead className="text-gray-300 font-medium">Hora</TableHead>
                                <TableHead className="text-gray-300 font-medium">Actividad</TableHead>
                                <TableHead className="text-gray-300 font-medium">Tareas</TableHead>
                                <TableHead className="text-gray-300 font-medium">Estado</TableHead>
                                <TableHead className="text-gray-300 font-medium text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {actividades.map((actividad) => {
                                const tareasTerminadas = actividad.pendientes.filter(t => t.terminada).length;
                                const actPorcentaje = actividad.pendientes.length > 0 
                                  ? Math.round((tareasTerminadas / actividad.pendientes.length) * 100)
                                  : 0;
                                
                                return (
                                  <TableRow 
                                    key={actividad.actividadId} 
                                    className="bg-[#1a1a1a] border-[#141414] hover:bg-[#1f1f1f]"
                                  >
                                    <TableCell>
                                      <div className="text-sm text-gray-300">
                                        {actividad.horaInicio} - {actividad.horaFin}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="max-w-[250px]">
                                        <div className="font-medium text-gray-100 truncate">
                                          {actividad.titulo}
                                        </div>
                                        {actividad.pendientes.length > 0 && (
                                          <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                                            {actividad.pendientes[0]?.nombre || 'Sin descripción'}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col gap-1">
                                        <Badge className="bg-gray-800 text-gray-300 w-fit">
                                          {actividad.pendientes.length} total
                                        </Badge>
                                        <div className="w-20">
                                          <Progress value={actPorcentaje} className="h-1 bg-gray-700">
                                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" />
                                          </Progress>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-purple-500/30">
                                        {actividad.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        size="sm"
                                        onClick={() => onViewActivity(actividad, selectedUser)}
                                        className="bg-[#6841ea] hover:bg-[#5a36d1] text-white"
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
                        
                        {/* Resumen de la fecha */}
                        <div className="mt-6 p-4 bg-[#1a1a1a] rounded-lg border border-none">
                          <h5 className="font-semibold text-gray-200 mb-3">Resumen del día</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <p className="text-sm text-gray-400">Actividades</p>
                              <p className="text-2xl font-bold text-gray-100">{estadisticas.totalActividades}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-400">Tareas totales</p>
                              <p className="text-2xl font-bold text-purple-400">{estadisticas.totalTareas}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-400">Tareas terminadas</p>
                              <p className="text-2xl font-bold text-green-400">{estadisticas.tareasTerminadas}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-400">Tiempo total</p>
                              <p className="text-2xl font-bold text-blue-400">{estadisticas.tiempoTotal} min</p>
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

  // Vista Detalle de Actividad CON TABLA DE TAREAS
  if (detalleView === 'actividad' && selectedActivity && selectedUser) {
    // Filtrar tareas por búsqueda
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

    return (
      <div className="p-6 space-y-6">
        {/* Activity Header Card */}
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-transparent border-none hover:border-purple-500/50 transition-colors">
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Folder className="w-6 h-6 text-purple-400" />
                  <h2 className="text-2xl font-bold text-gray-100">{selectedActivity.titulo}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {selectedUser.nombre}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {selectedActivity.fecha}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedActivity.horaInicio} - {selectedActivity.horaFin}
                  </span>
                  <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-purple-500/30">
                    {selectedActivity.status}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={onBackToUser}
                  variant="outline"
                  className="border-none text-gray-300 hover:bg-gray-800 hover:text-white hover:border-purple-500/50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a usuario
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-purple-500/50 transition-colors">
            <CardContent className="text-center p-4">
              <div className="flex flex-col items-center">
                <Target className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-400">Total Tareas</p>
                <p className="text-3xl font-bold text-gray-100 mt-1">{selectedActivity.pendientes.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-pink-500/50 transition-colors">
            <CardContent className="text-center p-4">
              <div className="flex flex-col items-center">
                <CheckCircle className="w-8 h-8 text-purple-400 mb-2" />
                <p className="text-sm text-gray-400">Terminadas</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">
                  {selectedActivity.pendientes.filter(t => t.terminada).length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-blue-500/50 transition-colors">
            <CardContent className="text-center p-4">
              <div className="flex flex-col items-center">
                <CheckCircle className="w-8 h-8 text-blue-400 mb-2" />
                <p className="text-sm text-gray-400">Confirmadas</p>
                <p className="text-3xl font-bold text-blue-400 mt-1">
                  {selectedActivity.pendientes.filter(t => t.confirmada).length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-green-500/50 transition-colors">
            <CardContent className="text-center p-4">
              <div className="flex flex-col items-center">
                <Timer className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-sm text-gray-400">Tiempo total</p>
                <p className="text-3xl font-bold text-green-400 mt-1">
                  {selectedActivity.pendientes.reduce((sum, t) => sum + t.duracionMin, 0)} min
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Table */}
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-purple-500/50 transition-colors">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-gray-100">Reporte de Tareas</CardTitle>
                <CardDescription className="text-gray-400">
                  Haz clic en una fila para ver detalles completos del reporte
                </CardDescription>
              </div>
              
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Buscar tarea..."
                  value={tareaSearch}
                  onChange={(e) => setTareaSearch(e.target.value)}
                  className="pl-10 bg-gray-800 border-none text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-none overflow-hidden">
              <Table>
                <TableHeader className="bg-[#1a1a1a]">
                  <TableRow className="hover:bg-gray-800 border-none">
                    <TableHead className="text-gray-300 font-medium w-12">#</TableHead>
                    <TableHead className="text-gray-300 font-medium">Tarea</TableHead>
                    <TableHead className="text-gray-300 font-medium">Estado</TableHead>
                    <TableHead className="text-gray-300 font-medium">Confirmación</TableHead>
                    <TableHead className="text-gray-300 font-medium">Duración</TableHead>
                    <TableHead className="text-gray-300 font-medium">Fecha Creación</TableHead>
                    <TableHead className="text-gray-300 font-medium text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tareasFiltradas.length > 0 ? (
                    tareasFiltradas.map((tarea, index) => (
                      <TableRow 
                        key={tarea.pendienteId || index} 
                        className="bg-[#1a1a1a] border-[#141414] hover:bg-[#1f1f1f] cursor-pointer"
                        onClick={() => onViewTask(tarea, selectedActivity, selectedUser)}
                      >
                        <TableCell>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            tarea.terminada 
                              ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white' 
                              : 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                          }`}>
                            {index + 1}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-100">{tarea.nombre}</div>
                            {tarea.descripcion && (
                              <div className="text-sm text-gray-400 line-clamp-1 mt-1">
                                {tarea.descripcion}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {tarea.terminada ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Terminada
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {tarea.confirmada ? (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Confirmada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-none text-gray-400">
                              <XCircle className="w-3 h-3 mr-1" />
                              Sin confirmar
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Timer className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-300">{tarea.duracionMin} min</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-300">
                            {new Date(tarea.fechaCreacion).toLocaleDateString()}
                          </div>
                          {tarea.fechaFinTerminada && (
                            <div className="text-xs text-green-400">
                              Terminada: {new Date(tarea.fechaFinTerminada).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewTask(tarea, selectedActivity, selectedUser);
                            }}
                            className="bg-[#6841ea] hover:bg-[#5a36d1] text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                        {selectedActivity.pendientes.length === 0 
                          ? "No hay tareas en esta actividad" 
                          : "No se encontraron tareas que coincidan con la búsqueda"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Summary Info */}
            {tareasFiltradas.length > 0 && (
              <div className="mt-6 flex items-center justify-between text-sm text-gray-400">
                <div>
                  Mostrando {tareasFiltradas.length} de {selectedActivity.pendientes.length} tareas
                  {tareaSearch && (
                    <span className="ml-2 text-purple-400">
                      (filtradas)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                    <span>Terminadas: {tareasFiltradas.filter(t => t.terminada).length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500/20"></div>
                    <span>Confirmadas: {tareasFiltradas.filter(t => t.confirmada).length}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista Detalle de Tarea
  if (detalleView === 'tarea' && selectedTask && selectedActivity && selectedUser) {
    return (
      <div className="p-6 space-y-6">
        {/* Task Header Card */}
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-purple-500/50 transition-colors">
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    selectedTask.terminada 
                      ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20' 
                      : 'bg-gradient-to-br from-amber-500/20 to-orange-500/20'
                  }`}>
                    {selectedTask.terminada ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-amber-400" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-100">{selectedTask.nombre}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {selectedUser.nombre}
                  </span>
                  <span className="flex items-center gap-1">
                    <Folder className="w-4 h-4" />
                    {selectedActivity.titulo.substring(0, 50)}...
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {selectedActivity.fecha}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => onViewActivity(selectedActivity, selectedUser)}
                  variant="outline"
                  className="border-none text-gray-300 hover:bg-gray-800 hover:text-white hover:border-purple-500/50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a actividad
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-purple-500/50 transition-colors">
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-2">Estado Actual</p>
                  <div className="flex items-center gap-3">
                    {selectedTask.terminada ? (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Terminada
                      </Badge>
                    ) : (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Pendiente
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-2">Confirmación</p>
                  <div className="flex items-center gap-3">
                    {selectedTask.confirmada ? (
                      <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirmada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-none text-gray-400">
                        <XCircle className="w-4 h-4 mr-2" />
                        Sin confirmar
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-pink-500/50 transition-colors">
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-2">Duración</p>
                  <div className="flex items-center gap-3">
                    <Timer className="w-5 h-5 text-pink-400" />
                    <span className="text-2xl font-bold text-gray-100">{selectedTask.duracionMin} minutos</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-2">Fecha Creación</p>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-100">{new Date(selectedTask.fechaCreacion).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-blue-500/50 transition-colors">
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-2">Última Actualización</p>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-100">{new Date(selectedActivity.ultimaActualizacion).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {selectedTask.fechaFinTerminada && (
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-2">Fecha Terminación</p>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-green-400" />
                      <span className="text-green-400">{new Date(selectedTask.fechaFinTerminada).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Description */}
        {selectedTask.descripcion && (
          <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-purple-500/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <File className="w-5 h-5" />
                Explicación Completa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-[#1a1a1a] rounded-lg border border-none">
                <p className="text-gray-300 whitespace-pre-wrap">{selectedTask.descripcion}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Actions */}
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-pink-500/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-gray-100">Gestión del Reporte</CardTitle>
            <CardDescription className="text-gray-400">
              Acciones y observaciones sobre este reporte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={detalleEstado} onValueChange={(value: any) => setDetalleEstado(value)}>
                  <SelectTrigger className="bg-gray-800 border-none text-gray-100 focus:border-purple-500 focus:ring-purple-500">
                    <SelectValue placeholder="Cambiar estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-none text-gray-100">
                    <SelectItem value="pendiente" className="focus:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Pendiente</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="en_progreso" className="focus:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-blue-400" />
                        <span>En progreso</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="terminada" className="focus:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>Terminada</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="bloqueada" className="focus:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <Pause className="w-4 h-4 text-red-400" />
                        <span>Bloqueada</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={cambiarEstadoTarea}
                  className="bg-[#6841ea] hover:bg-[#5a36d1] text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Actualizar estado
                </Button>
              </div>
              
              <div className="space-y-2">
                <Textarea
                  placeholder="Agregar observaciones, detalles técnicos, problemas encontrados..."
                  value={detalleNotas}
                  onChange={(e) => setDetalleNotas(e.target.value)}
                  className="bg-gray-800 border-none text-gray-100 placeholder:text-gray-500 min-h-[100px] focus:border-purple-500 focus:ring-purple-500"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={agregarNotaDetalle}
                    disabled={!detalleNotas.trim()}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Guardar observación
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