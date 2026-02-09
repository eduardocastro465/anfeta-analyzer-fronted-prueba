import { useState, useEffect, useCallback } from "react";
import { ApiResponse } from "../components/types";
import { useToast } from "@/components/ui/use-toast";

export const useReporteData = () => {
  const [datos, setDatos] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tiempoUltimaCarga, setTiempoUltimaCarga] = useState<string>("");
  const { toast } = useToast();

  const cargarDatosReales = useCallback(
    async (forceRefresh = false) => {
      const startTime = Date.now();

      try {
        if (forceRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const response = await fetch(
          "http://localhost:4001/api/v1/admin/todas-explicaciones",
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          },
        );

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result: ApiResponse = await response.json();

        if (!result.success) {
          throw new Error("La API respondió con success: false");
        }

        setDatos(result);
        setTiempoUltimaCarga(new Date().toLocaleTimeString());

        toast({
          title: "Datos cargados",
          description: `${result.data.usuarios.length} usuarios con ${result.estadisticas.totalTareas} tareas`,
        });
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Error desconocido";
        setError(errorMsg);

        toast({
          title: "Error",
          description: "No se pudieron cargar los datos",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    cargarDatosReales();
  }, [cargarDatosReales]);

  return {
    datos,
    loading,
    error,
    refreshing,
    tiempoUltimaCarga,
    cargarDatosReales,
    setDatos,
  };
};

// Funciones helper
export const obtenerIniciales = (nombre: string): string => {
  if (!nombre || nombre === "Usuario") return "U";
  const palabras = nombre.split(" ");
  if (palabras.length >= 2) {
    return (
      palabras[1].charAt(0) + palabras[2]?.charAt(0) || palabras[1].charAt(0)
    ).toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
};

export const calcularProgresoUsuario = (estadisticas: {
  totalTareas: number;
  tareasTerminadas: number;
}): number => {
  if (estadisticas.totalTareas === 0) return 0;
  return (estadisticas.tareasTerminadas / estadisticas.totalTareas) * 100;
};

export const obtenerFechaPorDias = (dias: number): string => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString().split("T")[0];
};
