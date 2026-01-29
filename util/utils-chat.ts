import { Colaborador } from "@/lib/types";

export const getDisplayName = (colaborador: Colaborador) => {
  if (colaborador.firstName || colaborador.lastName) {
    return `${colaborador.firstName || ""} ${colaborador.lastName || ""}`.trim();
  }
  return colaborador.email.split("@")[0];
};

export const isReportTimeWindow = (horaInicio: number, horaFin: number) => {
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  return currentTotalMinutes >= horaInicio * 60 && currentTotalMinutes <= horaFin * 60;
};