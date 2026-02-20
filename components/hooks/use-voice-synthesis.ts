import { useState, useRef, useCallback } from "react";

export const useVoiceSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rate, setRate] = useState(1.2);
  const rateRef = useRef(1.2);
  const currentTextRef = useRef<string>("");

  const speak = useCallback(
    (text: string, customRate?: number): Promise<void> => {
      return new Promise((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          resolve();
          return;
        }

        window.speechSynthesis.cancel();
        currentTextRef.current = text;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "es-MX";
        utterance.rate = customRate ?? rateRef.current;

        // Selección de voz
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice =
          voices.find((v) => v.name.includes("Microsoft Sabina")) ||
          voices.find((v) => v.lang.startsWith("es"));

        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [],
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const changeRate = useCallback(
    (newRate: number) => {
      rateRef.current = newRate; // ← actualizar ref primero
      setRate(newRate);
      if (currentTextRef.current && window.speechSynthesis.speaking) {
        speak(currentTextRef.current, newRate);
      }
    },
    [speak],
  );

  return { speak, stop, isSpeaking, rate, setRate, changeRate };
};
