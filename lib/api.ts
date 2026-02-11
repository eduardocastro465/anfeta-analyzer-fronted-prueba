import type {
  Colaborador,
  Actividad,
  UsersApiResponse,
  ActividadesApiResponse,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const BASE_URL_BACK = process.env.NEXT_PUBLIC_BASE_URL_BACK;

export async function fetchColaboradores(): Promise<Colaborador[]> {
  try {
    const response = await fetch(`${BASE_URL}/api/users/search`);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data: UsersApiResponse = await response.json();
    return data.items || [];
  } catch (error) {
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
    throw error;
  }
}

export async function logout(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL_BACK}/auth/logout`, {
      method: "POST",
      credentials: "include", // envía la cookie
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function validateSession(): Promise<any | null> {
  try {
    const response = await fetch(`${BASE_URL_BACK}/auth/verifyToken`, {
      method: "GET",
      credentials: "include",
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`401 Usuario no autotizado`);
    }

    return response.json();
  } catch (error) {}
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
    throw error;
  }
}

export async function sendPendienteValidarYGuardar(data: {
  actividadId: string;
  actividadTitulo: string;
  nombrePendiente: string;
  idPendiente: string;
  explicacion: string;
  userEmail?: string;
}) {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/validar-guardar-explicacion`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actividadId: data.actividadId,
          actividadTitulo: data.actividadTitulo,
          nombrePendiente: data.nombrePendiente,
          idPendiente: data.idPendiente,
          explicacion: data.explicacion,
          userEmail: data.userEmail, // Enviar también como userEmail
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return { valida: false, razon: "Error de conexión" };
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
    const response = await fetch(`${BASE_URL_BACK}/assistant/validar-tarea`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: data.taskId,
        taskName: data.taskName,
        activityTitle: data.activityTitle,
        explanation: data.explanation,
        confirmed: data.confirmed,
        priority: data.priority,
        duration: data.duration,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
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
      `${BASE_URL_BACK}/assistant/validar-explicacion`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actividadId,
          taskId: pendienteId,
          transcript,
        }),
      },
    );

    const data = await response.json();

    // 👇 NO tires throw, deja que el backend responda
    return data;
  } catch (error) {
    return {
      valida: false,
      razon: "Errr",
    };
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
    return { success: false, actividades: [] };
  }
}

export async function guardarExplicaciones(payload: {
  transcript: string;
  actividadId: string;
  pendienteNombre: string;
  sessionId: string;
  actividadTitulo: string;
  pendienteId: string;
}) {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/guardar-explicaciones`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: payload.transcript,
          pendienteNombre: payload.pendienteNombre,
          actividadId: payload.actividadId,
          sessionId: payload.sessionId,
          pendienteId: payload.pendienteId,
          actividadTitulo: payload.actividadTitulo,
        }),
      },
    );

    if (!response.ok) throw new Error(`Error: ${response.status}`);
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, message: "Error de conexión" };
  }
}

export async function verificarDescripcion(sessionId: string) {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/validar-explicacion`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
        }),
      },
    );

    if (response.ok) {
      const data = await response.json();

      return data;
    }
  } catch (error) {
    return { valida: false, tareasConDescripcion: [] };
  }
}

export async function guardarReporteTarde(payload: any) {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/guardarDescripcionTarde`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) throw new Error(`Error: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, actividades: [] };
  }
}

export async function obtenerConversacionCompleta(
  sessionId: string,
): Promise<{ success: boolean; data: any | null }> {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/conversacion/${sessionId}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, data: null };
  }
}

export async function chatGeneralIA(mensaje: string, sessionId: string | null) {
  try {
    const response = await fetch(`${BASE_URL_BACK}/assistant/consultar-ia`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje: mensaje, sessionId: sessionId }),
    });

    if (!response.ok) throw new Error(`Error: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, actividades: [] };
  }
}

export async function consultarIAProyecto(
  mensaje: string,
  sessionId: string | null,
) {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/consultar-ia-proyecto`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: mensaje, sessionId: sessionId }),
      },
    );

    if (!response.ok) throw new Error(`Error: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, actividades: [] };
  }
}

// lib/api.ts

export async function obtenerCambiosTareas() {
  try {
    const response = await fetch(
      `${BASE_URL_BACK}/assistant/verificar-cambios-tareas`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Error al verificar cambios");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error de conexión:", error);
    return { success: false };
  }
}
