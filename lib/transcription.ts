const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY_1,
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2,
].filter((key) => key && key.trim() !== "");

let indiceActual = 0;

export async function transcribirAudioCliente(
  audioBlob: Blob,
): Promise<string> {
  if (API_KEYS.length === 0) {
    throw new Error("No hay API keys de Groq configuradas");
  }

  // Intentar con cada API key disponible
  for (let i = 0; i < API_KEYS.length; i++) {
    const apiKey = API_KEYS[indiceActual];
    const numCuenta = indiceActual + 1;

    // Rotar al siguiente índice para la próxima llamada
    indiceActual = (indiceActual + 1) % API_KEYS.length;

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("language", "es");
      formData.append("response_format", "json");

      const response = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        },
      );

      // Si es error 429 (rate limit) y hay más keys, continuar al siguiente
      if (response.status === 429 && i < API_KEYS.length - 1) {
        continue;
      }

      if (!response.ok) {
        throw new Error(
          `Error en transcripción: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return data.text || "";
    } catch (error) {
      // Si es un error de red o fetch y hay más keys, intentar con la siguiente
      if (i < API_KEYS.length - 1) {
        continue;
      }

      // Si ya probamos todas las keys, lanzar el error

      throw error;
    }
  }

  throw new Error("No se pudo transcribir con ninguna API key disponible");
}
