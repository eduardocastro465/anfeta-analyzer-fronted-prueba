"use client";

import { ChatBot } from "@/components/chat-bot";
import type { Colaborador, Actividad } from "@/lib/types";

export default function ChatPage() {
  // 👉 luego puedes traer esto de localStorage o context
  const colaborador = JSON.parse(
    localStorage.getItem("colaborador") || "null"
  ) as Colaborador | null;

  const actividades = JSON.parse(
    localStorage.getItem("actividades") || "[]"
  ) as Actividad[];

  if (!colaborador) {
    return <p>Sesión no encontrada</p>;
  }

  return (
    <ChatBot
      colaborador={colaborador}
      actividades={actividades}
      onLogout={() => window.close()}
    />
  );
}
