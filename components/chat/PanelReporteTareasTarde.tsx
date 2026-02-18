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

    const INTERVALO_ACTUALIZACION_TAREAS = 3000; // 5 segundos en milisegundos

    // Actualizar la hora cada minuto
    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000);
      return () => clearInterval(interval);
    }, []);

    // Función para mostrar alerta
    const mostrarAlertaMensaje = useCallback((mensaje: string) => {
      setMensajeAlerta(mensaje);
      setMostrarAlerta(true);
      setTimeout(() => setMostrarAlerta(false), 5000);
    }, []);

    // Función para procesar tareas reportadas (VERSIÓN MEJORADA)
    const procesarTareasReportadas = useCallback(
      (nuevasTareasReportadas: any[], metadata: any = null) => {
        nuevasTareasReportadas.forEach((item, i) => {});
        if (metadata) {
          setEstadisticasServidor(metadata);

          const tieneReportesPropios = metadata.tieneReportesPropios || false;
          const tieneReportesColaborativos =
            metadata.tieneReportesColaborativos || false;

          if (!tieneReportesPropios && tieneReportesColaborativos) {
            setMostrandoReportesDeOtros(true);
          } else {
            setMostrandoReportesDeOtros(false);
          }
        }

        if (nuevasTareasReportadas.length === 0) {
          return;
        }

        if (nuevasTareasReportadas.length > 0) {
        }

        setTareasReportadasMap((mapActual) => {
          const nuevoMap = new Map(mapActual);
          let nuevasAgregadas = 0;
          let actualizadas = 0;

          nuevasTareasReportadas.forEach((item: any, index: number) => {
            const tareaId = item.pendienteId || item.id || `tarea-${index}`;

            if (!tareaId) {
              console.warn("Item sin ID:", item);
              return;
            }

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
                  reportadoPor: reportadoPor,
                  emailReportado: emailReportado,
                  esMiReporte: esMiReporte,
                  esReporteColaborativo:
                    item.esReporteColaborativo || !esMiReporte,
                  _raw: item,
                });
                actualizadas++;
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
                reportadoPor: reportadoPor,
                emailReportado: emailReportado,
                esMiReporte: esMiReporte,
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
              nuevasAgregadas++;
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

    // Función para cargar tareas reportadas (VERSIÓN CON METADATA)
    const cargarTareasReportadas = useCallback(
      async (esForzado: boolean = false) => {
        if (!currentUserEmail) {
          console.warn("No hay email para cargar tareas reportadas");
          return;
        }

        if (actualizandoRef.current && !esForzado) {
          return;
        }

        setIsLoading(true);
        actualizandoRef.current = true;

        try {
          const url = `http://localhost:4000/api/v1/reportes/tareas-reportadas?email=${encodeURIComponent(currentUserEmail)}&limit=100`;

          const response = await fetch(url, {
            method: "GET",
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
          }

          const data = await response.json();

          const tareasData = data.data || data.tareas || data.resultados || [];
          const metadata = data.metadata || data.info || {};

          if (Array.isArray(tareasData) && tareasData.length > 0) {
            procesarTareasReportadas(tareasData, metadata);

            if (esForzado) {
              const mensaje =
                metadata.mensaje || `${tareasData.length} tarea(s) cargada(s)`;
              setTimeout(() => {
                mostrarAlertaMensaje(mensaje);
              }, 500);
            }
          } else {
            procesarTareasReportadas([], metadata);

            if (esForzado) {
              const totalActual = tareasReportadasMap.size;
              const mensaje =
                metadata.mensaje ||
                (totalActual > 0
                  ? `No hay nuevas tareas. Tienes ${totalActual} en historial`
                  : "No tienes tareas reportadas aún");
              mostrarAlertaMensaje(mensaje);
            }
          }
        } catch (error) {
          console.error("Error cargando tareas reportadas:", error);
          if (esForzado) {
            mostrarAlertaMensaje("No se pudieron cargar las tareas reportadas");
          }
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

    // NUEVO: Función para guardar reporte completado
    const handleGuardarReporte = useCallback(async () => {
      setGuardandoReporte(true);
      try {
        // Recargar tareas reportadas
        await cargarTareasReportadas(true);

        // Limpiar selección
        setTareasSeleccionadas(new Set());

        // Cerrar modal
        setMostrarModalReporte(false);

        // Notificar completado
        if (onReportCompleted) {
          onReportCompleted();
        }

        mostrarAlertaMensaje("Reporte completado exitosamente");
      } catch (error) {
        console.error("Error al completar reporte:", error);
        mostrarAlertaMensaje("Error al completar el reporte");
      } finally {
        setGuardandoReporte(false);
      }
    }, [cargarTareasReportadas, onReportCompleted, mostrarAlertaMensaje]);

  useEffect(() => {
    // ✅ NO hacer polling si el modal está abierto
    if (mostrarModalReporte) {
      return; // ← Sale temprano, no inicia el intervalo
    }

    const interval = setInterval(() => {
      cargarTareasReportadas(false);
    }, INTERVALO_ACTUALIZACION_TAREAS);

    return () => {
      clearInterval(interval);
    };
  }, [currentUserEmail, cargarTareasReportadas, mostrarModalReporte]); // ← Agregado


  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (!mostrarModalReporte && ultimoReporteEnviado > 0) {
      console.log("🔄 Modal cerrado - recargando tareas en 1 segundo");
      timer = setTimeout(() => {
        cargarTareasReportadas(true);
      }, 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [mostrarModalReporte, ultimoReporteEnviado, cargarTareasReportadas]);

    // Filtrar actividades con tareas pendientes
    const actividadesConTareas = useMemo(() => {
      if (!assistantAnalysis?.data?.revisionesPorActividad) {
        return [];
      }
      console.log("=== ACTIVIDADES CON TAREAS ===");
      console.log("Total actividades:", assistantAnalysis.data);

      return assistantAnalysis.data.revisionesPorActividad
        .map((revision) => {
          const colaboradoresReales =
            revision.colaboradores ||
            assistantAnalysis.colaboradoresInvolucrados ||
            [];

          const tareasReportadas = revision.tareasConTiempo.filter((tarea) => {
            const reporte = Array.from(tareasReportadasMap.values()).find((r) => {
              const coincidePorId = r.pendienteId === tarea.id;
              const coincidePorNombre = r.nombreTarea === tarea.nombre;
              if (coincidePorId || coincidePorNombre) {
                console.log(
                  `  MATCH → tarea: "${tarea.nombre}" | coincidePorId: ${coincidePorId} | coincidePorNombre: ${coincidePorNombre} | esMiReporte: ${r.esMiReporte}`,
                );
              }
              return coincidePorId || coincidePorNombre;
            });
            return !!reporte;
          });

          const tareasNoReportadas = revision.tareasConTiempo.filter((tarea) => {
            const estaReportada = Array.from(tareasReportadasMap.values()).some(
              (r) => {
                const coincidePorId = r.pendienteId === tarea.id;
                const coincidePorNombre = r.nombreTarea === tarea.nombre;
                return coincidePorId || coincidePorNombre;
              },
            );
            const tieneDescripcion = tareasConDescripcion.has(tarea.id);
            return !estaReportada && !tieneDescripcion;
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

    // Calcular estadísticas
    const estadisticas = useMemo(() => {
      const todasTareasReportadas = actividadesConTareas.flatMap(
        (a) => a.tareasReportadas,
      );

      const totalReportadasPorMi = todasTareasReportadas.filter((tarea: any) => {
        const reporte = Array.from(tareasReportadasMap.values()).find((r) => {
          const coincidePorId = r.pendienteId === tarea.id;
          const coincidePorNombre = r.nombreTarea === tarea.nombre;
          return (coincidePorId || coincidePorNombre) && r.esMiReporte;
        });
        return !!reporte;
      }).length;

      const totalReportadasPorOtros = todasTareasReportadas.filter(
        (tarea: any) => {
          const reporte = Array.from(tareasReportadasMap.values()).find((r) => {
            const coincidePorId = r.pendienteId === tarea.id;
            const coincidePorNombre = r.nombreTarea === tarea.nombre;
            return (coincidePorId || coincidePorNombre) && !r.esMiReporte;
          });
          return !!reporte;
        },
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

    // Función para toggle de selección de tarea
    const toggleSeleccionTarea = useCallback(
      (tarea: any) => {
        const tareaId = tarea.id;

        // ✅ NUEVO: Verificar si la tarea NO tiene descripción
        if (!tarea.descripcion || tarea.descripcion.trim().length === 0) {
          mostrarAlertaMensaje(
            `"${tarea.nombre}" no tiene descripción del pendiente. Solo se pueden reportar tareas con descripción previa.`,
          );
          return; // ← BLOQUEA la selección
        }

        const reporte = Array.from(tareasReportadasMap.values()).find((r) => {
          const coincidePorId = r.pendienteId === tareaId;
          const coincidePorNombre = r.nombreTarea === tarea.nombre;
          return coincidePorId || coincidePorNombre;
        });

        if (reporte) {
          if (reporte.esMiReporte) {
            mostrarAlertaMensaje(
              `Ya reportaste esta tarea: "${reporte.nombreTarea}"`,
            );
          } else {
            const nombreReportante = reporte.reportadoPor || "otro colaborador";
            mostrarAlertaMensaje(
              `"${reporte.nombreTarea}" ya fue reportada por ${nombreReportante}`,
            );
          }
          return;
        }

        setTareasSeleccionadas((prev) => {
          const nuevasSeleccionadas = new Set(prev);
          if (nuevasSeleccionadas.has(tareaId)) {
            nuevasSeleccionadas.delete(tareaId);
          } else {
            nuevasSeleccionadas.add(tareaId);
          }
          return nuevasSeleccionadas;
        });
      },
      [tareasReportadasMap, mostrarAlertaMensaje],
    );

    // Función para seleccionar todas las tareas NO REPORTADAS
    const seleccionarTodasTareas = useCallback(() => {
      // ✅ FILTRAR solo tareas con descripción
      const todasTareasIds = actividadesConTareas.flatMap((actividad) =>
        actividad.tareasNoReportadas
          .filter((t: any) => t.descripcion && t.descripcion.trim().length > 0)
          .map((t: any) => t.id),
      );

      if (todasTareasIds.length === 0) {
        mostrarAlertaMensaje(
          "No hay tareas con descripción pendientes por reportar",
        );
        return;
      }

      setTareasSeleccionadas(new Set(todasTareasIds));
      mostrarAlertaMensaje(
        `${todasTareasIds.length} tarea${todasTareasIds.length !== 1 ? "s" : ""} con descripción seleccionada${todasTareasIds.length !== 1 ? "s" : ""}`,
      );
    }, [actividadesConTareas, mostrarAlertaMensaje]);

    // Función para deseleccionar todas
    const deseleccionarTodasTareas = useCallback(() => {
      setTareasSeleccionadas(new Set());
      mostrarAlertaMensaje("Todas las tareas deseleccionadas");
    }, [mostrarAlertaMensaje]);

    // Función para explicar tareas seleccionadas (ACTUALIZADA)
    const handleExplicarTareasSeleccionadas = useCallback(async () => {
      if (tareasSeleccionadas.size === 0) {
        mostrarAlertaMensaje(
          "Por favor selecciona al menos una tarea pendiente para explicar",
        );
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

          if (onReportCompleted) {
            onReportCompleted();
          }

          setTareasSeleccionadas(new Set());

          setTimeout(() => {
            cargarTareasReportadas(true);
          }, 5000);
        }, 3000);
      } else if (onStartVoiceMode) {
        console.warn("Usando onStartVoiceMode (fallback)");
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

    // Función para recargar tareas reportadas
    const handleRecargarTareas = useCallback(() => {
      cargarTareasReportadas(true);
    }, [cargarTareasReportadas]);

    // ========== RENDER ==========

    return (
      <div className="w-full animate-in slide-in-from-bottom-2 duration-300">
        {/* Alerta flotante - ESTILO TARDE (Naranja) */}
        {mostrarAlerta && (
          <div className="fixed top-3 right-3 z-50 animate-in slide-in-from-right duration-300">
            <div
              className={`px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 backdrop-blur-sm ${
                theme === "dark"
                  ? "bg-gradient-to-r from-orange-900/90 to-amber-900/90 text-white border border-orange-500/50"
                  : "bg-gradient-to-r from-orange-100 to-amber-100 text-gray-800 border border-orange-300"
              }`}
            >
              <Sunset className="w-4 h-4 text-orange-500 animate-pulse" />
              <span className="text-xs font-medium">{mensajeAlerta}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 p-0.5 h-auto hover:bg-orange-500/20"
                onClick={() => setMostrarAlerta(false)}
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {/* BANNER ESPECIAL SI SOLO HAY REPORTES DE OTROS */}
        {mostrandoReportesDeOtros && estadisticasServidor && (
          <div
            className={`p-2.5 rounded-lg mb-2 border ${
              theme === "dark"
                ? "bg-gradient-to-r from-orange-900/30 to-amber-900/30 border-orange-700/50"
                : "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300"
            }`}
          >
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4
                  className={`font-bold text-xs mb-0.5 flex items-center gap-1.5 ${theme === "dark" ? "text-orange-300" : "text-orange-700"}`}
                >
                  <Sunset className="w-3 h-3" />
                  Reportes del equipo - Turno Tarde
                </h4>
                <p
                  className={`text-[10px] mb-1.5 ${theme === "dark" ? "text-orange-200" : "text-orange-600"}`}
                >
                  {estadisticasServidor.mensaje ||
                    "No tienes reportes propios, pero hay reportes de otros colaboradores en tus actividades."}
                </p>
                <div className="flex flex-wrap gap-1 text-[9px]">
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${
                      theme === "dark"
                        ? "bg-orange-800/50 text-orange-200"
                        : "bg-orange-200 text-orange-800"
                    }`}
                  >
                    Tú: {currentUserEmail.split("@")[0]}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${
                      theme === "dark"
                        ? "bg-blue-800/50 text-blue-200"
                        : "bg-blue-200 text-blue-800"
                    }`}
                  >
                    {estadisticasServidor.tareasColaboradores || 0} reportes de
                    otros
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TasksPanel o NoTasksMessage */}
        {hayTareas ? (
          <div
            className={`w-full max-w-xl rounded-lg border overflow-hidden shadow-md ${
              theme === "dark"
                ? "bg-gradient-to-b from-[#1a1a1a] to-[#252527] border-orange-900/50"
                : "bg-gradient-to-b from-white to-orange-50/30 border-orange-200"
            }`}
          >
            {/* Header - ESTILO TARDE */}
            <div
              className={`px-3 py-2 border-b bg-gradient-to-r from-orange-500/20 to-amber-500/20 flex justify-between items-center ${
                theme === "dark" ? "border-orange-900/50" : "border-orange-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <h4
                  className={`font-bold text-xs flex items-center gap-1.5 uppercase tracking-wide ${
                    theme === "dark" ? "text-orange-200" : "text-orange-800"
                  }`}
                >
                  <Sunset className="w-4 h-4 text-orange-500" />
                  Tareas Tarde ({estadisticas.totalTareas})
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                      theme === "dark"
                        ? "bg-green-500/30 text-green-200"
                        : "bg-green-200 text-green-800"
                    }`}
                  >
                    ✓ {estadisticas.totalReportadas}
                  </span>
                  {mostrandoReportesDeOtros && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                        theme === "dark"
                          ? "bg-orange-500/30 text-orange-200"
                          : "bg-orange-200 text-orange-800"
                      }`}
                    >
                      De otros
                    </span>
                  )}
                </h4>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRecargarTareas}
                  disabled={isLoading}
                  className="h-6 w-6 p-0 hover:bg-orange-500/20"
                  title="Recargar tareas reportadas"
                >
                  <RefreshCw
                    className={`w-3 h-3 text-orange-500 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>

              <Badge
                variant="secondary"
                className="text-[9px] font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white border-none px-2 py-0.5"
              >
                <Zap className="w-2.5 h-2.5 mr-0.5" />
                SELECCIONAR
              </Badge>
            </div>

            {/* Contenido */}
            <div className="p-2.5">
              <div
                className={`text-xs p-2.5 rounded-lg mb-2.5 border ${
                  theme === "dark"
                    ? mostrandoReportesDeOtros
                      ? "bg-orange-900/30 text-orange-200 border-orange-700/50"
                      : "bg-blue-900/30 text-blue-200 border-blue-700/50"
                    : mostrandoReportesDeOtros
                      ? "bg-orange-100 text-orange-800 border-orange-300"
                      : "bg-blue-100 text-blue-800 border-blue-300"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {mostrandoReportesDeOtros ? (
                    <>
                      <Users className="w-4 h-4" />
                      <strong className="flex items-center gap-1.5">
                        Trabajo colaborativo{" "}
                        <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[9px]">
                          {estadisticasServidor?.tareasColaboradores || 0}{" "}
                          reportes
                        </span>
                      </strong>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      <strong className="flex items-center gap-1.5">
                        Tareas Pendientes:{" "}
                        <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[9px]">
                          {estadisticas.totalNoReportadas}
                        </span>
                      </strong>
                    </>
                  )}
                  {!mostrandoReportesDeOtros && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/30 text-amber-900 dark:text-amber-200 rounded-full font-semibold">
                      Por reportar
                    </span>
                  )}
                </div>
                <span className="block text-[10px] mt-1 opacity-90 font-medium">
                  {mostrandoReportesDeOtros ? (
                    <>
                      <strong>Tú:</strong>{" "}
                      {currentUserEmail
                        ? currentUserEmail.split("@")[0]
                        : "Usuario"}
                      <span className="mx-1.5">•</span> No tienes reportes
                      propios, pero hay reportes de otros colaboradores.
                    </>
                  ) : (
                    <>
                      {estadisticas.totalReportadasPorMi > 0 &&
                        `Tienes ${estadisticas.totalReportadasPorMi} tarea(s) reportada(s). `}
                      {estadisticas.totalReportadasPorOtros > 0 &&
                        `${estadisticas.totalReportadasPorOtros} tarea(s) reportada(s) por otros. `}
                      <br />
                      <strong>Tú:</strong>{" "}
                      {currentUserEmail
                        ? currentUserEmail.split("@")[0]
                        : "Usuario"}
                    </>
                  )}
                </span>
              </div>

              {/* Lista de actividades */}
              <div className="space-y-2.5">
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

            {/* Footer con acciones */}
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

  // ========== COMPONENTES AUXILIARES ==========

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
        className={`p-2.5 rounded-lg border ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] border-orange-900/30"
            : "bg-gradient-to-br from-white to-orange-50/50 border-orange-200"
        }`}
      >
        {/* Header de actividad - ESTILO TARDE */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${badgeColor}`}
            >
              {index + 1}
            </div>
            <div className="max-w-[70%]">
              <h5
                className={`font-bold text-xs line-clamp-2 ${
                  theme === "dark" ? "text-orange-200" : "text-orange-900"
                }`}
              >
                {actividad.titulo}
              </h5>
              {currentUserEmail && (
                <span
                  className={`text-[9px] font-semibold ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}
                >
                  Tú: {currentUserEmail.split("@")[0]}
                </span>
              )}
              {mostrandoReportesDeOtros && (
                <span
                  className={`text-[9px] block mt-0.5 font-semibold ${theme === "dark" ? "text-orange-300" : "text-orange-600"}`}
                >
                  Mostrando reportes de otros colaboradores
                </span>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] flex-shrink-0 font-semibold ${
              theme === "dark"
                ? "border-orange-700 text-orange-300 bg-orange-900/20"
                : "border-orange-400 text-orange-700 bg-orange-100"
            }`}
          >
            <Clock className="w-2.5 h-2.5 mr-0.5" />
            {actividad.horario}
          </Badge>
        </div>

        {/* INDICADOR DE TIPO DE TRABAJO - ESTILO TARDE */}
        <div className="ml-8 mb-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              {esActividadIndividual ? (
                <Badge
                  variant="secondary"
                  className={`text-[9px] px-2 py-0.5 flex items-center gap-0.5 font-bold rounded-full ${
                    theme === "dark"
                      ? "bg-blue-500/30 text-blue-200 border border-blue-500/50"
                      : "bg-blue-200 text-blue-800 border border-blue-400"
                  }`}
                >
                  <UserIcon className="w-2.5 h-2.5" />
                  Individual
                  <span className="text-[8px] opacity-80 ml-0.5">(Solo tú)</span>
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className={`text-[9px] px-2 py-0.5 flex items-center gap-0.5 font-bold rounded-full ${
                    theme === "dark"
                      ? "bg-green-500/30 text-green-200 border border-green-500/50"
                      : "bg-green-200 text-green-800 border border-green-400"
                  }`}
                >
                  <UsersIcon className="w-2.5 h-2.5" />
                  Equipo ({colaboradoresReales.length})
                  <span className="text-[8px] opacity-80 ml-0.5">
                    {colaboradoresReales
                      .slice(0, 2)
                      .map((c: string) => c.split("@")[0])
                      .join(", ")}
                    {colaboradoresReales.length > 2 &&
                      ` +${colaboradoresReales.length - 2}`}
                  </span>
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN ÚNICA: TAREAS YA REPORTADAS (TUS REPORTES + REPORTES DE OTROS) */}
        {revision.tareasReportadas.length > 0 && (
          <div className="mb-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Badge
                variant="outline"
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  theme === "dark"
                    ? "bg-green-500/20 text-green-300 border-green-500/50"
                    : "bg-green-200 text-green-800 border-green-400"
                }`}
              >
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                Reportadas ({revision.tareasReportadas.length})
              </Badge>
              <span
                className={`text-[10px] font-medium ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Estas tareas ya fueron reportadas
              </span>
            </div>

            <div className="ml-8 space-y-2">
              {revision.tareasReportadas.map((tarea: any) => {
                const reporteInfo = Array.from(tareasReportadasMap.values()).find(
                  (r) => {
                    const coincidePorId = r.pendienteId === tarea.id;
                    const coincidePorNombre = r.nombreTarea === tarea.nombre;
                    return coincidePorId || coincidePorNombre;
                  },
                );

                if (!reporteInfo) return null;

                const esMiReporte = reporteInfo.esMiReporte || false;

                return (
                  <TareaReportada
                    key={tarea.id}
                    tarea={tarea}
                    theme={theme}
                    reporteInfo={reporteInfo}
                    esMiReporte={esMiReporte}
                    currentUserEmail={currentUserEmail}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* SECCIÓN DE TAREAS PENDIENTES */}
        {revision.tareasNoReportadas.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Badge
                variant="outline"
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  theme === "dark"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                    : "bg-amber-200 text-amber-800 border-amber-400"
                }`}
              >
                <Clock className="w-2.5 h-2.5 mr-0.5" />
                Pendientes ({revision.tareasNoReportadas.length})
              </Badge>
              <span
                className={`text-[10px] font-medium ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Selecciona para reportar
              </span>
            </div>

            <div className="ml-8 space-y-2">
              {revision.tareasNoReportadas.map((tarea: any) => {
                const estaReportada = Array.from(
                  tareasReportadasMap.values(),
                ).some((r) => {
                  const coincidePorId = r.pendienteId === tarea.id;
                  const coincidePorNombre = r.nombreTarea === tarea.nombre;
                  return coincidePorId || coincidePorNombre;
                });

                if (estaReportada) {
                  return null;
                }

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
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

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

    const fechaReporte = reporteInfo.fechaReporte || new Date().toISOString();
    const fechaFormateada = new Date(fechaReporte).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div
        className={`p-2.5 rounded-lg border ${
          esRealmenteMiReporte
            ? theme === "dark"
              ? "bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/50"
              : "bg-gradient-to-br from-green-100 to-emerald-100 border-green-400"
            : theme === "dark"
              ? "bg-gradient-to-br from-orange-900/30 to-amber-900/30 border-orange-500/50"
              : "bg-gradient-to-br from-orange-100 to-amber-100 border-orange-400"
        }`}
      >
        <div className="flex items-start gap-2">
          <div className="flex items-center mt-0.5">
            <div
              className={`w-5 h-5 flex items-center justify-center rounded-full border ${
                esRealmenteMiReporte
                  ? theme === "dark"
                    ? "bg-green-500/40 text-green-300 border-green-400"
                    : "bg-green-500/30 text-green-700 border-green-500"
                  : theme === "dark"
                    ? "bg-orange-500/40 text-orange-300 border-orange-400"
                    : "bg-orange-500/30 text-orange-700 border-orange-500"
              }`}
            >
              <Check className="w-3 h-3 font-bold" />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold line-clamp-2 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {tarea.nombre}
                </span>
                <Badge
                  className={`text-[9px] flex-shrink-0 font-bold rounded-full px-1.5 py-0.5 ${
                    esRealmenteMiReporte
                      ? theme === "dark"
                        ? "bg-green-500/40 text-green-200 border-green-400"
                        : "bg-green-500/30 text-green-800 border-green-500"
                      : theme === "dark"
                        ? "bg-orange-500/40 text-orange-200 border-orange-400"
                        : "bg-orange-500/30 text-orange-800 border-orange-500"
                  }`}
                >
                  {esRealmenteMiReporte ? (
                    <>
                      <User className="w-2.5 h-2.5 mr-0.5 inline" />
                      MI REPORTE
                    </>
                  ) : (
                    <>
                      <Users className="w-2.5 h-2.5 mr-0.5 inline" />
                      POR {nombreFormateado.toUpperCase()}
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-0.5 font-medium ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    <User className="w-2.5 h-2.5" />
                    {esRealmenteMiReporte
                      ? "Yo reporté"
                      : `Reportado por: ${nombreFormateado}`}
                  </span>

                  <span
                    className={`flex items-center gap-0.5 font-medium ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    <Calendar className="w-2.5 h-2.5" />
                    {fechaFormateada}
                  </span>
                </div>

                {tarea.duracionMin > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      theme === "dark"
                        ? "text-blue-300 bg-blue-500/30"
                        : "text-blue-800 bg-blue-200"
                    }`}
                  >
                    {tarea.duracionMin} min
                  </span>
                )}
              </div>

              {/* Botón para mostrar/ocultar descripción */}
              {reporteInfo.texto && (
                <div className="mt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMostrarDescripcion(!mostrarDescripcion)}
                    className={`text-[10px] h-6 px-2 py-0.5 font-semibold rounded-md ${
                      theme === "dark"
                        ? "text-gray-300 hover:text-gray-200 hover:bg-[#3a3a3a]"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    <MessageSquare className="w-2.5 h-2.5 mr-0.5" />
                    {mostrarDescripcion
                      ? "Ocultar explicación"
                      : "Ver explicación"}
                    <ChevronDown
                      className={`w-2.5 h-2.5 ml-0.5 transition-transform ${mostrarDescripcion ? "rotate-180" : ""}`}
                    />
                  </Button>

                  {mostrarDescripcion && (
                    <div
                      className={`mt-1.5 p-2 rounded-md text-[10px] ${
                        theme === "dark"
                          ? "bg-[#2a2a2a] text-gray-300 border border-[#3a3a3a]"
                          : "bg-white text-gray-700 border border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-1 mb-1">
                        <MessageSquare className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                        <span className="font-bold">
                          {esRealmenteMiReporte
                            ? "Mi explicación:"
                            : `Explicación de ${nombreFormateado}:`}
                        </span>
                      </div>
                      <p className="italic whitespace-pre-wrap font-medium">
                        "{reporteInfo.texto}"
                      </p>
                      {reporteInfo.encontradoEn && (
                        <div
                          className={`mt-1.5 pt-1.5 border-t ${theme === "dark" ? "border-[#3a3a3a]" : "border-gray-300"}`}
                        >
                          <span
                            className={`text-[9px] font-semibold ${theme === "dark" ? "text-gray-500" : "text-gray-600"}`}
                          >
                            Fuente: {reporteInfo.encontradoEn}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  interface TareaPendienteProps {
    tarea: any;
    theme: "light" | "dark";
    estaSeleccionada: boolean;
    onToggleSeleccion: () => void;
    esActividadIndividual: boolean;
    colaboradoresReales: string[];
  }

  function TareaPendiente({
    tarea,
    theme,
    estaSeleccionada,
    onToggleSeleccion,
    esActividadIndividual,
    colaboradoresReales,
  }: TareaPendienteProps) {
    // ✅ VALIDACIÓN MEJORADA: Verifica descripción
    const tieneDescripcion = !!(
      tarea.descripcion &&
      typeof tarea.descripcion === "string" &&
      tarea.descripcion.trim().length > 0
    );

    // ✅ VALIDACIÓN MEJORADA: Verifica queHizo
    const tieneQueHizo = !!(
      tarea.queHizo &&
      typeof tarea.queHizo === "string" &&
      tarea.queHizo.trim().length > 0
    );

    // ✅ LÓGICA DE ESTADO CORREGIDA
    const estaBloqueada = !tieneDescripcion; // Solo bloquear si NO tiene descripción
    const estaExplicada = tieneDescripcion && tieneQueHizo; // Verde: tiene ambos
    const necesitaExplicacion = tieneDescripcion && !tieneQueHizo; // Amarillo: solo tiene descripción

    return (
      <div
        className={`p-2.5 rounded-lg border transition-all duration-200 ${
          estaBloqueada
            ? // BLOQUEADO (sin descripción) - NO se puede seleccionar
              `opacity-50 cursor-not-allowed ${
                theme === "dark"
                  ? "bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700"
                  : "bg-gradient-to-br from-gray-100 to-gray-200 border-gray-400"
              }`
            : // SELECCIONABLE (con descripción) - SÍ se puede seleccionar
              estaSeleccionada
              ? "border-orange-500 bg-gradient-to-br from-orange-500/20 to-amber-500/20 shadow-md scale-[1.01] cursor-pointer"
              : theme === "dark"
                ? "bg-gradient-to-br from-[#1f1f1f] to-[#252527] border-[#3a3a3a] hover:bg-[#2a2a2a] hover:border-orange-700 cursor-pointer"
                : "bg-gradient-to-br from-white to-gray-50 border-gray-300 hover:bg-orange-50/50 hover:border-orange-400 cursor-pointer"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (!estaBloqueada) {
            onToggleSeleccion();
          }
        }}
        title={
          estaBloqueada
            ? "Esta tarea no tiene descripción del pendiente. No se puede reportar."
            : estaExplicada
              ? "Tarea completada con explicación."
              : "Tarea con descripción. Click para seleccionar y explicar qué hiciste."
        }
      >
        <div className="flex items-start gap-2">
          <div className="flex items-center mt-0.5">
            <div
              className={`w-5 h-5 flex items-center justify-center border rounded-md transition-all ${
                estaBloqueada
                  ? // X roja para bloqueadas (sin descripción)
                    theme === "dark"
                    ? "border-red-700 bg-red-900/30"
                    : "border-red-500 bg-red-100"
                  : // Checkbox normal para seleccionables
                    estaSeleccionada
                    ? "bg-orange-500 border-orange-500 shadow-md"
                    : theme === "dark"
                      ? "border-gray-600 hover:border-orange-500"
                      : "border-gray-400 hover:border-orange-500"
              }`}
            >
              {estaBloqueada ? (
                // X roja para bloqueadas
                <X className="w-3 h-3 text-red-500 font-bold" />
              ) : (
                estaSeleccionada && (
                  // Check naranja para seleccionadas
                  <Check className="w-3 h-3 text-white font-bold" />
                )
              )}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold line-clamp-2 ${
                    estaBloqueada
                      ? theme === "dark"
                        ? "text-gray-500"
                        : "text-gray-500"
                      : theme === "dark"
                        ? "text-gray-200"
                        : "text-gray-800"
                  }`}
                >
                  {tarea.nombre}
                </span>

                <div className="flex items-center gap-1">
                  {/* ✅ BADGES CORREGIDOS CON LÓGICA EXPLÍCITA */}
                  {estaBloqueada ? (
                    // ❌ SIN DESCRIPCIÓN - Rojo
                    <Badge className="text-[9px] flex-shrink-0 font-bold rounded-full px-1.5 py-0.5 bg-red-500/30 text-red-400 border-red-500/50">
                      <X className="w-2.5 h-2.5 mr-0.5 inline" />
                      SIN DESCRIPCIÓN
                    </Badge>
                  ) : estaExplicada ? (
                    // ✅ EXPLICADA (tiene descripción + queHizo) - Verde
                    <Badge className="text-[9px] flex-shrink-0 font-bold rounded-full px-1.5 py-0.5 bg-green-500/30 text-green-400 border-green-500/50">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 inline" />
                      EXPLICADA
                    </Badge>
                  ) : (
                    // ⚠️ PENDIENTE EXPLICAR (tiene descripción, sin queHizo) - Amarillo
                    <Badge className="text-[9px] flex-shrink-0 font-bold rounded-full px-1.5 py-0.5 bg-amber-500/30 text-amber-400 border-amber-500/50">
                      <Mic className="w-2.5 h-2.5 mr-0.5 inline" />
                      PENDIENTE EXPLICAR
                    </Badge>
                  )}

                  {/* Badge de prioridad */}
                  <Badge
                    variant={
                      tarea.prioridad === "ALTA" ? "destructive" : "secondary"
                    }
                    className={`text-[9px] flex-shrink-0 font-bold rounded-full px-1.5 py-0.5 ${
                      estaBloqueada
                        ? "opacity-50"
                        : tarea.prioridad === "ALTA"
                          ? "bg-red-500/30 text-red-400 border-red-500/50"
                          : theme === "dark"
                            ? "bg-amber-500/30 text-amber-300 border-amber-500/50"
                            : "bg-amber-300 text-amber-900 border-amber-500"
                    }`}
                  >
                    {tarea.prioridad}
                  </Badge>
                </div>
              </div>

              {/* Mostrar descripción si existe */}
              {tieneDescripcion && (
                <div
                  className={`text-[10px] italic ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <FileText className="w-2.5 h-2.5 inline mr-0.5" />
                  <strong>Descripción:</strong>{" "}
                  {tarea.descripcion.substring(0, 100)}
                  {tarea.descripcion.length > 100 && "..."}
                </div>
              )}

              {/* Mostrar queHizo si existe */}
              {tieneQueHizo && (
                <div
                  className={`text-[10px] italic ${
                    theme === "dark" ? "text-green-400" : "text-green-600"
                  }`}
                >
                  <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" />
                  <strong>Qué hiciste:</strong> {tarea.queHizo.substring(0, 100)}
                  {tarea.queHizo.length > 100 && "..."}
                </div>
              )}

              {/* Información de colaboradores y tiempo */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <span
                  className={`flex-shrink-0 font-semibold ${
                    estaBloqueada
                      ? "opacity-50"
                      : theme === "dark"
                        ? "text-gray-400"
                        : "text-gray-600"
                  }`}
                >
                  {esActividadIndividual ? (
                    <>
                      <User className="w-2.5 h-2.5 inline mr-0.5" />
                      Tú solo
                    </>
                  ) : (
                    <>
                      <Users className="w-2.5 h-2.5 inline mr-0.5" />
                      Equipo ({colaboradoresReales.length})
                    </>
                  )}
                </span>

                {!esActividadIndividual && colaboradoresReales.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {colaboradoresReales
                      .slice(0, 2)
                      .map((colaborador: string, idx: number) => {
                        const nombre = colaborador.split("@")[0];
                        return (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                              estaBloqueada
                                ? "opacity-50"
                                : theme === "dark"
                                  ? "bg-[#2a2a2a] text-gray-400"
                                  : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {nombre}
                          </span>
                        );
                      })}
                    {colaboradoresReales.length > 2 && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                          estaBloqueada
                            ? "opacity-50"
                            : theme === "dark"
                              ? "text-gray-400"
                              : "text-gray-600"
                        }`}
                      >
                        +{colaboradoresReales.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Tiempo y estado */}
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${
                      estaBloqueada
                        ? "opacity-50"
                        : theme === "dark"
                          ? "text-gray-400"
                          : "text-gray-600"
                    }`}
                  >
                    {tarea.duracionMin} min
                  </span>
                  {tarea.diasPendiente > 0 && (
                    <span
                      className={`font-semibold ${
                        estaBloqueada
                          ? "opacity-50"
                          : theme === "dark"
                            ? "text-amber-300"
                            : "text-amber-700"
                      }`}
                    >
                      {tarea.diasPendiente}d pendiente
                    </span>
                  )}
                </div>

                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    estaBloqueada
                      ? theme === "dark"
                        ? "bg-gray-700/50 text-gray-500"
                        : "bg-gray-300 text-gray-600"
                      : estaExplicada
                        ? theme === "dark"
                          ? "bg-green-500/40 text-green-200"
                          : "bg-green-300 text-green-900"
                        : theme === "dark"
                          ? "bg-amber-500/40 text-amber-200"
                          : "bg-amber-300 text-amber-900"
                  }`}
                >
                  <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                  {estaBloqueada
                    ? "BLOQUEADA"
                    : estaExplicada
                      ? "EXPLICADA"
                      : "POR EXPLICAR"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    const countSeleccionadas = tareasSeleccionadas ? tareasSeleccionadas.size : 0;
    const todasSeleccionadas = countSeleccionadas === totalTareasPendientes;
    const esTrabajoEnEquipo = todosColaboradores.length > 1;
    const nombreUsuario = currentUserEmail.includes("@")
      ? currentUserEmail.split("@")[0]
      : currentUserEmail;

    const esTurnoTarde = turno === "tarde";

    const handleMainAction = () => {
      if (esHoraReporte) {
        onOpenReport?.();
      } else {
        if (countSeleccionadas === 0) {
          console.warn(
            "Por favor selecciona al menos una tarea pendiente para explicar",
          );
          return;
        }
        if (esTurnoTarde && onOpenReporteModal) {
          onOpenReporteModal();
        } else {
          onExplicarTareasSeleccionadas();
        }
      }
    };

    const handleContinuarChat = () => {
      if (onStartVoiceMode) {
        onStartVoiceMode();
      } else {
        console.warn("onStartVoiceMode no está definido");
      }
    };

    return (
      <div
        className={`p-2.5 border-t ${
          theme === "dark"
            ? "border-orange-900/50 bg-gradient-to-r from-[#2a2a2a] to-[#1f1f1f]"
            : "border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50"
        }`}
      >
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px]">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-bold ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}
                >
                  {totalTareasPendientes} pendiente
                  {totalTareasPendientes !== 1 ? "s" : ""}
                </span>
                {mostrandoReportesDeOtros ? (
                  <div className="flex gap-1">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        theme === "dark"
                          ? "bg-orange-500/30 text-orange-200"
                          : "bg-orange-300 text-orange-900"
                      }`}
                    >
                      De otros: {tareasReportadasPorOtros}
                    </span>
                    {estadisticasServidor?.tareasUsuario !== undefined && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          theme === "dark"
                            ? "bg-gray-700 text-gray-300"
                            : "bg-gray-300 text-gray-800"
                        }`}
                      >
                        Tú: {estadisticasServidor.tareasUsuario}
                      </span>
                    )}
                  </div>
                ) : (
                  totalTareasReportadas > 0 && (
                    <div className="flex gap-1">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          theme === "dark"
                            ? "bg-green-500/30 text-green-200"
                            : "bg-green-300 text-green-900"
                        }`}
                      >
                        {tareasReportadasPorMi} mías
                      </span>
                      {tareasReportadasPorOtros > 0 && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            theme === "dark"
                              ? "bg-orange-500/30 text-orange-200"
                              : "bg-orange-300 text-orange-900"
                          }`}
                        >
                          {tareasReportadasPorOtros} de otros
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>

              {!esHoraReporte && countSeleccionadas > 0 && (
                <span
                  className={`text-[9px] flex items-center gap-0.5 font-bold ${
                    theme === "dark" ? "text-orange-300" : "text-orange-700"
                  }`}
                >
                  <CheckSquare className="w-2.5 h-2.5" />
                  {countSeleccionadas} seleccionada
                  {countSeleccionadas !== 1 ? "s" : ""}
                </span>
              )}

              {currentUserEmail && (
                <span
                  className={`text-[9px] font-semibold ${theme === "dark" ? "text-gray-500" : "text-gray-600"}`}
                >
                  {nombreUsuario}
                  {mostrandoReportesDeOtros && " (No tienes reportes propios)"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {mostrandoReportesDeOtros ? (
                <Badge
                  variant="outline"
                  className={`text-[9px] px-2 py-0.5 flex items-center gap-0.5 font-bold rounded-full ${
                    theme === "dark"
                      ? "bg-orange-500/20 text-orange-200 border-orange-500/50"
                      : "bg-orange-200 text-orange-900 border-orange-400"
                  }`}
                >
                  <UsersIcon className="w-2.5 h-2.5" />
                  Trabajo colaborativo
                </Badge>
              ) : esTrabajoEnEquipo ? (
                <Badge
                  variant="outline"
                  className={`text-[9px] px-2 py-0.5 flex items-center gap-0.5 font-bold rounded-full ${
                    theme === "dark"
                      ? "bg-green-500/20 text-green-200 border-green-500/50"
                      : "bg-green-200 text-green-900 border-green-400"
                  }`}
                >
                  <UsersIcon className="w-2.5 h-2.5" />
                  Equipo ({todosColaboradores.length})
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className={`text-[9px] px-2 py-0.5 flex items-center gap-0.5 font-bold rounded-full ${
                    theme === "dark"
                      ? "bg-blue-500/20 text-blue-200 border-blue-500/50"
                      : "bg-blue-200 text-blue-900 border-blue-400"
                  }`}
                >
                  <UserIcon className="w-2.5 h-2.5" />
                  Individual
                </Badge>
              )}
            </div>
          </div>

          {!esHoraReporte && totalTareasPendientes > 0 && (
            <div className="flex gap-1.5">
              <Button
                onClick={
                  todasSeleccionadas ? onDeseleccionarTodas : onSeleccionarTodas
                }
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                {todasSeleccionadas
                  ? "Deseleccionar todas"
                  : "Seleccionar con descripción"}
              </Button>
              {onRecargar && (
                <Button
                  onClick={onRecargar}
                  size="sm"
                  variant="ghost"
                  disabled={isLoading}
                  className="h-7 w-7 p-0 hover:bg-orange-500/20"
                  title="Recargar tareas reportadas"
                >
                  <RefreshCw
                    className={`w-3 h-3 text-orange-500 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-1.5">
            <Button
              onClick={handleMainAction}
              size="sm"
              className={`flex-1 text-white text-[11px] h-8 font-bold rounded-lg shadow-md ${
                countSeleccionadas === 0 && !esHoraReporte
                  ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              }`}
              disabled={!esHoraReporte && countSeleccionadas === 0}
            >
              {esHoraReporte ? (
                <>
                  <ClipboardList className="w-3.5 h-3.5 mr-1" />
                  Iniciar Reporte
                </>
              ) : esTurnoTarde ? (
                <>
                  <Mic className="w-3.5 h-3.5 mr-1" />
                  Explicar Tareas{" "}
                  {countSeleccionadas > 0 && `(${countSeleccionadas})`}
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 mr-1" />
                  Reportar Tareas{" "}
                  {countSeleccionadas > 0 && `(${countSeleccionadas})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="animate-in slide-in-from-bottom-2 duration-300 flex justify-center">
        <div
          className={`p-4 rounded-lg border text-center shadow-md ${
            theme === "dark"
              ? "bg-gradient-to-br from-[#1a1a1a] to-[#252527] border-orange-900/50"
              : "bg-gradient-to-br from-white to-orange-50 border-orange-300"
          }`}
        >
          {mostrandoReportesDeOtros && estadisticasServidor ? (
            <>
              <Users className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <h4
                className={`font-bold mb-1 text-sm flex items-center justify-center gap-1.5 ${
                  theme === "dark" ? "text-orange-300" : "text-orange-800"
                }`}
              >
                <Sunset className="w-4 h-4" />
                Reportes del equipo
              </h4>
              <p
                className={`text-xs mb-2 font-medium ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {nombreUsuario}, no tienes tareas reportadas, pero hay{" "}
                {estadisticasServidor.tareasColaboradores || 0}
                reporte{estadisticasServidor.tareasColaboradores !== 1
                  ? "s"
                  : ""}{" "}
                de otros colaboradores.
              </p>
              <div
                className={`text-[10px] p-2 rounded-lg mb-2 ${
                  theme === "dark"
                    ? "bg-orange-900/30 text-orange-200 border border-orange-700/50"
                    : "bg-orange-100 text-orange-800 border border-orange-300"
                }`}
              >
                {estadisticasServidor.mensaje || "Trabajo colaborativo"}
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h4
                className={`font-bold mb-1 text-sm ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}
              >
                Todas las tareas reportadas
              </h4>
              <p
                className={`text-xs mb-2 font-medium ${
                  theme === "dark" ? "text-gray-500" : "text-gray-600"
                }`}
              >
                {nombreUsuario}, no hay tareas pendientes por reportar.
              </p>
            </>
          )}
          {onRecargar && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRecargar}
              className="text-[10px] font-bold bg-transparent hover:bg-orange-500/20 rounded-lg h-7"
            >
              <RefreshCw className="w-2.5 h-2.5 mr-1" />
              Recargar tareas
            </Button>
          )}
        </div>
      </div>
    );
  }

  interface TypingIndicatorProps {
    theme: "light" | "dark";
  }

  export function TypingIndicator({ theme }: TypingIndicatorProps) {
    return (
      <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
        <div
          className={`rounded-lg px-3 py-2 flex items-center gap-1.5 shadow-md ${
            theme === "dark"
              ? "bg-gradient-to-r from-orange-900/50 to-amber-900/50 text-white"
              : "bg-gradient-to-r from-orange-100 to-amber-100 text-gray-900"
          }`}
        >
          <Sunset className="w-3 h-3 text-orange-500" />
          <div className="flex gap-0.5">
            {[0, 150, 300].map((delay) => (
              <div
                key={delay}
                className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // TasksPanel para exportar
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
      <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-2.5">
        <div
          className={`w-full max-w-xl rounded-lg border overflow-hidden shadow-md ${
            theme === "dark"
              ? "bg-gradient-to-b from-[#1a1a1a] to-[#252527] border-orange-900/50"
              : "bg-gradient-to-b from-white to-orange-50/30 border-orange-200"
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
