import { ValidationError } from '../errors/DomainError';

export class PrediccionCalidad {
  private constructor(
    readonly id: string,
    readonly loteId: string,
    readonly calidad: string,
    readonly modelo: string,
    readonly referencia: string,
    readonly createdAt: Date,
  ) {}

  static crear(props: {
    id: string;
    loteId: string;
    calidad: string;
    modelo: string;
    referencia: string;
    createdAt?: Date;
  }): PrediccionCalidad {
    const calidad = props.calidad.trim();
    const modelo = props.modelo.trim();
    const referencia = props.referencia.trim();
    if (!props.loteId.trim() || calidad.length < 1 || calidad.length > 80) {
      throw new ValidationError('La predicción no tiene un resultado válido.');
    }
    if (modelo.length < 1 || modelo.length > 120) {
      throw new ValidationError('La predicción no identifica un modelo válido.');
    }
    if (referencia.length < 1 || referencia.length > 500) {
      throw new ValidationError('La predicción no tiene una referencia válida.');
    }
    return new PrediccionCalidad(props.id, props.loteId, calidad, modelo, referencia, props.createdAt ?? new Date());
  }
}
