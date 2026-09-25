import { Lote, Parcela, Productor } from '../core/modelos';

export interface LoteVista {
  id: string;
  codigo: string;
  estado: string;
  productor: string;
  parcela: string;
  distrito: string;
  localidad: string | null;
  parcelaId: string;
  variedad: string;
  cantidadKg: number;
  fechaCosecha: string;
  observaciones: string | null;
  altitudMsnm: number | null;
  areaHectareas: number | null;
}

export function vistasDeLotes(lotes: Lote[], parcelas: Parcela[], productores: Productor[]): LoteVista[] {
  return lotes.map((lote) => {
    const parcela = parcelas.find((item) => item.id === lote.parcelaId);
    const productor = productores.find((item) => item.id === parcela?.productorId);
    return {
      id: lote.id,
      codigo: lote.codigo,
      estado: lote.estado,
      productor: productor?.nombre ?? 'Sin productor',
      parcela: parcela?.nombre ?? 'Sin parcela',
      distrito: parcela?.distrito ?? '—',
      localidad: parcela?.localidad ?? null,
      parcelaId: lote.parcelaId,
      variedad: lote.variedad,
      cantidadKg: lote.cantidadKg,
      fechaCosecha: lote.fechaCosecha,
      observaciones: lote.observaciones,
      altitudMsnm: parcela?.altitudMsnm ?? null,
      areaHectareas: parcela?.areaHectareas ?? null,
    };
  });
}

export interface BarraCosecha {
  etiqueta: string;
  kilogramos: number;
  altura: number;
}

export function barrasDeCosecha(lotes: Lote[]): BarraCosecha[] {
  const grupos = new Map<string, number>();
  for (const lote of lotes) {
    const etiqueta = lote.fechaCosecha.slice(0, 7);
    grupos.set(etiqueta, (grupos.get(etiqueta) ?? 0) + lote.cantidadKg);
  }
  const maximo = Math.max(...grupos.values(), 1);
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([etiqueta, kilogramos]) => ({
      etiqueta,
      kilogramos,
      altura: Math.max(12, Math.round((kilogramos / maximo) * 120)),
    }));
}
