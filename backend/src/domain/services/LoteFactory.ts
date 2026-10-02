import { FechaCosecha } from '../valueobjects/FechaCosecha';
import { IdentificadorLote } from '../valueobjects/IdentificadorLote';
import { Lote } from '../entities/Lote';

export class LoteFactory {
  static crear(props: {
    id: string;
    semillaCodigo: string;
    parcelaId: string;
    fechaCosecha: string;
    hoyIso: string;
    cantidadKg: number;
    variedad: string;
    observaciones?: string | null;
  }): Lote {
    const fecha = FechaCosecha.crear(props.fechaCosecha, props.hoyIso);
    const anio = Number(fecha.iso.slice(0, 4));
    return Lote.crear({
      id: props.id,
      codigo: IdentificadorLote.generar(anio, props.semillaCodigo),
      parcelaId: props.parcelaId,
      fechaCosecha: fecha,
      cantidadKg: props.cantidadKg,
      variedad: props.variedad,
      observaciones: props.observaciones,
    });
  }
}
