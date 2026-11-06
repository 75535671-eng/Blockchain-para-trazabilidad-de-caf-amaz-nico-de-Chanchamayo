const PREVIAS = ['BENEFICIO', 'TRILLA', 'ALMACENAMIENTO', 'TRASLADO'] as const;

export interface EventoParaTrazabilidad {
  etapa: string;
  fecha: string;
  humedadPorcentaje: number | null;
}

export interface EntradaTrazabilidad {
  tieneBeneficio: number;
  tieneTrilla: number;
  tieneAlmacenamiento: number;
  tieneTraslado: number;
  ordenCronologico: number;
  humedadAusente: number;
  humedadPorcentaje: number;
  diasEntreExtremos: number;
}

export function entradaTrazabilidad(eventos: EventoParaTrazabilidad[]): EntradaTrazabilidad | null {
  const previos = eventos.filter((evento) => (PREVIAS as readonly string[]).includes(evento.etapa));
  if (previos.length === 0) {
    return null;
  }
  const etapas = PREVIAS.filter((etapa) => previos.some((evento) => evento.etapa === etapa));
  const primera = (etapa: string) => Math.min(...previos.filter((evento) => evento.etapa === etapa).map((evento) => diaUtc(evento.fecha)));
  const ordenadas = [...etapas].sort((a, b) => primera(a) - primera(b) || PREVIAS.indexOf(a) - PREVIAS.indexOf(b));
  const orden = ordenadas.every((etapa, indice) => etapa === etapas[indice]) ? 1 : 0;
  const dias = etapas.length > 1 ? Math.round((Math.max(...etapas.map(primera)) - Math.min(...etapas.map(primera))) / 86_400_000) : 0;
  const beneficios = previos
    .filter((evento) => evento.etapa === 'BENEFICIO' && evento.humedadPorcentaje != null)
    .sort((a, b) => diaUtc(a.fecha) - diaUtc(b.fecha));
  const humedad = beneficios.at(-1)?.humedadPorcentaje ?? null;
  return {
    tieneBeneficio: etapas.includes('BENEFICIO') ? 1 : 0,
    tieneTrilla: etapas.includes('TRILLA') ? 1 : 0,
    tieneAlmacenamiento: etapas.includes('ALMACENAMIENTO') ? 1 : 0,
    tieneTraslado: etapas.includes('TRASLADO') ? 1 : 0,
    ordenCronologico: orden,
    humedadAusente: humedad == null ? 1 : 0,
    humedadPorcentaje: humedad ?? 11,
    diasEntreExtremos: dias,
  };
}

function diaUtc(fecha: string): number {
  return Date.parse(`${fecha.slice(0, 10)}T00:00:00Z`);
}
