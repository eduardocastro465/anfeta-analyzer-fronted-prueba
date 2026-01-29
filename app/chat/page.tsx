"use client";

import { useEffect, useState } from "react";
import { ChatBot } from "@/components/chat-bot";
import type { Colaborador, Actividad } from "@/lib/types";

export default function ChatPage() {
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Esto solo se ejecuta en el cliente (navegador)
    const savedColaborador = localStorage.getItem("colaborador");
    const savedActividades = localStorage.getItem("actividades");

    if (savedColaborador) {
      setColaborador(JSON.parse(savedColaborador));
    }

    if (savedActividades) {
      setActividades(JSON.parse(savedActividades));
    }

    setIsReady(true);
  }, []);

  // Mientras se lee el localStorage, no renderizamos nada o mostramos un loader
  if (!isReady) {
    return null;
  }

  if (!colaborador) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">
          Sesión no encontrada. Por favor, inicia sesión.
        </p>
      </div>
    );
  }

  return (
    <ChatBot
      colaborador={colaborador}
      actividades={actividades}
      onLogout={() => {
        localStorage.clear();
        window.location.href = "/";
      }}
    />
  );
}
