"use client";

import {
  Bot,
  Target,
  CheckCircle2,
  ListChecks,
  Headphones,
  Users,
  User,
  CheckSquare,
  Check,
  UsersIcon,
  UserIcon,
  AlertCircle,
  FileText,
  Clock,
  MessageSquare,
  RefreshCw,
  Calendar,
  UserCheck,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageItem } from "./MessageItem";
import { MessageListProps } from "@/lib/types";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";

interface ExtendedMessageListProps extends MessageListProps {
  onStartVoiceModeWithTasks?: (selectedTaskIds: string[]) => void;
  onStartVoiceMode?: () => void;
  onReportCompleted?: () => void;
  userEmail?: string;
}

export function MessageList({
  messages,
  isTyping,
  theme,
  onVoiceMessageClick,
  scrollRef,
  assistantAnalysis,
  onStartVoiceModeWithTasks,
  onStartVoiceMode,
  onReportCompleted,
  userEmail
}: ExtendedMessageListProps) {
  // ========== ESTADOS ==========
  const [tareasConDescripcion] = useState<Set<string>>(new Set());
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<Set<string>>(new Set());
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [mensajeAlerta, setMensajeAlerta] = useState("");
  const [tasksPanelMostrado, setTasksPanelMostrado] = useState(false);
  const [tareasReportadasMap, setTareasReportadasMap] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [ultimoReporteEnviado, setUltimoReporteEnviado] = useState<number>(0);
  const [mostrandoReportesDeOtros, setMostrandoReportesDeOtros] = useState(false);
  const [estadisticasServidor, setEstadisticasServidor] = useState<any>(null);

  // Ref para controlar si ya estamos actualizando
  const actualizandoRef = useRef(false);

  // ✅ USA userEmail DIRECTAMENTE:
  const currentUserEmail = userEmail || localStorage.getItem('userEmail') || "";
  console.log('📧 Email del usuario actual:', currentUserEmail);

  // Actualizar la hora cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Función para mostrar alerta
  const mostrarAlertaMensaje = useCallback((mensaje: string) => {
    setMensajeAlerta(mensaje);
    setMostrarAlerta(true);
    setTimeout(() => setMostrarAlerta(false), 5000);
  }, []);

  // ✅ Función para procesar tareas reportadas (VERSIÓN MEJORADA)
  const procesarTareasReportadas = useCallback((nuevasTareasReportadas: any[], metadata: any = null) => {
    console.log('🔄 Procesando NUEVAS tareas reportadas:', nuevasTareasReportadas.length);

    if (metadata) {
      console.log('📊 Metadata del servidor:', metadata);
      setEstadisticasServidor(metadata);

      // Determinar si estamos mostrando reportes de otros
      const tieneReportesPropios = metadata.tieneReportesPropios || false;
      const tieneReportesColaborativos = metadata.tieneReportesColaborativos || false;

      if (!tieneReportesPropios && tieneReportesColaborativos) {
        setMostrandoReportesDeOtros(true);
        console.log('👥 Mostrando reportes de otros colaboradores (no tiene propios)');
      } else {
        setMostrandoReportesDeOtros(false);
      }
    }

    if (nuevasTareasReportadas.length === 0) {
      console.log('⚠️ No hay nuevas tareas para procesar');
      return;
    }

    if (nuevasTareasReportadas.length > 0) {
      console.log('📋 Ejemplo de tarea recibida:', {
        tarea: nuevasTareasReportadas[0].tarea,
        reportadoPor: nuevasTareasReportadas[0].reportadoPor,
        esMiReporte: nuevasTareasReportadas[0].esMiReporte
      });
    }

    // 📌 ACTUALIZAR el mapa existente, NO reemplazarlo
    setTareasReportadasMap(mapActual => {
      const nuevoMap = new Map(mapActual); // ✅ COPIA el mapa existente
      let nuevasAgregadas = 0;
      let actualizadas = 0;

      nuevasTareasReportadas.forEach((item: any, index: number) => {
        const tareaId = item.pendienteId || item.id || `tarea-${index}`;

        if (!tareaId) {
          console.warn('⚠️ Item sin ID:', item);
          return;
        }

        // 📌 DETERMINAR QUIÉN REPORTÓ ESTA TAREA (CON LA DATA DEL SERVIDOR)
        let reportadoPor = item.reportadoPor?.nombre || item.reportadoPor || "Usuario";
        let emailReportado = item.reportadoPor?.email || item.emailEncontrado || item.userEmail || "";
        let esMiReporte = item.esMiReporte || false;

        // Si el servidor no proporcionó estos datos, calcularlos
        if (!emailReportado && currentUserEmail) {
          // Intentar extraer del email encontrado en otras propiedades
          const emailEncontrado =
            item.emailEncontrado ||
            item.emailUsuario ||
            item.emailReportado ||
            item.userEmail ||
            item.actualizadoPor;

          if (emailEncontrado) {
            emailReportado = emailEncontrado;
            esMiReporte = currentUserEmail.toLowerCase() === emailEncontrado.toLowerCase();
            reportadoPor = emailReportado.split('@')[0];
          } else {
            // Asumir que es del usuario actual si no hay información
            emailReportado = currentUserEmail;
            esMiReporte = true;
            reportadoPor = currentUserEmail.split('@')[0];
          }
        }

        // Verificar si ya existe esta tarea en el mapa
        const tareaExistente = mapActual.get(tareaId);

        if (tareaExistente) {
          // 📌 ACTUALIZAR tarea existente si es más reciente
          const fechaExistente = new Date(tareaExistente.fechaReporte).getTime();
          const fechaNueva = new Date(item.fecha || item.fechaReporte || new Date()).getTime();

          if (fechaNueva > fechaExistente) {
            // Actualizar con datos más recientes
            nuevoMap.set(tareaId, {
              ...tareaExistente,
              texto: item.texto || item.explicacion || item.descripcion || tareaExistente.texto,
              fechaReporte: item.fecha || item.fechaReporte || tareaExistente.fechaReporte,
              estado: item.estado || tareaExistente.estado,
              reportadoPor: reportadoPor,
              emailReportado: emailReportado,
              esMiReporte: esMiReporte,
              esReporteColaborativo: item.esReporteColaborativo || (!esMiReporte),
              _raw: item
            });
            actualizadas++;
            console.log(`📝 Tarea ${tareaId} ACTUALIZADA (Reportado por: ${reportadoPor}, Es mío: ${esMiReporte})`);
          } else {
            console.log(`⏭️  Tarea ${tareaId} ya existe (más reciente), omitiendo`);
          }
        } else {
          // 📌 AGREGAR nueva tarea
          nuevoMap.set(tareaId, {
            id: tareaId,
            pendienteId: tareaId,
            nombreTarea: item.tarea || item.nombreTarea || item.nombre || "Tarea sin nombre",
            explicacion: item.texto || item.explicacion || item.descripcion || "",
            reportadoPor: reportadoPor,
            emailReportado: emailReportado,
            esMiReporte: esMiReporte,
            esReporteColaborativo: item.esReporteColaborativo || (!esMiReporte),
            fechaReporte: item.fecha || item.fechaReporte || item.updatedAt || new Date(),
            actividadTitulo: item.actividad || item.actividadTitulo || "Actividad",
            duracionMin: item.duracionMin || 0,
            estado: item.estado || "reportado",
            texto: item.texto || item.explicacion || item.descripcion || "",
            _raw: item
          });
          nuevasAgregadas++;
          console.log(`➕ Tarea ${tareaId} AGREGADA (Reportado por: ${reportadoPor}, Es mío: ${esMiReporte})`);
        }
      });

      const misReportes = Array.from(nuevoMap.values()).filter(t => t.esMiReporte).length;
      const reportesDeOtros = Array.from(nuevoMap.values()).filter(t => !t.esMiReporte).length;

      console.log('✅ Mapa actualizado:', {
        totalAntes: mapActual.size,
        totalDespues: nuevoMap.size,
        nuevasAgregadas: nuevasAgregadas,
        actualizadas: actualizadas,
        misReportes: misReportes,
        reportesDeOtros: reportesDeOtros,
        mostrandoReportesDeOtros: mostrandoReportesDeOtros
      });

      return nuevoMap;
    });

  }, [currentUserEmail, mostrandoReportesDeOtros]);

  // ✅ Función para cargar tareas reportadas (VERSIÓN CON METADATA)
  const cargarTareasReportadas = useCallback(async (esForzado: boolean = false) => {
    if (!currentUserEmail) {
      console.warn('⚠️ No hay email para cargar tareas reportadas');
      return;
    }

    // Evitar múltiples llamadas simultáneas
    if (actualizandoRef.current && !esForzado) {
      console.log('⏳ Ya se está actualizando, omitiendo...');
      return;
    }

    setIsLoading(true);
    actualizandoRef.current = true;

    try {
      console.log('🔄 Cargando tareas reportadas para:', currentUserEmail);

      const url = `http://localhost:4000/api/v1/reportes/tareas-reportadas?email=${encodeURIComponent(currentUserEmail)}&limit=100`;
      console.log('🌐 URL llamada:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Datos recibidos del servidor:', {
        success: data.success,
        count: data.count || 0,
        metadata: data.metadata,
        info: data.info
      });

      const tareasData = data.data || data.tareas || data.resultados || [];
      const metadata = data.metadata || data.info || {};

      if (Array.isArray(tareasData) && tareasData.length > 0) {
        procesarTareasReportadas(tareasData, metadata);

        if (esForzado) {
          const mensaje = metadata.mensaje || `✅ ${tareasData.length} tarea(s) cargada(s)`;
          setTimeout(() => {
            mostrarAlertaMensaje(mensaje);
          }, 500);
        }
      } else {
        console.log('ℹ️ No se encontraron tareas reportadas');
        // Pasar metadata incluso si no hay datos
        procesarTareasReportadas([], metadata);

        if (esForzado) {
          const totalActual = tareasReportadasMap.size;
          const mensaje = metadata.mensaje ||
            (totalActual > 0
              ? `ℹ️ No hay nuevas tareas. Tienes ${totalActual} en historial`
              : "ℹ️ No tienes tareas reportadas aún");
          mostrarAlertaMensaje(mensaje);
        }
      }
    } catch (error) {
      console.error('❌ Error cargando tareas reportadas:', error);
      if (esForzado) {
        mostrarAlertaMensaje("⚠️ No se pudieron cargar las tareas reportadas");
      }
      // ❌ IMPORTANTE: NO limpiamos el mapa si hay error
    } finally {
      setIsLoading(false);
      actualizandoRef.current = false;
    }
  }, [currentUserEmail, procesarTareasReportadas, mostrarAlertaMensaje, tareasReportadasMap]);

  // ✅ Cargar tareas reportadas cuando haya email y assistantAnalysis
  useEffect(() => {
    if (currentUserEmail && assistantAnalysis) {
      console.log('🎯 AssistantAnalysis recibido, cargando tareas reportadas...');
      cargarTareasReportadas(false);
    }
  }, [assistantAnalysis, cargarTareasReportadas, currentUserEmail]);

  // ✅ Filtrar actividades con tareas pendientes
  const actividadesConTareas = useMemo(() => {
    if (!assistantAnalysis?.data?.revisionesPorActividad) {
      console.log('❌ No hay revisionesPorActividad en assistantAnalysis');
      return [];
    }

    console.log('📊 Procesando revisiones por actividad:', assistantAnalysis.data.revisionesPorActividad.length);

    return assistantAnalysis.data.revisionesPorActividad
      .map((revision: any) => {
        const colaboradoresReales = revision.colaboradores ||
          revision.colaboradoresInvolucrados ||
          assistantAnalysis.colaboradoresInvolucrados ||
          [];

        // ✅ TAREAS YA REPORTADAS (TUS REPORTES + REPORTES DE OTROS)
        const tareasReportadas = revision.tareasConTiempo.filter(
          (tarea: any) => {
            const reporte = Array.from(tareasReportadasMap.values()).find(
              (r) => {
                const coincidePorId = r.pendienteId === tarea.id;
                const coincidePorNombre = r.nombreTarea === tarea.nombre;
                return coincidePorId || coincidePorNombre;
              }
            );
            return !!reporte;
          }
        );

        // ✅ TAREAS NO REPORTADAS (PENDIENTES)
        const tareasNoReportadas = revision.tareasConTiempo.filter(
          (tarea: any) => {
            const estaReportada = Array.from(tareasReportadasMap.values()).some(
              (r) => {
                const coincidePorId = r.pendienteId === tarea.id;
                const coincidePorNombre = r.nombreTarea === tarea.nombre;
                return coincidePorId || coincidePorNombre;
              }
            );
            const tieneDescripcion = tareasConDescripcion.has(tarea.id);
            return !estaReportada && !tieneDescripcion;
          }
        );

        return {
          ...revision,
          colaboradoresReales,
          esActividadIndividual: colaboradoresReales.length <= 1,
          tareasReportadas, // ✅ TODAS las tareas reportadas (mías y de otros)
          tareasNoReportadas, // ✅ Solo las NO reportadas
        };
      })
      .filter((revision: any) =>
        revision.tareasReportadas.length > 0 ||
        revision.tareasNoReportadas.length > 0
      );
  }, [assistantAnalysis, tareasConDescripcion, tareasReportadasMap]);

  // ✅ Calcular estadísticas
  const estadisticas = useMemo(() => {
    const todasTareasReportadas = actividadesConTareas.flatMap(a => a.tareasReportadas);
    
    const totalReportadasPorMi = todasTareasReportadas.filter((tarea: any) => {
      const reporte = Array.from(tareasReportadasMap.values()).find(
        (r) => {
          const coincidePorId = r.pendienteId === tarea.id;
          const coincidePorNombre = r.nombreTarea === tarea.nombre;
          return (coincidePorId || coincidePorNombre) && r.esMiReporte;
        }
      );
      return !!reporte;
    }).length;

    const totalReportadasPorOtros = todasTareasReportadas.filter((tarea: any) => {
      const reporte = Array.from(tareasReportadasMap.values()).find(
        (r) => {
          const coincidePorId = r.pendienteId === tarea.id;
          const coincidePorNombre = r.nombreTarea === tarea.nombre;
          return (coincidePorId || coincidePorNombre) && !r.esMiReporte;
        }
      );
      return !!reporte;
    }).length;

    const totalNoReportadas = actividadesConTareas.reduce(
      (sum, actividad) => sum + actividad.tareasNoReportadas.length, 0
    );

    return {
      totalReportadasPorMi,
      totalReportadasPorOtros,
      totalReportadas: totalReportadasPorMi + totalReportadasPorOtros,
      totalNoReportadas,
      totalTareas: totalReportadasPorMi + totalReportadasPorOtros + totalNoReportadas,
    };
  }, [actividadesConTareas, tareasReportadasMap]);

  const hayTareas = actividadesConTareas.length > 0;

  // ✅ Resetear tasksPanelMostrado cuando cambia el assistantAnalysis
  useEffect(() => {
    if (assistantAnalysis && !tasksPanelMostrado) {
      console.log('🎬 Mostrando TasksPanel por primera vez');
      setTasksPanelMostrado(true);
    }
  }, [assistantAnalysis, tasksPanelMostrado]);

  // ✅ Auto-scroll cuando hay nuevas tareas
  useEffect(() => {
    if (!assistantAnalysis || !hayTareas || !scrollRef.current) return;

    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [assistantAnalysis, hayTareas, scrollRef]);

  // ✅ Función para toggle de selección de tarea
  const toggleSeleccionTarea = useCallback((tarea: any) => {
    const tareaId = tarea.id;
    const tareaNombre = tarea.nombre;

    console.log('🎯 Intentando seleccionar tarea:', { tareaId, tareaNombre });

    // ✅ VERIFICAR si la tarea ya fue reportada por ALGUIEN
    const reporte = Array.from(tareasReportadasMap.values()).find(
      (r) => {
        const coincidePorId = r.pendienteId === tareaId;
        const coincidePorNombre = r.nombreTarea === tarea.nombre;
        return coincidePorId || coincidePorNombre;
      }
    );

    if (reporte) {
      console.log('⚠️ Tarea ya reportada:', reporte);
      if (reporte.esMiReporte) {
        mostrarAlertaMensaje(`✅ Ya reportaste esta tarea: "${reporte.nombreTarea}"`);
      } else {
        const nombreReportante = reporte.reportadoPor || "otro colaborador";
        mostrarAlertaMensaje(`📋 "${reporte.nombreTarea}" ya fue reportada por ${nombreReportante}`);
      }
      return; // ✅ NO PERMITIR seleccionar
    }

    // ✅ Solo permite seleccionar si NO está reportada
    setTareasSeleccionadas(prev => {
      const nuevasSeleccionadas = new Set(prev);
      if (nuevasSeleccionadas.has(tareaId)) {
        nuevasSeleccionadas.delete(tareaId);
        console.log('➖ Tarea deseleccionada:', tareaId);
      } else {
        nuevasSeleccionadas.add(tareaId);
        console.log('➕ Tarea seleccionada:', tareaId);
      }
      return nuevasSeleccionadas;
    });
  }, [tareasReportadasMap, mostrarAlertaMensaje]);

  // ✅ Función para seleccionar todas las tareas NO REPORTADAS
  const seleccionarTodasTareas = useCallback(() => {
    const todasTareasIds = actividadesConTareas
      .flatMap(actividad => actividad.tareasNoReportadas.map((t: any) => t.id));

    console.log('🎯 Seleccionando todas las tareas pendientes:', todasTareasIds.length);
    
    if (todasTareasIds.length === 0) {
      mostrarAlertaMensaje("✅ No hay tareas pendientes por reportar");
      return;
    }
    
    setTareasSeleccionadas(new Set(todasTareasIds));
    mostrarAlertaMensaje(`✅ ${todasTareasIds.length} tareas pendientes seleccionadas`);
  }, [actividadesConTareas, mostrarAlertaMensaje]);

  // ✅ Función para deseleccionar todas
  const deseleccionarTodasTareas = useCallback(() => {
    setTareasSeleccionadas(new Set());
    console.log('🔄 Todas las tareas deseleccionadas');
    mostrarAlertaMensaje("🔄 Todas las tareas deseleccionadas");
  }, [mostrarAlertaMensaje]);

  // ✅ Función para explicar tareas seleccionadas (ACTUALIZADA)
  const handleExplicarTareasSeleccionadas = useCallback(async () => {
    if (tareasSeleccionadas.size === 0) {
      mostrarAlertaMensaje("⚠️ Por favor selecciona al menos una tarea pendiente para explicar");
      return;
    }

    console.log('🚀 Iniciando reporte de tareas seleccionadas:', {
      total: tareasSeleccionadas.size,
      tareas: Array.from(tareasSeleccionadas)
    });

    // Marcamos el tiempo del último reporte
    setUltimoReporteEnviado(Date.now());

    if (onStartVoiceModeWithTasks) {
      onStartVoiceModeWithTasks(Array.from(tareasSeleccionadas));
      mostrarAlertaMensaje(`🎤 Iniciando reporte de ${tareasSeleccionadas.size} tarea${tareasSeleccionadas.size !== 1 ? 's' : ''}`);

      // ✅ PROGRAMAR ACTUALIZACIÓN DESPUÉS DE 3 SEGUNDOS
      setTimeout(() => {
        console.log('🔄 Actualizando tareas reportadas después del reporte...');
        cargarTareasReportadas(true);

        if (onReportCompleted) {
          onReportCompleted();
        }

        // Limpiar selección
        setTareasSeleccionadas(new Set());

        // Mostrar mensaje de éxito
        setTimeout(() => {
          mostrarAlertaMensaje(`✅ Reporte enviado. Las tareas se actualizarán en segundos...`);
        }, 1000);
      }, 3000); // Esperar 3 segundos para que se procese el reporte

    } else if (onStartVoiceMode) {
      console.warn("⚠️ Usando onStartVoiceMode (fallback)");
      onStartVoiceMode();
      mostrarAlertaMensaje(`🎤 Modo voz iniciado con ${tareasSeleccionadas.size} tarea${tareasSeleccionadas.size !== 1 ? 's' : ''} seleccionada${tareasSeleccionadas.size !== 1 ? 's' : ''}`);
    }
  }, [tareasSeleccionadas, onStartVoiceModeWithTasks, onStartVoiceMode, onReportCompleted, cargarTareasReportadas, mostrarAlertaMensaje]);

  // ✅ Función para recargar tareas reportadas
  const handleRecargarTareas = useCallback(() => {
    console.log('🔄 Recargando tareas reportadas manualmente...');
    cargarTareasReportadas(true);
  }, [cargarTareasReportadas]);

  // ✅ Sincronizar automáticamente cada 30 segundos (solo si hay reportes recientes)
  useEffect(() => {
    if (ultimoReporteEnviado > 0) {
      const interval = setInterval(() => {
        const tiempoDesdeUltimoReporte = Date.now() - ultimoReporteEnviado;
        // Solo sincronizar si ha pasado menos de 5 minutos desde el último reporte
        if (tiempoDesdeUltimoReporte < 5 * 60 * 1000) {
          console.log('⏰ Sincronización automática de tareas reportadas...');
          cargarTareasReportadas(false);
        }
      }, 30000); // Cada 30 segundos

      return () => clearInterval(interval);
    }
  }, [ultimoReporteEnviado, cargarTareasReportadas]);

  // ========== RENDER ==========

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* ✅ Alerta flotante */}
      {mostrarAlerta && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${theme === 'dark'
            ? 'bg-gray-800 text-white border border-gray-700'
            : 'bg-white text-gray-800 border border-gray-200'
            }`}>
            <AlertCircle className="w-5 h-5 text-[#6841ea]" />
            <span className="text-sm">{mensajeAlerta}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 p-1 h-auto"
              onClick={() => setMostrarAlerta(false)}
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* ✅ BANNER ESPECIAL SI SOLO HAY REPORTES DE OTROS */}
      {mostrandoReportesDeOtros && estadisticasServidor && (
        <div className={`p-3 rounded-lg mb-3 border ${theme === 'dark'
          ? 'bg-purple-900/20 border-purple-700/30'
          : 'bg-purple-50 border-purple-200'}`}>
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className={`font-medium text-sm mb-1 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
                📢 Reportes del equipo
              </h4>
              <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-purple-200' : 'text-purple-600'}`}>
                {estadisticasServidor.mensaje || "No tienes reportes propios, pero hay reportes de otros colaboradores en tus actividades."}
              </p>
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className={`px-2 py-1 rounded ${theme === 'dark'
                  ? 'bg-purple-800/40 text-purple-300'
                  : 'bg-purple-100 text-purple-700'}`}>
                  👤 Tú: {currentUserEmail.split('@')[0]}
                </span>
                <span className={`px-2 py-1 rounded ${theme === 'dark'
                  ? 'bg-blue-800/40 text-blue-300'
                  : 'bg-blue-100 text-blue-700'}`}>
                  📋 {estadisticasServidor.tareasColaboradores || 0} reportes de otros
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de mensajes */}
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          theme={theme}
          onVoiceMessageClick={onVoiceMessageClick}
        />
      ))}

      {/* Indicador de typing */}
      {isTyping && <TypingIndicator theme={theme} />}

      {/* ✅ TasksPanel con las tareas seleccionadas */}
      {hayTareas && assistantAnalysis && tasksPanelMostrado && (
        <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-4">
          <div
            className={`w-full max-w-xl rounded-lg border overflow-hidden ${theme === "dark"
              ? "bg-[#1a1a1a] border-[#2a2a2a]"
              : "bg-white border-gray-200"
              }`}
          >
            {/* Header */}
            <div className={`px-3 py-2 border-b bg-[#6841ea]/10 flex justify-between items-center ${theme === "dark"
              ? "border-[#2a2a2a]"
              : "border-gray-200"
              }`}>
              <div className="flex items-center gap-3">
                <h4 className={`font-medium text-xs flex items-center gap-2 uppercase tracking-wide ${theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}>
                  <Target className="w-4 h-4 text-[#6841ea]" />
                  Tareas ({estadisticas.totalTareas})
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === "dark"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-green-100 text-green-700"
                    }`}>
                    {estadisticas.totalReportadas} reportadas
                  </span>
                  {mostrandoReportesDeOtros && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === "dark"
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-purple-100 text-purple-700"
                      }`}>
                      👥 De otros
                    </span>
                  )}
                </h4>

                {/* Botón de recargar con indicador de actividad */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRecargarTareas}
                  disabled={isLoading}
                  className="h-6 w-6 p-0"
                  title="Recargar tareas reportadas"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <Badge
                variant="secondary"
                className="text-[10px] bg-[#6841ea] text-white border-none"
              >
                SELECCIONAR
              </Badge>
            </div>

            {/* ✅ Mensaje de instrucción */}
            <div className="p-3">
              <div className={`text-sm p-3 rounded mb-3 ${theme === "dark"
                ? mostrandoReportesDeOtros
                  ? "bg-purple-900/30 text-purple-300"
                  : "bg-blue-900/30 text-blue-300"
                : mostrandoReportesDeOtros
                  ? "bg-purple-50 text-purple-700"
                  : "bg-blue-50 text-blue-700"
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  {mostrandoReportesDeOtros ? (
                    <>
                      <Users className="w-4 h-4" />
                      <strong>Trabajo colaborativo ({estadisticasServidor?.tareasColaboradores || 0} reportes)</strong>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <strong>Tareas Pendientes: {estadisticas.totalNoReportadas}</strong>
                    </>
                  )}
                  {!mostrandoReportesDeOtros && (
                    <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-700 rounded">
                      Por reportar
                    </span>
                  )}
                </div>
                <span className="block text-xs mt-1 opacity-80">
                  {mostrandoReportesDeOtros ? (
                    <>
                      <strong>Tú:</strong> {currentUserEmail ? currentUserEmail.split('@')[0] : 'Usuario'}
                      <span className="ml-2">•</span> No tienes reportes propios, pero hay reportes de otros colaboradores.
                    </>
                  ) : (
                    <>
                      {estadisticas.totalReportadasPorMi > 0 &&
                        `Tienes ${estadisticas.totalReportadasPorMi} tarea(s) reportada(s). `}
                      {estadisticas.totalReportadasPorOtros > 0 &&
                        `${estadisticas.totalReportadasPorOtros} tarea(s) reportada(s) por otros. `}
                      <br />
                      <strong>Tú:</strong> {currentUserEmail ? currentUserEmail.split('@')[0] : 'Usuario'}
                    </>
                  )}
                </span>
              </div>

              {/* Lista de actividades */}
              <div className="space-y-4">
                {actividadesConTareas.map((revision, idx) => {
                  const actividad = assistantAnalysis.data.actividades.find(
                    (act: any) => act.id === revision.actividadId,
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
                      todosColaboradores={assistantAnalysis.colaboradoresInvolucrados || []}
                      tareasReportadasMap={tareasReportadasMap}
                      currentUserEmail={currentUserEmail}
                      mostrandoReportesDeOtros={mostrandoReportesDeOtros}
                    />
                  );
                })}
              </div>
            </div>

            {/* Footer con acciones */}
            <TasksPanelFooter
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
              todosColaboradores={assistantAnalysis.colaboradoresInvolucrados || []}
              onRecargar={handleRecargarTareas}
              isLoading={isLoading}
              currentUserEmail={currentUserEmail}
              mostrandoReportesDeOtros={mostrandoReportesDeOtros}
              estadisticasServidor={estadisticasServidor}
            />
          </div>
        </div>
      )}

      {/* ✅ Mensaje cuando no hay tareas */}
      {!hayTareas && assistantAnalysis && (
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
      "bg-blue-500/20 text-blue-500",
      "bg-purple-500/20 text-purple-500",
      "bg-pink-500/20 text-pink-500",
    ];
    return colors[index % 3];
  }, [index]);

  const colaboradoresReales = revision.colaboradoresReales || revision.colaboradores || [];
  const esActividadIndividual = revision.esActividadIndividual || colaboradoresReales.length <= 1;

  return (
    <div
      className={`p-3 rounded-lg ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"
        }`}
    >
      {/* Header de actividad */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${badgeColor}`}
          >
            {index + 1}
          </div>
          <div className="max-w-[70%]">
            <h5 className={`font-medium text-sm line-clamp-2 ${theme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>
              {actividad.titulo}
            </h5>
            {/* 📌 Indicador del usuario actual */}
            {currentUserEmail && (
              <span className={`text-[10px] ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}>
                Tú: {currentUserEmail.split('@')[0]}
              </span>
            )}
            {mostrandoReportesDeOtros && (
              <span className={`text-[10px] block mt-1 ${theme === "dark" ? "text-purple-300" : "text-purple-600"}`}>
                👥 Mostrando reportes de otros colaboradores
              </span>
            )}
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-xs flex-shrink-0 ${theme === "dark"
            ? "border-[#2a2a2a] text-gray-400"
            : "border-gray-300 text-gray-600"
            }`}
        >
          {actividad.horario}
        </Badge>
      </div>

      {/* ✅ INDICADOR DE TIPO DE TRABAJO */}
      <div className="ml-8 mb-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {esActividadIndividual ? (
              <Badge
                variant="secondary"
                className={`text-[10px] px-2 py-0.5 flex items-center gap-1 ${theme === "dark"
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-blue-100 text-blue-700"
                  }`}
              >
                <UserIcon className="w-3 h-3" />
                Individual
                <span className="text-[9px] opacity-75 ml-1">
                  (Solo tú)
                </span>
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className={`text-[10px] px-2 py-0.5 flex items-center gap-1 ${theme === "dark"
                  ? "bg-green-500/20 text-green-300"
                  : "bg-green-100 text-green-700"
                  }`}
              >
                <UsersIcon className="w-3 h-3" />
                Equipo ({colaboradoresReales.length})
                <span className="text-[9px] opacity-75 ml-1">
                  {colaboradoresReales.slice(0, 2).map((c: string) => c.split('@')[0]).join(', ')}
                  {colaboradoresReales.length > 2 && ` +${colaboradoresReales.length - 2}`}
                </span>
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ✅ SECCIÓN ÚNICA: TAREAS YA REPORTADAS (TUS REPORTES + REPORTES DE OTROS) */}
      {revision.tareasReportadas.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={`text-[10px] bg-green-500/10 text-green-600 border-green-500/30 ${theme === "dark" ? "bg-green-500/20" : "bg-green-500/10"
                }`}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Reportadas ({revision.tareasReportadas.length})
            </Badge>
            <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}>
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
                }
              );

              if (!reporteInfo) return null;

              const esMiReporte = reporteInfo.esMiReporte || false;

              return (
                <ReportedTaskItem
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

      {/* ✅ SECCIÓN DE TAREAS PENDIENTES */}
      {revision.tareasNoReportadas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={`text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 ${theme === "dark" ? "bg-amber-500/20" : "bg-amber-500/10"
                }`}
            >
              <Clock className="w-3 h-3 mr-1" />
              Pendientes ({revision.tareasNoReportadas.length})
            </Badge>
            <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}>
              Selecciona para reportar
            </span>
          </div>

          <div className="ml-8 space-y-2">
            {revision.tareasNoReportadas.map((tarea: any) => {
              // ✅ Verificar que no esté reportada
              const estaReportada = Array.from(tareasReportadasMap.values()).some(
                (r) => {
                  const coincidePorId = r.pendienteId === tarea.id;
                  const coincidePorNombre = r.nombreTarea === tarea.nombre;
                  return coincidePorId || coincidePorNombre;
                }
              );

              if (estaReportada) {
                return null; // ✅ NO renderizar si ya está reportada
              }

              return (
                <PendingTaskItem
                  key={tarea.id}
                  tarea={tarea}
                  theme={theme}
                  estaSeleccionada={tareasSeleccionadas?.has?.(tarea.id) || false}
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

interface ReportedTaskItemProps {
  tarea: any;
  theme: "light" | "dark";
  reporteInfo?: any;
  esMiReporte: boolean;
  currentUserEmail: string;
}

function ReportedTaskItem({ tarea, theme, reporteInfo, esMiReporte, currentUserEmail }: ReportedTaskItemProps) {
  const [mostrarDescripcion, setMostrarDescripcion] = useState(false);
  
  if (!reporteInfo) return null;

  const reportadoPor = reporteInfo.reportadoPor || "Usuario";
  const emailReportado = reporteInfo.emailReportado || "";
  
  // 📌 Determinar si realmente es mi reporte
  const esRealmenteMiReporte = esMiReporte && currentUserEmail && 
    emailReportado.toLowerCase() === currentUserEmail.toLowerCase();
  
  const nombreFormateado = reportadoPor.charAt(0).toUpperCase() + reportadoPor.slice(1);
  
  const fechaReporte = reporteInfo.fechaReporte || new Date().toISOString();
  const fechaFormateada = new Date(fechaReporte).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      className={`p-3 rounded border ${esRealmenteMiReporte
        ? theme === "dark"
          ? "bg-green-900/20 border-green-500/30"
          : "bg-green-50 border-green-200"
        : theme === "dark"
          ? "bg-purple-900/20 border-purple-500/30"
          : "bg-purple-50 border-purple-200"
        }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center mt-0.5">
          <div className={`w-5 h-5 flex items-center justify-center rounded ${esRealmenteMiReporte
            ? theme === "dark"
              ? "bg-green-500/30 text-green-400"
              : "bg-green-500/20 text-green-600"
            : theme === "dark"
              ? "bg-purple-500/30 text-purple-400"
              : "bg-purple-500/20 text-purple-600"
            }`}>
            <Check className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex-1">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-sm line-clamp-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                {tarea.nombre}
              </span>
              <Badge
                className={`text-[10px] flex-shrink-0 ${esRealmenteMiReporte
                  ? theme === "dark"
                    ? "bg-green-500/30 text-green-300 border-green-500/50"
                    : "bg-green-500/20 text-green-700 border-green-500/30"
                  : theme === "dark"
                    ? "bg-purple-500/30 text-purple-300 border-purple-500/50"
                    : "bg-purple-500/20 text-purple-700 border-purple-500/30"
                  }`}
              >
                {esRealmenteMiReporte ? (
                  <>
                    <User className="w-3 h-3 mr-1 inline" />
                    REPORTÉ
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3 mr-1 inline" />
                    POR {nombreFormateado}
                  </>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                  <User className="w-3 h-3" />
                  {esRealmenteMiReporte ? "Yo reporté" : `Reportado por: ${nombreFormateado}`}
                </span>

                <span className={`flex items-center gap-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                  <Calendar className="w-3 h-3" />
                  {fechaFormateada}
                </span>
              </div>

              {tarea.duracionMin > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === "dark" ? "text-blue-300 bg-blue-500/20" : "text-blue-700 bg-blue-100"
                  }`}>
                  {tarea.duracionMin} min
                </span>
              )}
            </div>

            {/* ✅ Botón para mostrar/ocultar descripción */}
            {reporteInfo.texto && (
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMostrarDescripcion(!mostrarDescripcion)}
                  className={`text-xs h-6 px-2 py-1 ${theme === "dark"
                    ? "text-gray-400 hover:text-gray-300 hover:bg-[#2a2a2a]"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                    }`}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  {mostrarDescripcion ? "Ocultar explicación" : "Ver explicación"}
                  <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${mostrarDescripcion ? "rotate-180" : ""}`} />
                </Button>
                
                {mostrarDescripcion && (
                  <div className={`mt-2 p-2 rounded text-xs ${theme === "dark"
                    ? "bg-[#2a2a2a] text-gray-300 border border-[#3a3a3a]"
                    : "bg-gray-100 text-gray-700 border border-gray-200"
                    }`}>
                    <div className="flex items-start gap-1 mb-1">
                      <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="font-medium">
                        {esRealmenteMiReporte ? "Mi explicación:" : `Explicación de ${nombreFormateado}:`}
                      </span>
                    </div>
                    <p className="italic whitespace-pre-wrap">
                      "{reporteInfo.texto}"
                    </p>
                    {reporteInfo.encontradoEn && (
                      <div className={`mt-1 pt-1 border-t ${theme === "dark" ? "border-[#3a3a3a]" : "border-gray-300"}`}>
                        <span className={`text-[10px] ${theme === "dark" ? "text-gray-500" : "text-gray-600"}`}>
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

interface PendingTaskItemProps {
  tarea: any;
  theme: "light" | "dark";
  estaSeleccionada: boolean;
  onToggleSeleccion: () => void;
  esActividadIndividual: boolean;
  colaboradoresReales: string[];
}

function PendingTaskItem({
  tarea,
  theme,
  estaSeleccionada,
  onToggleSeleccion,
  esActividadIndividual,
  colaboradoresReales
}: PendingTaskItemProps) {
  return (
    <div
      className={`p-3 rounded border cursor-pointer transition-all ${estaSeleccionada
        ? "border-[#6841ea] bg-[#6841ea]/10"
        : theme === "dark"
          ? "bg-[#1a1a1a] border-[#2a2a2a] hover:bg-[#2a2a2a]"
          : "bg-white border-gray-200 hover:bg-gray-50"
        }`}
      onClick={(e) => {
        e.stopPropagation();
        onToggleSeleccion();
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center mt-0.5">
          <div
            className={`w-5 h-5 flex items-center justify-center border rounded transition-all ${estaSeleccionada
              ? "bg-[#6841ea] border-[#6841ea]"
              : theme === "dark"
                ? "border-gray-500 hover:border-[#6841ea]"
                : "border-gray-400 hover:border-[#6841ea]"
              }`}
          >
            {estaSeleccionada && (
              <Check className="w-3.5 h-3.5 text-white" />
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-sm line-clamp-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                {tarea.nombre}
              </span>
              <Badge
                variant={tarea.prioridad === "ALTA" ? "destructive" : "secondary"}
                className={`text-[10px] flex-shrink-0 ${tarea.prioridad === "ALTA"
                  ? "bg-red-500/20 text-red-500 border-red-500/30"
                  : theme === "dark"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-amber-500/20 text-amber-700 border-amber-500/30"
                  }`}
              >
                {tarea.prioridad}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className={`flex-shrink-0 ${theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}>
                {esActividadIndividual ? (
                  <>
                    <User className="w-3 h-3 inline mr-1" />
                    Tú solo
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3 inline mr-1" />
                    Equipo ({colaboradoresReales.length})
                  </>
                )}
              </span>
              {!esActividadIndividual && colaboradoresReales.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {colaboradoresReales.slice(0, 2).map((colaborador: string, idx: number) => {
                    const nombre = colaborador.split('@')[0];
                    return (
                      <span
                        key={idx}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${theme === "dark"
                          ? "bg-[#2a2a2a] text-gray-400"
                          : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {nombre}
                      </span>
                    );
                  })}
                  {colaboradoresReales.length > 2 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                      +{colaboradoresReales.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                  {tarea.duracionMin} min
                </span>
                {tarea.diasPendiente > 0 && (
                  <span className={`${theme === "dark" ? "text-amber-300" : "text-amber-600"
                    }`}>
                    {tarea.diasPendiente}d pendiente
                  </span>
                )}
              </div>

              <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === "dark"
                ? "bg-amber-500/30 text-amber-300"
                : "bg-amber-500/20 text-amber-700"
                }`}>
                <Clock className="w-3 h-3 inline mr-1" />
                POR REPORTAR
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TasksPanelFooterProps {
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
}

function TasksPanelFooter({
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
}: TasksPanelFooterProps) {
  const countSeleccionadas = tareasSeleccionadas ? tareasSeleccionadas.size : 0;
  const todasSeleccionadas = countSeleccionadas === totalTareasPendientes;
  const esTrabajoEnEquipo = todosColaboradores.length > 1;
  const nombreUsuario = currentUserEmail.includes('@') ? currentUserEmail.split('@')[0] : currentUserEmail;

  const handleMainAction = () => {
    if (esHoraReporte) {
      onOpenReport?.();
    } else {
      if (countSeleccionadas === 0) {
        console.warn("⚠️ Por favor selecciona al menos una tarea pendiente para explicar");
        return;
      }
      console.log('🚀 Ejecutando explicación de tareas seleccionadas');
      onExplicarTareasSeleccionadas();
    }
  };

  const handleContinuarChat = () => {
    if (onStartVoiceMode) {
      onStartVoiceMode();
    } else {
      console.warn("⚠️ onStartVoiceMode no está definido");
    }
  };

  return (
    <div
      className={`p-3 border-t ${theme === "dark"
        ? "border-[#2a2a2a] bg-[#252527]"
        : "border-gray-200 bg-gray-50"
        }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={theme === "dark" ? "text-gray-500" : "text-gray-600"}>
                {totalTareasPendientes} pendiente{totalTareasPendientes !== 1 ? "s" : ""}
              </span>
              {mostrandoReportesDeOtros ? (
                <div className="flex gap-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === "dark"
                    ? "bg-purple-500/20 text-purple-300"
                    : "bg-purple-500/10 text-purple-700"
                    }`}>
                    👥 De otros: {tareasReportadasPorOtros}
                  </span>
                  {estadisticasServidor?.tareasUsuario !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === "dark"
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-200 text-gray-700"
                      }`}>
                      Tú: {estadisticasServidor.tareasUsuario}
                    </span>
                  )}
                </div>
              ) : (
                totalTareasReportadas > 0 && (
                  <div className="flex gap-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === "dark"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-green-500/10 text-green-700"
                      }`}>
                      {tareasReportadasPorMi} mías
                    </span>
                    {tareasReportadasPorOtros > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === "dark"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-purple-500/10 text-purple-700"
                        }`}>
                        {tareasReportadasPorOtros} de otros
                      </span>
                    )}
                  </div>
                )
              )}
            </div>

            {!esHoraReporte && countSeleccionadas > 0 && (
              <span className={`text-[10px] mt-1 flex items-center gap-1 ${theme === "dark" ? "text-[#6841ea]" : "text-[#6841ea]"
                }`}>
                <CheckSquare className="w-3 h-3" />
                {countSeleccionadas} seleccionada{countSeleccionadas !== 1 ? "s" : ""}
              </span>
            )}

            {currentUserEmail && (
              <span className={`text-[10px] mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                👤 {nombreUsuario}
                {mostrandoReportesDeOtros && " (No tienes reportes propios)"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {mostrandoReportesDeOtros ? (
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 flex items-center gap-1 ${theme === "dark"
                  ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                  : "bg-purple-100 text-purple-700 border-purple-300"
                  }`}
              >
                <UsersIcon className="w-3 h-3" />
                Trabajo colaborativo
              </Badge>
            ) : esTrabajoEnEquipo ? (
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 flex items-center gap-1 ${theme === "dark"
                  ? "bg-green-500/10 text-green-300 border-green-500/30"
                  : "bg-green-100 text-green-700 border-green-300"
                  }`}
              >
                <UsersIcon className="w-3 h-3" />
                Equipo ({todosColaboradores.length})
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 flex items-center gap-1 ${theme === "dark"
                  ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                  : "bg-blue-100 text-blue-700 border-blue-300"
                  }`}
              >
                <UserIcon className="w-3 h-3" />
                Individual
              </Badge>
            )}
          </div>
        </div>

        {!esHoraReporte && totalTareasPendientes > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={todasSeleccionadas ? onDeseleccionarTodas : onSeleccionarTodas}
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-7"
            >
              <CheckSquare className="w-3.5 h-3.5 mr-2" />
              {todasSeleccionadas ? "Deseleccionar todas" : "Seleccionar pendientes"}
            </Button>
            {onRecargar && (
              <Button
                onClick={onRecargar}
                size="sm"
                variant="ghost"
                disabled={isLoading}
                className="h-7 w-7 p-0"
                title="Recargar tareas reportadas"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleMainAction}
            size="sm"
            className={`flex-1 text-white text-xs h-8 ${countSeleccionadas === 0 && !esHoraReporte
              ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
              : "bg-[#6841ea] hover:bg-[#5a36d4]"
              }`}
            disabled={!esHoraReporte && countSeleccionadas === 0}
          >
            {esHoraReporte ? (
              <>
                <ListChecks className="w-3.5 h-3.5 mr-2" />
                Iniciar Reporte
              </>
            ) : (
              <>
                <Headphones className="w-3.5 h-3.5 mr-2" />
                Reportar Tareas {countSeleccionadas > 0 && `(${countSeleccionadas})`}
              </>
            )}
          </Button>

          <Button
            onClick={handleContinuarChat}
            size="sm"
            variant="outline"
            className={`flex-1 text-xs h-8 ${theme === "dark"
              ? "border-[#2a2a2a] hover:bg-[#1a1a1a] text-gray-300"
              : "border-gray-300 hover:bg-gray-100 text-gray-700"
              }`}
          >
            {esHoraReporte ? "Posponer" : "Continuar Chat"}
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
  estadisticasServidor = null
}: NoTasksMessageProps) {
  const nombreUsuario = currentUserEmail?.includes('@') ? currentUserEmail.split('@')[0] : 'Usuario';

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300 flex justify-center">
      <div
        className={`p-4 rounded-lg border text-center ${theme === "dark"
          ? "bg-[#1a1a1a] border-[#2a2a2a]"
          : "bg-gray-50 border-gray-200"
          }`}
      >
        {mostrandoReportesDeOtros && estadisticasServidor ? (
          <>
            <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <h4 className={`font-semibold mb-1 text-sm ${theme === "dark" ? "text-purple-300" : "text-purple-700"
              }`}>
              Reportes del equipo
            </h4>
            <p className={`text-xs mb-3 ${theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}>
              {nombreUsuario}, no tienes tareas reportadas, pero hay {estadisticasServidor.tareasColaboradores || 0}
              reporte{estadisticasServidor.tareasColaboradores !== 1 ? 's' : ''} de otros colaboradores.
            </p>
            <div className={`text-xs p-2 rounded mb-3 ${theme === "dark"
              ? "bg-purple-900/20 text-purple-300"
              : "bg-purple-50 text-purple-700"}`}>
              {estadisticasServidor.mensaje || "Trabajo colaborativo"}
            </div>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h4 className={`font-semibold mb-1 text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>
              Todas las tareas reportadas
            </h4>
            <p className={`text-xs mb-3 ${theme === "dark" ? "text-gray-500" : "text-gray-600"
              }`}>
              {nombreUsuario}, no hay tareas pendientes por reportar.
            </p>
          </>
        )}
        {onRecargar && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRecargar}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
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

function TypingIndicator({ theme }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
      <div
        className={`rounded-lg px-4 py-3 flex items-center gap-2 ${theme === "dark"
          ? "bg-[#2a2a2a] text-white"
          : "bg-gray-100 text-gray-900"
          }`}
      >
        <Bot className="w-4 h-4 text-[#6841ea]" />
        <div className="flex gap-1">
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-1.5 h-1.5 bg-[#6841ea] rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ✅ TasksPanel para exportar
export function TasksPanel({
  actividadesConTareasPendientes = [],
  totalTareasPendientes = 0,
  esHoraReporte = false,
  theme = "light",
  assistantAnalysis = null,
  onOpenReport,
  onStartVoiceMode,
  tareasSeleccionadas = new Set(),
  onToggleTarea = () => { },
  onSeleccionarTodas = () => { },
  onDeseleccionarTodas = () => { },
  onExplicarTareasSeleccionadas = () => { },
}: any) {
  const todosColaboradores = useMemo(() => {
    if (!assistantAnalysis?.colaboradoresInvolucrados) return [];
    return assistantAnalysis.colaboradoresInvolucrados;
  }, [assistantAnalysis]);

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-4">
      <div
        className={`w-full max-w-xl rounded-lg border overflow-hidden ${theme === "dark"
          ? "bg-[#1a1a1a] border-[#2a2a2a]"
          : "bg-white border-gray-200"
          }`}
      >
        <TasksPanelFooter
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