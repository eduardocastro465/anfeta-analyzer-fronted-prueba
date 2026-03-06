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
  X,
  Play,
  Volume2,
  StopCircle,
  PauseCircle,
  VolumeX,
  Settings,
  LogOut
} from "lucide-react";
import {
  useActividadesData,
  obtenerFechaPorDias,
} from "@/app/reporte-del-dia/hooks/useReporteData";
import { Actividad, Tarea } from "./components/types";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";

// Hook personalizado para SÍNTESIS DE VOZ
const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([]);
  const [vozSeleccionada, setVozSeleccionada] = useState<string>("");
  
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.speechSynthesis) {
        setIsSupported(false);
        setError("Tu navegador no soporta síntesis de voz.");
      } else {
        synthesisRef.current = window.speechSynthesis;
        
        const cargarVoces = () => {
          if (synthesisRef.current) {
            const vocesDisponibles = synthesisRef.current.getVoices();
            setVoces(vocesDisponibles);
            
            const vozEspanol = vocesDisponibles.find(v => 
              v.lang.includes('es') || v.lang.includes('ES')
            );
            if (vozEspanol) {
              setVozSeleccionada(vozEspanol.name);
            }
          }
        };
        
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = cargarVoces;
        }
        
        cargarVoces();
      }
    }
  }, []);

  const hablar = (texto: string, velocidad: number = 1) => {
    if (!synthesisRef.current || !isSupported) {
      setError("Síntesis de voz no disponible");
      return false;
    }

    detener();

    try {
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-ES';
      utterance.rate = velocidad;
      utterance.volume = 1;

      if (vozSeleccionada) {
        const voz = voces.find(v => v.name === vozSeleccionada);
        if (voz) utterance.voice = voz;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setError(null);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utterance.onerror = (event) => {
        console.error('Error de síntesis:', event);
        setError(`Error al reproducir`);
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utterance.onpause = () => {
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      synthesisRef.current.speak(utterance);
      return true;
    } catch (err) {
      console.error('Error al iniciar síntesis:', err);
      setError("Error al iniciar la reproducción");
      return false;
    }
  };

  const pausar = () => {
    if (synthesisRef.current && isSpeaking) {
      synthesisRef.current.pause();
      return true;
    }
    return false;
  };

  const reanudar = () => {
    if (synthesisRef.current && isSpeaking) {
      synthesisRef.current.resume();
      return true;
    }
    return false;
  };

  const detener = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      return true;
    }
    return false;
  };

  const cambiarVoz = (nombreVoz: string) => {
    setVozSeleccionada(nombreVoz);
  };

  return {
    isSpeaking,
    isPaused,
    isSupported,
    error,
    voces,
    vozSeleccionada,
    hablar,
    pausar,
    reanudar,
    detener,
    cambiarVoz
  };
};

// Modal de confirmación de lectura
const ModalConfirmacionLectura = ({ 
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
        title: "No hay tareas seleccionadas",
        description: "Selecciona al menos una tarea para leer",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    const tareasAConfirmar = tareas.filter(t => tareasSeleccionadas.has(t.pendienteId));
    onConfirm(tareasAConfirmar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-[#6841ea]/10 rounded-lg">
              <Volume2 className="w-5 h-5 text-[#6841ea]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Confirmar lectura por voz
                <span className="ml-2 text-xs bg-[#6841ea]/20 text-[#6841ea] px-2 py-0.5 rounded-full">
                  {tareasSeleccionadas.size} de {totalTareasConExplicacion}
                </span>
              </h2>
              <p className="text-sm text-gray-400">
                {actividad.titulo} · {actividad.fecha}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 180px)" }}>
          <div className="bg-[#111] rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-400">Total tareas:</span>
                <span className="text-white font-medium">{tareas.length}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">Con explicación:</span>
                <span className="text-[#6841ea] font-medium">{totalTareasConExplicacion}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">Seleccionadas:</span>
                <span className="text-[#6841ea] font-medium">{tareasSeleccionadas.size}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111] rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Instrucciones</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-[#6841ea] mt-1">•</span>
                <span>Se leerán <span className="text-white font-medium">{tareasSeleccionadas.size}</span> tareas con explicaciones disponibles</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#6841ea] mt-1">•</span>
                <span>Puedes seleccionar/deseleccionar tareas específicas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#6841ea] mt-1">•</span>
                <span>La lectura se realizará en orden, puedes pausar y reanudar</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">Tareas a leer</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={seleccionarTodas}
                disabled={totalTareasConExplicacion === 0}
                className="h-8 px-3 text-xs text-gray-400 hover:text-white border border-[#2a2a2a]"
              >
                Seleccionar todas
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={limpiarSeleccion}
                className="h-8 px-3 text-xs text-gray-400 hover:text-white border border-[#2a2a2a]"
              >
                Limpiar
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
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
                          ? 'border-[#6841ea]/50 bg-[#6841ea]/5'
                          : 'border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a]'
                        : 'border-[#2a2a2a] bg-[#111]/50 opacity-50'
                      }
                    `}
                  >
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={estaSeleccionada}
                            onChange={() => toggleTarea(tarea.pendienteId)}
                            disabled={!tieneExplicacion}
                            className="w-4 h-4 rounded border-[#3a3a3a] bg-[#0a0a0a] text-[#6841ea] focus:ring-[#6841ea]"
                          />
                        </div>

                        <div className="flex-shrink-0 w-6 h-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-400">{index + 1}</span>
                        </div>

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
                                <span className="text-[#6841ea] flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Con explicación
                                </span>
                              </>
                            )}
                          </div>

                          {tarea.explicacionActual && (
                            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 mt-2">
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

        <div className="flex items-center justify-between gap-3 p-5 border-t border-[#2a2a2a] bg-[#111]">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Volume2 className="w-4 h-4 text-[#6841ea]" />
            <span>Se leerán {tareasSeleccionadas.size} tarea{tareasSeleccionadas.size !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-10 px-4 text-sm text-gray-400 hover:text-white border border-[#2a2a2a]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={tareasSeleccionadas.size === 0}
              className={`
                h-10 px-5 text-sm font-medium
                ${tareasSeleccionadas.size > 0
                  ? 'bg-[#6841ea] hover:bg-[#7a4cf5] text-white'
                  : 'bg-[#2a2a2a] text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar lectura ({tareasSeleccionadas.size})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal de lectura en vivo
const ModalLecturaVivo = ({ 
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
  const [velocidad, setVelocidad] = useState(1);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const { toast } = useToast();
  
  const speech = useSpeechSynthesis();

  useEffect(() => {
    if (isOpen && tareas.length > 0 && !speech.isSpeaking) {
      const tarea = tareas[tareaActual];
      if (tarea.explicacionActual) {
        const textoALeer = `${tarea.nombre}. ${tarea.explicacionActual.texto}`;
        speech.hablar(textoALeer, velocidad);
      }
    }
  }, [tareaActual, isOpen, tareas]);

  if (!isOpen) return null;
  
  if (tareas.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="bg-[#0a0a0a] border border-red-500/30 rounded-xl p-6">
          <p className="text-white">No hay tareas para leer</p>
          <Button onClick={onClose} className="mt-4">Cerrar</Button>
        </div>
      </div>
    );
  }

  const tareaAct = tareas[tareaActual];
  const progreso = ((tareaActual + 1) / tareas.length) * 100;

  const pausarReanudar = () => {
    if (speech.isPaused) {
      speech.reanudar();
      toast({
        title: "Reanudado",
        description: "Continuando con la lectura",
        duration: 2000
      });
    } else if (speech.isSpeaking) {
      speech.pausar();
      toast({
        title: "Pausado",
        description: "Lectura pausada",
        duration: 2000
      });
    }
  };

  const detenerLectura = () => {
    speech.detener();
    toast({
      title: "Lectura detenida",
      duration: 2000
    });
  };

  const siguienteTarea = () => {
    speech.detener();
    
    if (tareaActual < tareas.length - 1) {
      setTareaActual(tareaActual + 1);
    } else {
      toast({
        title: "Lectura completada",
        description: `Se leyeron ${tareas.length} tareas correctamente`,
        duration: 4000
      });
      onCompletado();
      onClose();
    }
  };

  const tareaAnterior = () => {
    if (tareaActual > 0) {
      speech.detener();
      setTareaActual(tareaActual - 1);
    }
  };

  const repetirTarea = () => {
    speech.detener();
    if (tareaAct.explicacionActual) {
      const textoALeer = `${tareaAct.nombre}. ${tareaAct.explicacionActual.texto}`;
      speech.hablar(textoALeer, velocidad);
    }
  };

  const cambiarVelocidad = (nuevaVelocidad: number) => {
    setVelocidad(nuevaVelocidad);
    if (speech.isSpeaking) {
      repetirTarea();
    }
  };

  if (!speech.isSupported) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="bg-[#0a0a0a] border border-yellow-500/30 rounded-xl w-full max-w-md p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Navegador no compatible</h3>
            <p className="text-sm text-gray-400 mb-4">
              {speech.error || "Tu navegador no soporta síntesis de voz."}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl w-full max-w-3xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-4">
            <div className={`p-2 ${speech.isSpeaking ? 'bg-[#6841ea]/20' : 'bg-[#1a1a1a]'} rounded-lg`}>
              <Volume2 className={`w-5 h-5 ${speech.isSpeaking ? 'text-[#6841ea]' : 'text-gray-500'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Lectura por voz
              </h2>
              <p className="text-sm text-gray-400">
                Tarea {tareaActual + 1} de {tareas.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarConfig(!mostrarConfig)}
              className="p-1 hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="h-1 bg-[#1a1a1a]">
          <div 
            className="h-full bg-[#6841ea] transition-all duration-300"
            style={{ width: `${progreso}%` }}
          />
        </div>

        {mostrarConfig && (
          <div className="p-5 border-b border-[#2a2a2a] bg-[#111]">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Configuración de voz</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Velocidad</label>
                <div className="flex items-center gap-2">
                  <VolumeX className="w-4 h-4 text-gray-500" />
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={velocidad}
                    onChange={(e) => cambiarVelocidad(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer"
                  />
                  <Volume2 className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-white w-12">{velocidad.toFixed(1)}x</span>
                </div>
              </div>

              {speech.voces.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Voz</label>
                  <select
                    value={speech.vozSeleccionada}
                    onChange={(e) => speech.cambiarVoz(e.target.value)}
                    className="w-full h-9 text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 text-gray-300"
                  >
                    {speech.voces.map((voz) => (
                      <option key={voz.name} value={voz.name}>
                        {voz.name} ({voz.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">TAREA ACTUAL</h3>
            <p className="text-base font-medium text-white mb-2">{tareaAct.nombre}</p>
            {tareaAct.explicacionActual && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 mt-2">
                <p className="text-xs text-gray-500 mb-1">Explicación:</p>
                <p className="text-sm text-gray-300">{tareaAct.explicacionActual.texto}</p>
              </div>
            )}
          </div>

          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">ESTADO</span>
              {speech.isSpeaking && !speech.isPaused && (
                <span className="flex items-center gap-2 text-xs text-[#6841ea]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6841ea] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6841ea]"></span>
                  </span>
                  Leyendo...
                </span>
              )}
              {speech.isPaused && (
                <span className="text-xs text-yellow-400">Pausado</span>
              )}
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 min-h-[60px]">
              <p className="text-sm text-gray-400">
                {speech.isSpeaking 
                  ? (speech.isPaused ? "Lectura pausada" : "Hablando...") 
                  : "Listo para leer"}
              </p>
            </div>
          </div>

          {speech.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-400 text-center">{speech.error}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={tareaAnterior}
              disabled={tareaActual === 0}
              variant="ghost"
              className="h-10 px-4 text-gray-400 hover:text-white border border-[#2a2a2a] disabled:opacity-50"
            >
              ← Anterior
            </Button>

            <Button
              onClick={repetirTarea}
              variant="ghost"
              className="h-10 w-10 p-0 text-gray-400 hover:text-white border border-[#2a2a2a]"
              title="Repetir tarea actual"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              onClick={pausarReanudar}
              disabled={!speech.isSpeaking}
              variant="ghost"
              className="h-10 w-10 p-0 text-gray-400 hover:text-white border border-[#2a2a2a] disabled:opacity-50"
            >
              {speech.isPaused ? <Play className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
            </Button>

            <Button
              onClick={detenerLectura}
              disabled={!speech.isSpeaking}
              variant="ghost"
              className="h-10 w-10 p-0 text-gray-400 hover:text-white border border-[#2a2a2a] disabled:opacity-50"
            >
              <StopCircle className="w-4 h-4" />
            </Button>

            <Button
              onClick={siguienteTarea}
              variant="ghost"
              className="h-10 px-4 text-gray-400 hover:text-white border border-[#2a2a2a]"
            >
              {tareaActual < tareas.length - 1 ? 'Siguiente →' : 'Finalizar'}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            {[0.75, 1, 1.25, 1.5].map((v) => (
              <button
                key={v}
                onClick={() => cambiarVelocidad(v)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  velocidad === v
                    ? 'bg-[#6841ea] text-white'
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'
                }`}
              >
                {v}x
              </button>
            ))}
          </div>
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

  const [filtroFecha, setFiltroFecha] = useState<string>("hoy");
  const [filtroColaborador, setFiltroColaborador] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busquedaTexto, setBusquedaTexto] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  
  const [ordenarPor, setOrdenarPor] = useState<string>("fecha");
  const [ordenAsc, setOrdenAsc] = useState<boolean>(false);
  
  const [actividadExpandida, setActividadExpandida] = useState<string | null>(null);
  const [tareaExpandida, setTareaExpandida] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  
  const [modalLecturaAbierto, setModalLecturaAbierto] = useState(false);
  const [modalLecturaVivoAbierto, setModalLecturaVivoAbierto] = useState(false);
  const [actividadParaLectura, setActividadParaLectura] = useState<Actividad | null>(null);
  const [tareasParaLectura, setTareasParaLectura] = useState<Tarea[]>([]);

  const fechaActual = new Date().toISOString().split("T")[0];

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Sesión cerrada",
        description: "Hasta pronto",
        duration: 2000
      });
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
      toast({
        title: "Error al cerrar sesión",
        description: "Intenta nuevamente",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      localStorage.removeItem("colaborador");
      localStorage.removeItem("actividades");
      router.push("/");
    }
  };

  const abrirConfirmacionLectura = (actividad: Actividad) => {
    const tareasConExplicacion = actividad.tareas.filter(t => t.tieneExplicacion === true);
    
    if (tareasConExplicacion.length === 0) {
      toast({
        title: "No hay tareas para leer",
        description: "Esta actividad no tiene tareas con explicaciones",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    setActividadParaLectura(actividad);
    setTareasParaLectura(tareasConExplicacion);
    setModalLecturaAbierto(true);
    
    toast({
      title: "Preparando lectura",
      description: `Se encontraron ${tareasConExplicacion.length} tareas con explicaciones`,
      duration: 3000
    });
  };

  const iniciarLecturaGlobal = () => {
    const actividadesFiltradasActuales = actividadesFiltradas;
    
    if (actividadesFiltradasActuales.length === 0) {
      toast({
        title: "No hay actividades",
        description: "No se encontraron actividades con los filtros actuales",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    const tareasConExplicacion = actividadesFiltradasActuales.flatMap(act => 
      act.tareas.filter(t => t.tieneExplicacion === true)
    );
    
    if (tareasConExplicacion.length === 0) {
      toast({
        title: "No hay tareas para leer",
        description: "No se encontraron tareas con explicaciones",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    setModalLecturaAbierto(false);
    setTareasParaLectura(tareasConExplicacion);
    
    setTimeout(() => {
      setModalLecturaVivoAbierto(true);
    }, 100);
    
    toast({
      title: "Iniciando lectura",
      description: `Se leerán ${tareasConExplicacion.length} tareas`,
      duration: 3000
    });
  };

  const iniciarLecturaConfirmada = (tareasSeleccionadas: Tarea[]) => {
    setModalLecturaAbierto(false);
    setTareasParaLectura(tareasSeleccionadas);
    
    setTimeout(() => {
      setModalLecturaVivoAbierto(true);
    }, 100);
    
    toast({
      title: "Lectura iniciada",
      description: `Comenzando con ${tareasSeleccionadas.length} tarea${tareasSeleccionadas.length !== 1 ? 's' : ''}`,
      duration: 3000
    });
  };

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
    const status = new Set(actividades.map(a => a.status).filter(Boolean));
    return Array.from(status).sort();
  }, [actividades]);

  const actividadesFiltradas = useMemo(() => {
    if (!actividades) return [];
    return actividades.filter(act => {
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
      
      if (filtroColaborador !== "todos") {
        if (!act.colaboradores?.includes(filtroColaborador)) return false;
      }
      
      if (filtroStatus !== "todos" && act.status !== filtroStatus) return false;
      
      if (busquedaTexto) {
        const t = busquedaTexto.toLowerCase();
        if (!act.titulo.toLowerCase().includes(t) && 
            !act.tareas.some(ta => 
              ta.nombre.toLowerCase().includes(t) || 
              (ta.descripcion && ta.descripcion.toLowerCase().includes(t)) ||
              (ta.explicacionActual?.texto.toLowerCase().includes(t))
            )) return false;
      }
      return true;
    });
  }, [actividades, filtroFecha, filtroColaborador, filtroStatus, busquedaTexto, fechaInicio, fechaFin, fechaActual]);

  const actividadesOrdenadas = useMemo(() => {
    return [...actividadesFiltradas].sort((a, b) => {
      let cmp = 0;
      if (ordenarPor === "fecha") cmp = a.fecha.localeCompare(b.fecha);
      else if (ordenarPor === "titulo") cmp = a.titulo.localeCompare(b.titulo);
      else if (ordenarPor === "tareas") cmp = (a.totalTareas||0) - (b.totalTareas||0);
      else if (ordenarPor === "explicaciones") cmp = (a.tareasConExplicacion||0) - (b.tareasConExplicacion||0);
      return ordenAsc ? cmp : -cmp;
    });
  }, [actividadesFiltradas, ordenarPor, ordenAsc]);

  const toggleOrden = (c: string) => {
    if (ordenarPor === c) setOrdenAsc(!ordenAsc);
    else { setOrdenarPor(c); setOrdenAsc(false); }
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
      description: "Filtros restablecidos",
      duration: 2000
    });
  };

  if (loading) return <LoadingScreen />;
  if (error || !actividades) return <ErrorScreen onRetry={() => cargarActividades(true)} />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 p-6">
      {/* Modal de confirmación de lectura */}
      <ModalConfirmacionLectura 
        isOpen={modalLecturaAbierto}
        onClose={() => setModalLecturaAbierto(false)}
        onConfirm={iniciarLecturaConfirmada}
        actividad={actividadParaLectura}
        tareas={tareasParaLectura}
      />

      {/* Modal de lectura vivo */}
      <ModalLecturaVivo 
        isOpen={modalLecturaVivoAbierto}
        onClose={() => setModalLecturaVivoAbierto(false)}
        tareas={tareasParaLectura}
        onCompletado={() => {
          toast({
            title: "Lectura completada",
            description: "Todas las tareas han sido leídas",
            duration: 4000
          });
        }}
      />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Panel de Actividades
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {actividadesOrdenadas.length} actividades · {totalTareas} tareas · {
                actividades.reduce((acc, act) => acc + act.tareasConExplicacion, 0)
              } explicaciones
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="default"
              onClick={iniciarLecturaGlobal}
              className="h-10 px-4 bg-[#6841ea] hover:bg-[#7a4cf5] text-white"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Leer reportes
              {actividadesFiltradas.length > 0 && (
                <span className="ml-2 bg-[#7a4cf5] px-2 py-0.5 rounded-full text-xs">
                  {actividadesFiltradas.flatMap(act => act.tareas).filter(t => t.tieneExplicacion === true).length}
                </span>
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="h-9 px-3 text-gray-400 hover:text-white border border-[#2a2a2a]"
            >
              <Filter className="w-4 h-4 mr-2" />
              {mostrarFiltros ? 'Ocultar' : 'Mostrar'} filtros
            </Button>

            <Button
              size="sm"
              onClick={() => cargarActividades(true)}
              disabled={refreshing}
              className="h-9 px-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border border-[#2a2a2a]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>

            <Button
              size="sm"
              onClick={handleLogout}
              className="h-9 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total actividades</p>
                <p className="text-2xl font-semibold text-white">{totalActividades}</p>
              </div>
              <div className="p-2 bg-[#6841ea]/10 rounded-lg">
                <FileText className="w-5 h-5 text-[#6841ea]" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Tareas totales</p>
                <p className="text-2xl font-semibold text-white">{totalTareas}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <ListChecks className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Explicaciones</p>
                <p className="text-2xl font-semibold text-white">
                  {actividades.reduce((acc, act) => acc + act.tareasConExplicacion, 0)}
                </p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Colaboradores</p>
                <p className="text-2xl font-semibold text-white">
                  {colaboradoresUnicos.length}
                </p>
              </div>
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Users className="w-5 h-5 text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={busquedaTexto}
                  onChange={e => setBusquedaTexto(e.target.value)}
                  placeholder="Buscar actividades, tareas..."
                  className="pl-9 h-10 text-sm bg-[#0a0a0a] border-[#2a2a2a] text-gray-300 placeholder:text-gray-600"
                />
              </div>
              
              <div className="lg:col-span-2">
                <select
                  value={filtroFecha}
                  onChange={e => setFiltroFecha(e.target.value)}
                  className="w-full h-10 text-sm bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 text-gray-300"
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
                  className="w-full h-10 text-sm bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 text-gray-300"
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
                  className="w-full h-10 text-sm bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 text-gray-300"
                >
                  <option value="todos">Todos los estados</option>
                  {statusUnicos.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <div className="lg:col-span-3 flex gap-2">
                <Button
                  variant="ghost"
                  onClick={limpiarFiltros}
                  className="flex-1 h-10 text-sm text-gray-400 hover:text-white border border-[#2a2a2a]"
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
                  className="h-10 text-sm bg-[#0a0a0a] border-[#2a2a2a] text-gray-300"
                />
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  className="h-10 text-sm bg-[#0a0a0a] border-[#2a2a2a] text-gray-300"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabla principal */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#111] border border-[#2a2a2a] overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0a0a0a] border-b border-[#2a2a2a]">
                <tr>
                  <th className="px-3 py-3 w-6"></th>
                  <th className="px-3 py-3 text-left cursor-pointer hover:text-white" onClick={() => toggleOrden("fecha")}>
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Fecha
                      {ordenarPor === "fecha" && (ordenAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </span>
                  </th>
                  <th className="px-3 py-3 text-left cursor-pointer hover:text-white" onClick={() => toggleOrden("titulo")}>
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
              
              <tbody className="divide-y divide-[#2a2a2a]">
                {actividadesOrdenadas.map((act) => (
                  <React.Fragment key={act.actividadId}>
                    <tr 
                      className="hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                      onClick={() => setActividadExpandida(actividadExpandida === act.actividadId ? null : act.actividadId)}
                    >
                      <td className="px-3 py-3">
                        <div className="p-1">
                          {actividadExpandida === act.actividadId ? 
                            <ChevronUp className="w-4 h-4 text-gray-400" /> : 
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          }
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-300">{act.fecha}</td>
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
                          <span className="text-[#6841ea] font-medium">{act.tareasConExplicacion}</span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex -space-x-2">
                          {act.colaboradores?.slice(0, 3).map((email, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full flex items-center justify-center text-xs font-medium text-gray-300 hover:z-10 transition-transform hover:scale-110"
                              title={email}
                            >
                              {email.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {(act.colaboradores?.length || 0) > 3 && (
                            <div className="w-7 h-7 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full flex items-center justify-center text-xs font-medium text-gray-400">
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
                            abrirConfirmacionLectura(act);
                          }}
                          disabled={act.tareasConExplicacion === 0}
                          className={`
                            h-8 px-2 text-xs
                            ${act.tareasConExplicacion > 0
                              ? 'text-[#6841ea] hover:text-white hover:bg-[#6841ea]/20 border border-[#6841ea]/30'
                              : 'text-gray-600 cursor-not-allowed'
                            }
                          `}
                        >
                          <Volume2 className="w-3.5 h-3.5 mr-1" />
                          {act.tareasConExplicacion}
                        </Button>
                      </td>
                    </tr>

                    {/* Tareas expandidas */}
                    {actividadExpandida === act.actividadId && (
                      <tr>
                        <td colSpan={7} className="p-0 bg-[#0a0a0a]">
                          <div className="border-t border-[#2a2a2a]">
                            <div className="p-4">
                              <h4 className="text-sm font-medium text-gray-300 mb-3">
                                Tareas ({act.tareas.length})
                              </h4>
                              
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {act.tareas.map((t) => (
                                  <div
                                    key={t.pendienteId}
                                    className="bg-[#111] border border-[#2a2a2a] rounded-lg overflow-hidden hover:border-[#3a3a3a] transition-colors"
                                  >
                                    <div 
                                      className="p-3 cursor-pointer hover:bg-[#1a1a1a]"
                                      onClick={() => setTareaExpandida(tareaExpandida === t.pendienteId ? null : t.pendienteId)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="p-1">
                                          {tareaExpandida === t.pendienteId ? 
                                            <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : 
                                            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                          }
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
                                                <span className="text-[#6841ea] flex items-center gap-1">
                                                  <CheckCircle className="w-3 h-3" />
                                                  Con explicación
                                                </span>
                                              </>
                                            )}
                                          </div>

                                          {t.explicacionActual && tareaExpandida === t.pendienteId && (
                                            <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                                              <p className="text-sm text-gray-300 mb-2">
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
              <div className="inline-flex p-3 bg-[#1a1a1a] rounded-lg mb-3">
                <AlertCircle className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm">No se encontraron actividades</p>
              <p className="text-xs text-gray-600 mt-1">Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs">
          <div className="text-gray-500 bg-[#111] border border-[#2a2a2a] px-3 py-1.5 rounded-lg">
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
      `}</style>
    </div>
  );
}