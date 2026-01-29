import type {
  Colaborador,
  Actividad,
  UsersApiResponse,
  ActividadesApiResponse,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const BASE_URL_BACK = process.env.NEXT_PUBLIC_BASE_URL_BACK;

// Funciones del api de anfeta

export async function fetchColaboradores(): Promise<Colaborador[]> {
  try {
    const response = await fetch(`${BASE_URL}/api/users/search`);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data: UsersApiResponse = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching colaboradores:", error);
    throw error;
  }
}
export async function sendReporte(reporte: unknown): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/actividades`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-device-id": "chatbot-web-app",
    },
    body: JSON.stringify(reporte),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Error ${response.status}: ${response.statusText}`,
    );
  }
}

// Funciones del api local

export async function SignIn(email: string): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL_BACK}/auth/signIn`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error initiating session:", error);
    throw error;
  }
}

export async function logout(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL_BACK}/auth/logout`, {
      method: "POST",
      credentials: "include", // 🍪 envía la cookie
    });

    return response.ok;
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    return false;
  }
}

export async function validateSession(): Promise<any | null> {
  try {
    const response = await fetch(`${BASE_URL_BACK}/auth/verifyToken`, {
      method: "GET",
      credentials: "include", // 🍪 envía la cookie
    });

    if (!response.ok) {
      throw new Error(`401 Usuario no autotizado`);
    }

    return response.json();
  } catch (error) {
    console.log("Usuario no autorizado");
  }
}

export async function fetchActividadesByUser(
  email: string,
): Promise<Actividad[]> {
  try {
    // Use the assignee endpoint as per API documentation
    const response = await fetch(
      `${BASE_URL}/api/actividades/assignee/${encodeURIComponent(email)}`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data: ActividadesApiResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching actividades:", error);
    throw error;
  }
}

export async function obtenerHistorialSession(sessionId: string) {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/historial/sesion/${sessionId}`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function sendTaskValidation(data: {
  taskId: string;
  taskName: string;
  activityTitle: string;
  explanation: string;
  confirmed: boolean;
  priority: string;
  duration: number;
}) {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/validar-explicacion`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskName: data.taskName,
          explanation: data.explanation,
          activityTitle: data.activityTitle,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error validando explicación:", error);
    return { valida: false, razon: "Error de conexión" };
  }
}

export async function obtenerHistorialSidebar() {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/historial/titulos`,
      {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error obteniendo titulos:", error);
    return { success: false, hayPendientes: false };
  }
}

export async function obtenerActividadesConTiempoHoy() {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/actividades/hoy/con-tiempo`,
      {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error obteniendo actividades con tiempo hoy:", error);
    return { success: false, actividades: [] };
  }
}

export async function actualizarEstadoPendientes(
  pendientes: Array<{
    pendienteId: string;
    actividadId: string;
    completado: boolean;
    motivoNoCompletado?: string;
  }>,
) {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/pendientes/actualizar`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendientes),
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error actualizando estado de pendientes:", error);
    return { success: false, message: "Error de conexión" };
  }
}

export async function validarReportePendiente(
  pendienteId: string,
  actividadId: string,
  transcript: string,
) {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/confirmarEstadoPendientes`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendienteId: pendienteId,
          actividadId: actividadId,
          transcript: transcript,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error obteniendo actividades con tiempo hoy:", error);
    return { success: false, actividades: [] };
  }
}

export async function obtenerPendientesHoy(colaborador: {
  email: string;
  timestamp: string;
}) {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/verificar-actividades-finalizadas`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: colaborador.email,
          timestamp: colaborador.timestamp,
        }),
      },
    );

    if (!response.ok) throw new Error(`Error: ${response.status}`);

    return await response.json();
  } catch (error) {
    console.error("Error obteniendo pendientes hoy:", error);
    return { success: false, pendientes: [] };
  }
}

export async function obtenerActividadesConRevisiones(requestBody: any) {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/actividades-con-revisiones`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) throw new Error(`Error: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error obteniendo actividades con revisiones:", error);
    return { success: false, actividades: [] };
  }
}

export async function guardarExplicaciones(payload: any) {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/guardar-explicaciones`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) throw new Error(`Error: ${response.status}`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error guardando explicaciones:", error);
    return { success: false, message: "Error de conexión" };
  }
}
