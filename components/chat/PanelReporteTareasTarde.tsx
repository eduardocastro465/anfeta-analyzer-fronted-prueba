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
  Zap,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { PanelReporteTareasTardeProps, RevisionProcesada } from "@/lib/types";
import { ReporteActividadesModal } from "../ReporteActividadesModal";
import { wsService } from "@/lib/websocket.service"; // ✅ IMPORTAR WEBSOCKET

export function PanelReporteTareasTarde({
  assistantAnalysis,
  theme,
  turno,
  userEmail,
  onStartVoiceMode,
  onStartVoiceModeWithTasks,
  onReportCompleted,
  actividadesDiarias = [],
}: PanelReporteTareasTardeProps) {
  // ========== ESTADOS ==========
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

  // ✅ WEBSOCKET: Escuchar cambios en tareas reportadas
  useEffect(() => {
    if (!currentUserEmail) return;

    console.log("🔌 Conectando WebSocket para PanelReporteTareasTarde...");

    // Escuchar cambios en tareas
    wsService.on("cambios-tareas", (data: any) => {
      console.log(
        "🔄 Cambio detectado en tareas reportadas via WebSocket:",
        data,
      );
      // Recargar tareas cuando haya cambios
      cargarTareasReportadas(false);
    });

    // Escuchar cambios específicos de reportes
    wsService.on("reportes-actualizados", (data: any) => {
      console.log("📋 Reportes actualizados via WebSocket:", data);
      cargarTareasReportadas(false);
    });

    return () => {
      wsService.off("cambios-tareas");
      wsService.off("reportes-actualizados");
    };
  }, [currentUserEmail]);

  const INTERVALO_ACTUALIZACION_TAREAS = 3000;

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
        const tieneReportesPropios = metadata.tieneReportesPropios || false;
        const tieneReportesColaborativos =
          metadata.tieneReportesColaborativos || false;
        setMostrandoReportesDeOtros(
          !tieneReportesPropios && tieneReportesColaborativos,
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
    [currentUserEmail, mostrandoReportesDeOtros],
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
        const url = `http://localhost:4000/api/v1/reportes/tareas-reportadas?email=${encodeURIComponent(currentUserEmail)}&limit=100`;
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
          if (esForzado) {
            setTimeout(() => {
              mostrarAlertaMensaje(
                metadata.mensaje || `${tareasData.length} tarea(s) cargada(s)`,
              );
            }, 500);
          }
        } else {
          procesarTareasReportadas([], metadata);
          if (esForzado) {
            const totalActual = tareasReportadasMap.size;
            mostrarAlertaMensaje(
              metadata.mensaje ||
                (totalActual > 0
                  ? `No hay nuevas tareas. Tienes ${totalActual} en historial`
                  : "No tienes tareas reportadas aún"),
            );
          }
        }
      } catch (error) {
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
      if (onReportCompleted) onReportCompleted();
      mostrarAlertaMensaje("Reporte completado exitosamente");
    } catch (error) {
      mostrarAlertaMensaje("Error al completar el reporte");
    } finally {
      setGuardandoReporte(false);
    }
  }, [cargarTareasReportadas, onReportCompleted, mostrarAlertaMensaje]);

  // ✅ ELIMINADO: useEffect con setInterval para polling (línea ~170)
  // ✅ REEMPLAZADO por WebSocket arriba

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!mostrarModalReporte && ultimoReporteEnviado > 0) {
      timer = setTimeout(() => cargarTareasReportadas(true), 1000);
    }
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
      (sum, actividad) => sum + actividad.tareasNoReportadas.length,
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

      const reporte = Array.from(tareasReportadasMap.values()).find(
        (r) => r.pendienteId === tareaId || r.nombreTarea === tarea.nombre,
      );

      if (reporte) {
        mostrarAlertaMensaje(
          reporte.esMiReporte
            ? `Ya reportaste: "${reporte.nombreTarea}"`
            : `Ya reportada por ${reporte.reportadoPor || "otro colaborador"}`,
        );
        return;
      }

      setTareasSeleccionadas((prev) => {
        const nuevas = new Set(prev);
        nuevas.has(tareaId) ? nuevas.delete(tareaId) : nuevas.add(tareaId);
        return nuevas;
      });
    },
    [tareasReportadasMap, mostrarAlertaMensaje],
  );

  const seleccionarTodasTareas = useCallback(() => {
    const ids = actividadesConTareas.flatMap((actividad) =>
      actividad.tareasNoReportadas
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
        if (onReportCompleted) onReportCompleted();
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

  // ========== RENDER ==========
  return (
    <div className="w-full max-w-lg mx-auto animate-in slide-in-from-bottom-2 duration-300">
      {/* Alerta flotante — ocupa todo el ancho en móvil */}
      {mostrarAlerta && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300 sm:top-3 sm:left-auto sm:right-3 sm:max-w-sm">
          <div
            className={`px-4 py-3 flex items-center gap-2 sm:rounded-lg shadow-lg backdrop-blur-sm ${
              theme === "dark"
                ? "bg-gradient-to-r from-orange-900/95 to-amber-900/95 text-white border-b border-orange-500/50 sm:border"
                : "bg-gradient-to-r from-orange-100 to-amber-100 text-gray-800 border-b border-orange-300 sm:border"
            }`}
          >
            <Sunset className="w-4 h-4 text-orange-500 animate-pulse flex-shrink-0" />
            <span className="text-xs font-medium flex-1 min-w-0">
              {mensajeAlerta}
            </span>
            <button
              className="ml-1 p-1 rounded-full hover:bg-orange-500/20 flex-shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
              onClick={() => setMostrarAlerta(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Banner colaborativo */}
      {mostrandoReportesDeOtros && estadisticasServidor && (
        <div
          className={`p-3 rounded-xl mb-3 border ${
            theme === "dark"
              ? "bg-gradient-to-r from-orange-900/30 to-amber-900/30 border-orange-700/50"
              : "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg flex-shrink-0 ${theme === "dark" ? "bg-orange-500/20" : "bg-orange-200"}`}
            >
              <Users className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4
                className={`font-bold text-sm mb-1 ${theme === "dark" ? "text-orange-300" : "text-orange-700"}`}
              >
                Reportes del equipo — Turno Tarde
              </h4>
              <p
                className={`text-xs mb-2 leading-relaxed ${theme === "dark" ? "text-orange-200" : "text-orange-600"}`}
              >
                {estadisticasServidor.mensaje ||
                  "No tienes reportes propios, pero hay reportes de otros colaboradores."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${theme === "dark" ? "bg-orange-800/50 text-orange-200" : "bg-orange-200 text-orange-800"}`}
                >
                  Tú: {currentUserEmail.split("@")[0]}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${theme === "dark" ? "bg-blue-800/50 text-blue-200" : "bg-blue-200 text-blue-800"}`}
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
          className={`w-full rounded-xl border overflow-hidden shadow-md ${
            theme === "dark"
              ? "bg-[#1e1e1e] border-orange-900/50"
              : "bg-white border-orange-200"
          }`}
        >
          {/* Header */}
          <div
            className={`px-3 py-3 border-b bg-orange-500/10 ${
              theme === "dark" ? "border-orange-900/50" : "border-orange-200"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              {/* Título izquierda */}
              <div className="flex items-center gap-2 min-w-0">
                <Sunset className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <h4
                  className={`font-bold text-xs uppercase tracking-wide truncate ${theme === "dark" ? "text-orange-200" : "text-orange-800"}`}
                >
                  Tareas Tarde
                </h4>
                {/* Counters en píldoras */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${theme === "dark" ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-700"}`}
                  >
                    {estadisticas.totalTareas}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${theme === "dark" ? "bg-green-500/30 text-green-200" : "bg-green-100 text-green-700"}`}
                  >
                    ✓ {estadisticas.totalReportadas}
                  </span>
                </div>
              </div>

              {/* Acciones derecha */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {mostrandoReportesDeOtros && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold hidden sm:inline-block ${theme === "dark" ? "bg-orange-500/30 text-orange-200" : "bg-orange-200 text-orange-800"}`}
                  >
                    De otros
                  </span>
                )}
                {/* Botón recargar — touch target 40x40 */}
                <button
                  onClick={handleRecargarTareas}
                  disabled={isLoading}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                    theme === "dark"
                      ? "hover:bg-orange-500/20 text-orange-400"
                      : "hover:bg-orange-100 text-orange-600"
                  }`}
                  title="Recargar tareas"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-3">
            {/* Info box */}
            <div
              className={`text-xs p-3 rounded-xl mb-3 border ${
                theme === "dark"
                  ? mostrandoReportesDeOtros
                    ? "bg-orange-900/30 text-orange-200 border-orange-700/50"
                    : "bg-blue-900/30 text-blue-200 border-blue-700/50"
                  : mostrandoReportesDeOtros
                    ? "bg-orange-50 text-orange-800 border-orange-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {mostrandoReportesDeOtros ? (
                  <Users className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                )}
                <strong className="font-bold">
                  {mostrandoReportesDeOtros
                    ? "Trabajo colaborativo"
                    : `Pendientes por reportar: ${estadisticas.totalNoReportadas}`}
                </strong>
                {!mostrandoReportesDeOtros &&
                  estadisticas.totalNoReportadas > 0 && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 bg-amber-500/30 text-amber-900 dark:text-amber-200 rounded-full font-semibold flex-shrink-0">
                      Por reportar
                    </span>
                  )}
              </div>
              <p className="text-xs leading-relaxed opacity-90">
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
            <div className="space-y-3">
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
                      theme={theme}
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
            theme={theme}
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
          theme={theme}
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
  theme: "light" | "dark";
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
  theme,
  tareasSeleccionadas,
  onToggleTarea,
  todosColaboradores,
  tareasReportadasMap,
  currentUserEmail,
  mostrandoReportesDeOtros = false,
}: ActivityItemProps) {
  const badgeColor = useMemo(() => {
    const colors = [
      "bg-orange-500/30 text-orange-400 border-orange-500/50",
      "bg-amber-500/30 text-amber-400 border-amber-500/50",
      "bg-yellow-500/30 text-yellow-400 border-yellow-500/50",
    ];
    return colors[index % 3];
  }, [index]);

  const colaboradoresReales =
    revision.colaboradoresReales || revision.colaboradores || [];
  const esActividadIndividual =
    revision.esActividadIndividual || colaboradoresReales.length <= 1;

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        theme === "dark"
          ? "bg-[#252525] border-orange-900/30"
          : "bg-white border-orange-100 shadow-sm"
      }`}
    >
      {/* Header actividad */}
      <div
        className={`px-3 py-3 ${theme === "dark" ? "border-b border-orange-900/20" : "border-b border-orange-50"}`}
      >
        <div className="flex items-start gap-3">
          {/* Número */}
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border flex-shrink-0 ${badgeColor}`}
          >
            {index + 1}
          </div>

          {/* Info actividad */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h5
                className={`font-bold text-sm leading-tight ${theme === "dark" ? "text-orange-200" : "text-orange-900"}`}
              >
                {actividad.titulo}
              </h5>
              {/* Horario badge — siempre visible */}
              <span
                className={`text-xs font-semibold flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-lg ${
                  theme === "dark"
                    ? "bg-orange-900/40 text-orange-300"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                <Clock className="w-3 h-3" />
                {actividad.horario}
              </span>
            </div>

            {/* Usuario + tipo trabajo en fila */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {currentUserEmail && (
                <span
                  className={`text-xs font-semibold ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}
                >
                  Tú: {currentUserEmail.split("@")[0]}
                </span>
              )}
              {/* Separador */}
              {currentUserEmail && (
                <span
                  className={`text-xs ${theme === "dark" ? "text-gray-600" : "text-gray-300"}`}
                >
                  ·
                </span>
              )}

              {esActividadIndividual ? (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                    theme === "dark"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  <UserIcon className="w-3 h-3" />
                  Individual
                </span>
              ) : (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                    theme === "dark"
                      ? "bg-green-500/20 text-green-300 border border-green-500/30"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  <UsersIcon className="w-3 h-3" />
                  Equipo ({colaboradoresReales.length})
                </span>
              )}

              {mostrandoReportesDeOtros && (
                <span
                  className={`text-xs font-semibold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}
                >
                  Mostrando reportes de otros
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body con tareas */}
      <div className="p-3 space-y-3">
        {/* Tareas reportadas */}
        {revision.tareasReportadas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span
                className={`text-xs font-bold ${theme === "dark" ? "text-green-400" : "text-green-700"}`}
              >
                Reportadas ({revision.tareasReportadas.length})
              </span>
            </div>
            <div className="space-y-2">
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
                    theme={theme}
                    reporteInfo={reporteInfo}
                    esMiReporte={reporteInfo.esMiReporte || false}
                    currentUserEmail={currentUserEmail}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Tareas pendientes */}
        {revision.tareasNoReportadas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span
                className={`text-xs font-bold ${theme === "dark" ? "text-amber-400" : "text-amber-700"}`}
              >
                Pendientes ({revision.tareasNoReportadas.length})
              </span>
              <span
                className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}
              >
                · Toca para seleccionar
              </span>
            </div>

            <div className="space-y-2">
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
                    theme={theme}
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
  theme: "light" | "dark";
  reporteInfo?: any;
  esMiReporte: boolean;
  currentUserEmail: string;
}

function TareaReportada({
  tarea,
  theme,
  reporteInfo,
  esMiReporte,
  currentUserEmail,
}: TareaReportadaProps) {
  const [mostrarDescripcion, setMostrarDescripcion] = useState(false);
  if (!reporteInfo) return null;

  const reportadoPor = reporteInfo.reportadoPor || "Usuario";
  const emailReportado = reporteInfo.emailReportado || "";
  const esRealmenteMiReporte =
    esMiReporte &&
    currentUserEmail &&
    emailReportado.toLowerCase() === currentUserEmail.toLowerCase();
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
      className={`p-3 rounded-xl border ${
        esRealmenteMiReporte
          ? theme === "dark"
            ? "bg-green-900/20 border-green-700/40"
            : "bg-green-50 border-green-200"
          : theme === "dark"
            ? "bg-orange-900/20 border-orange-700/40"
            : "bg-orange-50 border-orange-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Ícono check */}
        <div
          className={`w-6 h-6 flex items-center justify-center rounded-full border flex-shrink-0 mt-0.5 ${
            esRealmenteMiReporte
              ? theme === "dark"
                ? "bg-green-500/30 text-green-300 border-green-500/50"
                : "bg-green-100 text-green-700 border-green-300"
              : theme === "dark"
                ? "bg-orange-500/30 text-orange-300 border-orange-500/50"
                : "bg-orange-100 text-orange-700 border-orange-300"
          }`}
        >
          <Check className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Nombre */}
          <p
            className={`text-sm font-semibold leading-tight mb-1.5 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
          >
            {tarea.nombre}
          </p>

          {/* Badge + metadata en fila */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                esRealmenteMiReporte
                  ? theme === "dark"
                    ? "bg-green-500/30 text-green-300"
                    : "bg-green-100 text-green-800"
                  : theme === "dark"
                    ? "bg-orange-500/30 text-orange-300"
                    : "bg-orange-100 text-orange-800"
              }`}
            >
              {esRealmenteMiReporte ? (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 inline" />
                  Mi reporte
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 inline" />
                  Por {nombreFormateado}
                </span>
              )}
            </span>

            <span
              className={`text-xs flex items-center gap-1 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}
            >
              <Calendar className="w-3 h-3" />
              {fechaFormateada}
            </span>

            {tarea.duracionMin > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${theme === "dark" ? "text-blue-300 bg-blue-500/20" : "text-blue-700 bg-blue-100"}`}
              >
                {tarea.duracionMin} min
              </span>
            )}
          </div>

          {/* Toggle descripción — botón grande para toque */}
          {reporteInfo.texto && (
            <div className="mt-2">
              <button
                onClick={() => setMostrarDescripcion(!mostrarDescripcion)}
                className={`flex items-center gap-1.5 text-xs font-semibold py-1.5 px-0 rounded-md transition-colors min-h-[36px] ${
                  theme === "dark"
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {mostrarDescripcion ? "Ocultar explicación" : "Ver explicación"}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${mostrarDescripcion ? "rotate-180" : ""}`}
                />
              </button>

              {mostrarDescripcion && (
                <div
                  className={`mt-1.5 p-3 rounded-xl text-xs leading-relaxed ${
                    theme === "dark"
                      ? "bg-[#2a2a2a] text-gray-300 border border-[#3a3a3a]"
                      : "bg-white text-gray-700 border border-gray-200"
                  }`}
                >
                  <p className="font-semibold mb-1 text-xs">
                    {esRealmenteMiReporte
                      ? "Mi explicación:"
                      : `Explicación de ${nombreFormateado}:`}
                  </p>
                  <p className="italic">"{reporteInfo.texto}"</p>
                  {reporteInfo.encontradoEn && (
                    <p
                      className={`mt-2 pt-2 border-t text-[11px] ${theme === "dark" ? "border-[#3a3a3a] text-gray-500" : "border-gray-200 text-gray-500"}`}
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
  theme: "light" | "dark";
  estaSeleccionada: boolean;
  onToggleSeleccion: () => void;
  esActividadIndividual: boolean;
  colaboradoresReales: string[];
  currentUserEmail: string;
}

function TareaPendiente({
  tarea,
  theme,
  estaSeleccionada,
  onToggleSeleccion,
  esActividadIndividual,
  colaboradoresReales,
  currentUserEmail,
}: TareaPendienteProps) {
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
      className={`p-3 rounded-xl border transition-all duration-150 ${
        estaBloqueada
          ? `opacity-50 ${
              theme === "dark"
                ? "bg-gray-900/50 border-gray-700"
                : "bg-gray-50 border-gray-200"
            }`
          : estaSeleccionada
            ? `border-orange-500 shadow-md ${theme === "dark" ? "bg-orange-900/20" : "bg-orange-50"}`
            : theme === "dark"
              ? "bg-[#222222] border-[#3a3a3a] active:bg-[#2a2a2a]"
              : "bg-white border-gray-200 active:bg-orange-50/50"
      }`}
      onClick={() => {
        if (!estaBloqueada) onToggleSeleccion();
      }}
      role={estaBloqueada ? undefined : "checkbox"}
      aria-checked={estaSeleccionada}
      aria-disabled={estaBloqueada}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox — mínimo 24x24 para touch */}
        <div
          className={`w-6 h-6 flex items-center justify-center border-2 rounded-lg transition-all flex-shrink-0 mt-0.5 ${
            estaBloqueada
              ? theme === "dark"
                ? "border-red-700 bg-red-900/30"
                : "border-red-300 bg-red-50"
              : estaSeleccionada
                ? "bg-orange-500 border-orange-500 shadow-sm"
                : theme === "dark"
                  ? "border-gray-600"
                  : "border-gray-300"
          }`}
        >
          {estaBloqueada ? (
            <X className="w-3.5 h-3.5 text-red-500" />
          ) : (
            estaSeleccionada && <Check className="w-3.5 h-3.5 text-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Nombre tarea */}
          <p
            className={`text-sm font-semibold leading-tight mb-2 ${
              estaBloqueada
                ? theme === "dark"
                  ? "text-gray-600"
                  : "text-gray-400"
                : theme === "dark"
                  ? "text-gray-200"
                  : "text-gray-800"
            }`}
          >
            {tarea.nombre}
          </p>

          {/* Badges en fila con wrap */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {tarea.explicacionVoz?.emailUsuario &&
              (tarea.explicacionVoz.emailUsuario === currentUserEmail ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Mi reporte
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  De {tarea.explicacionVoz.emailUsuario.split("@")[0]}
                </span>
              ))}
            {estaBloqueadaPorOtro ? null : estaBloqueada ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                <X className="w-3 h-3" />
                Sin descripción
              </span>
            ) : estaExplicada ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 border border-green-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Explicada
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                <Mic className="w-3 h-3" />
                Pendiente
              </span>
            )}

            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                estaBloqueada
                  ? "opacity-50"
                  : tarea.prioridad === "ALTA"
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : theme === "dark"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-amber-100 text-amber-800 border-amber-300"
              }`}
            >
              {tarea.prioridad}
            </span>
          </div>

          {/* Descripción truncada */}
          {tieneDescripcion && (
            <p
              className={`text-xs mb-1.5 leading-relaxed ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
            >
              <FileText className="w-3 h-3 inline mr-1 opacity-70" />
              {tarea.descripcion.substring(0, 90)}
              {tarea.descripcion.length > 90 && "…"}
            </p>
          )}

          {tieneQueHizo && (
            <p
              className={`text-xs mb-1.5 leading-relaxed ${theme === "dark" ? "text-green-400" : "text-green-600"}`}
            >
              <CheckCircle2 className="w-3 h-3 inline mr-1" />
              {tarea.queHizo.substring(0, 90)}
              {tarea.queHizo.length > 90 && "…"}
            </p>
          )}

          {/* Footer: colaboradores + tiempo */}
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`text-xs font-medium flex items-center gap-1 ${estaBloqueada ? "opacity-50" : theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
              >
                {esActividadIndividual ? (
                  <>
                    <User className="w-3 h-3" />
                    Tú solo
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3" />
                    Equipo ({colaboradoresReales.length})
                  </>
                )}
              </span>
              {!esActividadIndividual &&
                colaboradoresReales.slice(0, 2).map((c: string, i: number) => (
                  <span
                    key={i}
                    className={`text-xs px-1.5 py-0.5 rounded-full ${estaBloqueada ? "opacity-50" : theme === "dark" ? "bg-[#2a2a2a] text-gray-400" : "bg-gray-100 text-gray-600"}`}
                  >
                    {c.split("@")[0]}
                  </span>
                ))}
              {colaboradoresReales.length > 2 && (
                <span
                  className={`text-xs ${estaBloqueada ? "opacity-50" : theme === "dark" ? "text-gray-500" : "text-gray-500"}`}
                >
                  +{colaboradoresReales.length - 2}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {tarea.duracionMin > 0 && (
                <span
                  className={`text-xs font-medium ${estaBloqueada ? "opacity-50" : theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                >
                  {tarea.duracionMin}m
                </span>
              )}
              {tarea.diasPendiente > 0 && (
                <span
                  className={`text-xs font-semibold ${estaBloqueada ? "opacity-50" : theme === "dark" ? "text-amber-400" : "text-amber-600"}`}
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
  theme: "light" | "dark";
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
  theme,
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
  const countSeleccionadas = tareasSeleccionadas?.size ?? 0;
  const todasSeleccionadas =
    countSeleccionadas === totalTareasPendientes && totalTareasPendientes > 0;
  const esTrabajoEnEquipo = todosColaboradores.length > 1;
  const esTurnoTarde = turno === "tarde";
  const nombreUsuario = currentUserEmail.includes("@")
    ? currentUserEmail.split("@")[0]
    : currentUserEmail;

  const handleMainAction = () => {
    if (esHoraReporte) {
      onOpenReport?.();
    } else {
      if (countSeleccionadas === 0) return;
      if (esTurnoTarde && onOpenReporteModal) onOpenReporteModal();
      else onExplicarTareasSeleccionadas();
    }
  };

  return (
    <div
      className={`px-3 py-3 border-t ${
        theme === "dark"
          ? "border-orange-900/40 bg-[#1c1c1c]"
          : "border-orange-100 bg-orange-50/50"
      }`}
    >
      <div className="flex flex-col gap-3">
        {/* Stats + tipo trabajo */}
        <div className="flex items-start justify-between gap-3">
          {/* Izquierda: stats */}
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`text-xs font-bold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
              >
                {totalTareasPendientes} pendiente
                {totalTareasPendientes !== 1 ? "s" : ""}
              </span>

              {mostrandoReportesDeOtros ? (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${theme === "dark" ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-800"}`}
                >
                  De otros: {tareasReportadasPorOtros}
                </span>
              ) : (
                totalTareasReportadas > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${theme === "dark" ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-800"}`}
                    >
                      {tareasReportadasPorMi} mías
                    </span>
                    {tareasReportadasPorOtros > 0 && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${theme === "dark" ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-800"}`}
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
                className={`text-xs flex items-center gap-1 font-bold ${theme === "dark" ? "text-orange-300" : "text-orange-700"}`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                {countSeleccionadas} seleccionada
                {countSeleccionadas !== 1 ? "s" : ""}
              </span>
            )}

            {currentUserEmail && (
              <span
                className={`text-xs ${theme === "dark" ? "text-gray-600" : "text-gray-400"}`}
              >
                {nombreUsuario}
                {mostrandoReportesDeOtros && " · Sin reportes propios"}
              </span>
            )}
          </div>

          {/* Derecha: badge tipo */}
          <div className="flex-shrink-0">
            {mostrandoReportesDeOtros ? (
              <span
                className={`text-xs px-2.5 py-1 flex items-center gap-1 font-bold rounded-full ${theme === "dark" ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "bg-orange-100 text-orange-800 border border-orange-200"}`}
              >
                <UsersIcon className="w-3 h-3" />
                Colaborativo
              </span>
            ) : esTrabajoEnEquipo ? (
              <span
                className={`text-xs px-2.5 py-1 flex items-center gap-1 font-bold rounded-full ${theme === "dark" ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-green-100 text-green-800 border border-green-200"}`}
              >
                <UsersIcon className="w-3 h-3" />
                Equipo ({todosColaboradores.length})
              </span>
            ) : (
              <span
                className={`text-xs px-2.5 py-1 flex items-center gap-1 font-bold rounded-full ${theme === "dark" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-blue-100 text-blue-800 border border-blue-200"}`}
              >
                <UserIcon className="w-3 h-3" />
                Individual
              </span>
            )}
          </div>
        </div>

        {/* Seleccionar todas — botón touch-friendly */}
        {!esHoraReporte && totalTareasPendientes > 0 && (
          <div className="flex gap-2">
            <button
              onClick={
                todasSeleccionadas ? onDeseleccionarTodas : onSeleccionarTodas
              }
              className={`flex-1 h-10 flex items-center justify-center gap-2 text-xs font-semibold rounded-xl border transition-colors ${
                theme === "dark"
                  ? "border-orange-700/50 text-orange-300 hover:bg-orange-900/30 active:bg-orange-900/50"
                  : "border-orange-300 text-orange-700 hover:bg-orange-100 active:bg-orange-200"
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              {todasSeleccionadas
                ? "Deseleccionar todas"
                : "Seleccionar con descripción"}
            </button>

            {onRecargar && (
              <button
                onClick={onRecargar}
                disabled={isLoading}
                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-colors flex-shrink-0 ${
                  theme === "dark"
                    ? "border-orange-700/50 text-orange-400 hover:bg-orange-900/30"
                    : "border-orange-300 text-orange-600 hover:bg-orange-100"
                }`}
                title="Recargar"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            )}
          </div>
        )}

        {/* Botón principal — altura 48px (mínimo recomendado para móvil) */}
        <button
          onClick={handleMainAction}
          disabled={!esHoraReporte && countSeleccionadas === 0}
          className={`w-full h-12 flex items-center justify-center gap-2 text-sm font-bold text-white rounded-xl shadow-md transition-all active:scale-[0.98] ${
            countSeleccionadas === 0 && !esHoraReporte
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-orange-500 to-amber-500 active:from-orange-600 active:to-amber-600 shadow-orange-500/30"
          }`}
        >
          {esHoraReporte ? (
            <>
              <ClipboardList className="w-4 h-4" />
              Iniciar Reporte
            </>
          ) : esTurnoTarde ? (
            <>
              <Mic className="w-4 h-4" />
              Explicar Tareas
              {countSeleccionadas > 0 && ` (${countSeleccionadas})`}
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Reportar Tareas
              {countSeleccionadas > 0 && ` (${countSeleccionadas})`}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ========== NO TASKS MESSAGE ==========

interface NoTasksMessageProps {
  theme: "light" | "dark";
  onRecargar?: () => void;
  currentUserEmail?: string;
  mostrandoReportesDeOtros?: boolean;
  estadisticasServidor?: any;
}

export function NoTasksMessage({
  theme,
  onRecargar,
  currentUserEmail,
  mostrandoReportesDeOtros = false,
  estadisticasServidor = null,
}: NoTasksMessageProps) {
  const nombreUsuario = currentUserEmail?.includes("@")
    ? currentUserEmail.split("@")[0]
    : "Usuario";

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300 px-1">
      <div
        className={`p-6 rounded-xl border text-center shadow-sm ${
          theme === "dark"
            ? "bg-[#1e1e1e] border-orange-900/40"
            : "bg-white border-orange-100"
        }`}
      >
        {mostrandoReportesDeOtros && estadisticasServidor ? (
          <>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${theme === "dark" ? "bg-orange-500/20" : "bg-orange-100"}`}
            >
              <Users className="w-6 h-6 text-orange-500" />
            </div>
            <h4
              className={`font-bold mb-2 text-base ${theme === "dark" ? "text-orange-300" : "text-orange-800"}`}
            >
              Reportes del equipo
            </h4>
            <p
              className={`text-sm mb-3 leading-relaxed ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
            >
              {nombreUsuario}, no tienes tareas propias, pero hay{" "}
              <strong>{estadisticasServidor.tareasColaboradores || 0}</strong>{" "}
              reporte{estadisticasServidor.tareasColaboradores !== 1 ? "s" : ""}{" "}
              de otros colaboradores.
            </p>
            <div
              className={`text-xs p-3 rounded-xl mb-3 ${theme === "dark" ? "bg-orange-900/30 text-orange-200 border border-orange-700/40" : "bg-orange-50 text-orange-800 border border-orange-200"}`}
            >
              {estadisticasServidor.mensaje || "Trabajo colaborativo"}
            </div>
          </>
        ) : (
          <>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${theme === "dark" ? "bg-green-500/20" : "bg-green-100"}`}
            >
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <h4
              className={`font-bold mb-2 text-base ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
            >
              Todas las tareas reportadas
            </h4>
            <p
              className={`text-sm mb-3 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}
            >
              {nombreUsuario}, no hay tareas pendientes.
            </p>
          </>
        )}
        {onRecargar && (
          <button
            onClick={onRecargar}
            className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors min-h-[40px] ${
              theme === "dark"
                ? "border-orange-700/50 text-orange-400 hover:bg-orange-900/30"
                : "border-orange-300 text-orange-700 hover:bg-orange-50"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recargar tareas
          </button>
        )}
      </div>
    </div>
  );
}

// ========== TYPING INDICATOR ==========

interface TypingIndicatorProps {
  theme: "light" | "dark";
}

export function TypingIndicator({ theme }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
      <div
        className={`rounded-xl px-4 py-3 flex items-center gap-2 shadow-md ${
          theme === "dark"
            ? "bg-gradient-to-r from-orange-900/50 to-amber-900/50 text-white"
            : "bg-gradient-to-r from-orange-100 to-amber-100 text-gray-900"
        }`}
      >
        <Sunset className="w-4 h-4 text-orange-500 flex-shrink-0" />
        <div className="flex gap-1">
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== TASKS PANEL ==========

export function TasksPanel({
  actividadesConTareasPendientes = [],
  totalTareasPendientes = 0,
  esHoraReporte = false,
  theme = "light",
  assistantAnalysis = null,
  onOpenReport,
  onStartVoiceMode,
  tareasSeleccionadas = new Set(),
  onToggleTarea = () => {},
  onSeleccionarTodas = () => {},
  onDeseleccionarTodas = () => {},
  onExplicarTareasSeleccionadas = () => {},
}: any) {
  const todosColaboradores = useMemo(() => {
    if (!assistantAnalysis?.colaboradoresInvolucrados) return [];
    return assistantAnalysis.colaboradoresInvolucrados;
  }, [assistantAnalysis]);

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300">
      <div
        className={`w-full rounded-xl border overflow-hidden shadow-md ${
          theme === "dark"
            ? "bg-[#1a1a1a] border-orange-900/50"
            : "bg-white border-orange-200"
        }`}
      >
        <PiePanelReporte
          totalTareasPendientes={totalTareasPendientes}
          esHoraReporte={esHoraReporte}
          theme={theme}
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
