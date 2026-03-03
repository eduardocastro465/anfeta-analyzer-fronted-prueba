"use client";

import React, { useState, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import LoadingScreen from "./components/LoadingScreen";
import ErrorScreen from "./components/ErrorScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  FileText,
  LayoutGrid,
  ListChecks,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import {
  useActividadesData,
  obtenerFechaPorDias,
} from "./hooks/useReporteData";
import { Actividad, Tarea } from "./components/types";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";

export default function PanelAdminActividades() {
  const { toast } = useToast();
  const router = useRouter();

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
  const [actividadExpandida, setActividadExpandida] = useState<string | null>(
    null,
  );
  const [tareaExpandida, setTareaExpandida] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(true);

  // Estado para controlar visibilidad de botones de acción
  const [mostrarAcciones, setMostrarAcciones] = useState(false);

  const fechaActual = new Date().toISOString().split("T")[0];

  // Obtener valores únicos
  const proyectosUnicos = useMemo(() => {
    if (!actividades) return [];
    const proyectos = new Set(
      actividades.map((a) => a.proyecto).filter(Boolean),
    );
    return Array.from(proyectos).sort();
  }, [actividades]);

  const statusUnicos = useMemo(() => {
    if (!actividades) return [];
    const status = new Set(actividades.map((a) => a.status).filter(Boolean));
    return Array.from(status).sort();
  }, [actividades]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
    } finally {
      localStorage.removeItem("colaborador");
      localStorage.removeItem("actividades");
      router.push("/");
    }
  };

  // Filtrado
  const actividadesFiltradas = useMemo(() => {
    if (!actividades) return [];
    return actividades.filter((act) => {
      // Filtro fecha
      if (filtroFecha !== "todos") {
        const fechaAct = new Date(act.fecha);
        switch (filtroFecha) {
          case "hoy":
            if (act.fecha !== fechaActual) return false;
            break;
          case "ayer":
            if (act.fecha !== obtenerFechaPorDias(1)) return false;
            break;
          case "ultima_semana": {
            const semanaPasada = new Date();
            semanaPasada.setDate(semanaPasada.getDate() - 7);
            if (fechaAct < semanaPasada) return false;
            break;
          }
          case "ultimo_mes": {
            const mesPasado = new Date();
            mesPasado.setDate(mesPasado.getDate() - 30);
            if (fechaAct < mesPasado) return false;
            break;
          }
          case "rango":
            if (fechaInicio && act.fecha < fechaInicio) return false;
            if (fechaFin && act.fecha > fechaFin) return false;
            break;
        }
      }

      // Filtro proyecto
      if (filtroProyecto !== "todos" && act.proyecto !== filtroProyecto)
        return false;

      // Filtro status
      if (filtroStatus !== "todos" && act.status !== filtroStatus) return false;

      // Búsqueda texto
      if (busquedaTexto) {
        const t = busquedaTexto.toLowerCase();
        if (
          !act.titulo.toLowerCase().includes(t) &&
          !act.tareas.some(
            (ta) =>
              ta.nombre.toLowerCase().includes(t) ||
              (ta.descripcion && ta.descripcion.toLowerCase().includes(t)) ||
              ta.explicacionActual?.texto.toLowerCase().includes(t),
          )
        )
          return false;
      }
      return true;
    });
  }, [
    actividades,
    filtroFecha,
    filtroProyecto,
    filtroStatus,
    busquedaTexto,
    fechaInicio,
    fechaFin,
    fechaActual,
  ]);

  // Ordenamiento
  const actividadesOrdenadas = useMemo(() => {
    return [...actividadesFiltradas].sort((a, b) => {
      let cmp = 0;
      if (ordenarPor === "fecha") cmp = a.fecha.localeCompare(b.fecha);
      else if (ordenarPor === "proyecto")
        cmp = (a.proyecto || "").localeCompare(b.proyecto || "");
      else if (ordenarPor === "titulo") cmp = a.titulo.localeCompare(b.titulo);
      else if (ordenarPor === "tareas")
        cmp = (a.totalTareas || 0) - (b.totalTareas || 0);
      else if (ordenarPor === "explicaciones")
        cmp = (a.tareasConExplicacion || 0) - (b.tareasConExplicacion || 0);
      return ordenAsc ? cmp : -cmp;
    });
  }, [actividadesFiltradas, ordenarPor, ordenAsc]);

  // Exportar CSV
  const exportarACSV = () => {
    if (!actividades?.length) return;

    const filas = [
      [
        "Actividad ID",
        "Título",
        "Proyecto",
        "Fecha",
        "Hora",
        "Status",
        "Colaboradores",
        "Total Tareas",
        "Tareas con Exp",
        "Tarea ID",
        "Tarea",
        "Descripción",
        "Duración",
        "Prioridad",
        "Tiene Exp",
        "Texto Exp",
        "Email Exp",
        "Fecha Exp",
        "Validada",
      ].join(","),
    ];

    actividades.forEach((a: Actividad) => {
      if (a.tareas.length) {
        a.tareas.forEach((t: Tarea) => {
          const base = [
            a.actividadId,
            `"${a.titulo.replace(/"/g, '""')}"`,
            `"${a.proyecto}"`,
            a.fecha,
            `${a.horaInicio || ""}-${a.horaFin || ""}`,
            a.status,
            `"${(a.colaboradores || []).join(";")}"`,
            a.totalTareas,
            a.tareasConExplicacion,
            t.pendienteId || "",
            `"${t.nombre.replace(/"/g, '""')}"`,
            `"${(t.descripcion || "").replace(/"/g, '""')}"`,
            t.duracionMin || 0,
            t.prioridad || "MEDIA",
          ];

          if (t.explicacionActual) {
            filas.push(
              [
                ...base,
                "Sí",
                `"${t.explicacionActual.texto.replace(/"/g, '""')}"`,
                t.explicacionActual.email || "",
                t.explicacionActual.fecha || "",
                t.explicacionActual.validada ? "Sí" : "No",
              ].join(","),
            );
          } else {
            filas.push([...base, "No", "", "", "", ""].join(","));
          }
        });
      } else {
        filas.push(
          [
            a.actividadId,
            `"${a.titulo}"`,
            `"${a.proyecto}"`,
            a.fecha,
            `${a.horaInicio || ""}-${a.horaFin || ""}`,
            a.status,
            `"${(a.colaboradores || []).join(";")}"`,
            0,
            0,
            "Sin tareas",
            "",
            "",
            0,
            "",
            "No",
            "",
            "",
            "",
            "",
          ].join(","),
        );
      }
    });

    const blob = new Blob([filas.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `actividades_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast({
      title: "Exportación completada",
      description: `Se exportaron ${filas.length - 1} registros correctamente`,
      duration: 3000,
    });
  };

  const toggleOrden = (c: string) => {
    if (ordenarPor === c) setOrdenAsc(!ordenAsc);
    else {
      setOrdenarPor(c);
      setOrdenAsc(false);
    }
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
      duration: 2000,
    });
  };

  if (loading) return <LoadingScreen />;
  if (error || !actividades)
    return <ErrorScreen onRetry={() => cargarActividades(true)} />;

  return (
    <div className="font-['Inter',sans-serif] min-h-screen bg-[#0a0a0a] text-gray-100 p-6">
      {/* Header con diseño mejorado - cards redondeadas */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#6841ea] rounded-lg shadow-lg shadow-purple-500/20">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Panel de Actividades
                </h1>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <span>Gestión de explicaciones y tareas</span>
                  <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                  <span className="text-[#6841ea]">
                    {actividadesOrdenadas.length} actividades
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón para ocultar/mostrar acciones */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMostrarAcciones(!mostrarAcciones)}
              className="h-9 px-3 text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 rounded-lg transition-all duration-200"
            >
              {mostrarAcciones ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Ocultar acciones
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Mostrar acciones
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="h-9 px-3 text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 rounded-lg transition-all duration-200"
            >
              <Filter className="w-4 h-4 mr-2" />
              {mostrarFiltros ? "Ocultar" : "Mostrar"} filtros
            </Button>

            <Button
              size="sm"
              onClick={() => cargarActividades(true)}
              disabled={refreshing}
              className="h-9 px-3 bg-[#6841ea] hover:bg-[#7a4cf5] text-white border-0 rounded-lg shadow-lg shadow-purple-500/20 transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Actualizar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              className="h-9 px-3 text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>

        {/* Stats cards - REDONDEADAS (12px) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-[#111] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total actividades</p>
                <p className="text-2xl font-bold text-white">
                  {totalActividades}
                </p>
              </div>
              <div className="p-2 bg-[#6841ea]/10 rounded-lg">
                <FileText className="w-5 h-5 text-[#6841ea]" />
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Tareas totales</p>
                <p className="text-2xl font-bold text-white">{totalTareas}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ListChecks className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Explicaciones</p>
                <p className="text-2xl font-bold text-white">
                  {actividades.reduce(
                    (acc, act) => acc + act.tareasConExplicacion,
                    0,
                  )}
                </p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Colaboradores</p>
                <p className="text-2xl font-bold text-white">
                  {
                    new Set(actividades.flatMap((a) => a.colaboradores || []))
                      .size
                  }
                </p>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Users className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros - REDONDEADOS (12px) */}
      {mostrarFiltros && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-[#111] border border-white/5 rounded-xl p-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={busquedaTexto}
                  onChange={(e) => setBusquedaTexto(e.target.value)}
                  placeholder="Buscar actividades, tareas, explicaciones..."
                  className="pl-9 h-10 text-sm bg-[#1a1a1a] border-white/5 rounded-lg focus:border-[#6841ea] transition-colors"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="w-full h-10 text-sm bg-[#1a1a1a] border-white/5 rounded-lg px-3 text-gray-300 focus:border-[#6841ea] transition-colors"
                >
                  <option value="todos">Todas las fechas</option>
                  <option value="hoy">Hoy</option>
                  <option value="ayer">Ayer</option>
                  <option value="ultima_semana">Última semana</option>
                  <option value="ultimo_mes">Último mes</option>
                  <option value="rango">Rango personalizado</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={filtroProyecto}
                  onChange={(e) => setFiltroProyecto(e.target.value)}
                  className="w-full h-10 text-sm bg-[#1a1a1a] border-white/5 rounded-lg px-3 text-gray-300 focus:border-[#6841ea] transition-colors"
                >
                  <option value="todos">Todos los proyectos</option>
                  {proyectosUnicos.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full h-10 text-sm bg-[#1a1a1a] border-white/5 rounded-lg px-3 text-gray-300 focus:border-[#6841ea] transition-colors"
                >
                  <option value="todos">Todos los estados</option>
                  {statusUnicos.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                {/* Botón de limpiar filtros - SOLO VISIBLE cuando mostrarAcciones es true */}
                {mostrarAcciones && (
                  <Button
                    variant="ghost"
                    onClick={limpiarFiltros}
                    className="w-full h-10 text-sm text-gray-400 hover:text-white border border-white/5 hover:border-white/10 rounded-lg transition-all duration-200"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {filtroFecha === "rango" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="h-10 text-sm bg-[#1a1a1a] border-white/5 rounded-lg focus:border-[#6841ea] transition-colors"
                  placeholder="Fecha inicio"
                />
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="h-10 text-sm bg-[#1a1a1a] border-white/5 rounded-lg focus:border-[#6841ea] transition-colors"
                  placeholder="Fecha fin"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabla principal - ESQUINAS RECTAS (0px) */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#111] border border-white/5 overflow-hidden shadow-2xl shadow-black/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1a1a1a] border-b border-white/5">
                <tr>
                  <th className="px-3 py-3 w-6"></th>
                  <th
                    className="px-3 py-3 text-left cursor-pointer hover:text-white w-24"
                    onClick={() => toggleOrden("fecha")}
                  >
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Fecha
                      {ordenarPor === "fecha" &&
                        (ordenAsc ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        ))}
                    </span>
                  </th>
                  <th
                    className="px-3 py-3 text-left cursor-pointer hover:text-white w-28"
                    onClick={() => toggleOrden("proyecto")}
                  >
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Proyecto
                      {ordenarPor === "proyecto" &&
                        (ordenAsc ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        ))}
                    </span>
                  </th>
                  <th
                    className="px-3 py-3 text-left cursor-pointer hover:text-white"
                    onClick={() => toggleOrden("titulo")}
                  >
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actividad
                      {ordenarPor === "titulo" &&
                        (ordenAsc ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        ))}
                    </span>
                  </th>
                  <th
                    className="px-3 py-3 text-left w-20 cursor-pointer hover:text-white"
                    onClick={() => toggleOrden("tareas")}
                  >
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Tareas
                      {ordenarPor === "tareas" &&
                        (ordenAsc ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        ))}
                    </span>
                  </th>
                  <th
                    className="px-3 py-3 text-left w-24 cursor-pointer hover:text-white"
                    onClick={() => toggleOrden("explicaciones")}
                  >
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Explicaciones
                      {ordenarPor === "explicaciones" &&
                        (ordenAsc ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        ))}
                    </span>
                  </th>
                  <th className="px-3 py-3 text-left w-32">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Colaboradores
                    </span>
                  </th>

                  {/* Columna de acciones - SOLO VISIBLE cuando mostrarAcciones es true */}
                  {mostrarAcciones && (
                    <th className="px-3 py-3 text-center w-20">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Acciones
                      </span>
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {actividadesOrdenadas.map((act) => (
                  <React.Fragment key={act.actividadId}>
                    {/* Fila actividad */}
                    <tr
                      className="hover:bg-white/5 cursor-pointer transition-colors duration-150 group"
                      onClick={() =>
                        setActividadExpandida(
                          actividadExpandida === act.actividadId
                            ? null
                            : act.actividadId,
                        )
                      }
                    >
                      <td className="px-3 py-3">
                        <div
                          className={`p-1 transition-colors duration-200 ${
                            actividadExpandida === act.actividadId
                              ? "bg-[#6841ea]/20"
                              : "group-hover:bg-white/5"
                          }`}
                        >
                          {actividadExpandida === act.actividadId ? (
                            <ChevronUp className="w-4 h-4 text-[#6841ea]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-gray-300 font-medium">
                          {act.fecha}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex px-2 py-1 bg-[#1a1a1a] border border-white/5 text-xs font-medium text-gray-300">
                          {act.proyecto}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <div className="font-medium text-white">
                            {act.titulo}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-0.5 ${
                                act.status === "COMPLETADA"
                                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                  : act.status === "EN_PROGRESO"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              }`}
                            >
                              {act.status}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-white font-medium">
                            {act.totalTareas}
                          </span>
                          {act.totalTareas > 0 && (
                            <span className="text-xs text-gray-500">
                              (
                              {Math.round(
                                (act.tareasConExplicacion / act.totalTareas) *
                                  100,
                              )}
                              %)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {act.tareasConExplicacion > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-400"></span>
                            <span className="text-green-400 font-medium">
                              {act.tareasConExplicacion}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex -space-x-2">
                          {act.colaboradores?.slice(0, 3).map((email, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-xs font-medium text-gray-300 hover:z-10 transition-transform hover:scale-110"
                              title={email}
                            >
                              {email.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {act.colaboradores?.length > 3 && (
                            <div className="w-7 h-7 bg-[#6841ea]/20 border border-[#6841ea]/30 flex items-center justify-center text-xs font-medium text-[#6841ea]">
                              +{act.colaboradores.length - 3}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Botón de exportar por actividad - SOLO VISIBLE cuando mostrarAcciones es true */}
                      {mostrarAcciones && (
                        <td className="px-3 py-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast({
                                title: "Información",
                                description:
                                  "Exportación por actividad pronto disponible",
                                duration: 2000,
                              });
                            }}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#6841ea]/20 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </td>
                      )}
                    </tr>

                    {/* Tareas expandidas - CONTENEDOR EXTERIOR RECTO, PERO ELEMENTOS INTERNOS REDONDEADOS */}
                    {actividadExpandida === act.actividadId && (
                      <tr>
                        <td
                          colSpan={mostrarAcciones ? 8 : 7}
                          className="px-0 py-0 bg-[#1a1a1a]"
                        >
                          <div className="border-t border-white/5">
                            <div className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-[#6841ea]/10 rounded-lg">
                                  <ListChecks className="w-4 h-4 text-[#6841ea]" />
                                </div>
                                <h4 className="text-sm font-medium text-white">
                                  Tareas ({act.tareas.length})
                                </h4>
                              </div>

                              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                {act.tareas.map((t) => (
                                  <div
                                    key={t.pendienteId}
                                    className="bg-[#111] border border-white/5 rounded-lg overflow-hidden"
                                  >
                                    {/* Cabecera de tarea */}
                                    <div
                                      className="p-3 cursor-pointer hover:bg-white/5 transition-colors"
                                      onClick={() =>
                                        setTareaExpandida(
                                          tareaExpandida === t.pendienteId
                                            ? null
                                            : t.pendienteId,
                                        )
                                      }
                                    >
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`p-1 transition-colors ${
                                            tareaExpandida === t.pendienteId
                                              ? "bg-[#6841ea]/20"
                                              : ""
                                          }`}
                                        >
                                          {tareaExpandida === t.pendienteId ? (
                                            <ChevronUp className="w-3.5 h-3.5 text-[#6841ea]" />
                                          ) : (
                                            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                          )}
                                        </div>

                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">
                                              {t.nombre}
                                            </span>
                                            <span
                                              className={`text-xs px-2 py-0.5 rounded-full ${
                                                t.prioridad === "ALTA"
                                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                                  : t.prioridad === "MEDIA"
                                                    ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                              }`}
                                            >
                                              {t.prioridad}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {t.duracionMin} min
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              |
                                            </span>
                                            <span
                                              className={`text-xs flex items-center gap-1 ${
                                                t.terminada
                                                  ? "text-green-400"
                                                  : "text-yellow-400"
                                              }`}
                                            >
                                              {t.terminada
                                                ? "Completada"
                                                : "Pendiente"}
                                            </span>
                                            {t.tieneExplicacion && (
                                              <>
                                                <span className="text-xs text-gray-500">
                                                  |
                                                </span>
                                                <span className="text-xs text-green-400 flex items-center gap-1">
                                                  <CheckCircle className="w-3 h-3" />
                                                  Con explicación
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Detalle de explicación */}
                                    {tareaExpandida === t.pendienteId &&
                                      t.explicacionActual && (
                                        <div className="border-t border-white/5 bg-[#111] p-4">
                                          <div className="space-y-3">
                                            {/* Explicación actual */}
                                            <div className="bg-[#1a1a1a] p-4 border border-[#6841ea]/20 rounded-lg">
                                              <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                  <div className="p-1.5 bg-[#6841ea]/10 rounded-lg">
                                                    <CheckCircle className="w-4 h-4 text-[#6841ea]" />
                                                  </div>
                                                  <span className="text-sm font-medium text-white">
                                                    Explicación actual
                                                  </span>
                                                </div>
                                                <span
                                                  className={`text-xs px-2 py-1 rounded-full ${
                                                    t.explicacionActual.validada
                                                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                                      : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                                  }`}
                                                >
                                                  {t.explicacionActual.validada
                                                    ? "Validada"
                                                    : "Pendiente"}
                                                </span>
                                              </div>

                                              <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                                                {t.explicacionActual.texto}
                                              </p>

                                              <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-6 h-6 bg-[#2a2a2a] border border-white/10 rounded-full flex items-center justify-center text-xs font-medium text-gray-300">
                                                    {t.explicacionActual.email
                                                      ?.charAt(0)
                                                      .toUpperCase()}
                                                  </div>
                                                  <span className="text-gray-400">
                                                    {
                                                      t.explicacionActual.email?.split(
                                                        "@",
                                                      )[0]
                                                    }
                                                  </span>
                                                </div>
                                                <span className="text-gray-500">
                                                  {new Date(
                                                    t.explicacionActual.fecha,
                                                  ).toLocaleString("es-ES", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                  })}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Historial */}
                                            {t.historialExplicaciones &&
                                              t.historialExplicaciones.length >
                                                0 && (
                                                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                                                  <h5 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Historial de versiones (
                                                    {
                                                      t.historialExplicaciones
                                                        .length
                                                    }
                                                    )
                                                  </h5>

                                                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                                    {t.historialExplicaciones.map(
                                                      (hist, idx) => (
                                                        <div
                                                          key={idx}
                                                          className="p-3 bg-[#111] border border-white/5 rounded-lg"
                                                        >
                                                          <p className="text-sm text-gray-400 mb-2">
                                                            {hist.texto}
                                                          </p>
                                                          <div className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-2">
                                                              <span className="text-gray-500">
                                                                {
                                                                  hist.email?.split(
                                                                    "@",
                                                                  )[0]
                                                                }
                                                              </span>
                                                            </div>
                                                            <span className="text-gray-600">
                                                              {new Date(
                                                                hist.fecha,
                                                              ).toLocaleDateString(
                                                                "es-ES",
                                                                {
                                                                  day: "2-digit",
                                                                  month:
                                                                    "2-digit",
                                                                  year: "numeric",
                                                                },
                                                              )}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      ),
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                ))}
                              </div>
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

          {actividadesOrdenadas.length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex p-3 bg-gray-800/50 rounded-lg mb-3">
                <AlertCircle className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm">
                No se encontraron actividades
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Intenta ajustar los filtros de búsqueda
              </p>
            </div>
          )}
        </div>

        {/* Footer con estadísticas - MIXTO: contenedor recto, elementos internos redondeados */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#6841ea] rounded-full"></div>
              <span className="text-gray-400">
                {actividadesOrdenadas.length} actividades mostradas
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-400">
                {actividadesOrdenadas.reduce(
                  (acc, act) => acc + act.tareasConExplicacion,
                  0,
                )}{" "}
                explicaciones
              </span>
            </div>
          </div>

          {/* Botón de exportar general - SOLO VISIBLE cuando mostrarAcciones es true */}
          {mostrarAcciones && (
            <Button
              size="sm"
              onClick={exportarACSV}
              className="h-8 px-3 bg-[#6841ea] hover:bg-[#7a4cf5] text-white border-0 rounded-lg text-xs shadow-lg shadow-purple-500/20"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
}
