// Crea este archivo nuevo: DashboardContainer.tsx
import React, { useState } from "react";
import DashboardView from "./DashboardView";
import { ApiResponse, DetalleView, Usuario, Actividad } from "../types/reporteTypes";

interface DashboardContainerProps {
  datos: ApiResponse;
}

export function DashboardContainer({ datos }: DashboardContainerProps) {
  const [currentView, setCurrentView] = useState<DetalleView>('dashboard');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Actividad | null>(null);

  const handleNavigate = (view: DetalleView, user?: Usuario, activity?: Actividad) => {
    console.log("✅ NAVEGACIÓN - Vista:", view, 
                "Usuario:", user?.nombre, 
                "Actividad:", activity?.titulo);
    setCurrentView(view);
    setSelectedUser(user || null);
    setSelectedActivity(activity || null);
  };

  return (
    <DashboardView
      estadisticas={datos.estadisticas}
      data={datos.data}
      currentView={currentView}
      selectedUser={selectedUser}
      selectedActivity={selectedActivity}
      onNavigate={handleNavigate}
    />
  );
}

// Exporta como default también
export default DashboardContainer;