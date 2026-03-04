// hooks/useVoskRealtime.ts
import { useRef, useState, useCallback } from "react";

const MODEL_URL = "/models/vosk-model-small-es-0.42.tar.gz";
const SAMPLE_RATE = 16000;
const SILENCE_THRESHOLD = 0.006; // RMS mínimo para considerar que hay voz
const SILENCE_DURATION_MS = 3500; // ms de silencio antes de auto-enviar

type VoskStatus = "idle" | "loading" | "ready" | "error";

interface UseVoskRealtimeOptions {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (error: Error) => void;
  silenceThresholdMs?: number;
}

interface UseVoskRealtimeReturn {
  status: VoskStatus;
  isRecording: boolean;
  transcript: string;
  silenceCountdown: number | null;
  startRealtime: () => Promise<MediaStream | null>;
  stopRealtime: () => Promise<string>;
  cancelRealtime: () => void;
  loadModel: () => Promise<void>;
}

export function useVoskRealtime({
  onPartial,
  onFinal,
  onError,
  silenceThresholdMs = SILENCE_DURATION_MS,
}: UseVoskRealtimeOptions = {}): UseVoskRealtimeReturn {
  const [status, setStatus] = useState<VoskStatus>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");

  const modelRef = useRef<any>(null);
  const recognizerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const loadingRef = useRef<Promise<void> | null>(null);
  const cancelledRef = useRef(false);
  const fullTextRef = useRef("");
  const lastPartialRef = useRef("");

  // ── silencio ──
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpeechRef = useRef(false); // hubo voz al menos una vez
  const isStopping = useRef(false); // evitar doble stop

  // ==================== CARGA DEL MODELO ====================
  const loadModel = useCallback(async () => {
    if (modelRef.current) return;
    if (loadingRef.current) return loadingRef.current;

    const doLoad = async () => {
      try {
        setStatus("loading");
        const Vosk = await import("vosk-browser");
        const model = await Vosk.createModel(MODEL_URL);
        modelRef.current = model;
        setStatus("ready");
      } catch (err) {
        setStatus("error");
        loadingRef.current = null;
        throw err;
      }
    };

    loadingRef.current = doLoad();
    return loadingRef.current;
  }, []);

  // ==================== STOP (interno, reutilizable) ====================
  const _doStop = useCallback(
    (wasCancelled = false): Promise<string> => {
      return new Promise((resolve) => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        setIsRecording(false);

        processorRef.current?.disconnect();
        processorRef.current = null;

        const recognizer = recognizerRef.current;
        recognizer?.retrieveFinalResult();
        setSilenceCountdown(null);
        setTimeout(() => {
          const text =
            fullTextRef.current.trim() || lastPartialRef.current.trim();
          setTranscript(text);
          // ✅ Solo enviar si NO fue cancelado
          if (!wasCancelled) onFinal?.(text);

          try {
            recognizer?.remove();
          } catch {}
          recognizerRef.current = null;

          audioCtxRef.current?.close();
          audioCtxRef.current = null;

          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;

          isStopping.current = false;
          resolve(text);
        }, 800);
      });
    },
    [onFinal],
  );

  // ==================== INICIAR ====================
  const startRealtime = useCallback(async (): Promise<MediaStream | null> => {
    cancelledRef.current = false;
    isStopping.current = false;
    hasSpeechRef.current = false;
    fullTextRef.current = "";
    lastPartialRef.current = "";
    setTranscript("");

    try {
      if (!modelRef.current) await loadModel();
      if (!modelRef.current) throw new Error("Modelo no disponible");

      const recognizer = new modelRef.current.KaldiRecognizer(SAMPLE_RATE);
      recognizerRef.current = recognizer;

      recognizer.on("result", (msg: any) => {
        const text = msg?.result?.text ?? msg?.text ?? "";
        if (text) {
          if (!fullTextRef.current.endsWith(text)) {
            fullTextRef.current += text + " ";
          }
          const current = fullTextRef.current.trim();
          setTranscript(current);
          onPartial?.(current);
        }
      });

      recognizer.on("partialresult", (msg: any) => {
        const partial = msg?.result?.partial ?? msg?.partial ?? "";
        if (partial) {
          lastPartialRef.current = partial;
          const live = (fullTextRef.current + partial).trim();
          setTranscript(live);
          onPartial?.(live);
        }
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
    processor.onaudioprocess = (e) => {
        if (cancelledRef.current || isStopping.current) return;

        const input = e.inputBuffer.getChannelData(0);
        const pcm = new Float32Array(input);

        // Calcular RMS para detectar silencio
        let sum = 0;
        for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
        const rms = Math.sqrt(sum / pcm.length);

        recognizer.acceptWaveformFloat(pcm, SAMPLE_RATE);

        if (rms > SILENCE_THRESHOLD) {
          hasSpeechRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          setSilenceCountdown(null); // ← limpiar visual cuando vuelve a hablar
        } else if (hasSpeechRef.current && !silenceTimerRef.current) {
          // Iniciar countdown visual
          const totalSeconds = Math.ceil(silenceThresholdMs / 1000); // 4
          setSilenceCountdown(totalSeconds);

          const countdownInterval = setInterval(() => {
            setSilenceCountdown((prev) => {
              if (prev === null || prev <= 1) {
                clearInterval(countdownInterval);
                return null;
              }
              return prev - 1;
            });
          }, 1000);

          silenceTimerRef.current = setTimeout(async () => {
            clearInterval(countdownInterval);
            setSilenceCountdown(null);
            if (!isStopping.current && !cancelledRef.current) {
              isStopping.current = true;
              await _doStop(false);
            }
          }, silenceThresholdMs);
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);
      return stream;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Error iniciando Vosk");
      onError?.(error);
      return null;
    }
  }, [loadModel, onPartial, onError, _doStop, silenceThresholdMs]);

  // ==================== DETENER MANUAL ====================
  const stopRealtime = useCallback((): Promise<string> => {
    if (isStopping.current) return Promise.resolve("");
    isStopping.current = true;
    return _doStop(false); // false = no cancelado, sí enviar
  }, [_doStop]);

  // ==================== CANCELAR ====================
  const cancelRealtime = useCallback(() => {
    cancelledRef.current = true;
    setSilenceCountdown(null); // ← limpiar visual
    isStopping.current = false;
    setIsRecording(false);
    setTranscript("");

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    processorRef.current?.disconnect();
    processorRef.current = null;

    try {
      recognizerRef.current?.remove();
    } catch {}
    recognizerRef.current = null;

    audioCtxRef.current?.close();
    audioCtxRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    fullTextRef.current = "";
    lastPartialRef.current = "";
    hasSpeechRef.current = false;
  }, []);

  return {
    status,
    isRecording,
    transcript,
    silenceCountdown, // ← NUEVO
    startRealtime,
    stopRealtime,
    cancelRealtime,
    loadModel,
  };
}