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
