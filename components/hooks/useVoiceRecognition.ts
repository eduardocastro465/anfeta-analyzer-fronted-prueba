// hooks/useVoiceRecognition.ts
import { useRef, useState } from 'react';

export function useVoiceRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = (
    onResult: (transcript: string) => void,
    onError?: (error: string) => void
  ) => {
    if (typeof window === "undefined") return;
    
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      onError?.("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    setIsRecording(true);
    setIsListening(true);
    setVoiceTranscript("");
    voiceTranscriptRef.current = "";

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = true;

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

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      if (fullTranscript.length > 0) {
        silenceTimerRef.current = setTimeout(() => {
          if (voiceTranscriptRef.current.trim().length > 0) {
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
            onResult(voiceTranscriptRef.current);
          }
        }, 3000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Error:", event.error);
      setIsListening(false);
      setIsRecording(false);
      onError?.(event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsRecording(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
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