import { ValidationError } from '../errors/DomainError';

export class AreaHectareas {
  private constructor(readonly valor: number) {}

  static crear(entrada: number): AreaHectareas {
    if (!Number.isFinite(entrada) || entrada <= 0) {
      throw new ValidationError('El área de la parcela debe ser mayor que cero.');
    }
    return new AreaHectareas(Math.round(entrada * 100) / 100);
  }
}
