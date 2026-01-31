import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  ListChecks,
  Clock,
  Percent,
  CheckCircle,
  AlertTriangle,
  Folder,
  Search,
  Eye,
  Calendar,
  Timer,
  ChevronDown,
  ChevronUp,
  User,
  CalendarDays,
  ExternalLink
} from "lucide-react";
import { ApiResponse, Usuario, Actividad } from "./types";
import { obtenerIniciales, obtenerFechaPorDias } from "../hooks/useReporteData";

interface DashboardViewProps {
  estadisticas: ApiResponse["estadisticas"];
  data: ApiResponse["data"];
  onViewUser: (usuario: Usuario) => void;
  onViewActivity: (actividad: Actividad, usuario: Usuario) => void;
}

export default function DashboardView({ 
  estadisticas, 
  data, 
  onViewUser,
  onViewActivity 
}: DashboardViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [fechaFiltro, setFechaFiltro] = useState<string>("hoy");
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  
  // Obtener fecha actual
  const fechaActual = new Date().toISOString().split('T')[0];

  // Obtener todas las actividades con información de usuario
  const allActivities = useMemo(() => {
    return data.usuarios.flatMap(usuario => 
      usuario.actividades.map(actividad => ({
        ...actividad,
        usuario
      }))
    );
  }, [data.usuarios]);

  // Función para filtrar actividades por fecha
  const filtrarActividadesPorFecha = (actividades: typeof allActivities) => {
    switch (fechaFiltro) {
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

  // Filtrar actividades por fecha
  const actividadesFiltradasPorFecha = useMemo(() => {
    return filtrarActividadesPorFecha(allActivities);
  }, [allActivities, fechaFiltro, fechaActual]);

  // Ordenar por fecha más reciente y limitar
  const recentActivities = useMemo(() => {
    return [...actividadesFiltradasPorFecha]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 15);
  }, [actividadesFiltradasPorFecha]);

  // Filtrar actividades por búsqueda
  const filteredActivities = useMemo(() => {
    return recentActivities.filter(activity => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        activity.usuario.nombre.toLowerCase().includes(term) ||
        activity.titulo.toLowerCase().includes(term) ||
        activity.usuario.email.toLowerCase().includes(term) ||
        activity.fecha.toLowerCase().includes(term)
      );
    });
  }, [recentActivities, searchTerm]);

  // Calcular estadísticas para el resumen
  const estadisticasFecha = useMemo(() => {
    const actividadesEnFecha = actividadesFiltradasPorFecha;
    
    return {
      totalActividades: actividadesEnFecha.length,
      totalTareas: actividadesEnFecha.reduce((sum, a) => sum + a.pendientes.length, 0),
      tareasTerminadas: actividadesEnFecha.reduce((sum, a) => 
        sum + a.pendientes.filter(t => t.terminada).length, 0),
      tareasConfirmadas: actividadesEnFecha.reduce((sum, a) => 
        sum + a.pendientes.filter(t => t.confirmada).length, 0),
      tiempoTotal: actividadesEnFecha.reduce((sum, a) => 
        sum + a.pendientes.reduce((sumT, t) => sumT + t.duracionMin, 0), 0),
      usuariosUnicos: new Set(actividadesEnFecha.map(a => a.usuario._id)).size
    };
  }, [actividadesFiltradasPorFecha]);

  const toggleActivityExpand = (activityId: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedActivities(newExpanded);
  };

  // Obtener texto descriptivo del filtro
  const getFechaFiltroTexto = () => {
    switch (fechaFiltro) {
      case "hoy": return "hoy";
      case "ayer": return "ayer";
      case "ultima_semana": return "la última semana";
      case "ultimo_mes": return "el último mes";
      case "todos": return "todas las fechas";
      default: return "hoy";
    }
  };

  return (
    <div className="font-arial p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#1a1a1a] border-none hover:border-purple-500/50 transition-colors">
          <CardContent className="p-0 px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Usuarios Totales</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-100">{estadisticas.totalUsuarios}</h3>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    <Users className="w-3 h-3 mr-1" />
                    {estadisticas.usuariosConActividades} activos
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <Users className="w-7 h-7 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-pink-500/50 transition-colors">
          <CardContent className="p-0 px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Tareas Totales</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-100">{estadisticas.totalTareas}</h3>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {estadisticas.totalTareasTerminadas} terminadas
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-500/20">
                <ListChecks className="w-7 h-7 text-pink-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-blue-500/50 transition-colors">
          <CardContent className="p-0 px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Tiempo Total</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-100">{estadisticas.tiempoTotalFormateado}</h3>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    <Clock className="w-3 h-3 mr-1" />
                    {estadisticas.tiempoTotalMinutos} min
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                <Clock className="w-7 h-7 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-green-500/50 transition-colors">
          <CardContent className="p-0 px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Eficiencia</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-100">{estadisticas.porcentajeTerminadas}%</h3>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <Percent className="w-3 h-3 mr-1" />
                    {estadisticas.porcentajeConfirmadas}% confirmadas
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                <Percent className="w-7 h-7 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity CON TABLA Y FILTRO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-purple-500/50 transition-colors">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-gray-100">Actividades Recientes</CardTitle>
                  <CardDescription className="text-gray-400">
                    Mostrando actividades de {getFechaFiltroTexto()}
                  </CardDescription>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Buscar actividades..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-800 border-none text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  
                  <Select value={fechaFiltro} onValueChange={setFechaFiltro}>
                    <SelectTrigger className="w-full sm:w-48 bg-gray-800 border-none text-gray-100 focus:border-purple-500 focus:ring-purple-500">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        <SelectValue placeholder="Filtrar por fecha" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-none text-gray-100">
                      <SelectItem value="hoy" className="focus:bg-gray-800 focus:text-white">Hoy</SelectItem>
                      <SelectItem value="ayer" className="focus:bg-gray-800 focus:text-white">Ayer</SelectItem>
                      <SelectItem value="ultima_semana" className="focus:bg-gray-800 focus:text-white">Última semana</SelectItem>
                      <SelectItem value="ultimo_mes" className="focus:bg-gray-800 focus:text-white">Último mes</SelectItem>
                      <SelectItem value="todos" className="focus:bg-gray-800 focus:text-white">Todas las fechas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="p-2 bg-[#1a1a1a] rounded border border-gray-700">
                  <p className="text-xs text-gray-400">Actividades</p>
                  <p className="text-lg font-bold text-gray-100">{estadisticasFecha.totalActividades}</p>
                </div>
                <div className="p-2 bg-[#1a1a1a] rounded border border-gray-700">
                  <p className="text-xs text-gray-400">Tareas</p>
                  <p className="text-lg font-bold text-purple-400">{estadisticasFecha.totalTareas}</p>
                </div>
                <div className="p-2 bg-[#1a1a1a] rounded border border-gray-700">
                  <p className="text-xs text-gray-400">Usuarios</p>
                  <p className="text-lg font-bold text-blue-400">{estadisticasFecha.usuariosUnicos}</p>
                </div>
                <div className="p-2 bg-[#1a1a1a] rounded border border-gray-700">
                  <p className="text-xs text-gray-400">Tiempo</p>
                  <p className="text-lg font-bold text-green-400">{estadisticasFecha.tiempoTotal} min</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-gray-700 overflow-hidden">
              <Table>
                <TableHeader className="bg-[#1a1a1a]">
                  <TableRow className="border-b border-gray-700">
                    <TableHead className="text-gray-300 font-medium w-12"></TableHead>
                    <TableHead className="text-gray-300 font-medium">Fecha</TableHead>
                    <TableHead className="text-gray-300 font-medium">Colaborador</TableHead>
                    <TableHead className="text-gray-300 font-medium">Actividad</TableHead>
                    <TableHead className="text-gray-300 font-medium">Tareas</TableHead>
                    <TableHead className="text-gray-300 font-medium">Estado</TableHead>
                    <TableHead className="text-gray-300 font-medium text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.length > 0 ? (
                    filteredActivities.map((activity) => {
                      const isExpanded = expandedActivities.has(activity.actividadId);
                      const tareasTerminadas = activity.pendientes.filter(t => t.terminada).length;
                      const porcentaje = activity.pendientes.length > 0 
                        ? Math.round((tareasTerminadas / activity.pendientes.length) * 100)
                        : 0;
                      
                      return (
                        <React.Fragment key={activity.actividadId}>
                          <TableRow className="bg-[#1a1a1a] border-b border-gray-800 hover:bg-[#1f1f1f]">
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleActivityExpand(activity.actividadId)}
                                className="p-1 h-6 w-6 hover:bg-gray-800"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="text-sm text-gray-300">
                                  {new Date(activity.fecha).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {activity.horaInicio} - {activity.horaFin}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewUser(activity.usuario);
                                  }}>
                                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                                    {obtenerIniciales(activity.usuario.nombre)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div 
                                    className="font-medium text-gray-100 cursor-pointer hover:text-purple-300"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onViewUser(activity.usuario);
                                    }}
                                  >
                                    {activity.usuario.nombre}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate max-w-[120px]">
                                    {activity.usuario.email}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[200px]">
                                <div className="font-medium text-gray-100 truncate">
                                  {activity.titulo}
                                </div>
                                <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                                  {activity.pendientes.length > 0 
                                    ? `${activity.pendientes[0]?.nombre || 'Sin tareas'}...`
                                    : 'Sin tareas'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge className="bg-gray-800 text-gray-300 w-fit">
                                  {activity.pendientes.length} total
                                </Badge>
                                <div className="w-24">
                                  <div className="flex justify-between text-xs mb-0.5">
                                    <span className="text-gray-400">{porcentaje}%</span>
                                  </div>
                                  <Progress value={porcentaje} className="h-1 bg-gray-700">
                                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" />
                                  </Progress>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${
                                activity.status === 'completada' 
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                  : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-purple-500/30'
                              }`}>
                                {activity.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewUser(activity.usuario);
                                  }}
                                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                                >
                                  <User className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewActivity(activity, activity.usuario);
                                  }}
                                  className="bg-[#6841ea] hover:bg-[#5a36d1] text-white"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Row for Tasks */}
                          {isExpanded && activity.pendientes.length > 0 && (
                            <TableRow className="bg-[#0f0f0f]">
                              <TableCell colSpan={7} className="p-0 border-b border-gray-800">
                                <div className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-gray-200">Reportes de Tareas de la actividad:</h4>
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onViewActivity(activity, activity.usuario);
                                      }}
                                      className="bg-[#6841ea] hover:bg-[#5a36d1] text-white text-xs"
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Ver todas las tareas
                                    </Button>
                                  </div>
                                  
                                  {/* Mini tabla de tareas */}
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-gray-800">
                                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Tarea</th>
                                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Estado</th>
                                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Duración</th>
                                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Confirmada</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {activity.pendientes.slice(0, 4).map((tarea, idx) => (
                                          <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                            <td className="py-2 px-3">
                                              <div className="flex items-center gap-2">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                                  tarea.terminada 
                                                    ? 'bg-green-500/20 text-green-400' 
                                                    : 'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                  {idx + 1}
                                                </div>
                                                <span className="text-gray-300 truncate max-w-[150px]">
                                                  {tarea.nombre}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="py-2 px-3">
                                              {tarea.terminada ? (
                                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                                  Terminada
                                                </Badge>
                                              ) : (
                                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                                                  Pendiente
                                                </Badge>
                                              )}
                                            </td>
                                            <td className="py-2 px-3">
                                              <div className="flex items-center gap-1 text-gray-300">
                                                <Timer className="w-3 h-3" />
                                                {tarea.duracionMin} min
                                              </div>
                                            </td>
                                            <td className="py-2 px-3">
                                              {tarea.confirmada ? (
                                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                                  Confirmada
                                                </Badge>
                                              ) : (
                                                <span className="text-gray-500 text-xs">No</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  
                                  {activity.pendientes.length > 4 && (
                                    <div className="mt-3 text-center text-gray-400 text-sm">
                                      ... y {activity.pendientes.length - 4} tareas más
                                    </div>
                                  )}
                                  
                                  <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                                    <div className="flex items-center gap-4">
                                      <span className="flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                        {tareasTerminadas} terminadas
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4 text-blue-400" />
                                        {activity.pendientes.filter(t => t.confirmada).length} confirmadas
                                      </span>
                                    </div>
                                    <span className="text-gray-300">
                                      Tiempo total: {activity.pendientes.reduce((sum, t) => sum + t.duracionMin, 0)} min
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                        {recentActivities.length === 0 
                          ? `No hay actividades para ${getFechaFiltroTexto()}` 
                          : "No se encontraron actividades que coincidan con la búsqueda"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            {filteredActivities.length > 0 && (
              <div className="mt-6 flex items-center justify-between text-sm text-gray-400">
                <div>
                  Mostrando {filteredActivities.length} de {recentActivities.length} actividades
                  {searchTerm && (
                    <span className="ml-2 text-purple-400">
                      (filtradas)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500/20"></div>
                    <span>Total tareas: {filteredActivities.reduce((sum, a) => sum + a.pendientes.length, 0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                    <span>
                      {filteredActivities.reduce((sum, a) => sum + a.pendientes.filter(t => t.terminada).length, 0)} terminadas
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-pink-500/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-gray-100">Resumen Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Usuarios activos</span>
                  <span className="text-sm font-bold text-purple-400">{estadisticas.usuariosConActividades}</span>
                </div>
                <Progress value={estadisticas.porcentajeConActividades} className="h-1.5 bg-gray-800">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" />
                </Progress>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Tareas terminadas</span>
                  <span className="text-sm font-bold text-green-400">{estadisticas.totalTareasTerminadas}</span>
                </div>
                <Progress value={estadisticas.porcentajeTerminadas} className="h-1.5 bg-gray-800">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full" />
                </Progress>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Tiempo promedio</span>
                  <span className="text-sm font-bold text-blue-400">
                    {estadisticas.totalTareas > 0 
                      ? Math.round(estadisticas.tiempoTotalMinutos / estadisticas.totalTareas)
                      : 0} min/tarea
                  </span>
                </div>
                <Progress value={60} className="h-1.5 bg-gray-800">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full" />
                </Progress>
              </div>
              
              <div className="pt-4 border-t border-gray-700">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Actividades hoy</span>
                    <span className="text-gray-300">
                      {allActivities.filter(a => a.fecha === fechaActual).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Usuarios activos hoy</span>
                    <span className="text-gray-300">
                      {new Set(allActivities
                        .filter(a => a.fecha === fechaActual)
                        .map(a => a.usuario._id)
                      ).size}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Última actividad</span>
                    <span className="text-gray-300">
                      {recentActivities.length > 0 
                        ? new Date(recentActivities[0].fecha).toLocaleDateString() 
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}