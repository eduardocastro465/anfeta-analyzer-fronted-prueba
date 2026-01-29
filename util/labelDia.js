// @/util/labelDia.ts

export function obtenerLabelDia(fechaISO) {
  const fecha = new Date(fechaISO);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  // Normalizar fechas a medianoche para comparación
  const normalizarFecha = (f) => {
    return new Date(f.getFullYear(), f.getMonth(), f.getDate());
  };

  const fechaNormalizada = normalizarFecha(fecha);
  const hoyNormalizada = normalizarFecha(hoy);
  const ayerNormalizada = normalizarFecha(ayer);

  if (fechaNormalizada.getTime() === hoyNormalizada.getTime()) {
    return "Hoy";
  } else if (fechaNormalizada.getTime() === ayerNormalizada.getTime()) {
    return "Ayer";
  } else if (fechaNormalizada > ayerNormalizada) {
    // Últimos 7 días
    const diasSemana = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    return diasSemana[fecha.getDay()];
  } else {
    // Fechas más antiguas
    return fecha.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
}