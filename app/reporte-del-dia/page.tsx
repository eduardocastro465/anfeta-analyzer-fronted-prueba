"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Breadcrumbs from "./components/Breadcrumbs";
import DashboardView from "./components/DashboardView";
import ColaboradoresView from "./components/ColaboradoresView";
import DetallesView from "./components/DetallesView";
import LoadingScreen from "./components/LoadingScreen";
import ErrorScreen from "./components/ErrorScreen";
import {
  useReporteData,
  obtenerIniciales,
  calcularProgresoUsuario,
  obtenerFechaPorDias,
} from "./hooks/useReporteData";
import {
  ViewMode,
  DetalleView,
  Usuario,
  Actividad,
  Pendiente,
  ApiResponse,
} from "./components/types";

export default function PanelAdminExplicacionesReal() {
  // Estados de navegación
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [detalleView, setDetalleView] = useState<DetalleView>("general");
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Actividad | null>(
    null,
  );
  const [selectedTask, setSelectedTask] = useState<Pendiente | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState<string>("todos");
  const [fechaFiltro, setFechaFiltro] = useState<string>("hoy");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fechaActual = new Date().toISOString().split("T")[0];
  const { toast } = useToast();

  // Hook personalizado para datos
  const {
    datos,
    loading,
    error,
    refreshing,
    tiempoUltimaCarga,
    cargarDatosReales,
    setDatos,
  } = useReporteData();

  // Funciones de navegación
  const verDashboardGeneral = () => {
    setViewMode("dashboard");
    setDetalleView("general");
    setSelectedUser(null);
    setSelectedActivity(null);
    setSelectedTask(null);
  };

  const verColaboradores = () => {
    setViewMode("colaboradores");
    setDetalleView("general");
    setSelectedUser(null);
    setSelectedActivity(null);
    setSelectedTask(null);
  };

  const verDetallesGenerales = () => {
    setViewMode("detalles");
    setDetalleView("general");
    setSelectedUser(null);
    setSelectedActivity(null);
    setSelectedTask(null);
  };

  const verDetalleUsuario = (usuario: Usuario) => {
    setViewMode("detalles");
    setDetalleView("usuario");
    setSelectedUser(usuario);
    setSelectedActivity(null);
    setSelectedTask(null);
  };

  const verDetalleActividad = (actividad: Actividad, usuario: Usuario) => {
    setViewMode("detalles");
    setDetalleView("actividad");
    setSelectedUser(usuario);
    setSelectedActivity(actividad);
    setSelectedTask(null);
  };

  const verDetalleTarea = (
    tarea: Pendiente,
    actividad: Actividad,
    usuario: Usuario,
  ) => {
    setViewMode("detalles");
    setDetalleView("tarea");
    setSelectedUser(usuario);
    setSelectedActivity(actividad);
    setSelectedTask(tarea);
  };

  // Funciones de filtrado (mantener lógica similar)
  const filtrarActividadesPorFecha = (usuario: Usuario): Actividad[] => {
    if (!usuario.actividades || usuario.actividades.length === 0) return [];

    switch (fechaFiltro) {
      case "hoy":
        return usuario.actividades.filter(
          (actividad) => actividad.fecha === fechaActual,
        );
      case "ayer":
        const fechaAyer = obtenerFechaPorDias(1);
        return usuario.actividades.filter(
          (actividad) => actividad.fecha === fechaAyer,
        );
      case "ultima_semana":
        const fechaSemanaPasada = obtenerFechaPorDias(7);
        return usuario.actividades.filter(
          (actividad) =>
            new Date(actividad.fecha) >= new Date(fechaSemanaPasada),
        );
      case "ultimo_mes":
        const fechaMesPasado = obtenerFechaPorDias(30);
        return usuario.actividades.filter(
          (actividad) => new Date(actividad.fecha) >= new Date(fechaMesPasado),
        );
      case "todos":
      default:
        return usuario.actividades;
    }
  };

  // Exportar CSV
  const exportarACSV = () => {
    if (!datos) return;

    const filas = [];
    filas.push(
      [
        "Usuario ID",
        "Nombre",
        "Email",
        "Fuente",
        "Actividad ID",
        "Título Actividad",
        "Fecha Actividad",
        "Horario",
        "Status",
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

    datos.data.usuarios.forEach((usuario) => {
      usuario.actividades.forEach((actividad) => {
        actividad.pendientes.forEach((pendiente) => {
          filas.push(
            [
              usuario.odooUserId,
              `"${usuario.nombre}"`,
              `"${usuario.email}"`,
              usuario.fuente,
              actividad.actividadId,
              `"${actividad.titulo.replace(/"/g, '""')}"`,
              actividad.fecha,
              `${actividad.horaInicio}-${actividad.horaFin}`,
              actividad.status,
              pendiente.pendienteId || "N/A",
              `"${(pendiente.nombre || "").replace(/"/g, '""')}"`,
              `"${(pendiente.descripcion || "").replace(/"/g, '""')}"`,
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
    const fecha = new Date().toISOString().split("T")[0];
    link.href = URL.createObjectURL(blob);
    link.download = `explicaciones_completas_${fecha}.csv`;
    link.click();

    toast({
      title: "Exportado exitosamente",
      description: `${filas.length - 1} registros exportados a CSV`,
    });
  };

  // Renderizar estados
  if (loading) return <LoadingScreen />;
  if (error || !datos)
    return <ErrorScreen onRetry={() => cargarDatosReales(true)} />;

  // Main Content selector
  const MainContent = () => {
    switch (viewMode) {
      case "dashboard":
        return (
          <DashboardView
            estadisticas={datos.estadisticas}
            data={datos.data}
            onViewUser={verDetalleUsuario}
            onViewActivity={verDetalleActividad}
          />
        );
      case "colaboradores":
        return (
          <ColaboradoresView
            datos={datos}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            fechaFiltro={fechaFiltro}
            setFechaFiltro={setFechaFiltro}
            filtroUsuario={filtroUsuario}
            setFiltroUsuario={setFiltroUsuario}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            fechaActual={fechaActual}
            onViewUser={verDetalleUsuario}
            obtenerIniciales={obtenerIniciales}
          />
        );
      case "detalles":
        return (
          <DetallesView
            detalleView={detalleView}
            datos={datos}
            selectedUser={selectedUser}
            selectedActivity={selectedActivity}
            selectedTask={selectedTask}
            onBackToGeneral={verDetallesGenerales}
            onBackToUser={() => selectedUser && verDetalleUsuario(selectedUser)}
            onViewActivity={verDetalleActividad}
            onViewTask={verDetalleTarea}
            onViewUser={verDetalleUsuario}
            obtenerIniciales={obtenerIniciales}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="font-['Arial'] min-h-screen bg-[#1a1a1a] text-gray-100 font-arial">
      <Sidebar
        sidebarOpen={sidebarOpen}
        viewMode={viewMode}
        estadisticas={datos.estadisticas}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onViewChange={(view) => {
          if (view === "dashboard") verDashboardGeneral();
          if (view === "colaboradores") verColaboradores();
          if (view === "detalles") verDetallesGenerales();
        }}
      />

      <div
        className={`min-h-screen flex flex-col transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        <div className="sticky top-0 z-40 bg-[#1a1a1a] border-none">
          <Header
            viewMode={viewMode}
            detalleView={detalleView}
            selectedUser={selectedUser}
            selectedActivity={selectedActivity}
            selectedTask={selectedTask}
            tiempoUltimaCarga={tiempoUltimaCarga}
            refreshing={refreshing}
            onExport={exportarACSV}
            onRefresh={() => cargarDatosReales(true)}
          />

          <Breadcrumbs
            viewMode={viewMode}
            detalleView={detalleView}
            selectedUser={selectedUser}
            selectedActivity={selectedActivity}
            onViewDashboard={verDashboardGeneral}
            onViewColaboradores={verColaboradores}
            onViewDetalles={verDetallesGenerales}
            onBackToUser={verDetalleUsuario}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <MainContent />
        </div>
      </div>
    </div>
  );
}
