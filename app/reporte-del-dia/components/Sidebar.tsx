import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  FileText,
  Menu,
  X,
} from "lucide-react";
import { ViewMode } from "./types";
import { EstadisticasGlobales } from "./types";

interface SidebarProps {
  sidebarOpen: boolean;
  viewMode: ViewMode;
  estadisticas: EstadisticasGlobales;
  onToggleSidebar: () => void;
  onViewChange: (view: ViewMode) => void;
}

export default function Sidebar({
  sidebarOpen,
  viewMode,
  estadisticas,
  onToggleSidebar,
  onViewChange
}: SidebarProps) {
  return (
    <div className={`font-arial fixed left-0 top-0 h-screen bg-[#0a0a0a] border-r border-none flex flex-col transition-all duration-300 z-50 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
      {/* Logo y toggle */}
      <div className="p-6 flex items-center justify-between">
        {sidebarOpen ? (
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Panel Admin
            </h2>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            {/* Logo pequeño */}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="text-gray-400 hover:text-white hover:bg-gray-800"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation Items */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          <Button
            variant={viewMode === 'dashboard' ? "default" : "ghost"}
            onClick={() => onViewChange('dashboard')}
            className={`w-full justify-start ${sidebarOpen ? 'justify-start' : 'justify-center'} ${viewMode === 'dashboard' ? 'bg-[#6841ea] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3">Dashboard</span>}
          </Button>

          <Button
            variant={viewMode === 'colaboradores' ? "default" : "ghost"}
            onClick={() => onViewChange('colaboradores')}
            className={`w-full justify-start ${sidebarOpen ? 'justify-start' : 'justify-center'} ${viewMode === 'colaboradores' ? 'bg-[#6841ea] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <Users className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3">Colaboradores</span>}
          </Button>

          <Button
            variant={viewMode === 'detalles' ? "default" : "ghost"}
            onClick={() => onViewChange('detalles')}
            className={`w-full justify-start ${sidebarOpen ? 'justify-start' : 'justify-center'} ${viewMode === 'detalles' ? 'bg-[#6841ea] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <FileText className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3">Detalles</span>}
          </Button>

          <Separator className="my-4 bg-gray-800" />

          {/* Quick Stats */}
          {sidebarOpen && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-400 px-3">Resumen Rápido</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/50">
                  <span className="text-sm text-gray-300">Usuarios</span>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {estadisticas.totalUsuarios}
                  </Badge>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/50">
                  <span className="text-sm text-gray-300">Tareas</span>
                  <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">
                    {estadisticas.totalTareas}
                  </Badge>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/50">
                  <span className="text-sm text-gray-300">Eficiencia</span>
                  <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-purple-500/30">
                    {estadisticas.porcentajeTerminadas}%
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t border-none">
        <div className={`flex items-center ${sidebarOpen ? 'justify-start gap-3' : 'justify-center'}`}>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              A
            </AvatarFallback>
          </Avatar>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-100 truncate">Administrador</p>
              <p className="text-xs text-gray-400 truncate">admin@system.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}