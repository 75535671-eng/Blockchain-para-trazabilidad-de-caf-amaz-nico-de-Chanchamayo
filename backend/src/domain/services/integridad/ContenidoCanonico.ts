/**
 * Texto estable que entra al hash de integridad del evento.
 * Lleva el lote, la etapa, la fecha, la descripción y, en el beneficio, el método y la humedad.
 * No lleva nombre, documento, teléfono ni organización del productor.
 */
export function contenidoCanonico(evento: {
  loteId: string;
  etapa: string;
  fecha: string;
  descripcion: string;
  variables: { metodoBeneficio: string; humedadPorcentaje: number } | null;
}): string {
  const lineas = [
    `lote=${evento.loteId}`,
    `etapa=${evento.etapa}`,
    `fecha=${evento.fecha}`,
    `descripcion=${JSON.stringify(evento.descripcion)}`,
  ];
  if (evento.variables) {
    lineas.push(`metodo=${evento.variables.metodoBeneficio}`);
    lineas.push(`humedad=${evento.variables.humedadPorcentaje.toFixed(2)}`);
  }
  return lineas.join('\n');
}
