"use client";

import { useState, useEffect } from "react"; // Añadimos useEffect
import { LoginForm } from "@/components/login-form";
import { ChatBot } from "@/components/chat-bot";

import type { Colaborador, Actividad } from "@/lib/types";
import { logout } from "../lib/api";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentColaborador, setCurrentColaborador] =
    useState<Colaborador | null>(null);
  const [userActividades, setUserActividades] = useState<Actividad[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Estado para hidratación

  // 1. Recuperar sesión al cargar (Solo en el cliente)
  useEffect(() => {
    const savedColaborador = localStorage.getItem("colaborador");
    const savedActividades = localStorage.getItem("actividades");

    if (savedColaborador && savedActividades) {
      try {
        setCurrentColaborador(JSON.parse(savedColaborador));
        setUserActividades(JSON.parse(savedActividades));
        setIsLoggedIn(true);
      } catch (error) {
        console.error("Error al parsear sesión guardada", error);
        localStorage.clear();
      }
    }
    setIsLoading(false); // Terminamos de verificar el localStorage
  }, []);

  const handleLogin = (colaborador: Colaborador, actividades: Actividad[]) => {
    // 2. Guardar sesión (Solo ocurre tras interacción del usuario, es seguro)
    localStorage.setItem("colaborador", JSON.stringify(colaborador));
    localStorage.setItem("actividades", JSON.stringify(actividades));

    setCurrentColaborador(colaborador);
    setUserActividades(actividades);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    const ok = await logout();
    if (ok) {
      localStorage.removeItem("colaborador"); // Limpiar storage
      localStorage.removeItem("actividades");
      setIsLoggedIn(false);
      setCurrentColaborador(null);
      setUserActividades([]);
    }
  };

  // 3. Evitar renderizado inconsistente durante la carga
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        Cargando sesión...
      </div>
    );
  }

  if (!isLoggedIn || !currentColaborador) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <ChatBot
      colaborador={currentColaborador}
      actividades={userActividades}
      onLogout={handleLogout}
    />
  );
}
