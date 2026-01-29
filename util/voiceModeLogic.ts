// utils/voiceModeLogic.ts
import type {  ActividadConTareas } from '@/lib/types';

export function isClearCommand(transcript: string, commands: string[]): boolean {
  const lowerTranscript = transcript.toLowerCase().trim();

  if (lowerTranscript.length > 30) return false;

  const isExactMatch = commands.some(
    (cmd) =>
      lowerTranscript === cmd ||
      lowerTranscript === ` ${cmd}` ||
      lowerTranscript === `${cmd} ` ||
      lowerTranscript === ` ${cmd} ` ||
      lowerTranscript === `${cmd}.` ||
      lowerTranscript === `${cmd},` ||
      lowerTranscript === `${cmd}!`,
  );

  if (isExactMatch) return true;

  const words = lowerTranscript.split(/\s+/);
  const lastWord = words[words.length - 1];

  return commands.some(
    (cmd) =>
      lastWord === cmd ||
      lastWord === `${cmd}.` ||
      lastWord === `${cmd},` ||
      lastWord === `${cmd}!`,
  );
}

export function getCurrentActivity(
  currentActivityIndex: number,
  activitiesWithTasks: ActividadConTareas[]
  
) {
  if (
    currentActivityIndex >= 0 &&
    currentActivityIndex < activitiesWithTasks.length
  ) {
    return activitiesWithTasks[currentActivityIndex];
  }
  return null;
}

export function getCurrentTask(
  currentActivityIndex: number,
  currentTaskIndex: number,
  activitiesWithTasks: ActividadConTareas[]
) {
  const currentActivity = getCurrentActivity(currentActivityIndex, activitiesWithTasks);
  if (
    currentActivity &&
    currentTaskIndex >= 0 &&
    currentTaskIndex < currentActivity.tareas.length
  ) {
    return currentActivity.tareas[currentTaskIndex];
  }
  return null;
}

export function cleanExplanationTranscript(transcript: string): string {
  return transcript
    .replace(/\b(terminar|listo|fin|confirmar|enviar)\b/gi, "")
    .trim();
}

export function validateExplanationLength(explanation: string): {
  isValid: boolean;
  message?: string;
} {
  if (!explanation || explanation.length < 5) {
    return {
      isValid: false,
      message: "La explicación es demasiado corta. Por favor, da más detalles.",
    };
  }
  return { isValid: true };
}