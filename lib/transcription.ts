import { obtenerKeysUsuario } from "@/lib/api";

interface KeysCache {
  groq: string[];
  gemini: string;
  cargadas: boolean;
}

const keysCache: KeysCache = {
  groq: [],
  gemini: "",
  cargadas: false,
};

let groqIndiceActual = 0;

async function cargarKeys(): Promise<void> {
  if (keysCache.cargadas) return;

  try {
    const res = await obtenerKeysUsuario();
    if (res.success) {
      keysCache.groq = Array.isArray(res.keys.groq)
        ? res.keys.groq.filter((k: string) => k.trim() !== "")
        : [];
      keysCache.gemini = res.keys.gemini || "";
      keysCache.cargadas = true;
    }
  } catch (error) {
    console.error("Error al cargar keys del usuario:", error);
  }
}

export function invalidarCacheKeys(): void {
  keysCache.groq = [];
  keysCache.gemini = "";
  keysCache.cargadas = false;
  groqIndiceActual = 0;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function transcribirConGroq(audioBlob: Blob): Promise<string> {
  const keys = keysCache.groq;
  if (keys.length === 0)
    throw new Error("No hay API keys de Groq configuradas");

  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[groqIndiceActual];
    groqIndiceActual = (groqIndiceActual + 1) % keys.length;

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("language", "es");
      formData.append("response_format", "json");

      const response = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        },
      );

      if (response.status === 429) {
        console.warn(`⚠️ Key ${i + 1} con rate limit`);
        if (i < keys.length - 1) continue;
        throw Object.assign(
          new Error("Rate limit alcanzado en todas las keys"),
          { status: 429 },
        );
      }

      if (!response.ok) throw new Error(`Error ${response.status}`);

      const data = await response.json();
      return data.text || "";
    } catch (error: any) {
      if (error?.status === 429) throw error;
      if (i < keys.length - 1) continue;
      throw error;
    }
  }

  throw new Error("No se pudo transcribir con ninguna API key de Groq");
}

async function transcribirConGemini(audioBlob: Blob): Promise<string> {
  const apiKey = keysCache.gemini;

  if (!apiKey) throw new Error("No hay API key de Gemini configurada");

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = arrayBufferToBase64(arrayBuffer);
    const mimeType = audioBlob.type || "audio/webm";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Audio,
                  },
                },
                {
                  text: "Transcribe exactamente lo que se dice en este audio en español. Devuelve solo el texto transcrito, sin explicaciones ni comentarios.",
                },
              ],
            },
          ],
          generationConfig: { temperature: 0 },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Gemini error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return text.trim();
  } catch (error) {
    throw error;
  }
}

export async function transcribirAudioCliente(
  audioBlob: Blob,
): Promise<string> {
  await cargarKeys();

  try {
    const transcript = await transcribirConGroq(audioBlob);
    if (transcript.trim()) return transcript;
  } catch (error) {
    console.warn("Groq falló, intentando con Gemini...", error);
  }

  if (keysCache.gemini) {
    try {
      const transcript = await transcribirConGemini(audioBlob);
      if (transcript.trim()) return transcript;
    } catch (error) {
      console.error("Gemini también falló:", error);
    }
  }

  throw new Error("No se pudo transcribir el audio con ningún servicio");
}
