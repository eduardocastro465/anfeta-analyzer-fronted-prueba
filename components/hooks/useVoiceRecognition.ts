// hooks/useVoiceRecognition.ts
import { useRef, useState } from "react";

export function useVoiceRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>("");

  const startRecording = (
    onResult?: (transcript: string) => void,
    onError?: (error: string) => void,
  ) => {
    if (typeof window === "undefined") return;

    if (
      !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      const isOpera =
        (window as any).opr ||
        (window as any).opera ||
        navigator.userAgent.indexOf(" OPR/") > -1;
      const isFirefox = navigator.userAgent.indexOf("Firefox") > -1;

      let browserMessage = "Tu navegador no soporta reconocimiento de voz.";
      if (isOpera)
        browserMessage =
          "Opera no soporta el reconocimiento de voz. Te recomendamos usar Chrome o Edge.";
      if (isFirefox)
        browserMessage =
          "Firefox tiene soporte limitado para el reconocimiento de voz. Te recomendamos usar Chrome o Edge.";

      onError?.(browserMessage);
      return;
    }

    setIsRecording(true);
    setIsListening(true);
    setVoiceTranscript("");
    voiceTranscriptRef.current = "";

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const fullTranscript = (finalTranscript + interimTranscript).trim();
      voiceTranscriptRef.current = fullTranscript;
      setVoiceTranscript(fullTranscript);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setIsRecording(false);

      let errorMessage = "Ocurrió un error con el micrófono.";

      switch (event.error) {
        case "not-allowed":
        case "permission-denied":
          errorMessage =
            "Permiso al micrófono denegado. Por favor, actívalo en la configuración de la barra de direcciones.";
          break;
        case "network":
          errorMessage = "Error de red. Verifica tu conexión a internet.";
          break;
        case "no-speech":
          errorMessage = "No se detectó voz. Por favor, intenta de nuevo.";
          break;
        case "audio-capture":
          errorMessage =
            "No se encontró un micrófono físicamente o está en uso por otra app.";
          break;
      }

      onError?.(errorMessage);
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsRecording(false);

      // ✅ Solo llamar onResult si hay transcripción Y se proporcionó el callback
      if (onResult && voiceTranscriptRef.current.trim().length > 0) {
        onResult(voiceTranscriptRef.current);
      }
    };

    try {
      recognition.start();
    } catch (error) {
      onError?.("No se pudo iniciar el reconocimiento de voz");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {}
    }

    setIsRecording(false);
    setIsListening(false);
  };

  return {
    isRecording,
    isListening,
    voiceTranscript,
    startRecording,
    stopRecording,
    recognitionRef,
    voiceTranscriptRef,
  };
}
