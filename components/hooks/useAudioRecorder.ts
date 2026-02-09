// hooks/useAudioRecorder.ts
import { useRef, useState } from "react";

export const useAudioRecorder = () => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);

  const startRecording = async (): Promise<MediaStream> => {
    try {
      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });

      // IMPORTANTE: Guardar y retornar el stream
      setCurrentStream(stream);

      // Crear MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Manejar datos
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Iniciar grabación
      mediaRecorder.start();

      // ✅ Retornar el stream para que puedas usarlo
      return stream;
    } catch (error) {
      throw error;
    }
  };

  const stopRecording = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder) {
        return resolve(new Blob());
      }

      mediaRecorder.onstop = () => {
        // Crear blob de audio
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

        // Limpiar
        chunksRef.current = [];
        mediaRecorderRef.current = null;

        // Detener el stream
        if (currentStream) {
          currentStream.getTracks().forEach((track) => track.stop());
          setCurrentStream(null);
        }

        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  };

  return {
    startRecording,
    stopRecording,
    currentStream, // ✅ Exponer el stream actual
  };
};
