// utils/timeChecks.ts
export function isReportTimeWindow(
  horaInicio: number,
  minutoInicio: number,
  horaFin: number,
  minutoFin: number
): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const startTotalMinutes = horaInicio * 60 + minutoInicio;
  const endTotalMinutes = horaFin * 60 + minutoFin;

  return (
    currentTotalMinutes >= startTotalMinutes &&
    currentTotalMinutes <= endTotalMinutes
  );
}

export function checkIfAfterHours(hour: number, minute: number): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return currentHour > hour || (currentHour === hour && currentMinute >= minute);
}

export function isMidnight(): boolean {
  const now = new Date();
  return now.getHours() === 0 && now.getMinutes() === 0;
}