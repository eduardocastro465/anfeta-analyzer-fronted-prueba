// Al inicio del archivo, antes del componente MessageList
export const verificarHorarioReporte = (
  horaInicio: string,
  horaFin: string,
): boolean => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  const convertir = (hora12h: string): number => {
    const [tiempo, periodo] = hora12h.split(" ");
    const [horaStr, minutoStr] = tiempo.split(":");
    let hora = parseInt(horaStr, 10);
    const minuto = parseInt(minutoStr, 10);

    if (periodo === "PM" && hora !== 12) hora += 12;
    else if (periodo === "AM" && hora === 12) hora = 0;

    return hora * 60 + minuto;
  };

  return (
    currentTotalMinutes >= convertir(horaInicio) &&
    currentTotalMinutes <= convertir(horaFin)
  );
};
