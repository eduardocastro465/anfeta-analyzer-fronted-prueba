"use client";

import { useState, useEffect } from "react";
import { LoginForm } from "@/components/login-form";
import { ChatContainer } from "@/components/ChatContainer";
import type { Colaborador, Actividad } from "@/lib/types";
import { logout } from "@/lib/api";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentColaborador, setCurrentColaborador] =
    useState<Colaborador | null>(null);
  const [userActividades, setUserActividades] = useState<Actividad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🔹 Recuperar sesión
  useEffect(() => {
    try {
      const savedColaborador = localStorage.getItem("colaborador");
      const savedActividades = localStorage.getItem("actividades");

      if (savedColaborador && savedActividades) {
        setCurrentColaborador(JSON.parse(savedColaborador));
        setUserActividades(JSON.parse(savedActividades));
        setIsLoggedIn(true);
      }
    } catch (error) {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSession = () => {
    localStorage.removeItem("colaborador");
    localStorage.removeItem("actividades");
  };

  // 🔹 Login
  const handleLogin = (colaborador: Colaborador, actividades: Actividad[]) => {
    localStorage.setItem("colaborador", JSON.stringify(colaborador));
    localStorage.setItem("actividades", JSON.stringify(actividades));

    setCurrentColaborador(colaborador);
    setUserActividades(actividades);
    setIsLoggedIn(true);
  };

  // 🔹 Logout DEFINITIVO
  const handleLogout = async () => {
    try {
      await logout(); // backend (cookies / jwt)
    } catch (e) {
    } finally {
      clearSession();
      setIsLoggedIn(false);
      setCurrentColaborador(null);
      setUserActividades([]);
    }
  };

  // 🔹 Loader
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Cargando sesión...
      </div>
    );
  }

  // 🔹 Login
  if (!isLoggedIn || !currentColaborador) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // 🔹 Chat
  return (
    <ChatContainer
      colaborador={currentColaborador}
      actividades={userActividades}
      onLogout={handleLogout}
    />
  );
}
