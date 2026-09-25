import { ValidationError } from '../errors/DomainError';

export class CantidadKg {
  private constructor(readonly valor: number) {}

  static crear(entrada: number): CantidadKg {
    if (!Number.isFinite(entrada) || entrada <= 0) {
      throw new ValidationError('La cantidad del lote debe ser mayor que cero.');
    }
    return new CantidadKg(Math.round(entrada * 100) / 100);
  }
}
