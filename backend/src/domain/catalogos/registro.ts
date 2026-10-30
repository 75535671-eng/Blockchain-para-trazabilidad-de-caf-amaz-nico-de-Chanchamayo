export const DISTRITOS_PARCELA = [
  'La Merced',
  'Perené',
  'Pichanaqui',
  'San Ramón',
  'San Luis de Shuaro',
  'Vitoc',
  'Sangani',
] as const;

export const VARIEDADES_LOTE = ['Caturra', 'Typica', 'Bourbon', 'Pache'] as const;

export const MENSAJE_PRODUCTOR_DUPLICADO = 'Este productor ya se encuentra registrado';

export function esDistritoParcela(valor: string): boolean {
  return (DISTRITOS_PARCELA as readonly string[]).includes(valor.trim());
}

export function esVariedadLote(valor: string): boolean {
  return (VARIEDADES_LOTE as readonly string[]).includes(valor.trim());
}

export const ETAPAS_TRAZABILIDAD = [
  'BENEFICIO',
  'TRILLA',
  'ALMACENAMIENTO',
  'TRASLADO',
  'EXPORTACION',
] as const;

export type EtapaTrazabilidad = (typeof ETAPAS_TRAZABILIDAD)[number];

export const METODOS_BENEFICIO = ['Lavado', 'Honey', 'Natural'] as const;

export type MetodoBeneficio = (typeof METODOS_BENEFICIO)[number];

export function esEtapaTrazabilidad(valor: string): valor is EtapaTrazabilidad {
  return (ETAPAS_TRAZABILIDAD as readonly string[]).includes(valor);
}

export function esMetodoBeneficio(valor: string): valor is MetodoBeneficio {
  return (METODOS_BENEFICIO as readonly string[]).includes(valor);
}
