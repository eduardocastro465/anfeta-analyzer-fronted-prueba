import { useState, useRef, useEffect, useCallback } from "react";

interface UseAutoSendVoiceOptions {
  /**
   * Tiempo de silencio en milisegundos antes de enviar automáticamente
   * @default 3000 (3 segundos)
   */
  silenceThreshold?: number;

  /**
   * Umbral de detección de voz (0-255)
   * @default 8
   */
  speechThreshold?: number;

  /**
   * Callback que se ejecuta cuando se completa la grabación y transcripción
   */
  onTranscriptionComplete?: (transcript: string) => void;

  /**
   * Callback que se ejecuta en caso de error
   */
  onError?: (error: Error) => void;

  /**
   * Función de transcripción personalizada
   */
  transcriptionService: (audioBlob: Blob) => Promise<string>;

  /**
   * Función para detener la grabación del MediaRecorder
   */
  stopRecording: () => Promise<Blob>;

  /**
   * Función para iniciar la grabación del MediaRecorder
   */
  startRecording: () => Promise<MediaStream>;

  /**
   * Habilitar transcripción en tiempo real (experimental)
   * @default false
   */
  enableRealtimeTranscription?: boolean;
}

interface UseAutoSendVoiceReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  audioLevel: number;
  transcript: string;
  startVoiceRecording: () => Promise<void>;
  cancelVoiceRecording: () => Promise<void>;
  cleanup: () => void;
}

export function useAutoSendVoice({
  silenceThreshold = 3000,
  speechThreshold = 8,
  onTranscriptionComplete,
  onError,
  transcriptionService,
  stopRecording,
  startRecording,
  enableRealtimeTranscription = false,
}: UseAutoSendVoiceOptions): UseAutoSendVoiceReturn {
  // ==================== ESTADOS ====================
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState("");

  // ==================== REFS ====================
  const isRecordingRef = useRef(false);
  const wasCancelledRef = useRef(false);
  const isProcessingRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // ==================== SINCRONIZACIÓN STATE <-> REF ====================
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // ==================== RECONOCIMIENTO DE VOZ EN TIEMPO REAL ====================
  const startRealtimeRecognition = useCallback(() => {
    if (!enableRealtimeTranscription) return;
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition no soportado en este navegador");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "es-ES";

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart + " ";
          } else {
            interimTranscript += transcriptPart;
          }
        }

        // Actualizar transcript en tiempo real
        setTranscript((prev) => {
          const newTranscript = (prev + finalTranscript).trim();
          return (
            newTranscript + (interimTranscript ? " " + interimTranscript : "")
          );
        });
      };

      recognition.onerror = (event: any) => {
        console.error("Error en reconocimiento de voz:", event.error);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error("Error al iniciar reconocimiento:", error);
    }
  }, [enableRealtimeTranscription]);

  const stopRealtimeRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (error) {
        console.error("Error al detener reconocimiento:", error);
      }
    }
  }, []);

  // ==================== PROCESAMIENTO Y ENVÍO ====================
  const processAndSendAudio = useCallback(async () => {
    if (isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsTranscribing(true);
    setAudioLevel(0);

    // Detener reconocimiento en tiempo real
    stopRealtimeRecognition();

    // Detener detección de audio
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    try {
      // Obtener el audio grabado
      const audioBlob = await stopRecording();

      if (wasCancelledRef.current) {
        wasCancelledRef.current = false;
        setTranscript("");
        return;
      }

      // Si no hay transcripción en tiempo real, usar el servicio de transcripción
      let finalTranscript = transcript.trim();

      if (!enableRealtimeTranscription || !finalTranscript) {
        finalTranscript = await transcriptionService(audioBlob);
      }

      if (finalTranscript && finalTranscript.length > 0) {
        setTranscript(finalTranscript);
        onTranscriptionComplete?.(finalTranscript);
      } else {
        onError?.(new Error("La transcripción está vacía"));
      }
    } catch (error) {
      onError?.(
        error instanceof Error ? error : new Error("Error desconocido"),
      );
    } finally {
      setIsTranscribing(false);
      isProcessingRef.current = false;
      // Limpiar transcript después de enviar
      setTimeout(() => setTranscript(""), 500);
    }
  }, [
    silenceThreshold,
    stopRecording,
    transcriptionService,
    onTranscriptionComplete,
    onError,
    transcript,
    enableRealtimeTranscription,
    stopRealtimeRecognition,
  ]);

  // ==================== TIMER DE SILENCIO ====================
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    silenceTimerRef.current = setTimeout(() => {
      processAndSendAudio();
    }, silenceThreshold);
  }, [silenceThreshold, processAndSendAudio]);

  // ==================== DETECCIÓN DE NIVEL DE AUDIO ====================
  const startAudioLevelDetection = useCallback(
    (stream: MediaStream) => {
      try {
        micStreamRef.current = stream;

        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.3;
        microphone.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let frameCount = 0;

        // Función de detección continua
        const checkAudioLevel = () => {
          if (!isRecordingRef.current) {
            setAudioLevel(0);
            return;
          }

          analyser.getByteFrequencyData(dataArray);

          const sum = dataArray.reduce((a, b) => a + b, 0);
          const average = sum / dataArray.length;
          const normalizedLevel = Math.min(average * 2, 100);

          setAudioLevel(normalizedLevel);

          frameCount++;

          if (average > speechThreshold) {
            // 🎤 VOZ DETECTADA
            resetSilenceTimer();
          }

          animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
        };

        resetSilenceTimer();
        checkAudioLevel();
      } catch (error) {
        onError?.(
          error instanceof Error
            ? error
            : new Error("Error en detección de audio"),
        );
      }
    },
    [speechThreshold, resetSilenceTimer, onError],
  );

  // ==================== INICIAR GRABACIÓN ====================
  const startVoiceRecording = useCallback(async () => {
    wasCancelledRef.current = false;
    setTranscript(""); // Limpiar transcript anterior

    // Evitar inicio si ya se está procesando
    if (isTranscribing || isProcessingRef.current) {
      return;
    }

    // Si está grabando, cancelar y reiniciar
    if (isRecording) {
      await cancelVoiceRecording();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    try {
      const stream = await startRecording();

      setIsRecording(true);
      isRecordingRef.current = true;

      startAudioLevelDetection(stream);
      startRealtimeRecognition();
    } catch (error) {
      let errorMessage = "No se pudo acceder al micrófono";

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage =
            "Permisos denegados. Por favor, permite el acceso al micrófono.";
        } else if (error.name === "NotFoundError") {
          errorMessage =
            "No se encontró ningún micrófono. Conecta uno e intenta de nuevo.";
        } else {
          errorMessage = error.message;
        }
      }

      onError?.(new Error(errorMessage));

      setIsRecording(false);
      isRecordingRef.current = false;
      setAudioLevel(0);
      setTranscript("");
    }
  }, [
    isTranscribing,
    isRecording,
    startRecording,
    startAudioLevelDetection,
    startRealtimeRecognition,
    onError,
  ]);

  // ==================== CANCELAR GRABACIÓN ====================
  const cancelVoiceRecording = useCallback(async () => {
    wasCancelledRef.current = true;

    stopRealtimeRecognition();

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    await stopRecording();
    setAudioLevel(0);
    setIsRecording(false);
    isRecordingRef.current = false;
    setTranscript("");
  }, [stopRecording, stopRealtimeRecognition]);

  // ==================== LIMPIEZA ====================
  const cleanup = useCallback(() => {
    stopRealtimeRecognition();

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    setTranscript("");
  }, [stopRealtimeRecognition]);

  // ==================== EFECTO DE MONTAJE/DESMONTAJE ====================
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    isTranscribing,
    audioLevel,
    transcript,
    startVoiceRecording,
    cancelVoiceRecording,
    cleanup,
  };
}
