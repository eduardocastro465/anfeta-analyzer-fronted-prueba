import { Loader2, Database, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-100 font-arial flex items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-md">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 border-4 border-purple-500/20 rounded-full animate-ping"></div>
          </div>
          <Loader2 className="w-16 h-16 animate-spin text-purple-500 mx-auto relative z-10" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">
            Conectando con el servidor...
          </h2>
          <p className="text-gray-400 mb-4">
            Obteniendo datos en tiempo real desde la base de datos
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Database className="w-4 h-4" />
              <span>Conectando a MongoDB...</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <ExternalLink className="w-4 h-4" />
              <span>Consultando API de explicaciones...</span>
            </div>
          </div>
        </div>
        
        <Progress value={60} className="w-full max-w-xs mx-auto bg-[#2a2a2a]">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" style={{ width: '60%' }} />
        </Progress>
      </div>
    </div>
  );
}