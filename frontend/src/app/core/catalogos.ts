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

export const ETAPAS_TRAZABILIDAD = [
  { valor: 'BENEFICIO', etiqueta: 'Beneficio' },
  { valor: 'TRILLA', etiqueta: 'Trilla' },
  { valor: 'ALMACENAMIENTO', etiqueta: 'Almacenamiento' },
  { valor: 'TRASLADO', etiqueta: 'Traslado' },
  { valor: 'EXPORTACION', etiqueta: 'Exportación' },
] as const;

export const METODOS_BENEFICIO = ['Lavado', 'Honey', 'Natural'] as const;

export function etiquetaEtapa(valor: string): string {
  return ETAPAS_TRAZABILIDAD.find((etapa) => etapa.valor === valor)?.etiqueta ?? valor;
}
