"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchColaboradores, fetchActividadesByUser } from "@/lib/api";
import type { Colaborador, Actividad } from "@/lib/types";
import {
  User,
  Mail,
  ListTodo,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Moon,
  Sun,
} from "lucide-react";

interface LoginFormProps {
  onLogin: (colaborador: Colaborador, actividades: Actividad[]) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [colaboradorInfo, setColaboradorInfo] = useState<Colaborador | null>(
    null
  );
  const [actividadesCount, setActividadesCount] = useState<number>(0);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [isLoadingColaboradores, setIsLoadingColaboradores] = useState(true);
  const [isLoadingActividades, setIsLoadingActividades] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    loadColaboradores();

    // Detectar tema del sistema
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const loadColaboradores = async () => {
    setIsLoadingColaboradores(true);
    setError(null);
    try {
      const data = await fetchColaboradores();
      setColaboradores(data);
    } catch (err) {
      setError("Error al cargar colaboradores. Verifica tu conexión.");
      console.error(err);
    } finally {
      setIsLoadingColaboradores(false);
    }
  };

  useEffect(() => {
    if (selectedId) {
      const colaborador = colaboradores.find((c) => c._id === selectedId);
      setColaboradorInfo(colaborador || null);

      if (colaborador?.email) {
        loadActividades(colaborador.email);
      }
    } else {
      setColaboradorInfo(null);
      setActividadesCount(0);
      setActividades([]);
    }
  }, [selectedId, colaboradores]);

  const loadActividades = async (email: string) => {
    setIsLoadingActividades(true);
    try {
      const data = await fetchActividadesByUser(email);
      setActividades(data);
      setActividadesCount(data.length);
    } catch (err) {
      console.error(err);
      setActividades([]);
      setActividadesCount(0);
    } finally {
      setIsLoadingActividades(false);
    }
  };

  const handleAcceder = () => {
    if (colaboradorInfo && actividades.length > 0) {
      onLogin(colaboradorInfo, actividades);
    }
  };

  const getDisplayName = (colaborador: Colaborador) => {
    if (colaborador.firstName || colaborador.lastName) {
      return `${colaborador.firstName || ""} ${
        colaborador.lastName || ""
      }`.trim();
    }
    return colaborador.email.split("@")[0];
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fondo decorativo con gradientes */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-500">
        {/* Elementos decorativos */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-400/20 to-blue-400/20 dark:from-violet-600/10 dark:to-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/20 to-violet-400/20 dark:from-blue-600/10 dark:to-violet-600/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        {/* Patrón de puntos decorativos */}
        <div
          className="absolute inset-0 opacity-30 dark:opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(139, 92, 246, 0.15) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Botón de tema flotante */}
      <div className="absolute top-6 right-6 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full w-12 h-12 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-violet-200 dark:border-violet-800 hover:scale-110 transition-all duration-300 hover:shadow-xl hover:shadow-violet-300/50 dark:hover:shadow-violet-700/50"
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 text-violet-700 dark:text-violet-300 transition-transform duration-300 rotate-0 hover:rotate-12" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500 transition-transform duration-300 rotate-0 hover:rotate-180" />
          )}
        </Button>
      </div>

      {/* Contenido principal */}
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Borde superior decorativo */}
          <div className="h-1.5 bg-gradient-to-r from-violet-500 via-blue-500 to-violet-500 animate-gradient bg-[length:200%_auto]" />

          <CardHeader className="text-center space-y-4 pt-8 pb-6">
            {/* Ícono principal con efecto */}
            <div className="mx-auto relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-violet-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <User className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
            </div>

            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 dark:from-violet-400 dark:to-blue-400 bg-clip-text text-transparent">
                Registro de Actividades
              </CardTitle>
              <CardDescription className="text-base text-slate-600 dark:text-slate-300">
                Selecciona tu usuario para comenzar a registrar tus tareas
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-8">
            {error && (
              <div className="relative p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{error}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                      onClick={loadColaboradores}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Reintentar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                Colaborador
              </label>

              {isLoadingColaboradores ? (
                <div className="flex items-center justify-center p-6 border-2 border-dashed border-violet-200 dark:border-violet-800 rounded-xl bg-violet-50/50 dark:bg-violet-950/20">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-600 dark:text-violet-400" />
                  <span className="ml-3 text-sm font-medium text-violet-700 dark:text-violet-300">
                    Cargando colaboradores...
                  </span>
                </div>
              ) : (
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="w-full h-12 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600 focus:border-violet-500 dark:focus:border-violet-500 transition-colors rounded-xl bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Selecciona tu usuario..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2">
                    {colaboradores.map((colaborador) => (
                      <SelectItem
                        key={colaborador._id}
                        value={colaborador._id}
                        className="rounded-lg my-1"
                      >
                        <div className="flex items-center gap-3 py-1">
                          {colaborador.avatar ? (
                            <img
                              src={colaborador.avatar || "/placeholder.svg"}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover ring-2 ring-violet-200 dark:ring-violet-800"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <span className="font-medium">
                            {getDisplayName(colaborador)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {colaboradorInfo && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-500">
                {/* Tarjeta de información del colaborador */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/50 border-2 border-violet-100 dark:border-violet-900/50 p-5 shadow-lg">
                  {/* Patrón de fondo */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-400/10 to-blue-400/10 dark:from-violet-600/5 dark:to-blue-600/5 rounded-full blur-2xl" />

                  <div className="relative space-y-4">
                    <div className="flex items-center gap-4">
                      {colaboradorInfo.avatar ? (
                        <img
                          src={colaboradorInfo.avatar || "/placeholder.svg"}
                          alt=""
                          className="w-14 h-14 rounded-full object-cover ring-4 ring-white dark:ring-slate-700 shadow-lg"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-white dark:ring-slate-700">
                          {getDisplayName(colaboradorInfo)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-lg text-slate-900 dark:text-white">
                          {getDisplayName(colaboradorInfo)}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mt-1">
                          <Mail className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          {colaboradorInfo.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t-2 border-violet-200/50 dark:border-violet-800/50">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        Tareas asignadas
                      </span>
                      {isLoadingActividades ? (
                        <Loader2 className="w-5 h-5 animate-spin text-violet-600 dark:text-violet-400" />
                      ) : (
                        <Badge
                          variant={
                            actividadesCount > 0 ? "default" : "secondary"
                          }
                          className={`px-3 py-1 text-sm font-bold ${
                            actividadesCount > 0
                              ? "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 shadow-md"
                              : ""
                          }`}
                        >
                          {actividadesCount}{" "}
                          {actividadesCount === 1 ? "tarea" : "tareas"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón de acceso */}
                <Button
                  onClick={handleAcceder}
                  className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-violet-300/50 dark:hover:shadow-violet-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  disabled={actividadesCount === 0 || isLoadingActividades}
                >
                  {isLoadingActividades ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Cargando tareas...
                    </>
                  ) : actividadesCount > 0 ? (
                    <>
                      Acceder al ChatBot
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : (
                    "No hay tareas asignadas"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
