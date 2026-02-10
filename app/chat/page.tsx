"use client";

import { useEffect, useState } from "react";
import ChatContainer from "@/components/ChatContainer";
import type { Colaborador, Actividad } from "@/lib/types";

export default function ChatPage({
  colaborador,
  actividades,
  onLogout,
}: {
  colaborador: Colaborador;
  actividades: Actividad[];
  onLogout: () => void;
}) {
  return (
    <ChatContainer
      colaborador={colaborador}
      actividades={actividades}
      onLogout={onLogout}
    />
  );
}