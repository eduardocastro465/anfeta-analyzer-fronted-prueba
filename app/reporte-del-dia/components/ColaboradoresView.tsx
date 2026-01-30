import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Timer
} from "lucide-react";
import { ApiResponse, Usuario } from "./types";
import { obtenerIniciales, obtenerFechaPorDias } from "../hooks/useReporteData";

interface ColaboradoresViewProps {
  datos: ApiResponse;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fechaFiltro: string;
  setFechaFiltro: (filtro: string) => void;
  filtroUsuario: string;
  setFiltroUsuario: (filtro: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  fechaActual: string;
  onViewUser: (usuario: Usuario) => void;
  obtenerIniciales: (nombre: string) => string;
}

export default function ColaboradoresView({
  datos,
  searchTerm,
  setSearchTerm,
  fechaFiltro,
  setFechaFiltro,
  filtroUsuario,
  setFiltroUsuario,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  fechaActual,
  onViewUser,
  obtenerIniciales
}: ColaboradoresViewProps) {
  
  const filtrarActividadesPorFecha = (usuario: Usuario): Usuario["actividades"] => {
    if (!usuario.actividades || usuario.actividades.length === 0) return [];
    
    switch (fechaFiltro) {
      case "hoy":
        return usuario.actividades.filter(actividad => 
          actividad.fecha === fechaActual
        );
      case "ayer":
        const fechaAyer = obtenerFechaPorDias(1);
        return usuario.actividades.filter(actividad => 
          actividad.fecha === fechaAyer
        );
      case "ultima_semana":
        const fechaSemanaPasada = obtenerFechaPorDias(7);
        return usuario.actividades.filter(actividad => 
          new Date(actividad.fecha) >= new Date(fechaSemanaPasada)
        );
      case "ultimo_mes":
        const fechaMesPasado = obtenerFechaPorDias(30);
        return usuario.actividades.filter(actividad => 
          new Date(actividad.fecha) >= new Date(fechaMesPasado)
        );
      case "todos":
      default:
        return usuario.actividades;
    }
  };

  const calcularEstadisticasPorFecha = (usuario: Usuario) => {
    const actividadesFiltradas = filtrarActividadesPorFecha(usuario);
    
    const totalTareas = actividadesFiltradas.reduce((sum, actividad) => 
      sum + actividad.pendientes.length, 0
    );
    
    const tareasTerminadas = actividadesFiltradas.reduce((sum, actividad) => 
      sum + actividad.pendientes.filter(t => t.terminada).length, 0
    );
    
    const tareasConfirmadas = actividadesFiltradas.reduce((sum, actividad) => 
      sum + actividad.pendientes.filter(t => t.confirmada).length, 0
    );
    
    const tiempoTotal = actividadesFiltradas.reduce((sum, actividad) => 
      sum + actividad.pendientes.reduce((sumT, tarea) => sumT + tarea.duracionMin, 0), 0
    );
    
    return {
      totalActividades: actividadesFiltradas.length,
      totalTareas,
      tareasTerminadas,
      tareasConfirmadas,
      tiempoTotalMinutos: tiempoTotal,
      porcentajeTerminadas: totalTareas > 0 ? (tareasTerminadas / totalTareas) * 100 : 0
    };
  };

  // Filtrar usuarios por estado
  const usuariosFiltradosPorEstado = useMemo(() => {
    return datos.data.usuarios.filter(usuario => {
      if (filtroUsuario === "con_actividades") return usuario.actividades.length > 0;
      if (filtroUsuario === "sin_actividades") return usuario.actividades.length === 0;
      if (filtroUsuario === "con_tareas") return usuario.estadisticas.totalTareas > 0;
      if (filtroUsuario === "con_pendientes") return usuario.estadisticas.tareasTerminadas < usuario.estadisticas.totalTareas;
      return true;
    });
  }, [datos.data.usuarios, filtroUsuario]);

  // Filtrar usuarios por fecha y búsqueda
  const usuariosFiltrados = useMemo(() => {
    return usuariosFiltradosPorEstado.map(usuario => {
      const estadisticasFecha = calcularEstadisticasPorFecha(usuario);
      return {
        ...usuario,
        estadisticasFecha,
        tieneActividadesEnFecha: estadisticasFecha.totalActividades > 0
      };
    }).filter(usuario => {
      // Filtrar solo usuarios con actividades en la fecha seleccionada
      if (fechaFiltro !== "todos" && !usuario.tieneActividadesEnFecha) return false;
      
      // Búsqueda por nombre, email, etc.
      if (!searchTerm) return true;
      
      const term = searchTerm.toLowerCase();
      return (
        usuario.nombre.toLowerCase().includes(term) ||
        usuario.email.toLowerCase().includes(term) ||
        usuario.odooUserId.toLowerCase().includes(term)
      );
    });
  }, [usuariosFiltradosPorEstado, fechaFiltro, searchTerm, fechaActual]);

  // Paginación
  const totalPages = Math.ceil(usuariosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const usuariosPaginados = usuariosFiltrados.slice(startIndex, endIndex);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fechaFiltro, filtroUsuario, setCurrentPage]);

  return (
    <div className="font-arial p-6 space-y-6">
      {/* Filters and Search */}
      <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-purple-500/50 transition-colors">
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-100">Filtrar Reportes por Fecha</h3>
              <p className="text-sm text-gray-400">
                Mostrando reportes del {fechaFiltro === 'hoy' ? 'día de hoy' : 
                  fechaFiltro === 'ayer' ? 'día de ayer' : 
                  fechaFiltro === 'ultima_semana' ? 'última semana' :
                  fechaFiltro === 'ultimo_mes' ? 'último mes' : 'todas las fechas'}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Buscar colaborador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64 bg-gray-800 border-none text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              
              <Select value={fechaFiltro} onValueChange={setFechaFiltro}>
                <SelectTrigger className="w-full sm:w-48 bg-gray-800 border-none text-gray-100 focus:border-purple-500 focus:ring-purple-500">
                  <SelectValue placeholder="Seleccionar fecha" />
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
        </CardContent>
      </Card>

      {/* Colaboradores Table */}
      <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-pink-500/50 transition-colors overflow-hidden">
        <CardHeader>
          <CardTitle className="text-gray-100">Reportes de Colaboradores</CardTitle>
          <CardDescription className="text-gray-400">
            Reportes filtrados por fecha - Haz clic para ver detalles completos
          </CardDescription>
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
                  <TableHead className="text-gray-300 font-medium">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosPaginados.map((usuario) => {
                  const porcentaje = usuario.estadisticasFecha.porcentajeTerminadas;
                  const esCompleto = porcentaje >= 100;
                  
                  return (
                    <TableRow key={usuario._id} className="bg-[#1a1a1a] border-[#141414] hover:bg-[#1f1f1f]">
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
                          {usuario.estadisticasFecha.totalActividades}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gray-800 text-gray-300">
                            {usuario.estadisticasFecha.totalTareas}
                          </Badge>
                          {usuario.estadisticasFecha.tareasTerminadas > 0 && (
                            <Badge className={`${esCompleto ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
                              {usuario.estadisticasFecha.tareasTerminadas}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">
                              {Math.round(porcentaje)}%
                            </span>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help">
                                  <Progress 
                                    value={porcentaje}
                                    className="h-1.5 bg-gray-700"
                                  >
                                    <div className={`h-full rounded-full ${
                                      esCompleto 
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                        : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                    }`} />
                                  </Progress>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="p-2">
                                  <div className="flex items-center gap-2">
                                    {esCompleto ? (
                                      <>
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm font-medium">¡Completado!</span>
                                      </>
                                    ) : (
                                      <>
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm font-medium">{Math.round(porcentaje)}% completado</span>
                                      </>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {usuario.estadisticasFecha.tareasTerminadas} de {usuario.estadisticasFecha.totalTareas} tareas terminadas
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-300">
                          {new Date(usuario.ultimaSincronizacion).toLocaleDateString()}
                          {usuario.estadisticasFecha.totalActividades > 0 && (
                            <div className="text-xs text-gray-500">
                              {usuario.estadisticasFecha.totalActividades} actividades en esta fecha
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => onViewUser(usuario)}
                          className="bg-[#6841ea] hover:bg-[#5a36d1] text-white"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver reporte
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-400">
                Mostrando {startIndex + 1}-{Math.min(endIndex, usuariosFiltrados.length)} de {usuariosFiltrados.length} usuarios
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="border-none text-gray-300 hover:bg-gray-800 hover:text-white hover:border-purple-500/50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={
                        currentPage === pageNumber
                          ? "bg-[#6841ea] hover:bg-[#5a36d1] text-white"
                          : "border-none text-gray-300 hover:bg-gray-800 hover:text-white hover:border-purple-500/50"
                      }
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="border-none text-gray-300 hover:bg-gray-800 hover:text-white hover:border-purple-500/50"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-purple-500/50 transition-colors">
          <CardContent className="text-center">
            <p className="text-sm text-gray-400 mb-2">Usuarios con reportes</p>
            <p className="text-3xl font-bold text-purple-400">{usuariosFiltrados.length}</p>
            <div className="mt-2 text-xs text-gray-500">
              Total de colaboradores con actividades en esta fecha
            </div>
          </CardContent>
        </Card>
        
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-green-500/50 transition-colors">
          <CardContent className="text-center">
            <p className="text-sm text-gray-400 mb-2">Tareas completadas</p>
            <p className="text-3xl font-bold text-green-400">
              {usuariosFiltrados.reduce((sum, u) => sum + u.estadisticasFecha.tareasTerminadas, 0)}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              Tareas terminadas en esta fecha
            </div>
          </CardContent>
        </Card>
        
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-[#2a2a2a] border-none hover:border-blue-500/50 transition-colors">
          <CardContent className="text-center">
            <p className="text-sm text-gray-400 mb-2">Eficiencia promedio</p>
            <p className="text-3xl font-bold text-blue-400">
              {usuariosFiltrados.length > 0 
                ? Math.round(usuariosFiltrados.reduce((sum, u) => sum + u.estadisticasFecha.porcentajeTerminadas, 0) / usuariosFiltrados.length)
                : 0}%
            </p>
            <div className="mt-2 text-xs text-gray-500">
              Porcentaje promedio de completado
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}