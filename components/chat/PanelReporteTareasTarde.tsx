"use client";

import {
  Sunset,
  CheckCircle2,
  ClipboardList,
  Mic,
  Users,
  User,
  CheckSquare,
  Check,
  UsersIcon,
  UserIcon,
  FileText,
  Clock,
  MessageSquare,
  RefreshCw,
  Calendar,
  ChevronDown,
  X,
  TrendingUp,
  Pencil,
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { PanelReporteTareasTardeProps, RevisionProcesada } from "@/lib/types";
import { ReporteActividadesModal } from "../ReporteActividadesModal";
import { wsService } from "@/lib/websocket.service";
import { useTheme } from "@/context/ThemeContext";

export function PanelReporteTareasTarde({
  assistantAnalysis,
  theme: _theme,
  turno,
  userEmail,
  onStartVoiceMode,
  onStartVoiceModeWithTasks,
  onReportCompleted,
  actividadesDiarias = [],
}: PanelReporteTareasTardeProps) {
  const theme = useTheme();

  const [tareasConDescripcion] = useState<Set<string>>(new Set());
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<Set<string>>(
    new Set(),
  );
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [mensajeAlerta, setMensajeAlerta] = useState("");
  const [tareasReportadasMap, setTareasReportadasMap] = useState<
    Map<string, any>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [ultimoReporteEnviado, setUltimoReporteEnviado] = useState<number>(0);
  const [mostrandoReportesDeOtros, setMostrandoReportesDeOtros] =
    useState(false);
  const [estadisticasServidor, setEstadisticasServidor] = useState<any>(null);
  const [mostrarModalReporte, setMostrarModalReporte] = useState(false);
  const [guardandoReporte, setGuardandoReporte] = useState(false);
  const actualizandoRef = useRef(false);
  const currentUserEmail = userEmail || "";

  useEffect(() => {
    if (!currentUserEmail) return;
    cargarTareasReportadas(false);
  }, [currentUserEmail]);

  useEffect(() => {
    if (!currentUserEmail) return;
    const onCambios = () => cargarTareasReportadas(false);
    const onExplicacion = () => cargarTareasReportadas(false);
    const onReportes = () => cargarTareasReportadas(false);
    wsService.on("cambios-tareas", onCambios);
    wsService.on("explicacion_guardada", onExplicacion);
    wsService.on("reportes-actualizados", onReportes);
    return () => {
      wsService.off("cambios-tareas", onCambios);
      wsService.off("explicacion_guardada", onExplicacion);
      wsService.off("reportes-actualizados", onReportes);
    };
  }, [currentUserEmail]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const mostrarAlertaMensaje = useCallback((mensaje: string) => {
    setMensajeAlerta(mensaje);
    setMostrarAlerta(true);
    setTimeout(() => setMostrarAlerta(false), 5000);
  }, []);

  const procesarTareasReportadas = useCallback(
    (nuevasTareasReportadas: any[], metadata: any = null) => {
      if (metadata) {
        setEstadisticasServidor(metadata);
        setMostrandoReportesDeOtros(
          !(metadata.tieneReportesPropios || false) &&
            (metadata.tieneReportesColaborativos || false),
        );
      }
      if (nuevasTareasReportadas.length === 0) return;
      setTareasReportadasMap((mapActual) => {
        const nuevoMap = new Map(mapActual);
        nuevasTareasReportadas.forEach((item: any, index: number) => {
          const tareaId = item.pendienteId || item.id || `tarea-${index}`;
          if (!tareaId) return;
          let reportadoPor =
            item.reportadoPor?.nombre || item.reportadoPor || "Usuario";
          let emailReportado =
            item.reportadoPor?.email ||
            item.emailEncontrado ||
            item.userEmail ||
            "";
          let esMiReporte = item.esMiReporte || false;
          if (!emailReportado && currentUserEmail) {
            const emailEncontrado =
              item.emailEncontrado ||
              item.emailUsuario ||
              item.emailReportado ||
              item.userEmail ||
              item.actualizadoPor;
            if (emailEncontrado) {
              emailReportado = emailEncontrado;
              esMiReporte =
                currentUserEmail.toLowerCase() ===
                emailEncontrado.toLowerCase();
              reportadoPor = emailReportado.split("@")[0];
            } else {
              emailReportado = currentUserEmail;
              esMiReporte = true;
              reportadoPor = currentUserEmail.split("@")[0];
            }
          }
          const tareaExistente = mapActual.get(tareaId);
          if (tareaExistente) {
            const fechaExistente = new Date(
              tareaExistente.fechaReporte,
            ).getTime();
            const fechaNueva = new Date(
              item.fecha || item.fechaReporte || new Date(),
            ).getTime();
            if (fechaNueva > fechaExistente) {
              nuevoMap.set(tareaId, {
                ...tareaExistente,
                texto:
                  item.texto ||
                  item.explicacion ||
                  item.descripcion ||
                  tareaExistente.texto,
                fechaReporte:
                  item.fecha ||
                  item.fechaReporte ||
                  tareaExistente.fechaReporte,
                estado: item.estado || tareaExistente.estado,
                reportadoPor,
                emailReportado,
                esMiReporte,
                esReporteColaborativo:
                  item.esReporteColaborativo || !esMiReporte,
                _raw: item,
              });
            }
          } else {
            nuevoMap.set(tareaId, {
              id: tareaId,
              pendienteId: tareaId,
              nombreTarea:
                item.tarea ||
                item.nombreTarea ||
                item.nombre ||
                "Tarea sin nombre",
              explicacion:
                item.texto || item.explicacion || item.descripcion || "",
              reportadoPor,
              emailReportado,
              esMiReporte,
              esReporteColaborativo: item.esReporteColaborativo || !esMiReporte,
              fechaReporte:
                item.fecha || item.fechaReporte || item.updatedAt || new Date(),
              actividadTitulo:
                item.actividad || item.actividadTitulo || "Actividad",
              duracionMin: item.duracionMin || 0,
              estado: item.estado || "reportado",
              texto: item.texto || item.explicacion || item.descripcion || "",
              _raw: item,
            });
          }
        });
        return nuevoMap;
      });
    },
    [currentUserEmail],
  );

  const handleAbrirModalReporte = useCallback(() => {
    if (tareasSeleccionadas.size === 0) {
      mostrarAlertaMensaje(
        "Por favor selecciona al menos una tarea para reportar",
      );
      return;
    }
    setMostrarModalReporte(true);
  }, [tareasSeleccionadas, mostrarAlertaMensaje]);

  const cargarTareasReportadas = useCallback(
    async (esForzado: boolean = false) => {
      if (!currentUserEmail) return;
      if (actualizandoRef.current && !esForzado) return;
      setIsLoading(true);
      actualizandoRef.current = true;
      try {
        const url = `${process.env.NEXT_PUBLIC_BASE_URL_BACK}/reportes/tareas-reportadas?email=${encodeURIComponent(currentUserEmail)}&limit=100`;
        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const data = await response.json();
        const tareasData = data.data || data.tareas || data.resultados || [];
        const metadata = data.metadata || data.info || {};
        if (Array.isArray(tareasData) && tareasData.length > 0) {
          procesarTareasReportadas(tareasData, metadata);
          if (esForzado)
            setTimeout(
              () =>
                mostrarAlertaMensaje(
                  metadata.mensaje ||
                    `${tareasData.length} tarea(s) cargada(s)`,
                ),
              500,
            );
        } else {
          procesarTareasReportadas([], metadata);
          if (esForzado)
            mostrarAlertaMensaje(
              metadata.mensaje ||
                (tareasReportadasMap.size > 0
                  ? `No hay nuevas tareas. Tienes ${tareasReportadasMap.size} en historial`
                  : "No tienes tareas reportadas aún"),
            );
        }
      } catch {
        if (esForzado)
          mostrarAlertaMensaje("No se pudieron cargar las tareas reportadas");
      } finally {
        setIsLoading(false);
        actualizandoRef.current = false;
      }
    },
    [
      currentUserEmail,
      procesarTareasReportadas,
      mostrarAlertaMensaje,
      tareasReportadasMap,
    ],
  );

  const handleGuardarReporte = useCallback(async () => {
    setGuardandoReporte(true);
    try {
      await cargarTareasReportadas(true);
      setTareasSeleccionadas(new Set());
      setMostrarModalReporte(false);
      onReportCompleted?.();
      mostrarAlertaMensaje("Reporte completado exitosamente");
    } catch {
      mostrarAlertaMensaje("Error al completar el reporte");
    } finally {
      setGuardandoReporte(false);
    }
  }, [cargarTareasReportadas, onReportCompleted, mostrarAlertaMensaje]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!mostrarModalReporte && ultimoReporteEnviado > 0)
      timer = setTimeout(() => cargarTareasReportadas(true), 1000);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [mostrarModalReporte, ultimoReporteEnviado, cargarTareasReportadas]);

  const actividadesConTareas = useMemo(() => {
    if (!assistantAnalysis?.data?.revisionesPorActividad) return [];
    return assistantAnalysis.data.revisionesPorActividad
      .map((revision) => {
        const colaboradoresReales =
          revision.colaboradores ||
          assistantAnalysis.colaboradoresInvolucrados ||
          [];
        const tareasReportadas = revision.tareasConTiempo.filter((tarea) =>
          Array.from(tareasReportadasMap.values()).find(
            (r) => r.pendienteId === tarea.id || r.nombreTarea === tarea.nombre,
          ),
        );
        const tareasNoReportadas = revision.tareasConTiempo.filter((tarea) => {
          const estaReportada = Array.from(tareasReportadasMap.values()).some(
            (r) => r.pendienteId === tarea.id || r.nombreTarea === tarea.nombre,
          );
          return !estaReportada && !tareasConDescripcion.has(tarea.id);
        });
        return {
          ...revision,
          colaboradoresReales,
          esActividadIndividual: colaboradoresReales.length <= 1,
          tareasReportadas,
          tareasNoReportadas,
        } as RevisionProcesada;
      })
      .filter(
        (revision: RevisionProcesada) =>
          revision.tareasReportadas.length > 0 ||
          revision.tareasNoReportadas.length > 0,
      );
  }, [assistantAnalysis, tareasConDescripcion, tareasReportadasMap]);

  const estadisticas = useMemo(() => {
    const todasTareasReportadas = actividadesConTareas.flatMap(
      (a) => a.tareasReportadas,
    );
    const totalReportadasPorMi = todasTareasReportadas.filter((tarea: any) =>
      Array.from(tareasReportadasMap.values()).find(
        (r) =>
          (r.pendienteId === tarea.id || r.nombreTarea === tarea.nombre) &&
          r.esMiReporte,
      ),
    ).length;
    const totalReportadasPorOtros = todasTareasReportadas.filter((tarea: any) =>
      Array.from(tareasReportadasMap.values()).find(
        (r) =>
          (r.pendienteId === tarea.id || r.nombreTarea === tarea.nombre) &&
          !r.esMiReporte,
      ),
    ).length;
    const totalNoReportadas = actividadesConTareas.reduce(
      (sum, a) => sum + a.tareasNoReportadas.length,
      0,
    );
    return {
      totalReportadasPorMi,
      totalReportadasPorOtros,
      totalReportadas: totalReportadasPorMi + totalReportadasPorOtros,
      totalNoReportadas,
      totalTareas:
        totalReportadasPorMi + totalReportadasPorOtros + totalNoReportadas,
    };
  }, [actividadesConTareas, tareasReportadasMap]);

  const hayTareas = actividadesConTareas.length > 0;

  const toggleSeleccionTarea = useCallback(
    (tarea: any) => {
      const tareaId = tarea.id;
      const reporte = Array.from(tareasReportadasMap.values()).find(
        (r) => r.pendienteId === tareaId || r.nombreTarea === tarea.nombre,
      );
      if (reporte) {
        if (!reporte.esMiReporte) {
          mostrarAlertaMensaje(
            `Ya reportada por ${reporte.reportadoPor || "otro colaborador"}`,
          );
          return;
        }
        setTareasSeleccionadas((prev) => {
          const nuevas = new Set(prev);
          nuevas.has(tareaId) ? nuevas.delete(tareaId) : nuevas.add(tareaId);
          return nuevas;
        });
        return;
      }
      if (!tarea.descripcion || tarea.descripcion.trim().length === 0) {
        mostrarAlertaMensaje(
          `"${tarea.nombre}" no tiene descripción del pendiente.`,
        );
        return;
      }
      const emailDueño = tarea.explicacionVoz?.emailUsuario;
      if (emailDueño && emailDueño !== currentUserEmail) {
        mostrarAlertaMensaje(
          `Esta tarea fue asignada a ${emailDueño.split("@")[0]} en la mañana`,
        );
        return;
      }
      setTareasSeleccionadas((prev) => {
        const nuevas = new Set(prev);
        nuevas.has(tareaId) ? nuevas.delete(tareaId) : nuevas.add(tareaId);
        return nuevas;
      });
    },
    [tareasReportadasMap, mostrarAlertaMensaje, currentUserEmail],
  );

  const seleccionarTodasTareas = useCallback(() => {
    const ids = actividadesConTareas.flatMap((a) =>
      a.tareasNoReportadas
        .filter((t: any) => t.descripcion && t.descripcion.trim().length > 0)
        .map((t: any) => t.id),
    );
    if (ids.length === 0) {
      mostrarAlertaMensaje("No hay tareas con descripción por reportar");
      return;
    }
    setTareasSeleccionadas(new Set(ids));
    mostrarAlertaMensaje(
      `${ids.length} tarea${ids.length !== 1 ? "s" : ""} seleccionada${ids.length !== 1 ? "s" : ""}`,
    );
  }, [actividadesConTareas, mostrarAlertaMensaje]);

  const deseleccionarTodasTareas = useCallback(() => {
    setTareasSeleccionadas(new Set());
    mostrarAlertaMensaje("Todas las tareas deseleccionadas");
  }, [mostrarAlertaMensaje]);

  const handleExplicarTareasSeleccionadas = useCallback(async () => {
    if (tareasSeleccionadas.size === 0) {
      mostrarAlertaMensaje("Selecciona al menos una tarea para explicar");
      return;
    }
    setUltimoReporteEnviado(Date.now());
    if (onStartVoiceModeWithTasks) {
      onStartVoiceModeWithTasks(Array.from(tareasSeleccionadas));
      mostrarAlertaMensaje(
        `Iniciando reporte de ${tareasSeleccionadas.size} tarea${tareasSeleccionadas.size !== 1 ? "s" : ""}`,
      );
      setTimeout(() => {
        cargarTareasReportadas(true);
        onReportCompleted?.();
        setTareasSeleccionadas(new Set());
        setTimeout(() => cargarTareasReportadas(true), 5000);
      }, 3000);
    } else if (onStartVoiceMode) {
      onStartVoiceMode();
      mostrarAlertaMensaje(
        `Modo voz iniciado con ${tareasSeleccionadas.size} tarea${tareasSeleccionadas.size !== 1 ? "s" : ""} seleccionada${tareasSeleccionadas.size !== 1 ? "s" : ""}`,
      );
    }
  }, [
    tareasSeleccionadas,
    onStartVoiceModeWithTasks,
    onStartVoiceMode,
    onReportCompleted,
    cargarTareasReportadas,
    mostrarAlertaMensaje,
  ]);

  const handleRecargarTareas = useCallback(
    () => cargarTareasReportadas(true),
    [cargarTareasReportadas],
  );

  useEffect(() => {
    if (actividadesConTareas.length === 0) return;
    const idsPendientes = actividadesConTareas.flatMap((a) =>
      a.tareasNoReportadas
        .filter((t: any) => {
          const tieneDesc = !!(
            t.descripcion && t.descripcion.trim().length > 0
          );
          const emailDueño = t.explicacionVoz?.emailUsuario;
          const bloqueadaPorOtro = !!(
            emailDueño && emailDueño !== currentUserEmail
          );
          return tieneDesc && !bloqueadaPorOtro;
        })
        .map((t: any) => t.id),
    );
    setTareasSeleccionadas(new Set(idsPendientes));
  }, [actividadesConTareas, currentUserEmail]);

  return (
    <div className="w-full max-w-lg mx-auto animate-in slide-in-from-bottom-2 duration-300">
      {/* Alerta flotante */}
      {mostrarAlerta && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300 sm:top-3 sm:left-auto sm:right-3 sm:max-w-xs">
          <div
            className={`px-3 py-2 flex items-center gap-2 sm:rounded-lg shadow-lg backdrop-blur-sm ${theme === "dark" ? "bg-orange-900/95 text-white border-b border-orange-500/50 sm:border" : "bg-orange-100 text-gray-800 border-b border-orange-300 sm:border"}`}
          >
            <Sunset className="w-3.5 h-3.5 text-orange-500 animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-medium flex-1 min-w-0">
              {mensajeAlerta}
            </span>
            <button
              className={`ml-1 p-1 rounded-full flex-shrink-0 flex items-center justify-center ${theme === "dark" ? "hover:bg-orange-500/20" : "hover:bg-orange-200"}`}
              onClick={() => setMostrarAlerta(false)}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Banner colaborativo */}
      {mostrandoReportesDeOtros && estadisticasServidor && (
        <div
          className={`px-3 py-2.5 rounded-xl mb-2 border ${theme === "dark" ? "bg-orange-900/30 border-orange-700/50" : "bg-orange-50 border-orange-300"}`}
        >
          <div className="flex items-start gap-2">
            <div
              className={`p-1.5 rounded-lg flex-shrink-0 ${theme === "dark" ? "bg-orange-500/20" : "bg-orange-200"}`}
            >
              <Users className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4
                className={`font-bold text-xs mb-0.5 ${theme === "dark" ? "text-orange-300" : "text-orange-700"}`}
              >
                Reportes del equipo — Turno Tarde
              </h4>
              <p
                className={`text-[11px] mb-1.5 leading-relaxed ${theme === "dark" ? "text-orange-200" : "text-orange-600"}`}
              >
                {estadisticasServidor.mensaje ||
                  "No tienes reportes propios, pero hay reportes de otros colaboradores."}
              </p>
              <div className="flex flex-wrap gap-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${theme === "dark" ? "bg-orange-800/50 text-orange-200" : "bg-orange-200 text-orange-800"}`}
                >
                  Tú: {currentUserEmail.split("@")[0]}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${theme === "dark" ? "bg-blue-800/50 text-blue-200" : "bg-blue-200 text-blue-800"}`}
                >
                  {estadisticasServidor.tareasColaboradores || 0} reportes de
                  otros
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel principal */}
      {hayTareas ? (
        <div
          className={`w-full rounded-xl border overflow-hidden shadow-sm ${theme === "dark" ? "bg-[#1e1e1e] border-orange-900/50" : "bg-white border-orange-200"}`}
        >
          {/* Header */}
          <div
            className={`px-3 py-2 border-b ${theme === "dark" ? "bg-orange-500/10 border-orange-900/40" : "bg-orange-500/6 border-orange-100"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sunset className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <h4
                  className={`font-bold text-xs uppercase tracking-wide truncate ${theme === "dark" ? "text-orange-200" : "text-orange-800"}`}
                >
                  Tareas Tarde
                </h4>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${theme === "dark" ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-700"}`}
                >
                  {estadisticas.totalTareas}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${theme === "dark" ? "bg-green-500/25 text-green-300" : "bg-green-100 text-green-700"}`}
                >
                  ✓ {estadisticas.totalReportadas}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {mostrandoReportesDeOtros && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold hidden sm:inline-block ${theme === "dark" ? "bg-orange-500/30 text-orange-200" : "bg-orange-200 text-orange-800"}`}
                  >
                    De otros
                  </span>
                )}
                <button
                  onClick={handleRecargarTareas}
                  disabled={isLoading}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${theme === "dark" ? "hover:bg-orange-500/20 text-orange-400" : "hover:bg-orange-100 text-orange-600"}`}
                  title="Recargar"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-2.5">
            {/* Info box */}
            <div
              className={`text-[11px] px-2.5 py-2 rounded-lg mb-2.5 border ${
                theme === "dark"
                  ? mostrandoReportesDeOtros
                    ? "bg-orange-900/20 text-orange-200 border-orange-700/30"
                    : "bg-blue-950/40 text-blue-200 border-blue-800/30"
                  : mostrandoReportesDeOtros
                    ? "bg-orange-50 text-orange-800 border-orange-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {mostrandoReportesDeOtros ? (
                  <Users className="w-3 h-3 flex-shrink-0" />
                ) : (
                  <TrendingUp className="w-3 h-3 flex-shrink-0" />
                )}
                <strong className="font-bold text-[11px]">
                  {mostrandoReportesDeOtros
                    ? "Trabajo colaborativo"
                    : `Pendientes por reportar: ${estadisticas.totalNoReportadas}`}
                </strong>
                {!mostrandoReportesDeOtros &&
                  estadisticas.totalNoReportadas > 0 && (
                    <span
                      className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${theme === "dark" ? "bg-amber-500/20 text-amber-300" : "bg-amber-500/20 text-amber-800"}`}
                    >
                      Por reportar
                    </span>
                  )}
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {mostrandoReportesDeOtros ? (
                  <>
                    <strong>Tú:</strong>{" "}
                    {currentUserEmail
                      ? currentUserEmail.split("@")[0]
                      : "Usuario"}
                    {" · "}No tienes reportes propios pero hay reportes de otros
                    colaboradores.
                  </>
                ) : (
                  <>
                    {estadisticas.totalReportadasPorMi > 0 &&
                      `${estadisticas.totalReportadasPorMi} tarea(s) reportada(s) por ti. `}
                    {estadisticas.totalReportadasPorOtros > 0 &&
                      `${estadisticas.totalReportadasPorOtros} por otros. `}
                    <strong>Tú:</strong>{" "}
                    {currentUserEmail
                      ? currentUserEmail.split("@")[0]
                      : "Usuario"}
                  </>
                )}
              </p>
            </div>

            {/* Lista de actividades */}
            <div className="space-y-2">
              {actividadesConTareas.map(
                (revision: RevisionProcesada, idx: number) => {
                  const actividad = assistantAnalysis.data.actividades.find(
                    (act) => act.id === revision.actividadId,
                  );
                  if (!actividad) return null;
                  return (
                    <ActivityItem
                      key={revision.actividadId}
                      revision={revision}
                      actividad={actividad}
                      index={idx}
                      tareasSeleccionadas={tareasSeleccionadas}
                      onToggleTarea={toggleSeleccionTarea}
                      todosColaboradores={
                        (assistantAnalysis as any).colaboradoresInvolucrados ||
                        []
                      }
                      tareasReportadasMap={tareasReportadasMap}
                      currentUserEmail={currentUserEmail}
                      mostrandoReportesDeOtros={mostrandoReportesDeOtros}
                    />
                  );
                },
              )}
            </div>
          </div>

          <ReporteActividadesModal
            isOpen={mostrarModalReporte}
            onOpenChange={setMostrarModalReporte}
            theme={theme}
            actividadesDiarias={actividadesDiarias}
            tareasSeleccionadas={tareasSeleccionadas}
            actividadesConTareas={actividadesConTareas}
            tareasReportadasMap={tareasReportadasMap}
            onGuardarReporte={handleGuardarReporte}
            guardandoReporte={guardandoReporte}
            turno={turno}
          />

          <PiePanelReporte
            totalTareasPendientes={estadisticas.totalNoReportadas}
            totalTareasReportadas={estadisticas.totalReportadas}
            tareasReportadasPorMi={estadisticas.totalReportadasPorMi}
            tareasReportadasPorOtros={estadisticas.totalReportadasPorOtros}
            esHoraReporte={false}
            onStartVoiceMode={onStartVoiceMode}
            tareasSeleccionadas={tareasSeleccionadas}
            onSeleccionarTodas={seleccionarTodasTareas}
            onDeseleccionarTodas={deseleccionarTodasTareas}
            onExplicarTareasSeleccionadas={handleExplicarTareasSeleccionadas}
            todosColaboradores={
              assistantAnalysis.colaboradoresInvolucrados || []
            }
            onRecargar={handleRecargarTareas}
            isLoading={isLoading}
            currentUserEmail={currentUserEmail}
            mostrandoReportesDeOtros={mostrandoReportesDeOtros}
            estadisticasServidor={estadisticasServidor}
            turno={turno}
            onOpenReporteModal={handleAbrirModalReporte}
          />
        </div>
      ) : (
        <NoTasksMessage
          onRecargar={handleRecargarTareas}
          currentUserEmail={currentUserEmail}
          mostrandoReportesDeOtros={mostrandoReportesDeOtros}
          estadisticasServidor={estadisticasServidor}
        />
      )}
    </div>
  );
}

// ========== ACTIVITY ITEM ==========

interface ActivityItemProps {
  revision: any;
  actividad: any;
  index: number;
  tareasSeleccionadas: Set<string>;
  onToggleTarea: (tarea: any) => void;
  todosColaboradores: string[];
  tareasReportadasMap: Map<string, any>;
  currentUserEmail: string;
  mostrandoReportesDeOtros?: boolean;
}

function ActivityItem({
  revision,
  actividad,
  index,
  tareasSeleccionadas,
  onToggleTarea,
  todosColaboradores,
  tareasReportadasMap,
  currentUserEmail,
  mostrandoReportesDeOtros = false,
}: ActivityItemProps) {
  const theme = useTheme();

  const badgeColor = useMemo(() => {
    const colors = [
      "bg-orange-500/25 text-orange-400 border-orange-500/40",
      "bg-amber-500/25 text-amber-400 border-amber-500/40",
      "bg-yellow-500/25 text-yellow-400 border-yellow-500/40",
    ];
    return colors[index % 3];
  }, [index]);

  const colaboradoresReales =
    revision.colaboradoresReales || revision.colaboradores || [];
  const esActividadIndividual =
    revision.esActividadIndividual || colaboradoresReales.length <= 1;

  return (
    <div
      className={`rounded-lg border overflow-hidden ${theme === "dark" ? "bg-[#232323] border-orange-900/25" : "bg-white border-orange-100 shadow-sm"}`}
    >
      {/* activity header */}
      <div
        className={`px-2.5 py-2 ${theme === "dark" ? "border-b border-orange-900/15" : "border-b border-orange-50"}`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border flex-shrink-0 ${badgeColor}`}
          >
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h5
                className={`font-bold text-xs leading-tight truncate ${theme === "dark" ? "text-orange-200" : "text-orange-900"}`}
              >
                {actividad.titulo}
              </h5>
              <span
                className={`text-[10px] font-semibold flex items-center gap-0.5 flex-shrink-0 px-1.5 py-0.5 rounded-md ${theme === "dark" ? "bg-orange-900/40 text-orange-300" : "bg-orange-100 text-orange-700"}`}
              >
                <Clock className="w-2.5 h-2.5" />
                {actividad.horario}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              {currentUserEmail && (
                <>
                  <span
                    className={`text-[10px] font-semibold ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}
                  >
                    Tú: {currentUserEmail.split("@")[0]}
                  </span>
                  <span
                    className={`text-[10px] ${theme === "dark" ? "text-gray-600" : "text-gray-300"}`}
                  >
                    ·
                  </span>
                </>
              )}
              {esActividadIndividual ? (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 ${theme === "dark" ? "bg-blue-500/15 text-blue-300 border border-blue-500/25" : "bg-blue-50 text-blue-700 border border-blue-200"}`}
                >
                  <UserIcon className="w-2.5 h-2.5" />
                  Individual
                </span>
              ) : (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 ${theme === "dark" ? "bg-green-500/15 text-green-300 border border-green-500/25" : "bg-green-50 text-green-700 border border-green-200"}`}
                >
                  <UsersIcon className="w-2.5 h-2.5" />
                  Equipo ({colaboradoresReales.length})
                </span>
              )}
              {mostrandoReportesDeOtros && (
                <span
                  className={`text-[10px] font-semibold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}
                >
                  De otros
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-2 space-y-2">
        {revision.tareasReportadas.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
              <span
                className={`text-[11px] font-bold ${theme === "dark" ? "text-green-400" : "text-green-700"}`}
              >
                Reportadas ({revision.tareasReportadas.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {revision.tareasReportadas.map((tarea: any) => {
                const reporteInfo = Array.from(
                  tareasReportadasMap.values(),
                ).find(
                  (r) =>
                    r.pendienteId === tarea.id ||
                    r.nombreTarea === tarea.nombre,
                );
                if (!reporteInfo) return null;
                return (
                  <TareaReportada
                    key={tarea.id}
                    tarea={tarea}
                    reporteInfo={reporteInfo}
                    esMiReporte={reporteInfo.esMiReporte || false}
                    currentUserEmail={currentUserEmail}
                    estaSeleccionada={
                      tareasSeleccionadas?.has?.(tarea.id) || false
                    }
                    onToggleSeleccion={() => onToggleTarea(tarea)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {revision.tareasNoReportadas.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <span
                className={`text-[11px] font-bold ${theme === "dark" ? "text-amber-400" : "text-amber-700"}`}
              >
                Pendientes ({revision.tareasNoReportadas.length})
              </span>
              <span
                className={`text-[10px] ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}
              >
                · Toca para seleccionar
              </span>
            </div>
            <div className="space-y-1.5">
              {revision.tareasNoReportadas.map((tarea: any) => {
                const estaReportada = Array.from(
                  tareasReportadasMap.values(),
                ).some(
                  (r) =>
                    r.pendienteId === tarea.id ||
                    r.nombreTarea === tarea.nombre,
                );
                if (estaReportada) return null;
                return (
                  <TareaPendiente
                    key={tarea.id}
                    tarea={tarea}
                    estaSeleccionada={
                      tareasSeleccionadas?.has?.(tarea.id) || false
                    }
                    onToggleSeleccion={() => onToggleTarea(tarea)}
                    esActividadIndividual={esActividadIndividual}
                    colaboradoresReales={colaboradoresReales}
                    currentUserEmail={currentUserEmail}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== TAREA REPORTADA ==========

interface TareaReportadaProps {
  tarea: any;
  reporteInfo?: any;
  esMiReporte: boolean;
  currentUserEmail: string;
  estaSeleccionada?: boolean;
  onToggleSeleccion?: () => void;
}

function TareaReportada({
  tarea,
  reporteInfo,
  esMiReporte,
  currentUserEmail,
  estaSeleccionada = false,
  onToggleSeleccion,
}: TareaReportadaProps) {
  const theme = useTheme();
  const [mostrarDescripcion, setMostrarDescripcion] = useState(false);
  if (!reporteInfo) return null;

  const esRealmenteMiReporte =
    esMiReporte &&
    currentUserEmail &&
    reporteInfo.emailReportado?.toLowerCase() ===
      currentUserEmail.toLowerCase();
  const reportadoPor = reporteInfo.reportadoPor || "Usuario";
  const nombreFormateado =
    reportadoPor.charAt(0).toUpperCase() + reportadoPor.slice(1);
  const fechaFormateada = new Date(
    reporteInfo.fechaReporte || new Date(),
  ).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`px-2.5 py-2 rounded-lg border transition-all duration-150 ${
        estaSeleccionada && esRealmenteMiReporte
          ? theme === "dark"
            ? "bg-orange-900/20 border-orange-500/60"
            : "bg-orange-50 border-orange-400"
          : esRealmenteMiReporte
            ? theme === "dark"
              ? "bg-green-900/15 border-green-700/35"
              : "bg-green-50 border-green-200"
            : theme === "dark"
              ? "bg-orange-900/15 border-orange-700/35"
              : "bg-orange-50 border-orange-200"
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`w-5 h-5 flex items-center justify-center rounded-full border flex-shrink-0 mt-0.5 ${
            estaSeleccionada && esRealmenteMiReporte
              ? theme === "dark"
                ? "bg-orange-500/25 border-orange-500/60 text-orange-300"
                : "bg-orange-100 border-orange-400 text-orange-600"
              : esRealmenteMiReporte
                ? theme === "dark"
                  ? "bg-green-500/25 text-green-300 border-green-500/45"
                  : "bg-green-100 text-green-700 border-green-300"
                : theme === "dark"
                  ? "bg-orange-500/25 text-orange-300 border-orange-500/45"
                  : "bg-orange-100 text-orange-700 border-orange-300"
          }`}
        >
          <Check className="w-3 h-3" />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-xs font-semibold leading-tight mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
          >
            {tarea.nombre}
          </p>

          {esRealmenteMiReporte && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSeleccion?.();
              }}
              className={`mb-1.5 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all min-h-[24px] ${
                estaSeleccionada
                  ? theme === "dark"
                    ? "bg-orange-500/25 border-orange-500/60 text-orange-300"
                    : "bg-orange-100 border-orange-400 text-orange-700"
                  : theme === "dark"
                    ? "border-gray-600 text-gray-400 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/10"
                    : "border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50"
              }`}
            >
              {estaSeleccionada ? (
                <>
                  <Check className="w-2.5 h-2.5" />
                  Seleccionada
                </>
              ) : (
                <>
                  <Pencil className="w-2.5 h-2.5" />
                  Editar
                </>
              )}
            </button>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${esRealmenteMiReporte ? (theme === "dark" ? "bg-green-500/25 text-green-300" : "bg-green-100 text-green-800") : theme === "dark" ? "bg-orange-500/25 text-orange-300" : "bg-orange-100 text-orange-800"}`}
            >
              {esRealmenteMiReporte ? (
                <span className="flex items-center gap-0.5">
                  <User className="w-2.5 h-2.5 inline" />
                  Mi reporte
                </span>
              ) : (
                <span className="flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5 inline" />
                  Por {nombreFormateado}
                </span>
              )}
            </span>
            <span
              className={`text-[10px] flex items-center gap-0.5 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}
            >
              <Calendar className="w-2.5 h-2.5" />
              {fechaFormateada}
            </span>
            {tarea.duracionMin > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${theme === "dark" ? "text-blue-300 bg-blue-500/15" : "text-blue-700 bg-blue-100"}`}
              >
                {tarea.duracionMin}m
              </span>
            )}
          </div>

          {reporteInfo.texto && (
            <div className="mt-1.5">
              <button
                onClick={() => setMostrarDescripcion(!mostrarDescripcion)}
                className={`flex items-center gap-1 text-[10px] font-semibold py-0.5 rounded-md transition-colors min-h-[28px] ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"}`}
              >
                <MessageSquare className="w-3 h-3" />
                {mostrarDescripcion ? "Ocultar" : "Ver explicación"}
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${mostrarDescripcion ? "rotate-180" : ""}`}
                />
              </button>
              {mostrarDescripcion && (
                <div
                  className={`mt-1 p-2 rounded-lg text-[11px] leading-relaxed ${theme === "dark" ? "bg-[#2a2a2a] text-gray-300 border border-[#3a3a3a]" : "bg-white text-gray-700 border border-gray-200"}`}
                >
                  <p
                    className={`font-semibold mb-0.5 text-[10px] ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {esRealmenteMiReporte
                      ? "Mi explicación:"
                      : `Explicación de ${nombreFormateado}:`}
                  </p>
                  <p
                    className={`italic ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
                  >
                    "{reporteInfo.texto}"
                  </p>
                  {reporteInfo.encontradoEn && (
                    <p
                      className={`mt-1.5 pt-1.5 border-t text-[10px] ${theme === "dark" ? "border-[#3a3a3a] text-gray-500" : "border-gray-200 text-gray-500"}`}
                    >
                      Fuente: {reporteInfo.encontradoEn}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== TAREA PENDIENTE ==========

interface TareaPendienteProps {
  tarea: any;
  estaSeleccionada: boolean;
  onToggleSeleccion: () => void;
  esActividadIndividual: boolean;
  colaboradoresReales: string[];
  currentUserEmail: string;
}

function TareaPendiente({
  tarea,
  estaSeleccionada,
  onToggleSeleccion,
  esActividadIndividual,
  colaboradoresReales,
  currentUserEmail,
}: TareaPendienteProps) {
  const theme = useTheme();

  const emailDueñoMañana = tarea.explicacionVoz?.emailUsuario || null;
  const estaBloqueadaPorOtro = !!(
    emailDueñoMañana && emailDueñoMañana !== currentUserEmail
  );
  const tieneDescripcion = !!(
    tarea.descripcion &&
    typeof tarea.descripcion === "string" &&
    tarea.descripcion.trim().length > 0
  );
  const tieneQueHizo = !!(
    tarea.queHizo &&
    typeof tarea.queHizo === "string" &&
    tarea.queHizo.trim().length > 0
  );
  const estaBloqueada = !tieneDescripcion || estaBloqueadaPorOtro;
  const estaExplicada = tieneDescripcion && tieneQueHizo;

  return (
    <div
      className={`px-2.5 py-2 rounded-lg border transition-all duration-150 ${
        estaBloqueada
          ? `opacity-50 ${theme === "dark" ? "bg-gray-900/50 border-gray-700" : "bg-gray-50 border-gray-200"}`
          : estaSeleccionada
            ? `border-orange-500 shadow-sm ${theme === "dark" ? "bg-orange-900/15" : "bg-orange-50"}`
            : theme === "dark"
              ? "bg-[#202020] border-[#333] active:bg-[#2a2a2a]"
              : "bg-white border-gray-200 active:bg-orange-50/50"
      }`}
      onClick={() => {
        if (!estaBloqueada) onToggleSeleccion();
      }}
      role={estaBloqueada ? undefined : "checkbox"}
      aria-checked={estaSeleccionada}
      aria-disabled={estaBloqueada}
    >
      <div className="flex items-start gap-2">
        <div
          className={`w-5 h-5 flex items-center justify-center border-2 rounded-md transition-all flex-shrink-0 mt-0.5 ${
            estaBloqueada
              ? theme === "dark"
                ? "border-red-700 bg-red-900/25"
                : "border-red-300 bg-red-50"
              : estaSeleccionada
                ? "bg-orange-500 border-orange-500 shadow-sm"
                : theme === "dark"
                  ? "border-gray-600"
                  : "border-gray-300"
          }`}
        >
          {estaBloqueada ? (
            <X className="w-3 h-3 text-red-500" />
          ) : estaSeleccionada ? (
            <Check className="w-3 h-3 text-white" />
          ) : null}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-xs font-semibold leading-tight mb-1 ${estaBloqueada ? (theme === "dark" ? "text-gray-600" : "text-gray-400") : theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
          >
            {tarea.nombre}
          </p>

          <div className="flex flex-wrap items-center gap-1 mb-1">
            {tarea.explicacionVoz?.emailUsuario &&
              (tarea.explicacionVoz.emailUsuario === currentUserEmail ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center gap-0.5">
                  <User className="w-2.5 h-2.5" />
                  Mi reporte
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25 flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" />
                  De {tarea.explicacionVoz.emailUsuario.split("@")[0]}
                </span>
              ))}
            {estaBloqueadaPorOtro ? null : estaBloqueada ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 flex items-center gap-0.5">
                <X className="w-2.5 h-2.5" />
                Sin desc.
              </span>
            ) : estaExplicada ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-500 border border-green-500/25 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Explicada
              </span>
            ) : (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25 flex items-center gap-0.5">
                <Mic className="w-2.5 h-2.5" />
                Pendiente
              </span>
            )}
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${estaBloqueada ? "opacity-50" : tarea.prioridad === "ALTA" ? "bg-red-500/15 text-red-400 border-red-500/25" : theme === "dark" ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-amber-100 text-amber-800 border-amber-300"}`}
            >
              {tarea.prioridad}
            </span>
          </div>

          {tieneDescripcion && (
            <p
              className={`text-[10px] mb-1 leading-relaxed ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}
            >
              <FileText className="w-2.5 h-2.5 inline mr-1 opacity-60" />
              {tarea.descripcion.substring(0, 80)}
              {tarea.descripcion.length > 80 && "…"}
            </p>
          )}
          {tieneQueHizo && (
            <p
              className={`text-[10px] mb-1 leading-relaxed ${theme === "dark" ? "text-green-400" : "text-green-600"}`}
            >
              <CheckCircle2 className="w-2.5 h-2.5 inline mr-1" />
              {tarea.queHizo.substring(0, 80)}
              {tarea.queHizo.length > 80 && "…"}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex flex-wrap items-center gap-1">
              <span
                className={`text-[10px] font-medium flex items-center gap-0.5 ${estaBloqueada ? "opacity-50" : theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
              >
                {esActividadIndividual ? (
                  <>
                    <User className="w-2.5 h-2.5" />
                    Solo
                  </>
                ) : (
                  <>
                    <Users className="w-2.5 h-2.5" />
                    Equipo ({colaboradoresReales.length})
                  </>
                )}
              </span>
              {!esActividadIndividual &&
                colaboradoresReales.slice(0, 2).map((c: string, i: number) => (
                  <span
                    key={i}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${estaBloqueada ? "opacity-50" : theme === "dark" ? "bg-[#2a2a2a] text-gray-400" : "bg-gray-100 text-gray-600"}`}
                  >
                    {c.split("@")[0]}
                  </span>
                ))}
              {colaboradoresReales.length > 2 && (
                <span
                  className={`text-[10px] ${estaBloqueada ? "opacity-50" : theme === "dark" ? "text-gray-500" : "text-gray-500"}`}
                >
                  +{colaboradoresReales.length - 2}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {tarea.duracionMin > 0 && (
                <span
                  className={`text-[10px] font-medium ${estaBloqueada ? "opacity-50" : theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                >
                  {tarea.duracionMin}m
                </span>
              )}
              {tarea.diasPendiente > 0 && (
                <span
                  className={`text-[10px] font-semibold ${estaBloqueada ? "opacity-50" : theme === "dark" ? "text-amber-400" : "text-amber-600"}`}
                >
                  {tarea.diasPendiente}d
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== PIE PANEL ==========

interface PiePanelReporteProps {
  totalTareasPendientes: number;
  totalTareasReportadas?: number;
  tareasReportadasPorMi?: number;
  tareasReportadasPorOtros?: number;
  esHoraReporte: boolean;
  onOpenReport?: () => void;
  onStartVoiceMode?: () => void;
  todosColaboradores: string[];
  tareasSeleccionadas: Set<string>;
  onSeleccionarTodas: () => void;
  onDeseleccionarTodas: () => void;
  onExplicarTareasSeleccionadas: () => void;
  onRecargar?: () => void;
  isLoading?: boolean;
  currentUserEmail?: string;
  mostrandoReportesDeOtros?: boolean;
  estadisticasServidor?: any;
  turno?: "mañana" | "tarde";
  onOpenReporteModal?: () => void;
}

function PiePanelReporte({
  totalTareasPendientes,
  totalTareasReportadas = 0,
  tareasReportadasPorMi = 0,
  tareasReportadasPorOtros = 0,
  esHoraReporte,
  onOpenReport,
  onStartVoiceMode,
  todosColaboradores,
  tareasSeleccionadas,
  onSeleccionarTodas,
  onDeseleccionarTodas,
  onExplicarTareasSeleccionadas,
  onRecargar,
  isLoading = false,
  currentUserEmail = "",
  mostrandoReportesDeOtros = false,
  estadisticasServidor = null,
  turno,
  onOpenReporteModal,
}: PiePanelReporteProps) {
  const theme = useTheme();
  const countSeleccionadas = tareasSeleccionadas?.size ?? 0;
  const todasSeleccionadas =
    countSeleccionadas === totalTareasPendientes && totalTareasPendientes > 0;
  const esTrabajoEnEquipo = todosColaboradores.length > 1;
  const nombreUsuario = currentUserEmail.includes("@")
    ? currentUserEmail.split("@")[0]
    : currentUserEmail;

  const handleMainAction = () => {
    if (esHoraReporte) {
      onOpenReport?.();
      return;
    }
    if (countSeleccionadas === 0) return;
    onOpenReporteModal?.();
  };

  const hayTareasPendientes = totalTareasPendientes > 0;

  const textoBoton = () => {
    if (esHoraReporte)
      return (
        <>
          <ClipboardList className="w-3.5 h-3.5" />
          Iniciar Reporte
        </>
      );
    if (!hayTareasPendientes && countSeleccionadas > 0)
      return (
        <>
          <Pencil className="w-3.5 h-3.5" />
          Editar Reporte ({countSeleccionadas})
        </>
      );
    return (
      <>
        <Mic className="w-3.5 h-3.5" />
        Reportar Tareas{countSeleccionadas > 0 && ` (${countSeleccionadas})`}
      </>
    );
  };

  return (
    <div
      className={`px-3 py-2.5 border-t ${theme === "dark" ? "border-orange-900/35 bg-[#1a1a1a]" : "border-orange-100 bg-orange-50/40"}`}
    >
      <div className="flex flex-col gap-2">
        {/* Stats row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-1">
              <span
                className={`text-xs font-bold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
              >
                {totalTareasPendientes} pendiente
                {totalTareasPendientes !== 1 ? "s" : ""}
              </span>
              {mostrandoReportesDeOtros ? (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${theme === "dark" ? "bg-orange-500/15 text-orange-300" : "bg-orange-100 text-orange-800"}`}
                >
                  De otros: {tareasReportadasPorOtros}
                </span>
              ) : (
                totalTareasReportadas > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${theme === "dark" ? "bg-green-500/15 text-green-300" : "bg-green-100 text-green-800"}`}
                    >
                      {tareasReportadasPorMi} mías
                    </span>
                    {tareasReportadasPorOtros > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${theme === "dark" ? "bg-orange-500/15 text-orange-300" : "bg-orange-100 text-orange-800"}`}
                      >
                        {tareasReportadasPorOtros} de otros
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
            {countSeleccionadas > 0 && !esHoraReporte && (
              <span
                className={`text-[10px] flex items-center gap-0.5 font-bold ${theme === "dark" ? "text-orange-300" : "text-orange-700"}`}
              >
                <CheckSquare className="w-3 h-3" />
                {countSeleccionadas} seleccionada
                {countSeleccionadas !== 1 ? "s" : ""}
              </span>
            )}
            {currentUserEmail && (
              <span
                className={`text-[10px] ${theme === "dark" ? "text-gray-600" : "text-gray-400"}`}
              >
                {nombreUsuario}
                {mostrandoReportesDeOtros && " · Sin reportes propios"}
              </span>
            )}
          </div>

          <div className="flex-shrink-0">
            {mostrandoReportesDeOtros ? (
              <span
                className={`text-[10px] px-2 py-0.5 flex items-center gap-1 font-bold rounded-full ${theme === "dark" ? "bg-orange-500/15 text-orange-300 border border-orange-500/25" : "bg-orange-100 text-orange-800 border border-orange-200"}`}
              >
                <UsersIcon className="w-2.5 h-2.5" />
                Colaborativo
              </span>
            ) : esTrabajoEnEquipo ? (
              <span
                className={`text-[10px] px-2 py-0.5 flex items-center gap-1 font-bold rounded-full ${theme === "dark" ? "bg-green-500/15 text-green-300 border border-green-500/25" : "bg-green-100 text-green-800 border border-green-200"}`}
              >
                <UsersIcon className="w-2.5 h-2.5" />
                Equipo ({todosColaboradores.length})
              </span>
            ) : (
              <span
                className={`text-[10px] px-2 py-0.5 flex items-center gap-1 font-bold rounded-full ${theme === "dark" ? "bg-blue-500/15 text-blue-300 border border-blue-500/25" : "bg-blue-100 text-blue-800 border border-blue-200"}`}
              >
                <UserIcon className="w-2.5 h-2.5" />
                Individual
              </span>
            )}
          </div>
        </div>

        {/* Select all row */}
        {!esHoraReporte && totalTareasPendientes > 0 && (
          <div className="flex gap-1.5">
            <button
              onClick={
                todasSeleccionadas ? onDeseleccionarTodas : onSeleccionarTodas
              }
              className={`flex-1 h-8 flex items-center justify-center gap-1.5 text-[11px] font-semibold rounded-lg border transition-colors ${theme === "dark" ? "border-orange-700/45 text-orange-300 hover:bg-orange-900/25" : "border-orange-300 text-orange-700 hover:bg-orange-100"}`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {todasSeleccionadas
                ? "Deseleccionar todas"
                : "Seleccionar con descripción"}
            </button>
            {onRecargar && (
              <button
                onClick={onRecargar}
                disabled={isLoading}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors flex-shrink-0 ${theme === "dark" ? "border-orange-700/45 text-orange-400 hover:bg-orange-900/25" : "border-orange-300 text-orange-600 hover:bg-orange-100"}`}
                title="Recargar"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            )}
          </div>
        )}

        {/* Main CTA */}
        <button
          onClick={handleMainAction}
          disabled={!esHoraReporte && countSeleccionadas === 0}
          className={`w-full h-9 flex items-center justify-center gap-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-all active:scale-[0.98] ${
            countSeleccionadas === 0 && !esHoraReporte
              ? theme === "dark"
                ? "bg-gray-700 cursor-not-allowed text-gray-500"
                : "bg-gray-300 cursor-not-allowed text-gray-500"
              : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/25"
          }`}
        >
          {textoBoton()}
        </button>
      </div>
    </div>
  );
}

// ========== NO TASKS MESSAGE ==========

interface NoTasksMessageProps {
  onRecargar?: () => void;
  currentUserEmail?: string;
  mostrandoReportesDeOtros?: boolean;
  estadisticasServidor?: any;
}

export function NoTasksMessage({
  onRecargar,
  currentUserEmail,
  mostrandoReportesDeOtros = false,
  estadisticasServidor = null,
}: NoTasksMessageProps) {
  const theme = useTheme();
  const nombreUsuario = currentUserEmail?.includes("@")
    ? currentUserEmail.split("@")[0]
    : "Usuario";

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300 px-1">
      <div
        className={`p-4 rounded-xl border text-center shadow-sm ${theme === "dark" ? "bg-[#1e1e1e] border-orange-900/40" : "bg-white border-orange-100"}`}
      >
        {mostrandoReportesDeOtros && estadisticasServidor ? (
          <>
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2 ${theme === "dark" ? "bg-orange-500/15" : "bg-orange-100"}`}
            >
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <h4
              className={`font-bold mb-1 text-sm ${theme === "dark" ? "text-orange-300" : "text-orange-800"}`}
            >
              Reportes del equipo
            </h4>
            <p
              className={`text-xs mb-2 leading-relaxed ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
            >
              {nombreUsuario}, no tienes tareas propias, pero hay{" "}
              <strong>{estadisticasServidor.tareasColaboradores || 0}</strong>{" "}
              reporte{estadisticasServidor.tareasColaboradores !== 1 ? "s" : ""}{" "}
              de otros colaboradores.
            </p>
            <div
              className={`text-[11px] px-2.5 py-1.5 rounded-lg mb-2 ${theme === "dark" ? "bg-orange-900/25 text-orange-200 border border-orange-700/35" : "bg-orange-50 text-orange-800 border border-orange-200"}`}
            >
              {estadisticasServidor.mensaje || "Trabajo colaborativo"}
            </div>
          </>
        ) : (
          <>
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2 ${theme === "dark" ? "bg-green-500/15" : "bg-green-100"}`}
            >
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <h4
              className={`font-bold mb-1 text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
            >
              Todas las tareas reportadas
            </h4>
            <p
              className={`text-xs mb-2 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}
            >
              {nombreUsuario}, no hay tareas pendientes.
            </p>
          </>
        )}
        {onRecargar && (
          <button
            onClick={onRecargar}
            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors min-h-[32px] ${theme === "dark" ? "border-orange-700/45 text-orange-400 hover:bg-orange-900/25" : "border-orange-300 text-orange-700 hover:bg-orange-50"}`}
          >
            <RefreshCw className="w-3 h-3" />
            Recargar tareas
          </button>
        )}
      </div>
    </div>
  );
}

// ========== TASKS PANEL (legacy export) ==========

export function TasksPanel({
  actividadesConTareasPendientes = [],
  totalTareasPendientes = 0,
  esHoraReporte = false,
  theme: _theme = "light",
  assistantAnalysis = null,
  onOpenReport,
  onStartVoiceMode,
  tareasSeleccionadas = new Set(),
  onToggleTarea = () => {},
  onSeleccionarTodas = () => {},
  onDeseleccionarTodas = () => {},
  onExplicarTareasSeleccionadas = () => {},
}: any) {
  const theme = useTheme();
  const todosColaboradores = useMemo(() => {
    if (!assistantAnalysis?.colaboradoresInvolucrados) return [];
    return assistantAnalysis.colaboradoresInvolucrados;
  }, [assistantAnalysis]);

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300">
      <div
        className={`w-full rounded-xl border overflow-hidden shadow-sm ${theme === "dark" ? "bg-[#1a1a1a] border-orange-900/50" : "bg-white border-orange-200"}`}
      >
        <PiePanelReporte
          totalTareasPendientes={totalTareasPendientes}
          esHoraReporte={esHoraReporte}
          onOpenReport={onOpenReport}
          onStartVoiceMode={onStartVoiceMode}
          tareasSeleccionadas={tareasSeleccionadas}
          onSeleccionarTodas={onSeleccionarTodas}
          onDeseleccionarTodas={onDeseleccionarTodas}
          onExplicarTareasSeleccionadas={onExplicarTareasSeleccionadas}
          todosColaboradores={todosColaboradores}
        />
      </div>
    </div>
  );
}
