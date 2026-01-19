'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export function ServiceWorkerRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('Service Worker registered:', registration);
      }).catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
    }

    // Capturar evento de instalación
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detectar si ya está instalada
    window.addEventListener('appinstalled', () => {
      console.log('App instalada exitosamente');
      setDeferredPrompt(null);
      setShowPrompt(false);
      toast({
        title: 'Instalada',
        description: 'La aplicación se ha instalado correctamente',
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('App instalada por usuario');
      toast({
        title: 'Instalación iniciada',
        description: 'La aplicación se está instalando...',
      });
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg p-4 max-w-xs z-50">
      <h3 className="font-semibold mb-2">Instalar aplicación</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Instala nuestra app para acceder sin conexión
      </p>
      <div className="flex gap-2">
        <Button
          onClick={handleInstallClick}
          className="flex-1"
          size="sm"
        >
          Instalar
        </Button>
        <Button
          onClick={handleDismiss}
          variant="outline"
          size="sm"
        >
          Después
        </Button>
      </div>
    </div>
  );
}
