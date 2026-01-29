import { useState, useRef, useCallback } from "react";

export const useSpeechRecognition = (onFinish: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const start = useCallback(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let current = "";
      for (let i = 0; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current); // Esto es lo que se ve en pantalla mientras hablas

      // Si el usuario deja de hablar por 3 segundos, terminamos
      if (event.results[event.results.length - 1].isFinal) {
        setTimeout(() => {
            recognition.stop();
            onFinish(current); // Aquí le avisamos al ChatBot que ya terminó de hablar
        }, 2000);
      }
    };

    recognition.start();
    setIsListening(true);
  }, [onFinish]);

  const stop = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return { isListening, transcript, start, stop, setTranscript };
};