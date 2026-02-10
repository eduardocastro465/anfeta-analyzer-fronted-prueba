import { useState, useEffect, useCallback } from "react";
import { ApiResponse } from "../components/types";
import { useToast } from "@/components/ui/use-toast";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const BASE_URL_BACK = process.env.NEXT_PUBLIC_BASE_URL_BACK;

export const useReporteData = () => {
  const [datos, setDatos] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tiempoUltimaCarga, setTiempoUltimaCarga] = useState<string>("");
  const { toast } = useToast();

  const cargarDatosReales = useCallback(async (forceRefresh = false) => {
    const startTime = Date.now();
    
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      
      console.log("🔄 Conectando a endpoint real...");
      const response = await fetch(
        `${BASE_URL_BACK}/admin/todas-explicaciones`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );

      const responseTime = Date.now() - startTime;
      // console.log(`⏱️ Tiempo de respuesta: ${responseTime}ms`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: ApiResponse = await response.json();
      
      if (!result.success) {
        throw new Error("La API respondió con success: false");
      }

      // console.log("✅ Datos recibidos correctamente");
      // console.log(`👥 ${result.data.usuarios.length} usuarios`);
      // console.log(`📊 ${result.estadisticas.totalTareas} tareas totales`);
      
      setDatos(result);
      setTiempoUltimaCarga(new Date().toLocaleTimeString());
      
      toast({
        title: "Datos cargados",
        description: `${result.data.usuarios.length} usuarios con ${result.estadisticas.totalTareas} tareas`,
      });

    } catch (err) {
      console.error("❌ Error cargando datos:", err);
      const errorMsg = err instanceof Error ? err.message : "Error desconocido";
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
  }, [toast]);

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
