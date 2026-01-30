import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { ViewMode, DetalleView, Usuario, Actividad } from "./types";

interface BreadcrumbsProps {
  viewMode: ViewMode;
  detalleView: DetalleView;
  selectedUser: Usuario | null;
  selectedActivity: Actividad | null;
  onViewDashboard: () => void;
  onViewColaboradores: () => void;
  onViewDetalles: () => void;
  onBackToUser: (user: Usuario) => void;
}

export default function Breadcrumbs({
  viewMode,
  detalleView,
  selectedUser,
  selectedActivity,
  onViewDashboard,
  onViewColaboradores,
  onViewDetalles,
  onBackToUser
}: BreadcrumbsProps) {
  return (
    <div className="font-arial flex items-center gap-2 text-sm text-gray-400 px-4 py-2 bg-[#1a1a1a] border-none">
      <Button
        variant="ghost"
        size="sm"
        onClick={onViewDashboard}
        className="text-gray-400 hover:text-white hover:bg-gray-800 h-6 px-2"
      >
        Dashboard
      </Button>
      {viewMode !== 'dashboard' && (
        <>
          <ChevronRight className="w-3 h-3" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (viewMode === 'colaboradores') onViewColaboradores();
              if (viewMode === 'detalles') onViewDetalles();
            }}
            className="text-gray-400 hover:text-white hover:bg-gray-800 h-6 px-2 capitalize"
          >
            {viewMode}
          </Button>
        </>
      )}
      {viewMode === 'detalles' && detalleView !== 'general' && (
        <>
          <ChevronRight className="w-3 h-3" />
          {detalleView === 'usuario' && selectedUser && (
            <span className="text-gray-300">{selectedUser.nombre}</span>
          )}
          {detalleView === 'actividad' && selectedActivity && selectedUser && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onBackToUser(selectedUser)}
                className="text-gray-400 hover:text-white hover:bg-gray-800 h-6 px-2"
              >
                {selectedUser.nombre}
              </Button>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-300">Actividad</span>
            </>
          )}
          {detalleView === 'tarea' && selectedActivity && selectedUser && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onBackToUser(selectedUser)}
                className="text-gray-400 hover:text-white hover:bg-gray-800 h-6 px-2"
              >
                {selectedUser.nombre}
              </Button>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-300">Tarea</span>
            </>
          )}
        </>
      )}
    </div>
  );
}