"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Search,
  Download,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Users,
  Activity,
  Loader2,
  Shield,
  Mail,
  Hash,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Interfaces basadas en TU JSON
interface Pendiente {
  pendienteId: string;
  nombre: string;
  descripcion: string;
  terminada: boolean;
  confirmada: boolean;
  duracionMin: number;
  fechaCreacion: string;
  fechaFinTerminada: string | null;
  _id?: string;
}

interface Actividad {
  actividadId: string;
  titulo: string;
  horaInicio: string;
  horaFin: string;
  status: string;
  fecha: string;
  pendientes: Pendiente[];
  ultimaActualizacion: string;
}

interface UsuarioCompleto {
  _id: string;
  odooUserId: string;
  email?: string;
  nombre?: string;
  avatar?: string;
  rol?: string;
  actividades: Actividad[];
  createdAt: string;
  ultimaSincronizacion: string;
  updatedAt: string;
  __v: number;
}

interface EstadisticasGlobales {
  totalUsuarios: number;
  totalActividades: number;
  totalTareas: number;
  totalTareasTerminadas: number;
  tiempoTotalMinutos: number;
}

export default function PanelAdminCompleto() {
  // Estados
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasGlobales>({
    totalUsuarios: 0,
    totalActividades: 0,
    totalTareas: 0,
    totalTareasTerminadas: 0,
    tiempoTotalMinutos: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [usuarioExpandido, setUsuarioExpandido] = useState<string | null>(null);
  const [actividadExpandida, setActividadExpandida] = useState<string | null>(
    null,
  );
  const { toast } = useToast();

  // Cargar datos
  const cargarDatosCompletos = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "http://localhost:4001/api/v1/assistant/admin/todas-explicaciones",
        {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setUsuarios(result.data.usuarios || []);
        setEstadisticas(
          result.data.estadisticas || {
            totalUsuarios: 0,
            totalActividades: 0,
            totalTareas: 0,
            totalTareasTerminadas: 0,
            tiempoTotalMinutos: 0,
          },
        );

        toast({
          title: "Datos cargados",
          description: `${result.data.usuarios?.length || 0} usuarios encontrados`,
        });
      } else {
        throw new Error("Formato de respuesta inválido");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");

      // Cargar datos de ejemplo si la API falla
      // cargarDatosEjemplo();

      toast({
        title: "Modo demo activado",
        description: "Usando datos de ejemplo",
        variant: "default",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosCompletos();
  }, []);

  // Filtrar usuarios
  const usuariosFiltrados = usuarios.filter((usuario) => {
    if (filtroUsuario === "todos") return true;
    if (filtroUsuario === "con_actividades")
      return usuario.actividades.length > 0;
    if (filtroUsuario === "sin_actividades")
      return usuario.actividades.length === 0;
    if (filtroUsuario === "admin") return usuario.rol === "admin";
    return true;
  });

  // Buscar en todos los campos
  const usuariosBuscados = usuariosFiltrados.filter((usuario) => {
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    return (
      usuario.nombre?.toLowerCase().includes(term) ||
      usuario.email?.toLowerCase().includes(term) ||
      usuario.odooUserId.toLowerCase().includes(term) ||
      usuario.actividades.some(
        (actividad) =>
          actividad.titulo.toLowerCase().includes(term) ||
          actividad.pendientes.some(
            (pendiente) =>
              pendiente.nombre.toLowerCase().includes(term) ||
              pendiente.descripcion.toLowerCase().includes(term),
          ),
      )
    );
  });

  // Función para exportar a CSV
  const exportarACSV = () => {
    const filas = [];

    // Cabeceras
    filas.push(
      [
        "Usuario ID",
        "Nombre",
        "Email",
        "Actividad ID",
        "Título Actividad",
        "Fecha Actividad",
        "Tarea ID",
        "Nombre Tarea",
        "Descripción",
        "Terminada",
        "Confirmada",
        "Duración (min)",
        "Fecha Creación",
        "Última Actualización",
      ].join(","),
    );

    // Datos
    usuarios.forEach((usuario) => {
      usuario.actividades.forEach((actividad) => {
        actividad.pendientes.forEach((pendiente) => {
          filas.push(
            [
              usuario.odooUserId,
              `"${usuario.nombre || "Sin nombre"}"`,
              `"${usuario.email || "Sin email"}"`,
              actividad.actividadId,
              `"${actividad.titulo.replace(/"/g, '""')}"`,
              actividad.fecha,
              pendiente.pendienteId,
              `"${pendiente.nombre.replace(/"/g, '""')}"`,
              `"${pendiente.descripcion.replace(/"/g, '""')}"`,
              pendiente.terminada ? "Sí" : "No",
              pendiente.confirmada ? "Sí" : "No",
              pendiente.duracionMin,
              new Date(pendiente.fechaCreacion).toLocaleDateString(),
              new Date(actividad.ultimaActualizacion).toLocaleString(),
            ].join(","),
          );
        });
      });
    });

    const csv = filas.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `explicaciones_completas_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({
      title: "Exportado",
      description: `Se exportaron ${filas.length - 1} registros`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#6841ea] mx-auto" />
          <h2 className="text-2xl font-bold text-gray-800">
            Cargando panel de administración...
          </h2>
          <p className="text-gray-600">
            Obteniendo datos de todos los usuarios
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  font-arial  bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#6841ea]/10">
              <Shield className="w-8 h-8 text-[#6841ea]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Panel de Administración
              </h1>
              <p className="text-gray-600">
                Gestión completa de explicaciones de todos los usuarios
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={exportarACSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={cargarDatosCompletos}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        {/* ESTADÍSTICAS PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Usuarios</p>
                  <h3 className="text-2xl font-bold">
                    {estadisticas.totalUsuarios}
                  </h3>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <Progress value={100} className="mt-4" />
              <p className="text-xs text-gray-500 mt-2">
                Total registrados en el sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Actividades
                  </p>
                  <h3 className="text-2xl font-bold">
                    {estadisticas.totalActividades}
                  </h3>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <Progress value={100} className="mt-4" />
              <p className="text-xs text-gray-500 mt-2">
                Total actividades registradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tareas</p>
                  <h3 className="text-2xl font-bold">
                    {estadisticas.totalTareas}
                  </h3>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <Progress
                value={
                  estadisticas.totalTareas > 0
                    ? (estadisticas.totalTareasTerminadas /
                        estadisticas.totalTareas) *
                      100
                    : 0
                }
                className="mt-4"
              />
              <p className="text-xs text-gray-500 mt-2">
                {estadisticas.totalTareasTerminadas} terminadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Tiempo Total
                  </p>
                  <h3 className="text-2xl font-bold">
                    {Math.floor(estadisticas.tiempoTotalMinutos / 60)}h{" "}
                    {estadisticas.tiempoTotalMinutos % 60}m
                  </h3>
                </div>
                <div className="p-3 rounded-full bg-orange-100">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  {estadisticas.tiempoTotalMinutos} minutos totales
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FILTROS Y BÚSQUEDA */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar en usuarios, actividades, tareas, descripciones..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los usuarios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los usuarios</SelectItem>
                    <SelectItem value="con_actividades">
                      Con actividades
                    </SelectItem>
                    <SelectItem value="sin_actividades">
                      Sin actividades
                    </SelectItem>
                    <SelectItem value="admin">Solo administradores</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado tareas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las tareas</SelectItem>
                    <SelectItem value="terminadas">Solo terminadas</SelectItem>
                    <SelectItem value="pendientes">Solo pendientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {usuariosBuscados.length} usuarios
                </Badge>
                <Badge variant="outline">
                  {usuariosBuscados.reduce(
                    (sum, u) => sum + u.actividades.length,
                    0,
                  )}{" "}
                  actividades
                </Badge>
                <Badge variant="outline">
                  {usuariosBuscados.reduce(
                    (sum, u) =>
                      sum +
                      u.actividades.reduce(
                        (sumAct, act) => sumAct + act.pendientes.length,
                        0,
                      ),
                    0,
                  )}{" "}
                  tareas
                </Badge>
              </div>

              <div className="text-sm text-gray-500">
                Última actualización: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LISTADO DE USUARIOS */}
        <div className="space-y-4">
          {usuariosBuscados.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">
                  No se encontraron usuarios
                </h3>
                <p className="text-gray-500">
                  Intenta con otros términos de búsqueda
                </p>
              </CardContent>
            </Card>
          ) : (
            usuariosBuscados.map((usuario) => (
              <Card key={usuario._id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* CABECERA USUARIO */}
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-[#6841ea]/10 text-[#6841ea]">
                            {usuario.nombre?.charAt(0) ||
                              usuario.email?.charAt(0) ||
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">
                              {usuario.nombre || "Usuario sin nombre"}
                            </h3>
                            {usuario.rol === "admin" && (
                              <Badge variant="default" className="bg-[#6841ea]">
                                <Shield className="w-3 h-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {usuario.email || "Sin email"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              ID: {usuario.odooUserId.substring(0, 8)}...
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Últ. sync:{" "}
                              {new Date(
                                usuario.ultimaSincronizacion,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {usuario.actividades.length} actividades
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setUsuarioExpandido(
                              usuarioExpandido === usuario._id
                                ? null
                                : usuario._id,
                            )
                          }
                        >
                          {usuarioExpandido === usuario._id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* DETALLE EXPANDIDO */}
                  {usuarioExpandido === usuario._id && (
                    <div className="p-4 space-y-4">
                      {usuario.actividades.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p>Este usuario no tiene actividades registradas</p>
                        </div>
                      ) : (
                        usuario.actividades.map((actividad) => (
                          <Card key={actividad.actividadId} className="border">
                            <CardContent className="p-4">
                              {/* CABECERA ACTIVIDAD */}
                              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-1">
                                    {actividad.titulo}
                                  </h4>
                                  <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {actividad.fecha}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {actividad.horaInicio} -{" "}
                                      {actividad.horaFin}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={
                                        actividad.status === "activo"
                                          ? "bg-green-50 text-green-700"
                                          : actividad.status === "completado"
                                            ? "bg-blue-50 text-blue-700"
                                            : "bg-gray-50 text-gray-700"
                                      }
                                    >
                                      {actividad.status}
                                    </Badge>
                                  </div>
                                </div>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setActividadExpandida(
                                      actividadExpandida ===
                                        actividad.actividadId
                                        ? null
                                        : actividad.actividadId,
                                    )
                                  }
                                >
                                  {actividadExpandida ===
                                  actividad.actividadId ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                  <span className="ml-1">
                                    {actividad.pendientes.length} tareas
                                  </span>
                                </Button>
                              </div>

                              {/* DETALLE TAREAS */}
                              {actividadExpandida === actividad.actividadId && (
                                <div className="space-y-3">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-12">
                                          #
                                        </TableHead>
                                        <TableHead>Tarea</TableHead>
                                        <TableHead className="w-32">
                                          Estado
                                        </TableHead>
                                        <TableHead className="w-24">
                                          Duración
                                        </TableHead>
                                        <TableHead className="w-32">
                                          Acciones
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {actividad.pendientes.map(
                                        (pendiente, index) => (
                                          <TableRow key={pendiente.pendienteId}>
                                            <TableCell>
                                              <div
                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                              ${
                                                index % 3 === 0
                                                  ? "bg-blue-100 text-blue-700"
                                                  : index % 3 === 1
                                                    ? "bg-purple-100 text-purple-700"
                                                    : "bg-green-100 text-green-700"
                                              }`}
                                              >
                                                {index + 1}
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <div className="font-medium">
                                                {pendiente.nombre}
                                              </div>
                                              <div className="text-xs text-gray-500 truncate max-w-xs">
                                                {pendiente.descripcion.length >
                                                100
                                                  ? `${pendiente.descripcion.substring(0, 100)}...`
                                                  : pendiente.descripcion}
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-1">
                                                {pendiente.terminada ? (
                                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                  <XCircle className="w-4 h-4 text-red-500" />
                                                )}
                                                <Badge
                                                  variant={
                                                    pendiente.terminada
                                                      ? "default"
                                                      : "secondary"
                                                  }
                                                  className={
                                                    pendiente.terminada
                                                      ? "bg-green-100 text-green-800"
                                                      : "bg-gray-100 text-gray-800"
                                                  }
                                                >
                                                  {pendiente.terminada
                                                    ? "Terminada"
                                                    : "Pendiente"}
                                                </Badge>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-gray-500" />
                                                <span>
                                                  {pendiente.duracionMin} min
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <Dialog>
                                                <DialogTrigger asChild>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                  >
                                                    <Eye className="w-3 h-3 mr-1" />
                                                    Ver
                                                  </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl">
                                                  <DialogHeader>
                                                    <DialogTitle>
                                                      Detalle completo de la
                                                      tarea
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                      Información detallada de
                                                      la explicación
                                                    </DialogDescription>
                                                  </DialogHeader>
                                                  <div className="space-y-4">
                                                    <div>
                                                      <h4 className="font-semibold mb-2">
                                                        Tarea
                                                      </h4>
                                                      <p className="text-lg">
                                                        {pendiente.nombre}
                                                      </p>
                                                    </div>
                                                    <div>
                                                      <h4 className="font-semibold mb-2">
                                                        Explicación completa
                                                      </h4>
                                                      <div className="p-4 bg-gray-50 rounded-lg">
                                                        <p className="whitespace-pre-wrap">
                                                          {
                                                            pendiente.descripcion
                                                          }
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                      <div>
                                                        <h4 className="font-semibold mb-2">
                                                          Estado
                                                        </h4>
                                                        <div className="flex items-center gap-2">
                                                          {pendiente.terminada ? (
                                                            <Badge className="bg-green-100 text-green-800">
                                                              <CheckCircle className="w-3 h-3 mr-1" />
                                                              Terminada
                                                            </Badge>
                                                          ) : (
                                                            <Badge variant="secondary">
                                                              Pendiente
                                                            </Badge>
                                                          )}
                                                          {pendiente.confirmada && (
                                                            <Badge className="bg-blue-100 text-blue-800">
                                                              Confirmada
                                                            </Badge>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <div>
                                                        <h4 className="font-semibold mb-2">
                                                          Tiempo
                                                        </h4>
                                                        <p>
                                                          {
                                                            pendiente.duracionMin
                                                          }{" "}
                                                          minutos
                                                        </p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </DialogContent>
                                              </Dialog>
                                            </TableCell>
                                          </TableRow>
                                        ),
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
