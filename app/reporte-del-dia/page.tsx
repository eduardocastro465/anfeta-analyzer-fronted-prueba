"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import LoadingScreen from "./components/LoadingScreen";
import ErrorScreen from "./components/ErrorScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  RefreshCw, 
  Search, 
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  FileText,
  ListChecks,
  Mic,
  X,
  Play,
  Volume2,
  Sparkles,
  StopCircle,
  PauseCircle,
  PlayCircle,
  LogOut
} from "lucide-react";
import {
  useActividadesData,
  obtenerFechaPorDias,
} from "./hooks/useReporteData";
import { Actividad, Tarea } from "./components/types";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";

// Declarar tipos para Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    mozSpeechRecognition: any;
    msSpeechRecognition: any;
  }
}

// Hook personalizado para reconocimiento de voz
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [textoDictado, setTextoDictado] = useState("");
  const [errorMicrofono, setErrorMicrofono] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Verificar soporte del navegador
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || 
                               window.webkitSpeechRecognition || 
                               window.mozSpeechRecognition || 
                               window.msSpeechRecognition;
      
      if (!SpeechRecognition) {
        setIsSupported(false);
        setErrorMicrofono("Tu navegador no soporta reconocimiento de voz. Prueba con Chrome, Edge o Safari.");
      }
    }
  }, []);

  // Inicializar reconocimiento de voz
  useEffect(() => {
    if (!isSupported || typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || 
                             window.webkitSpeechRecognition || 
                             window.mozSpeechRecognition || 
                             window.msSpeechRecognition;
    
    if (SpeechRecognition) {
      try {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'es-ES';
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          setTextoDictado(finalTranscript || interimTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Error de reconocimiento:', event.error);
          
          let mensajeError = "";
          switch(event.error) {
            case 'network':
              mensajeError = "Error de red. Verifica tu conexión a internet.";
              break;
            case 'not-allowed':
            case 'permission-denied':
              mensajeError = "Permiso de micrófono denegado. Habilita el acceso al micrófono.";
              break;
            case 'no-speech':
              mensajeError = "No se detectó voz. Intenta de nuevo.";
              break;
            case 'audio-capture':
              mensajeError = "No se detectó micrófono. Conecta un micrófono.";
              break;
            case 'aborted':
              // Ignorar, es normal cuando se detiene manualmente
              break;
            default:
              mensajeError = `Error: ${event.error}`;
          }
          
          if (mensajeError) {
            setErrorMicrofono(mensajeError);
            setIsListening(false);
            
            toast({
              title: "❌ Error en el micrófono",
              description: mensajeError,
              variant: "destructive",
              duration: 3000
            });
          }
        };

        recognitionRef.current.onend = () => {
          if (isListening && !isPaused && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Error al reiniciar reconocimiento:', e);
            }
          }
        };
      } catch (e) {
        console.error('Error al inicializar reconocimiento:', e);
        setErrorMicrofono("Error al inicializar el reconocimiento de voz");
        setIsSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error al detener reconocimiento:', e);
        }
      }
    };
  }, [isSupported, toast, isListening, isPaused]);

  // Manejar inicio/detención del reconocimiento
  useEffect(() => {
    if (!recognitionRef.current || !isSupported) return;

    if (isListening && !isPaused) {
      try {
        recognitionRef.current.start();
        setErrorMicrofono(null);
      } catch (e) {
        console.error('Error al iniciar reconocimiento:', e);
        // Si ya está iniciado, ignorar
        if (e instanceof Error && e.message.includes('start')) {
          // Ignorar error de "already started"
        } else {
          setErrorMicrofono("Error al iniciar el micrófono");
        }
      }
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error al detener reconocimiento:', e);
      }
    }
  }, [isListening, isPaused, isSupported]);

  const iniciar = () => {
    if (!isSupported) {
      toast({
        title: "❌ Navegador no compatible",
        description: "Usa Chrome, Edge o Safari para el reconocimiento de voz",
        variant: "destructive",
        duration: 4000
      });
      return false;
    }
    
    // Solicitar permiso de micrófono explícitamente
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => {
        setIsListening(true);
        setIsPaused(false);
        setTextoDictado("");
        setErrorMicrofono(null);
        toast({
          title: "🎤 Grabando...",
          description: "Micrófono activado. Habla claramente.",
          duration: 2000
        });
        return true;
      })
      .catch((err) => {
        console.error('Error al acceder al micrófono:', err);
        setErrorMicrofono("No se pudo acceder al micrófono. Verifica los permisos.");
        toast({
          title: "❌ Error de micrófono",
          description: "No se pudo acceder al micrófono. Verifica los permisos.",
          variant: "destructive",
          duration: 3000
        });
        return false;
      });
    
    return true;
  };

  const pausar = () => {
    setIsPaused(!isPaused);
    return !isPaused;
  };

  const detener = () => {
    setIsListening(false);
    setIsPaused(false);
    return textoDictado;
  };

  const reiniciar = () => {
    setTextoDictado("");
  };

  return {
    isListening,
    isPaused,
    textoDictado,
    errorMicrofono,
    isSupported,
    setTextoDictado,
    iniciar,
    pausar,
    detener,
    reiniciar
  };
};

// Modal de confirmación de dictado
const ModalConfirmacionDictado = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  actividad,
  tareas
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (tareasSeleccionadas: Tarea[]) => void;
  actividad: Actividad | null;
  tareas: Tarea[];
}) => {
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Inicializar selección cuando se abre el modal
  useEffect(() => {
    if (isOpen && tareas.length > 0) {
      const tareasConExplicacion = tareas
        .filter(t => t.tieneExplicacion === true)
        .map(t => t.pendienteId);
      setTareasSeleccionadas(new Set(tareasConExplicacion));
    }
  }, [isOpen, tareas]);

  if (!isOpen || !actividad) return null;

  const totalTareasConExplicacion = tareas.filter(t => t.tieneExplicacion === true).length;

  const toggleTarea = (tareaId: string) => {
    const newSelection = new Set(tareasSeleccionadas);
    if (newSelection.has(tareaId)) {
      newSelection.delete(tareaId);
    } else {
      newSelection.add(tareaId);
    }
    setTareasSeleccionadas(newSelection);
  };

  const seleccionarTodas = () => {
    setTareasSeleccionadas(new Set(
      tareas
        .filter(t => t.tieneExplicacion === true)
        .map(t => t.pendienteId)
    ));
  };

  const limpiarSeleccion = () => {
    setTareasSeleccionadas(new Set());
  };

  const handleConfirm = () => {
    if (tareasSeleccionadas.size === 0) {
      toast({
        title: "❌ No hay tareas seleccionadas",
        description: "Selecciona al menos una tarea para dictar",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    const tareasAConfirmar = tareas.filter(t => tareasSeleccionadas.has(t.pendienteId));
    onConfirm(tareasAConfirmar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111] border border-[#00ff00]/30 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl shadow-[#00ff00]/20">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gradient-to-r from-[#1a1a1a] to-[#111]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#00ff00]/10 rounded-lg animate-pulse">
              <Mic className="w-6 h-6 text-[#00ff00]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Confirmar dictado por voz
                <span className="text-xs bg-[#00ff00] text-black px-2 py-1 rounded-full font-medium">
                  {tareasSeleccionadas.size} de {totalTareasConExplicacion}
                </span>
              </h2>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <span className="max-w-md truncate">{actividad.titulo}</span>
                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                <span>{actividad.fecha}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {/* Info bar */}
          <div className="bg-[#1a1a1a] border border-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-400">Total tareas:</span>
                <span className="text-white font-medium">{tareas.length}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">Con explicación:</span>
                <span className="text-[#00ff00] font-medium">{totalTareasConExplicacion}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">Seleccionadas:</span>
                <span className="text-[#00ff00] font-medium">{tareasSeleccionadas.size}</span>
              </div>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-[#1a1a1a] border border-[#00ff00]/10 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Volume2 className="w-4 h-4 text-[#00ff00]" />
              <h3 className="text-sm font-medium text-white">Instrucciones para el dictado</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-400 ml-7">
              <li className="flex items-start gap-2">
                <span className="text-[#00ff00] mt-1">•</span>
                <span>Se dictarán <span className="text-white font-medium">{tareasSeleccionadas.size}</span> tareas con explicaciones disponibles</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00ff00] mt-1">•</span>
                <span>Puedes seleccionar/deseleccionar tareas específicas antes de comenzar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00ff00] mt-1">•</span>
                <span>El dictado se realizará en orden, puedes pausar y reanudar cuando quieras</span>
              </li>
            </ul>
          </div>

          {/* Acciones masivas */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[#00ff00]" />
              Tareas a dictar
            </h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={seleccionarTodas}
                disabled={totalTareasConExplicacion === 0}
                className="h-8 px-3 text-xs text-gray-400 hover:text-white border border-white/5 rounded-lg disabled:opacity-50"
              >
                Seleccionar todas
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={limpiarSeleccion}
                className="h-8 px-3 text-xs text-gray-400 hover:text-white border border-white/5 rounded-lg"
              >
                Limpiar
              </Button>
            </div>
          </div>

          {/* Lista de tareas */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {tareas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay tareas en esta actividad
              </div>
            ) : (
              tareas.map((tarea, index) => {
                const tieneExplicacion = tarea.tieneExplicacion === true;
                const estaSeleccionada = tareasSeleccionadas.has(tarea.pendienteId);
                
                return (
                  <div
                    key={tarea.pendienteId}
                    className={`
                      border rounded-lg transition-all duration-200
                      ${tieneExplicacion 
                        ? estaSeleccionada
                          ? 'border-[#00ff00] bg-[#00ff00]/5'
                          : 'border-white/5 bg-[#1a1a1a] hover:border-white/10'
                        : 'border-white/5 bg-[#1a1a1a]/50 opacity-50'
                      }
                    `}
                  >
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={estaSeleccionada}
                            onChange={() => toggleTarea(tarea.pendienteId)}
                            disabled={!tieneExplicacion}
                            className="w-4 h-4 rounded border-white/20 bg-[#111] text-[#00ff00] focus:ring-[#00ff00] focus:ring-offset-0 disabled:opacity-50"
                          />
                        </div>

                        {/* Número de orden */}
                        <div className="flex-shrink-0 w-6 h-6 bg-[#111] border border-white/5 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-400">{index + 1}</span>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">
                              {tarea.nombre}
                            </span>
                            {tarea.prioridad && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                tarea.prioridad === 'ALTA' ? 'bg-red-500/10 text-red-400' :
                                tarea.prioridad === 'MEDIA' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-blue-500/10 text-blue-400'
                              }`}>
                                {tarea.prioridad}
                              </span>
                            )}
                          </div>

                          {/* Metadatos */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                            {tarea.duracionMin > 0 && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {tarea.duracionMin} min
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span className={tarea.terminada ? 'text-green-400' : 'text-yellow-400'}>
                              {tarea.terminada ? 'Completada' : 'Pendiente'}
                            </span>
                            {tieneExplicacion && (
                              <>
                                <span>•</span>
                                <span className="text-[#00ff00] flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Con explicación
                                </span>
                              </>
                            )}
                          </div>

                          {/* Explicación */}
                          {tarea.explicacionActual && (
                            <div className="bg-[#111] border border-[#00ff00]/10 rounded-lg p-3 mt-2">
                              <p className="text-sm text-gray-300 mb-2">
                                {tarea.explicacionActual.texto.length > 150
                                  ? tarea.explicacionActual.texto.substring(0, 150) + '...'
                                  : tarea.explicacionActual.texto
                                }
                              </p>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">
                                  {tarea.explicacionActual.email?.split('@')[0] || 'Usuario'}
                                </span>
                                <span className="text-gray-600">
                                  {new Date(tarea.explicacionActual.fecha).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-white/5 bg-[#1a1a1a]">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span>Se dictarán {tareasSeleccionadas.size} tarea{tareasSeleccionadas.size !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-10 px-4 text-sm text-gray-400 hover:text-white border border-white/5 rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={tareasSeleccionadas.size === 0}
              className={`
                h-10 px-5 text-sm font-medium rounded-lg transition-all duration-300
                ${tareasSeleccionadas.size > 0
                  ? 'bg-[#00ff00] hover:bg-[#00dd00] text-black shadow-[0_0_20px_#00ff00]'
                  : 'bg-gray-800 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar dictado ({tareasSeleccionadas.size})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal de dictado en vivo
const ModalDictadoVivo = ({ 
  isOpen, 
  onClose, 
  tareas,
  onCompletado
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  tareas: Tarea[];
  onCompletado: () => void;
}) => {
  const [tareaActual, setTareaActual] = useState(0);
  const [textosDictados, setTextosDictados] = useState<{[key: string]: string}>({});
  const { toast } = useToast();
  
  const speech = useSpeechRecognition();

  // Reset cuando cambia la tarea
  useEffect(() => {
    if (isOpen && tareas.length > 0) {
      const textoGuardado = textosDictados[tareas[tareaActual].pendienteId] || "";
      speech.setTextoDictado(textoGuardado);
    }
  }, [tareaActual, isOpen, tareas, textosDictados]);

  if (!isOpen) return null;
  if (tareas.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-[#111] border border-red-500/30 rounded-xl p-6">
          <p className="text-white">No hay tareas para dictar</p>
          <Button onClick={onClose} className="mt-4">Cerrar</Button>
        </div>
      </div>
    );
  }

  const tareaAct = tareas[tareaActual];
  const progreso = ((tareaActual + 1) / tareas.length) * 100;

  const iniciarGrabacion = () => {
    speech.iniciar();
  };

  const pausarGrabacion = () => {
    speech.pausar();
  };

  const detenerGrabacion = () => {
    const texto = speech.detener();
    if (texto.trim()) {
      setTextosDictados(prev => ({
        ...prev,
        [tareaAct.pendienteId]: texto
      }));
    }
  };

  const siguienteTarea = () => {
    // Guardar texto actual antes de avanzar
    if (speech.textoDictado.trim()) {
      setTextosDictados(prev => ({
        ...prev,
        [tareaAct.pendienteId]: speech.textoDictado
      }));
    }

    if (tareaActual < tareas.length - 1) {
      setTareaActual(tareaActual + 1);
      speech.reiniciar();
      
      if (speech.isListening) {
        toast({
          title: "➡️ Siguiente tarea",
          description: tareas[tareaActual + 1].nombre,
          duration: 2000
        });
      }
    } else {
      // Terminamos todas las tareas
      speech.detener();
      
      toast({
        title: "✅ Dictado completado",
        description: `Se dictaron ${tareas.length} tareas correctamente`,
        duration: 4000
      });
      
      onCompletado();
      onClose();
    }
  };

  const tareaAnterior = () => {
    if (tareaActual > 0) {
      // Guardar texto actual antes de retroceder
      if (speech.textoDictado.trim()) {
        setTextosDictados(prev => ({
          ...prev,
          [tareaAct.pendienteId]: speech.textoDictado
        }));
      }
      
      setTareaActual(tareaActual - 1);
      speech.reiniciar();
    }
  };

  const saltarTarea = () => {
    if (tareaActual < tareas.length - 1) {
      toast({
        title: "⏭️ Tarea saltada",
        description: tareaAct.nombre,
        duration: 2000
      });
      
      // Guardar texto actual antes de saltar
      if (speech.textoDictado.trim()) {
        setTextosDictados(prev => ({
          ...prev,
          [tareaAct.pendienteId]: speech.textoDictado
        }));
      }
      
      setTareaActual(tareaActual + 1);
      speech.reiniciar();
    }
  };

  // Si no hay soporte, mostrar mensaje
  if (!speech.isSupported) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-[#111] border border-yellow-500/30 rounded-xl w-full max-w-md p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Navegador no compatible</h3>
            <p className="text-sm text-gray-400 mb-4">
              {speech.errorMicrofono || "Tu navegador no soporta reconocimiento de voz."}
            </p>
            <p className="text-xs text-gray-500 mb-6">
              Prueba con:
              <br />• Google Chrome (recomendado)
              <br />• Microsoft Edge
              <br />• Safari
            </p>
            <Button onClick={onClose} className="bg-[#6841ea] hover:bg-[#7a4cf5]">
              Entendido
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111] border border-[#00ff00]/30 rounded-xl w-full max-w-3xl shadow-2xl shadow-[#00ff00]/20">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gradient-to-r from-[#1a1a1a] to-[#111]">
          <div className="flex items-center gap-4">
            <div className={`p-3 ${speech.isListening ? 'bg-[#00ff00]/20 animate-pulse' : 'bg-[#00ff00]/10'} rounded-lg`}>
              <Mic className={`w-6 h-6 ${speech.isListening ? 'text-[#00ff00]' : 'text-gray-400'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Dictado por voz
              </h2>
              <p className="text-sm text-gray-400">
                Tarea {tareaActual + 1} de {tareas.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#1a1a1a]">
          <div 
            className="h-full bg-[#00ff00] transition-all duration-300"
            style={{ width: `${progreso}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Tarea actual */}
          <div className="bg-[#1a1a1a] border border-white/5 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">TAREA ACTUAL</h3>
            <p className="text-lg font-medium text-white mb-2">{tareaAct.nombre}</p>
            {tareaAct.explicacionActual && (
              <div className="bg-[#111] border border-[#00ff00]/10 rounded-lg p-3 mt-2">
                <p className="text-xs text-gray-500 mb-1">Explicación original:</p>
                <p className="text-sm text-gray-300">{tareaAct.explicacionActual.texto}</p>
              </div>
            )}
          </div>

          {/* Área de dictado */}
          <div className="bg-[#1a1a1a] border border-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-400">TEXTO DICTADO</span>
              {speech.isListening && !speech.isPaused && (
                <span className="flex items-center gap-2 text-xs text-[#00ff00]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff00] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff00]"></span>
                  </span>
                  Grabando...
                </span>
              )}
              {speech.isPaused && (
                <span className="text-xs text-yellow-400">⏸️ Pausado</span>
              )}
            </div>
            <textarea
              value={speech.textoDictado}
              onChange={(e) => speech.setTextoDictado(e.target.value)}
              placeholder={speech.isListening ? "Habla ahora..." : "Presiona 'Comenzar' para dictar..."}
              className="w-full h-32 bg-[#111] border border-white/5 rounded-lg p-3 text-sm text-gray-300 placeholder:text-gray-600 focus:border-[#00ff00] focus:ring-1 focus:ring-[#00ff00] transition-all resize-none"
              disabled={!speech.isListening}
            />
          </div>

          {/* Controles de grabación */}
          <div className="flex items-center justify-center gap-3">
            {!speech.isListening ? (
              <Button
                onClick={iniciarGrabacion}
                disabled={!speech.isSupported}
                className="h-12 px-6 bg-[#00ff00] hover:bg-[#00dd00] text-black font-medium rounded-lg shadow-[0_0_20px_#00ff00] transition-all duration-300 transform hover:scale-105"
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                Comenzar
              </Button>
            ) : (
              <>
                <Button
                  onClick={pausarGrabacion}
                  variant="ghost"
                  className="h-12 w-12 p-0 text-gray-400 hover:text-white border border-white/5 rounded-lg"
                >
                  {speech.isPaused ? <Play className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
                </Button>
                <Button
                  onClick={detenerGrabacion}
                  variant="ghost"
                  className="h-12 w-12 p-0 text-gray-400 hover:text-white border border-white/5 rounded-lg"
                >
                  <StopCircle className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>

          {/* Error de micrófono */}
          {speech.errorMicrofono && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-400 text-center">{speech.errorMicrofono}</p>
            </div>
          )}

          {/* Navegación de tareas */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
            <Button
              onClick={tareaAnterior}
              disabled={tareaActual === 0}
              variant="ghost"
              className="h-9 px-3 text-sm text-gray-400 hover:text-white border border-white/5 rounded-lg disabled:opacity-50"
            >
              ← Anterior
            </Button>
            
            <div className="text-xs text-gray-500">
              {Object.keys(textosDictados).length} de {tareas.length} dictadas
            </div>
            
            <Button
              onClick={siguienteTarea}
              variant="ghost"
              className="h-9 px-3 text-sm text-gray-400 hover:text-white border border-white/5 rounded-lg"
            >
              {tareaActual < tareas.length - 1 ? 'Siguiente →' : 'Finalizar'}
            </Button>
          </div>

          {/* Botón para saltar */}
          {tareaActual < tareas.length - 1 && (
            <div className="flex justify-center">
              <Button
                onClick={saltarTarea}
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500 hover:text-gray-400"
              >
                Saltar esta tarea
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
  const [filtroFecha, setFiltroFecha] = useState<string>("hoy");
  const [filtroColaborador, setFiltroColaborador] = useState<string>("todos");
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
  
  // Estados para dictado
  const [modalDictadoAbierto, setModalDictadoAbierto] = useState(false);
  const [modalDictadoVivoAbierto, setModalDictadoVivoAbierto] = useState(false);
  const [actividadParaDictado, setActividadParaDictado] = useState<Actividad | null>(null);
  const [tareasParaDictado, setTareasParaDictado] = useState<Tarea[]>([]);

  const fechaActual = new Date().toISOString().split("T")[0];

  // Función para abrir modal de confirmación de dictado
  const abrirConfirmacionDictado = (actividad: Actividad) => {
    const tareasConExplicacion = actividad.tareas.filter(t => t.tieneExplicacion === true);
    
    if (tareasConExplicacion.length === 0) {
      toast({
        title: "❌ No hay tareas para dictar",
        description: "Esta actividad no tiene tareas con explicaciones",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    setActividadParaDictado(actividad);
    setTareasParaDictado(tareasConExplicacion);
    setModalDictadoAbierto(true);
    
    toast({
      title: "🎤 Preparando dictado",
      description: `Se encontraron ${tareasConExplicacion.length} tareas con explicaciones`,
      duration: 3000
    });
  };

  // Función para iniciar el dictado global de reportes
  const iniciarDictadoGlobal = () => {
    // Obtener todas las actividades filtradas actualmente
    const actividadesFiltradasActuales = actividadesFiltradas;
    
    if (actividadesFiltradasActuales.length === 0) {
      toast({
        title: "❌ No hay actividades",
        description: "No se encontraron actividades con los filtros actuales",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    // Obtener todas las tareas con explicación de las actividades filtradas
    const tareasConExplicacion = actividadesFiltradasActuales.flatMap(act => 
      act.tareas.filter(t => t.tieneExplicacion === true)
    );
    
    if (tareasConExplicacion.length === 0) {
      toast({
        title: "❌ No hay tareas para dictar",
        description: "No se encontraron tareas con explicaciones en los resultados actuales",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    // Cerrar cualquier modal abierto
    setModalDictadoAbierto(false);
    
    // Establecer las tareas para dictado
    setTareasParaDictado(tareasConExplicacion);
    
    // Abrir directamente el modal de dictado vivo
    setTimeout(() => {
      setModalDictadoVivoAbierto(true);
    }, 100);
    
    toast({
      title: "🎤 Iniciando dictado de reportes",
      description: `Se dictarán ${tareasConExplicacion.length} tareas de ${actividadesFiltradasActuales.length} actividades`,
      duration: 3000
    });
  };

  // Función para iniciar el dictado después de confirmar
  const iniciarDictadoConfirmado = (tareasSeleccionadas: Tarea[]) => {
    setModalDictadoAbierto(false);
    
    // Establecer las tareas seleccionadas
    setTareasParaDictado(tareasSeleccionadas);
    
    // Abrir el modal de dictado vivo
    setTimeout(() => {
      setModalDictadoVivoAbierto(true);
    }, 100);
    
    toast({
      title: "🎤 Dictado iniciado",
      description: `Comenzando con ${tareasSeleccionadas.length} tarea${tareasSeleccionadas.length !== 1 ? 's' : ''}`,
      duration: 3000
    });
  };

  // Obtener colaboradores únicos
  const colaboradoresUnicos = useMemo(() => {
    if (!actividades) return [];
    const colaboradores = new Set<string>();
    actividades.forEach(act => {
      act.colaboradores?.forEach((email: string) => {
        if (email && email !== "Sin colaborador") {
          colaboradores.add(email);
        }
      });
    });
    return Array.from(colaboradores).sort();
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
    return actividades.filter(act => {
      // Filtro fecha - por defecto "hoy"
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
      
      // Filtro colaborador
      if (filtroColaborador !== "todos") {
        if (!act.colaboradores?.includes(filtroColaborador)) return false;
      }
      
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
  }, [actividades, filtroFecha, filtroColaborador, filtroStatus, busquedaTexto, fechaInicio, fechaFin, fechaActual]);

  // Ordenamiento
  const actividadesOrdenadas = useMemo(() => {
    return [...actividadesFiltradas].sort((a, b) => {
      let cmp = 0;
      if (ordenarPor === "fecha") cmp = a.fecha.localeCompare(b.fecha);
      else if (ordenarPor === "titulo") cmp = a.titulo.localeCompare(b.titulo);
      else if (ordenarPor === "tareas")
        cmp = (a.totalTareas || 0) - (b.totalTareas || 0);
      else if (ordenarPor === "explicaciones")
        cmp = (a.tareasConExplicacion || 0) - (b.tareasConExplicacion || 0);
      return ordenAsc ? cmp : -cmp;
    });
  }, [actividadesFiltradas, ordenarPor, ordenAsc]);

  const toggleOrden = (c: string) => {
    if (ordenarPor === c) setOrdenAsc(!ordenAsc);
    else {
      setOrdenarPor(c);
      setOrdenAsc(false);
    }
  };

  const limpiarFiltros = () => {
    setBusquedaTexto(""); 
    setFiltroFecha("hoy");
    setFiltroColaborador("todos"); 
    setFiltroStatus("todos");
    setFechaInicio("");
    setFechaFin("");
    toast({ 
      title: "Filtros limpiados", 
      description: "Filtros restablecidos a valores por defecto",
      duration: 2000
    });
  };

  if (loading) return <LoadingScreen />;
  if (error || !actividades)
    return <ErrorScreen onRetry={() => cargarActividades(true)} />;

  return (
    <div className="font-['Inter',sans-serif] min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#111111] to-[#0a0a0a] text-gray-100 p-6 relative">
      {/* Efecto de gradiente central */}
      <div className="fixed inset-0 bg-gradient-radial from-gray-800/20 via-transparent to-transparent pointer-events-none"></div>
      
      {/* Modal de confirmación de dictado */}
      <ModalConfirmacionDictado 
        isOpen={modalDictadoAbierto}
        onClose={() => setModalDictadoAbierto(false)}
        onConfirm={iniciarDictadoConfirmado}
        actividad={actividadParaDictado}
        tareas={tareasParaDictado}
      />

      {/* Modal de dictado vivo */}
      <ModalDictadoVivo 
        isOpen={modalDictadoVivoAbierto}
        onClose={() => setModalDictadoVivoAbierto(false)}
        tareas={tareasParaDictado}
        onCompletado={() => {
          toast({
            title: "✅ Dictado completado",
            description: "Todas las tareas han sido dictadas",
            duration: 4000
          });
        }}
      />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">
              Panel de Actividades
            </h1>
            <p className="text-sm text-gray-500">
              {actividadesOrdenadas.length} actividades · {totalTareas} tareas · {
                actividades.reduce((acc, act) => acc + act.tareasConExplicacion, 0)
              } explicaciones
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón de comenzar dictado de reportes */}
            <Button
              size="default"
              onClick={iniciarDictadoGlobal}
              className="h-10 px-6 bg-gradient-to-r from-[#00ff00] to-[#00cc00] hover:from-[#00dd00] hover:to-[#00aa00] text-black font-semibold rounded-lg shadow-[0_0_25px_#00ff00] transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              <span>Comenzar dictado de reportes</span>
              {actividadesFiltradas.length > 0 && (
                <span className="ml-1 bg-black/20 px-2 py-0.5 rounded-full text-xs">
                  {actividadesFiltradas.flatMap(act => act.tareas).filter(t => t.tieneExplicacion === true).length}
                </span>
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="h-9 px-3 text-gray-400 hover:text-white border border-white/10 rounded-lg bg-black/20 backdrop-blur-sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              {mostrarFiltros ? "Ocultar" : "Mostrar"} filtros
            </Button>

            <Button
              size="sm"
              onClick={() => cargarActividades(true)}
              disabled={refreshing}
              className="h-9 px-3 bg-[#6841ea] hover:bg-[#7a4cf5] text-white rounded-lg shadow-lg shadow-purple-500/20"
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

        {/* Stats cards con efecto glass */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl p-4 hover:border-[#6841ea]/30 transition-all duration-300">
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
          
          <div className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl p-4 hover:border-[#6841ea]/30 transition-all duration-300">
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
          
          <div className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl p-4 hover:border-[#6841ea]/30 transition-all duration-300">
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
          
          <div className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl p-4 hover:border-[#6841ea]/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Colaboradores</p>
                <p className="text-2xl font-bold text-white">
                  {colaboradoresUnicos.length}
                </p>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Users className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros con efecto glass */}
      {mostrarFiltros && (
        <div className="max-w-7xl mx-auto mb-6 relative z-10">
          <div className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl p-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={busquedaTexto}
                  onChange={e => setBusquedaTexto(e.target.value)}
                  placeholder="Buscar actividades, tareas..."
                  className="pl-9 h-10 text-sm bg-black/40 border-white/5 rounded-lg focus:border-[#6841ea] transition-colors"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  value={filtroFecha}
                  onChange={e => setFiltroFecha(e.target.value)}
                  className="w-full h-10 text-sm bg-black/40 border-white/5 rounded-lg px-3 text-gray-300 focus:border-[#6841ea] transition-colors"
                >
                  <option value="hoy">Hoy</option>
                  <option value="ayer">Ayer</option>
                  <option value="ultima_semana">Última semana</option>
                  <option value="ultimo_mes">Último mes</option>
                  <option value="todos">Todas las fechas</option>
                  <option value="rango">Rango personalizado</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={filtroColaborador}
                  onChange={e => setFiltroColaborador(e.target.value)}
                  className="w-full h-10 text-sm bg-black/40 border-white/5 rounded-lg px-3 text-gray-300 focus:border-[#6841ea] transition-colors"
                >
                  <option value="todos">Todos los colaboradores</option>
                  {colaboradoresUnicos.map(email => (
                    <option key={email} value={email}>
                      {email.split('@')[0]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={filtroStatus}
                  onChange={e => setFiltroStatus(e.target.value)}
                  className="w-full h-10 text-sm bg-black/40 border-white/5 rounded-lg px-3 text-gray-300 focus:border-[#6841ea] transition-colors"
                >
                  <option value="todos">Todos los estados</option>
                  {statusUnicos.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="lg:col-span-3 flex gap-2">
                <Button
                  variant="ghost"
                  onClick={limpiarFiltros}
                  className="flex-1 h-10 text-sm text-gray-400 hover:text-white border border-white/5 hover:border-white/10 rounded-lg bg-black/20"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Limpiar filtros
                </Button>
              </div>
            </div>

            {filtroFecha === "rango" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  className="h-10 text-sm bg-black/40 border-white/5 rounded-lg focus:border-[#6841ea] transition-colors"
                />
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  className="h-10 text-sm bg-black/40 border-white/5 rounded-lg focus:border-[#6841ea] transition-colors"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabla principal con efecto glass */}
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="bg-black/40 backdrop-blur-sm border border-white/5 overflow-hidden shadow-2xl shadow-black/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/60 border-b border-white/5">
                <tr>
                  <th className="px-3 py-3 w-6"></th>
                  <th className="px-3 py-3 text-left cursor-pointer hover:text-white" onClick={() => toggleOrden("fecha")}>
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Fecha
                      {ordenarPor === "fecha" && (ordenAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </span>
                  </th>
                  <th
                    className="px-3 py-3 text-left cursor-pointer hover:text-white"
                    onClick={() => toggleOrden("titulo")}
                  >
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actividad
                      {ordenarPor === "titulo" && (ordenAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </span>
                  </th>
                  <th className="px-3 py-3 text-left cursor-pointer hover:text-white" onClick={() => toggleOrden("tareas")}>
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Tareas
                      {ordenarPor === "tareas" && (ordenAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </span>
                  </th>
                  <th className="px-3 py-3 text-left cursor-pointer hover:text-white" onClick={() => toggleOrden("explicaciones")}>
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Explicaciones
                      {ordenarPor === "explicaciones" && (ordenAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </span>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Colaboradores
                    </span>
                  </th>
                  <th className="px-3 py-3 text-center">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Acciones
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {actividadesOrdenadas.map((act) => (
                  <React.Fragment key={act.actividadId}>
                    <tr 
                      className="hover:bg-white/5 cursor-pointer transition-all duration-300 group"
                      onClick={() => setActividadExpandida(actividadExpandida === act.actividadId ? null : act.actividadId)}
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
                      <td className="px-3 py-3">{act.fecha}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-white">{act.titulo}</div>
                        <div className="text-xs text-gray-500">{act.status}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-white font-medium">{act.totalTareas}</span>
                        {act.totalTareas > 0 && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({Math.round((act.tareasConExplicacion / act.totalTareas) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {act.tareasConExplicacion > 0 ? (
                          <span className="text-green-400 font-medium">{act.tareasConExplicacion}</span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex -space-x-2">
                          {act.colaboradores?.slice(0, 3).map((email, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 bg-black/60 border border-white/10 flex items-center justify-center text-xs font-medium text-gray-300 hover:z-10 transition-transform hover:scale-110"
                              title={email}
                            >
                              {email.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {(act.colaboradores?.length || 0) > 3 && (
                            <div className="w-7 h-7 bg-[#6841ea]/20 border border-[#6841ea]/30 flex items-center justify-center text-xs font-medium text-[#6841ea]">
                              +{(act.colaboradores?.length || 0) - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-3 py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirConfirmacionDictado(act);
                          }}
                          disabled={act.tareasConExplicacion === 0}
                          className={`
                            h-8 px-2 text-xs transition-all rounded-lg
                            ${act.tareasConExplicacion > 0
                              ? 'text-[#00ff00] hover:text-white hover:bg-[#00ff00]/20 border border-[#00ff00]/30'
                              : 'text-gray-600 cursor-not-allowed'
                            }
                          `}
                        >
                          <Mic className="w-3.5 h-3.5 mr-1" />
                          {act.tareasConExplicacion}
                        </Button>
                      </td>
                    </tr>

                    {/* Tareas expandidas */}
                    {actividadExpandida === act.actividadId && (
                      <tr>
                        <td colSpan={7} className="p-0 bg-black/60">
                          <div className="border-t border-white/5">
                            <div className="p-4">
                              <h4 className="text-sm font-medium text-white mb-3">
                                Tareas ({act.tareas.length})
                              </h4>
                              
                              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                {act.tareas.map((t) => (
                                  <div
                                    key={t.pendienteId}
                                    className="bg-black/40 border border-white/5 rounded-lg overflow-hidden transition-all duration-300 hover:border-[#6841ea]/30"
                                    onClick={() => setTareaExpandida(tareaExpandida === t.pendienteId ? null : t.pendienteId)}
                                  >
                                    <div className="p-3 cursor-pointer hover:bg-white/5 transition-colors">
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
                                            {t.prioridad && (
                                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                t.prioridad === 'ALTA' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                t.prioridad === 'MEDIA' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                              }`}>
                                                {t.prioridad}
                                              </span>
                                            )}
                                          </div>
                                          
                                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                            {t.duracionMin > 0 && (
                                              <>
                                                <span className="flex items-center gap-1">
                                                  <Clock className="w-3 h-3" />
                                                  {t.duracionMin} min
                                                </span>
                                                <span>•</span>
                                              </>
                                            )}
                                            <span className={t.terminada ? 'text-green-400' : 'text-yellow-400'}>
                                              {t.terminada ? 'Completada' : 'Pendiente'}
                                            </span>
                                            {t.tieneExplicacion && (
                                              <>
                                                <span>•</span>
                                                <span className="text-green-400 flex items-center gap-1">
                                                  <CheckCircle className="w-3 h-3" />
                                                  Con explicación
                                                </span>
                                              </>
                                            )}
                                          </div>

                                          {t.explicacionActual && tareaExpandida === t.pendienteId && (
                                            <div className="mt-3 pt-3 border-t border-white/5">
                                              <p className="text-xs text-gray-400 mb-2">
                                                {t.explicacionActual.texto}
                                              </p>
                                              <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500">
                                                  {t.explicacionActual.email?.split('@')[0]}
                                                </span>
                                                <span className="text-gray-600">
                                                  {new Date(t.explicacionActual.fecha).toLocaleDateString('es-ES')}
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
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
              <div className="inline-flex p-3 bg-black/40 rounded-lg mb-3">
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

        {/* Footer con estadísticas */}
        <div className="mt-4 flex items-center justify-between text-xs">
          <div className="text-gray-400 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/5">
            {actividadesOrdenadas.length} actividades mostradas · {
              actividadesOrdenadas.reduce((acc, act) => acc + act.tareasConExplicacion, 0)
            } explicaciones
          </div>
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
        .bg-gradient-radial {
          background: radial-gradient(circle at center, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 70%);
        }
      `}</style>
    </div>
  );
}
