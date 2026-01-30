import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ErrorScreenProps {
  onRetry: () => void;
}

export default function ErrorScreen({ onRetry }: ErrorScreenProps) {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-100 font-arial p-8">
      <div className="max-w-4xl mx-auto text-center">
        <Database className="w-20 h-20 text-gray-700 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-100 mb-2">Sin datos disponibles</h2>
        <p className="text-gray-400 mb-6">No se pudieron obtener datos del servidor.</p>
        <Button 
          onClick={onRetry} 
          size="lg"
          className="bg-[#6841ea] hover:bg-[#5a36d1] text-white"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Intentar nuevamente
        </Button>
      </div>
    </div>
  );
}