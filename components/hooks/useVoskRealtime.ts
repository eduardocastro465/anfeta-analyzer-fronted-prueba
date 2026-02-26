// hooks/useVoskRealtime.ts
// ─────────────────────────────────────────────
// Transcripción en tiempo real via Socket.io.
// Usa el wsService existente para enviar chunks de audio al backend
// y recibir texto parcial en vivo mientras el usuario habla.
//
// API pública idéntica a la versión anterior:
//   startRealtime, stopRealtime, cancelRealtime, loadModel (no-op)
//   status, isRecording, transcript, silenceCountdown
// ─────────────────────────────────────────────

import { useRef, useState, useCallback } from "react";
import { wsService } from "@/lib/websocket.service";

const SAMPLE_RATE = 16000;
const SILENCE_THRESHOLD = 0.01; // Umbral de silencio para considerar que se detuvo la grabación
const SILENCE_DURATION_MS = 3500; // Duración mínima de silencio para considerar que se detuvo la grabación

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

// ── Convierte Float32 a PCM16 (formato que acepta Vosk) ───────────────────
function float32ToPCM16(float32: Float32Array): ArrayBuffer {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return pcm.buffer;
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useVoskRealtime({
  onPartial,
  onFinal,
  onError,
  silenceThresholdMs = SILENCE_DURATION_MS,
}: UseVoskRealtimeOptions = {}): UseVoskRealtimeReturn {
  const [status, setStatus] = useState<VoskStatus>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);

  // Audio refs
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Control interno
  const cancelledRef = useRef(false);
  const isStopping = useRef(false);
  const hasSpeechRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTranscriptRef = useRef(""); // acumula texto confirmado (final: true)

  // ── loadModel: no-op, el modelo vive en el backend ──────────────────────
  const loadModel = useCallback(async () => {
    setStatus("ready");
  }, []);

  // ── Limpieza de audio ────────────────────────────────────────────────────
  const _cleanupAudio = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // ── Stop interno ──────────────────────────────────────────────────────────
  const _doStop = useCallback(
    (wasCancelled = false): string => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      setIsRecording(false);
      setSilenceCountdown(null);
      _cleanupAudio();

      // Avisar al backend que terminó la sesión
      wsService.emit("vosk-stop", null);

      // Remover listeners de vosk
      wsService.off("vosk-parcial");
      wsService.off("vosk-error");

      const finalText = liveTranscriptRef.current.trim();

      if (!wasCancelled) {
        onFinal?.(finalText);
      }

      liveTranscriptRef.current = "";
      isStopping.current = false;
      return finalText;
    },
    [_cleanupAudio, onFinal],
  );

  // ── startRealtime ─────────────────────────────────────────────────────────
  const startRealtime = useCallback(async (): Promise<MediaStream | null> => {
    cancelledRef.current = false;
    isStopping.current = false;
    hasSpeechRef.current = false;
    liveTranscriptRef.current = "";
    setTranscript("");
    setStatus("ready");

    // Registrar listeners de Socket.io para esta sesión
    wsService.on("vosk-parcial", (data: { text: string; final: boolean }) => {
      if (cancelledRef.current) return;

      let live = "";

      if (data.final) {
        // Texto confirmado: acumularlo
        liveTranscriptRef.current += data.text + " ";
        live = liveTranscriptRef.current.trim();
      } else {
        // Texto parcial: mostrar acumulado + parcial actual
        live = (liveTranscriptRef.current + data.text).trim();
      }

      setTranscript(live);
      onPartial?.(live);
    });

    wsService.on("vosk-error", (data: { error: string }) => {
      onError?.(new Error(data.error));
      setStatus("error");
    });

    // Iniciar sesión en el backend
    await wsService.emitWhenReady("vosk-start", null);

    try {
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
      const processor = audioCtx.createScriptProcessor(8192, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (cancelledRef.current || isStopping.current) return;

        const input = e.inputBuffer.getChannelData(0);
        const float32 = new Float32Array(input);

        // Calcular RMS para detección de silencio
        let sum = 0;
        for (let i = 0; i < float32.length; i++) sum += float32[i] * float32[i];
        const rms = Math.sqrt(sum / float32.length);

        // Enviar chunk al backend via Socket.io
        wsService.emit("vosk-chunk", float32ToPCM16(float32));

        // Detección de silencio
        if (rms > SILENCE_THRESHOLD) {
          hasSpeechRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          setSilenceCountdown(null);
        } else if (hasSpeechRef.current && !silenceTimerRef.current) {
          const totalSeconds = Math.ceil(silenceThresholdMs / 1000);
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

          silenceTimerRef.current = setTimeout(() => {
            clearInterval(countdownInterval);
            setSilenceCountdown(null);
            if (!isStopping.current && !cancelledRef.current) {
              isStopping.current = true;
              _doStop(false);
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
        err instanceof Error ? err : new Error("Error iniciando grabación");
      onError?.(error);
      setStatus("error");
      return null;
    }
  }, [onPartial, onError, _doStop, silenceThresholdMs]);

  // ── stopRealtime ──────────────────────────────────────────────────────────
  const stopRealtime = useCallback((): Promise<string> => {
    if (isStopping.current) return Promise.resolve("");
    isStopping.current = true;
    return Promise.resolve(_doStop(false));
  }, [_doStop]);

  // ── cancelRealtime ────────────────────────────────────────────────────────
  const cancelRealtime = useCallback(() => {
    cancelledRef.current = true;
    isStopping.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    setSilenceCountdown(null);
    setIsRecording(false);
    setTranscript("");
    _cleanupAudio();

    wsService.emit("vosk-stop", null);
    wsService.off("vosk-parcial");
    wsService.off("vosk-error");

    liveTranscriptRef.current = "";
    hasSpeechRef.current = false;
  }, [_cleanupAudio]);

  return {
    status,
    isRecording,
    transcript,
    silenceCountdown,
    startRealtime,
    stopRealtime,
    cancelRealtime,
    loadModel,
  };
}
