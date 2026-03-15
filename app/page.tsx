"use client";

import { useState, useEffect } from "react";
import {
  obtenerPreferenciasUsuario,
  guardarPreferenciasUsuario,
} from "@/lib/api";
import { LoginForm } from "@/components/LoginForm";
import { ChatContainer } from "@/components/ChatContainer";
import type { Colaborador, Actividad } from "@/lib/types";
import { logout } from "@/lib/api";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentColaborador, setCurrentColaborador] =
    useState<Colaborador | null>(null);
  const [userActividades, setUserActividades] = useState<Actividad[]>([]);

  const [preferencias, setPreferencias] = useState({
    tema: "AUTO",
    velocidadVoz: 1,
    idiomaVoz: "es-MX",
  });

  useEffect(() => {
    try {
      const savedColaborador = localStorage.getItem("colaborador");
      const savedActividades = localStorage.getItem("actividades");

      if (savedColaborador && savedActividades) {
        setCurrentColaborador(JSON.parse(savedColaborador));
        setUserActividades(JSON.parse(savedActividades));
        setIsLoggedIn(true);
      }
      obtenerPreferenciasUsuario().then((res) => {
        if (res.success && res.preferencias) {
          setPreferencias(res.preferencias);
          localStorage.setItem("tema", res.preferencias.tema);
        }
      });
    } catch (error) {
      clearSession();
    }
  }, []);

  const clearSession = () => {
    localStorage.removeItem("colaborador");
    localStorage.removeItem("actividades");
  };

  const handleLogin = async (
    colaborador: Colaborador,
    actividades: Actividad[],
  ) => {
    localStorage.setItem("colaborador", JSON.stringify(colaborador));
    localStorage.setItem("actividades", JSON.stringify(actividades));

    const temaManual =
      localStorage.getItem("tema_manual") === "true"
        ? (localStorage.getItem("tema") as string)
        : null;

    const prefs = await obtenerPreferenciasUsuario();
    const prefsFinales = temaManual
      ? { ...prefs.preferencias, tema: temaManual }
      : prefs.preferencias;

    if (temaManual) {
      await guardarPreferenciasUsuario(prefsFinales);
      localStorage.removeItem("tema_manual");
    }

    if (prefs.success) setPreferencias(prefsFinales);
    localStorage.setItem("tema", prefsFinales.tema);

    setCurrentColaborador(colaborador);
    setUserActividades(actividades);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
    } finally {
      clearSession();
      setIsLoggedIn(false);
      setCurrentColaborador(null);
      setUserActividades([]);
      setPreferencias({ tema: "AUTO", velocidadVoz: 1, idiomaVoz: "es-MX" });
    }
  };

  const handleViewReports = () => {
    window.location.href = "/reporte-del-dia";
  };

  if (!isLoggedIn || !currentColaborador) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <ChatContainer
      key={currentColaborador.email}
      colaborador={currentColaborador}
      actividades={userActividades}
      onLogout={handleLogout}
      onViewReports={handleViewReports}
      preferencias={preferencias}
      onGuardarPreferencias={async (nuevasPrefs) => {
        const result = await guardarPreferenciasUsuario(nuevasPrefs);
        if (result.success) setPreferencias(nuevasPrefs);
        localStorage.setItem("tema", nuevasPrefs.tema);
      }}
    />
  );
}
