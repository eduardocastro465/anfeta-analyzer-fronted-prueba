"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  TrendingUp,
  Calendar,
  Eye,
  Sparkles,
  User,
  Briefcase,
  Target,
  Lightbulb,
  MessageSquare,
  Globe,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ==================== TIPOS ====================
interface Memoria {
  odooUserId: string;
  email?: string;
  memorias: {
    preferencias: string[];
    personal: string[];
    trabajo: string[];
    habilidades: string[];
    objetivos: string[];
    general: string[];
    conversaciones: string[];
  };
  historialConversaciones: Array<{
    ia: "usuario" | "ia";
    resumenConversacion: string;
    timestamp: Date;
  }>;
  relevancia: number;
  vecesAccedida: number;
  ultimoAcceso: Date;
  activa: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MemoryManagerProps {
  theme: "light" | "dark";
  userId: string;
}

type CategoriaMemoria = keyof Memoria["memorias"];

// ==================== CONFIGURACIÓN DE CATEGORÍAS ====================
const CATEGORIAS_CONFIG: Record<
  CategoriaMemoria,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    description: string;
  }
> = {
  preferencias: {
    label: "Preferencias",
    icon: Sparkles,
    color: "text-purple-500",
    description: "Gustos, preferencias y configuraciones personales",
  },
  personal: {
    label: "Personal",
    icon: User,
    color: "text-blue-500",
    description: "Información personal y familiar",
  },
  trabajo: {
    label: "Trabajo",
    icon: Briefcase,
    color: "text-green-500",
    description: "Información laboral y profesional",
  },
  habilidades: {
    label: "Habilidades",
    icon: Lightbulb,
    color: "text-yellow-500",
    description: "Capacidades, conocimientos y competencias",
  },
  objetivos: {
    label: "Objetivos",
    icon: Target,
    color: "text-red-500",
    description: "Metas, aspiraciones y planes futuros",
  },
  general: {
    label: "General",
    icon: Globe,
    color: "text-gray-500",
    description: "Información general y miscelánea",
  },
  conversaciones: {
    label: "Conversaciones",
    icon: MessageSquare,
    color: "text-indigo-500",
    description: "Contexto e información de conversaciones pasadas",
  },
};

// ==================== COMPONENTE PRINCIPAL ====================
export function MemoryManager({ theme, userId }: MemoryManagerProps) {
  const [open, setOpen] = useState(false);
  const [memoria, setMemoria] = useState<Memoria | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [categoriaActiva, setCategoriaActiva] =
    useState<CategoriaMemoria>("preferencias");

  // Estados para edición
  const [editandoIndice, setEditandoIndice] = useState<number | null>(null);
  const [valorTemporal, setValorTemporal] = useState("");
  const [agregandoNuevo, setAgregandoNuevo] = useState(false);
  const [nuevoValor, setNuevoValor] = useState("");

  const { toast } = useToast();

  // ==================== CARGAR MEMORIA ====================
  const cargarMemoria = async () => {
    try {
      setCargando(true);

      const response = await fetch(`/api/memoria/${userId}`);

      if (!response.ok) {
        if (response.status === 404) {
          // No existe memoria, crear una vacía
          setMemoria({
            odooUserId: userId,
            memorias: {
              preferencias: [],
              personal: [],
              trabajo: [],
              habilidades: [],
              objetivos: [],
              general: [],
              conversaciones: [],
            },
            historialConversaciones: [],
            relevancia: 0.5,
            vecesAccedida: 0,
            ultimoAcceso: new Date(),
            activa: true,
          });
          return;
        }
        throw new Error("Error al cargar memoria");
      }

      const data = await response.json();
      setMemoria(data.data);
    } catch (error) {
      console.error("Error al cargar memoria:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la memoria del usuario",
      });
    } finally {
      setCargando(false);
    }
  };

  // ==================== AGREGAR MEMORIA ====================
  const agregarMemoria = async () => {
    if (!nuevoValor.trim() || !memoria) return;

    try {
      setGuardando(true);

      const response = await fetch(`/api/memoria/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria: categoriaActiva,
          valor: nuevoValor.trim(),
        }),
      });

      if (!response.ok) throw new Error("Error al agregar memoria");

      const data = await response.json();

      // Actualizar estado local
      setMemoria(data.data);
      setNuevoValor("");
      setAgregandoNuevo(false);

      toast({
        variant: "success",
        title: "Memoria agregada",
        description: "La información se guardó correctamente",
      });
    } catch (error) {
      console.error("Error al agregar memoria:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar la memoria",
      });
    } finally {
      setGuardando(false);
    }
  };

  // ==================== EDITAR MEMORIA ====================
  const editarMemoria = async (indice: number) => {
    if (!valorTemporal.trim() || !memoria) return;

    try {
      setGuardando(true);

      const response = await fetch(`/api/memoria/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria: categoriaActiva,
          indice: indice,
          nuevoValor: valorTemporal.trim(),
        }),
      });

      if (!response.ok) throw new Error("Error al editar memoria");

      const data = await response.json();

      // Actualizar estado local
      setMemoria(data.data);
      setEditandoIndice(null);
      setValorTemporal("");

      toast({
        variant: "success",
        title: "Memoria actualizada",
        description: "Los cambios se guardaron correctamente",
      });
    } catch (error) {
      console.error("Error al editar memoria:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la memoria",
      });
    } finally {
      setGuardando(false);
    }
  };

  // ==================== ELIMINAR MEMORIA ====================
  const eliminarMemoria = async (indice: number) => {
    if (!memoria) return;

    try {
      setGuardando(true);

      const response = await fetch(`/api/memoria/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria: categoriaActiva,
          indice: indice,
        }),
      });

      if (!response.ok) throw new Error("Error al eliminar memoria");

      const data = await response.json();

      // Actualizar estado local
      setMemoria(data.data);

      toast({
        variant: "success",
        title: "Memoria eliminada",
        description: "La información se eliminó correctamente",
      });
    } catch (error) {
      console.error("Error al eliminar memoria:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la memoria",
      });
    } finally {
      setGuardando(false);
    }
  };

  // ==================== EFECTOS ====================
  useEffect(() => {
    if (open) {
      cargarMemoria();
    }
  }, [open, userId]);

  // ==================== ESTADÍSTICAS ====================
  const calcularEstadisticas = () => {
    if (!memoria) return null;

    const totalMemorias = Object.values(memoria.memorias).reduce(
      (sum, arr) => sum + arr.length,
      0
    );

    return {
      total: totalMemorias,
      relevancia: Math.round(memoria.relevancia * 100),
      accesos: memoria.vecesAccedida,
      ultimoAcceso: memoria.ultimoAcceso,
    };
  };

  const stats = calcularEstadisticas();

  // ==================== RENDER ====================
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`
            gap-2
            ${
              theme === "dark"
                ? "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }
          `}
        >
          <Brain className="w-4 h-4" />
          <span className="hidden sm:inline">Memoria</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        className={`
          max-w-4xl max-h-[85vh] font-['Arial']
          ${
            theme === "dark"
              ? "bg-[#0a0a0a] border-[#1a1a1a]"
              : "bg-white border-gray-200"
          }
        `}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="w-6 h-6 text-[#6841ea]" />
            Administrador de Memoria
          </DialogTitle>
          <DialogDescription
            className={theme === "dark" ? "text-gray-400" : "text-gray-600"}
          >
            Gestiona la información que el chatbot recuerda sobre ti
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#6841ea]" />
          </div>
        ) : !memoria ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="w-12 h-12 text-gray-400" />
            <p className="text-sm text-gray-500">
              No se pudo cargar la memoria
            </p>
            <Button onClick={cargarMemoria} variant="outline" size="sm">
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ========== ESTADÍSTICAS ========== */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card
                  className={
                    theme === "dark"
                      ? "bg-[#1a1a1a] border-[#2a2a2a]"
                      : "bg-gray-50"
                  }
                >
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">
                      Total Memorias
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-[#6841ea]" />
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={
                    theme === "dark"
                      ? "bg-[#1a1a1a] border-[#2a2a2a]"
                      : "bg-gray-50"
                  }
                >
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">
                      Relevancia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <p className="text-2xl font-bold">{stats.relevancia}%</p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={
                    theme === "dark"
                      ? "bg-[#1a1a1a] border-[#2a2a2a]"
                      : "bg-gray-50"
                  }
                >
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">
                      Accesos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-500" />
                      <p className="text-2xl font-bold">{stats.accesos}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={
                    theme === "dark"
                      ? "bg-[#1a1a1a] border-[#2a2a2a]"
                      : "bg-gray-50"
                  }
                >
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">
                      Último Acceso
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <p className="text-xs font-medium">
                        {new Date(stats.ultimoAcceso).toLocaleDateString(
                          "es-MX",
                          {
                            day: "2-digit",
                            month: "short",
                          }
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ========== TABS POR CATEGORÍA ========== */}
            <Tabs
              value={categoriaActiva}
              onValueChange={(v) => {
                setCategoriaActiva(v as CategoriaMemoria);
                setEditandoIndice(null);
                setAgregandoNuevo(false);
                setNuevoValor("");
              }}
            >
              <ScrollArea className="w-full">
                <TabsList
                  className={`
                    w-full justify-start
                    ${
                      theme === "dark"
                        ? "bg-[#1a1a1a] border-[#2a2a2a]"
                        : "bg-gray-100"
                    }
                  `}
                >
                  {Object.entries(CATEGORIAS_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const count = memoria.memorias[key as CategoriaMemoria].length;

                    return (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="gap-2 data-[state=active]:bg-[#6841ea] data-[state=active]:text-white"
                      >
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <span className="hidden sm:inline">{config.label}</span>
                        <Badge
                          variant="secondary"
                          className="ml-1 h-5 min-w-[20px] px-1"
                        >
                          {count}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </ScrollArea>

              {Object.entries(CATEGORIAS_CONFIG).map(([key, config]) => {
                const memorias = memoria.memorias[key as CategoriaMemoria];

                return (
                  <TabsContent key={key} value={key} className="space-y-3 mt-4">
                    {/* Descripción de categoría */}
                    <div
                      className={`
                        p-3 rounded-lg
                        ${
                          theme === "dark"
                            ? "bg-[#1a1a1a] border border-[#2a2a2a]"
                            : "bg-gray-50 border border-gray-200"
                        }
                      `}
                    >
                      <p className="text-sm text-gray-500">
                        {config.description}
                      </p>
                    </div>

                    {/* Lista de memorias */}
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2 pr-4">
                        {memorias.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <config.icon className="w-12 h-12 text-gray-400 mb-3" />
                            <p className="text-sm text-gray-500">
                              No hay memorias en esta categoría
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Agrega información para que el chatbot la recuerde
                            </p>
                          </div>
                        ) : (
                          memorias.map((item, index) => (
                            <div
                              key={index}
                              className={`
                                p-3 rounded-lg border transition-all
                                ${
                                  theme === "dark"
                                    ? "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]"
                                    : "bg-white border-gray-200 hover:border-gray-300"
                                }
                              `}
                            >
                              {editandoIndice === index ? (
                                // Modo edición
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={valorTemporal}
                                    onChange={(e) =>
                                      setValorTemporal(e.target.value)
                                    }
                                    className={`
                                      flex-1
                                      ${
                                        theme === "dark"
                                          ? "bg-[#0a0a0a] border-[#2a2a2a]"
                                          : "bg-gray-50"
                                      }
                                    `}
                                    placeholder="Editar memoria..."
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        editarMemoria(index);
                                      } else if (e.key === "Escape") {
                                        setEditandoIndice(null);
                                        setValorTemporal("");
                                      }
                                    }}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => editarMemoria(index)}
                                    disabled={guardando || !valorTemporal.trim()}
                                    className="text-green-500 hover:text-green-600"
                                  >
                                    {guardando ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditandoIndice(null);
                                      setValorTemporal("");
                                    }}
                                    disabled={guardando}
                                    className="text-gray-500 hover:text-gray-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                // Modo visualización
                                <div className="flex items-start justify-between gap-3">
                                  <p className="flex-1 text-sm">{item}</p>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditandoIndice(index);
                                        setValorTemporal(item);
                                      }}
                                      disabled={guardando}
                                      className={`
                                        w-8 h-8
                                        ${
                                          theme === "dark"
                                            ? "text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                        }
                                      `}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => eliminarMemoria(index)}
                                      disabled={guardando}
                                      className="w-8 h-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    >
                                      {guardando ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}

                        {/* Formulario para agregar nueva memoria */}
                        {agregandoNuevo ? (
                          <div
                            className={`
                              p-3 rounded-lg border
                              ${
                                theme === "dark"
                                  ? "bg-[#1a1a1a] border-[#6841ea]"
                                  : "bg-white border-[#6841ea]"
                              }
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <Input
                                value={nuevoValor}
                                onChange={(e) => setNuevoValor(e.target.value)}
                                className={`
                                  flex-1
                                  ${
                                    theme === "dark"
                                      ? "bg-[#0a0a0a] border-[#2a2a2a]"
                                      : "bg-gray-50"
                                  }
                                `}
                                placeholder="Escribe la nueva memoria..."
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    agregarMemoria();
                                  } else if (e.key === "Escape") {
                                    setAgregandoNuevo(false);
                                    setNuevoValor("");
                                  }
                                }}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={agregarMemoria}
                                disabled={guardando || !nuevoValor.trim()}
                                className="text-green-500 hover:text-green-600"
                              >
                                {guardando ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setAgregandoNuevo(false);
                                  setNuevoValor("");
                                }}
                                disabled={guardando}
                                className="text-gray-500 hover:text-gray-600"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setAgregandoNuevo(true)}
                            variant="outline"
                            className={`
                              w-full gap-2 border-dashed
                              ${
                                theme === "dark"
                                  ? "border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-[#6841ea]"
                                  : "border-gray-300 hover:bg-gray-50 hover:border-[#6841ea]"
                              }
                            `}
                          >
                            <Plus className="w-4 h-4" />
                            Agregar nueva memoria
                          </Button>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}