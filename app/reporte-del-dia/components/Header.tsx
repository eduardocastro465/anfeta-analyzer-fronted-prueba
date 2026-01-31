import React from "react";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Loader2, Clock } from "lucide-react";
import { ViewMode, DetalleView, Usuario, Actividad, Pendiente } from "./types";

interface HeaderProps {
  viewMode: ViewMode;
  detalleView: DetalleView;
  selectedUser: Usuario | null;
  selectedActivity: Actividad | null;
  selectedTask: Pendiente | null;
  tiempoUltimaCarga: string;
  refreshing: boolean;
  onExport: () => void;
  onRefresh: () => void;
}

export default function Header({
  viewMode,
  detalleView,
  selectedUser,
  selectedActivity,
  selectedTask,
  tiempoUltimaCarga,
  refreshing,
  onExport,
  onRefresh
}: HeaderProps) {
  return (
    <div className="font-arial bg-[#1a1a1a] border-none p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-100">
            {viewMode === 'dashboard' && 'Dashboard General'}
            {viewMode === 'colaboradores' && 'Colaboradores'}
            {viewMode === 'detalles' && (
              detalleView === 'general' ? 'Detalles Generales' :
              detalleView === 'usuario' ? `Detalles: ${selectedUser?.nombre}` :
              detalleView === 'actividad' ? `Actividad: ${selectedActivity?.titulo.substring(0, 30)}...` :
              detalleView === 'tarea' ? `Tarea: ${selectedTask?.nombre.substring(0, 30)}...` : 'Detalles'
            )}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-3 h-3" />
            <span>Última carga: {tiempoUltimaCarga}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onExport}
            disabled={refreshing}
            className="border-none text-gray-300 hover:bg-gray-800 hover:text-white hover:border-purple-500/50"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button 
            onClick={onRefresh}
            disabled={refreshing}
            className="bg-[#6841ea] hover:bg-[#5a36d1] text-white"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Actualizar
          </Button>
        </div>
      </div>
    </div>
  );
}