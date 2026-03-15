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
  startRecording: (onChunk?: (chunk: Blob) => void) => Promise<MediaStream>;

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
  processAndSendAudio: () => Promise<void>;
  cleanup: () => void;
  silenceCountdown: number | null;
}

export function useAutoSendVoice({
  silenceThreshold = 3000,
  speechThreshold = 8, // para que detecte la voz mas rapido
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
  const realtimeChunksRef = useRef<Blob[]>([]);
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>("");
  const transcriptRef = useRef("");
  const isTranscribingRealtimeRef = useRef(false);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const countIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== SINCRONIZACIÓN STATE <-> REF ====================
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // ==================== RECONOCIMIENTO DE VOZ EN TIEMPO REAL ====================

  const updateTranscript = useCallback(
    (updater: string | ((prev: string) => string)) => {
      setTranscript((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        transcriptRef.current = next;
        return next;
      });
    },
    [],
  );

  const startRealtimeWhisper = useCallback(() => {
    if (!enableRealtimeTranscription) return;

    console.log("startRealtimeWhisper iniciado");
    realtimeChunksRef.current = [];

    realtimeIntervalRef.current = setInterval(async () => {
      console.log(
        "interval tick - isRecording:",
        isRecordingRef.current,
        "chunks:",
        realtimeChunksRef.current.length,
      );

      if (!isRecordingRef.current || realtimeChunksRef.current.length === 0)
        return;
      if (isTranscribingRealtimeRef.current) return;

      const allChunks = realtimeChunksRef.current;
      const previewChunks =
        allChunks.length > 15
          ? [allChunks[0], ...allChunks.slice(-14)]
          : allChunks;

      const chunkBlob = new Blob(previewChunks, {
        type: mimeTypeRef.current || "audio/webm",
      });

      console.log("blob size:", chunkBlob.size, "type:", chunkBlob.type);

      if (chunkBlob.size < 5000) {
        console.log("blob muy pequeño, esperando...");
        return;
      }

      try {
        const partialTranscript = await transcriptionService(chunkBlob);
        console.log("transcript:", partialTranscript);
        if (partialTranscript?.trim()) {
          setTranscript(partialTranscript.trim());
          transcriptRef.current = partialTranscript.trim();
        }
      } catch (e) {
        console.error("error transcribiendo:", e);
      }
    }, 1500); // 1.5 segundos
  }, [enableRealtimeTranscription, transcriptionService]);

  const stopRealtimeWhisper = useCallback(() => {
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
      realtimeIntervalRef.current = null;
    }
  }, []);

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

  const startRealtimeRecognition = useCallback(() => {
    if (!enableRealtimeTranscription) return;
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      startRealtimeWhisper();
      return;
    }

    // ✅ Timeout: si en 5 segundos no llega ningún resultado, cambiar a Whisper
    let hasReceivedResult = false;
    const fallbackTimer = setTimeout(() => {
      if (!hasReceivedResult) {
        console.warn(
          "SpeechRecognition no produjo resultados, cambiando a Whisper",
        );
        stopRealtimeRecognition();
        startRealtimeWhisper();
      }
    }, 5000);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "es-ES";

      recognition.onresult = (event: any) => {
        hasReceivedResult = true;
        clearTimeout(fallbackTimer); // ✅ Funciona, cancelar fallback

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
        setTranscript((prev) => {
          const newTranscript = (prev + finalTranscript).trim();
          return (
            newTranscript + (interimTranscript ? " " + interimTranscript : "")
          );
        });
      };

      recognition.onerror = () => {
        clearTimeout(fallbackTimer);
        stopRealtimeRecognition();
        startRealtimeWhisper();
      };

      recognition.onend = () => {
        if (isRecordingRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      clearTimeout(fallbackTimer);
      startRealtimeWhisper();
    }
  }, [
    enableRealtimeTranscription,
    startRealtimeWhisper,
    stopRealtimeRecognition,
  ]);

  // ==================== PROCESAMIENTO Y ENVÍO ====================
  const processAndSendAudio = useCallback(async () => {
    if (isProcessingRef.current) {
      return;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    isProcessingRef.current = true;
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsTranscribing(true);
    setAudioLevel(0);

    // Detener reconocimiento en tiempo real
    stopRealtimeWhisper();
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
      const audioBlob = await stopRecording();

      if (wasCancelledRef.current) {
        wasCancelledRef.current = false;
        setTranscript("");
        return;
      }

      const finalTranscript = await transcriptionService(audioBlob);

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
    }
  }, [
    silenceThreshold,
    stopRecording,
    transcriptionService,
    onTranscriptionComplete,
    onError,
    stopRealtimeRecognition,
    stopRealtimeWhisper,
  ]);

  // ==================== TIMER DE SILENCIO ====================
  const resetSilenceTimer = useCallback(() => {
    if (isProcessingRef.current) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countIntervalRef.current) {
      clearInterval(countIntervalRef.current);
      countIntervalRef.current = null;
    }
    setSilenceCountdown(Math.ceil(silenceThreshold / 1000));
    const countInterval = setInterval(() => {
      setSilenceCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countInterval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    silenceTimerRef.current = setTimeout(() => {
      clearInterval(countInterval);
      setSilenceCountdown(null);
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
        analyser.smoothingTimeConstant = 0.8;
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

          if (average > speechThreshold) {
            // 🎤 VOZ — cancelar countdown
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            if (countIntervalRef.current) {
              clearInterval(countIntervalRef.current);
              countIntervalRef.current = null;
            }
            setSilenceCountdown(null);
          } else {
            // 🔇 SILENCIO — iniciar countdown solo si no está corriendo
            if (!silenceTimerRef.current && !isProcessingRef.current) {
              resetSilenceTimer();
            }
          }

          animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
        };

        // resetSilenceTimer();
        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
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
      const stream = await startRecording((chunk) => {
        realtimeChunksRef.current.push(chunk); // acumular chunks para Whisper parcial
      });

      isRecordingRef.current = true;
      setIsRecording(true);

      startAudioLevelDetection(stream);
      console.log("llamando startRealtimeWhisper directamente");
      startRealtimeWhisper();
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

    if (countIntervalRef.current) {
      clearInterval(countIntervalRef.current);
      countIntervalRef.current = null;
    }
    stopRealtimeWhisper();
    await stopRecording();
    setAudioLevel(0);
    setIsRecording(false);
    isRecordingRef.current = false;
    setTranscript("");
  }, [stopRecording, stopRealtimeRecognition, stopRealtimeWhisper]);

  // ==================== LIMPIEZA ====================
  const cleanup = useCallback(() => {
    stopRealtimeWhisper();
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
    processAndSendAudio,
    cleanup,
    silenceCountdown,
  };
}
