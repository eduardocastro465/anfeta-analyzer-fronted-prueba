import { useState, useRef, useCallback } from "react";

export const useVoiceSynthesis = (initialRate = 1.2, initialLang = "es-MX") => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rate, setRate] = useState(initialRate);
  const rateRef = useRef(initialRate);
  const langRef = useRef(initialLang);
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
        utterance.lang = langRef.current;
        utterance.rate = customRate ?? rateRef.current;

        // Selección de voz
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = null;

        if (langRef.current === "es-MX") {
          selectedVoice = voices.find((v) =>
            v.name.includes("Microsoft Sabina"),
          );
        }

        if (!selectedVoice) {
          selectedVoice = voices.find((v) => v.lang === langRef.current);
        }

        if (!selectedVoice) {
          const baseLang = langRef.current.split("-")[0];
          selectedVoice = voices.find((v) => v.lang.startsWith(baseLang));
        }

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
      rateRef.current = newRate;
      setRate(newRate);
      if (currentTextRef.current && window.speechSynthesis.speaking) {
        speak(currentTextRef.current, newRate);
      }
    },
    [speak],
  );

  const changeLang = useCallback((newLang: string) => {
    langRef.current = newLang;
  }, []);

  return { speak, stop, isSpeaking, rate, setRate, changeRate, changeLang };
};
