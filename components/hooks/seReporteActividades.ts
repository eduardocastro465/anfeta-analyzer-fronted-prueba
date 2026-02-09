// hooks/useReporteActividades.ts
import { useState } from "react";
import type { ActividadDiaria, PendienteEstadoLocal } from "@/lib/types";
import {
  obtenerActividadesConTiempoHoy,
  actualizarEstadoPendientes,
  validarReportePendiente,
} from "@/lib/api";

export function useReporteActividades() {
  const [mostrarModalReporte, setMostrarModalReporte] = useState(false);
  const [actividadesDiarias, setActividadesDiarias] = useState<
    ActividadDiaria[]
  >([]);
  const [pendientesReporte, setPendientesReporte] = useState<
    PendienteEstadoLocal[]
  >([]);
  const [guardandoReporte, setGuardandoReporte] = useState(false);
  const [yaSeVerificoHoy, setYaSeVerificoHoy] = useState(false);

  const cargarActividadesParaReporte = async () => {
    try {
      const response = await obtenerActividadesConTiempoHoy();

      if (response.success && response.data && response.data.length > 0) {
        setActividadesDiarias(response.data);

        const todosLosPendientes: PendienteEstadoLocal[] = [];
        response.data.forEach((actividad: ActividadDiaria) => {
          actividad.pendientes.forEach((pendiente) => {
            todosLosPendientes.push({
              ...pendiente,
              actividadId: actividad.actividadId,
              completadoLocal: false,
              motivoLocal: "",
            });
          });
        });

        setPendientesReporte(todosLosPendientes);
        setYaSeVerificoHoy(true);
      } else {
        setYaSeVerificoHoy(true);
      }
    } catch (error) {}
  };

  const toggleCompletadoReporte = (pendienteId: string) => {
    setPendientesReporte((prev) =>
      prev.map((p) =>
        p.pendienteId === pendienteId
          ? { ...p, completadoLocal: !p.completadoLocal, motivoLocal: "" }
          : p,
      ),
    );
  };

  const actualizarMotivoReporte = (pendienteId: string, motivo: string) => {
    setPendientesReporte((prev) =>
      prev.map((p) =>
        p.pendienteId === pendienteId ? { ...p, motivoLocal: motivo } : p,
      ),
    );
  };

  const guardarReporteDiario = async () => {
    try {
      setGuardandoReporte(true);

      const pendientesParaEnviar = pendientesReporte.map((p) => ({
        pendienteId: p.pendienteId,
        actividadId: p.actividadId,
        completado: p.completadoLocal,
        motivoNoCompletado:
          !p.completadoLocal && p.motivoLocal ? p.motivoLocal : undefined,
      }));

      const response = await actualizarEstadoPendientes(pendientesParaEnviar);

      if (response.success) {
        setMostrarModalReporte(false);
        return {
          success: true,
          actualizados: response.actualizados,
        };
      }

      return { success: false };
    } catch (error) {
      return { success: false };
    } finally {
      setGuardandoReporte(false);
    }
  };

  const validarPendienteReporte = async (
    pendienteId: string,
    actividadId: string,
    explicacion: string,
  ) => {
    try {
      const res = await validarReportePendiente(
        pendienteId,
        actividadId,
        explicacion,
      );

      const data = await res.json();

      setPendientesReporte((prev) =>
        prev.map((item) =>
          item.pendienteId === pendienteId
            ? {
                ...item,
                completadoLocal: data.completado,
                motivoLocal: data.completado ? "" : explicacion,
              }
            : item,
        ),
      );

      return data;
    } catch (error) {
      throw error;
    }
  };

  return {
    mostrarModalReporte,
    setMostrarModalReporte,
    actividadesDiarias,
    pendientesReporte,
    guardandoReporte,
    yaSeVerificoHoy,
    setYaSeVerificoHoy,
    cargarActividadesParaReporte,
    toggleCompletadoReporte,
    actualizarMotivoReporte,
    guardarReporteDiario,
    validarPendienteReporte,
  };
}
