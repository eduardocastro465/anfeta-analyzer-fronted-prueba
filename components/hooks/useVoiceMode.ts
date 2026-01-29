// hooks/useVoiceMode.ts
import { useState, useCallback } from 'react';
import type { VoiceModeStep, TaskExplanation } from '@/lib/types';

export function useVoiceMode() {
  const [voiceMode, setVoiceMode] = useState<boolean>(false);
  const [voiceStep, setVoiceStep] = useState<VoiceModeStep>("idle");
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number>(0);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const [taskExplanations, setTaskExplanations] = useState<TaskExplanation[]>([]);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [expectedInputType, setExpectedInputType] = useState<"explanation" | "confirmation" | "none">("none");
  const [currentListeningFor, setCurrentListeningFor] = useState<string>("");

  const startVoiceMode = useCallback(() => {
    console.log("Iniciando modo voz");
    setVoiceMode(true);
    setVoiceStep("confirm-start");
    setExpectedInputType("none");
  }, []);

  const cancelVoiceMode = useCallback(() => {
    console.log("Cancelando modo voz");
    setVoiceMode(false);
    setVoiceStep("idle");
    setCurrentActivityIndex(0);
    setCurrentTaskIndex(0);
    setTaskExplanations([]);
    setRetryCount(0);
    setExpectedInputType("none");
    setCurrentListeningFor("");
  }, []);

  const resetForNextTask = useCallback(() => {
    setRetryCount(0);
    setExpectedInputType("none");
    setCurrentListeningFor("");
  }, []);

  return {
    voiceMode,
    voiceStep,
    currentActivityIndex,
    currentTaskIndex,
    taskExplanations,
    retryCount,
    expectedInputType,
    currentListeningFor,
    setVoiceMode,
    setVoiceStep,
    setCurrentActivityIndex,
    setCurrentTaskIndex,
    setTaskExplanations,
    setRetryCount,
    setExpectedInputType,
    setCurrentListeningFor,
    startVoiceMode,
    cancelVoiceMode,
    resetForNextTask,
  };
}