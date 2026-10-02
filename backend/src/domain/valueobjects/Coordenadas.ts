import { ValidationError } from '../errors/DomainError';

export class Coordenadas {
  private constructor(
    readonly latitud: number,
    readonly longitud: number,
  ) {}

  static crear(latitud: number, longitud: number): Coordenadas {
    if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
      throw new ValidationError('La latitud debe estar entre -90 y 90.');
    }
    if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
      throw new ValidationError('La longitud debe estar entre -180 y 180.');
    }
    return new Coordenadas(redondear(latitud), redondear(longitud));
  }
}

function redondear(valor: number): number {
  return Math.round(valor * 1_000_000) / 1_000_000;
}
