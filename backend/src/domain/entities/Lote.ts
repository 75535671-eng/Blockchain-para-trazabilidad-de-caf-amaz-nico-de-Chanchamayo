import { CantidadKg } from '../valueobjects/CantidadKg';
import { FechaCosecha } from '../valueobjects/FechaCosecha';
import { IdentificadorLote } from '../valueobjects/IdentificadorLote';
import { ValidationError } from '../errors/DomainError';

export class Lote {
  private constructor(
    readonly id: string,
    readonly codigo: IdentificadorLote,
    readonly parcelaId: string,
    readonly fechaCosecha: FechaCosecha,
    readonly cantidad: CantidadKg,
    readonly variedad: string,
    readonly observaciones: string | null,
    /** Valor inicial del PMV1. PMV2 puede incorporar otros estados sin cambiar esta entidad. */
    readonly estado: 'REGISTRADO',
    readonly createdAt: Date,
  ) {}

  static crear(props: {
    id: string;
    codigo: IdentificadorLote;
    parcelaId: string;
    fechaCosecha: FechaCosecha;
    cantidadKg: number;
    variedad: string;
    observaciones?: string | null;
    createdAt?: Date;
  }): Lote {
    if (!props.parcelaId.trim()) {
      throw new ValidationError('El lote debe estar asociado a una parcela.');
    }
    const variedad = props.variedad.trim();
    if (variedad.length < 2 || variedad.length > 80) {
      throw new ValidationError('La variedad debe tener entre 2 y 80 caracteres.');
    }
    const observaciones = props.observaciones?.trim() ?? '';
    if (observaciones.length > 500) {
      throw new ValidationError('Las observaciones admiten como máximo 500 caracteres.');
    }
    return new Lote(
      props.id,
      props.codigo,
      props.parcelaId,
      props.fechaCosecha,
      CantidadKg.crear(props.cantidadKg),
      variedad,
      observaciones || null,
      'REGISTRADO',
      props.createdAt ?? new Date(),
    );
  }

  actualizar(props: {
    parcelaId: string;
    fechaCosecha: FechaCosecha;
    cantidadKg: number;
    variedad: string;
    observaciones?: string | null;
  }): Lote {
    return Lote.crear({
      id: this.id,
      codigo: this.codigo,
      parcelaId: props.parcelaId,
      fechaCosecha: props.fechaCosecha,
      cantidadKg: props.cantidadKg,
      variedad: props.variedad,
      observaciones: props.observaciones,
      createdAt: this.createdAt,
    });
  }
}
