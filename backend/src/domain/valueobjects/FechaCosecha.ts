import { ValidationError } from '../errors/DomainError';

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

export class FechaCosecha {
  private constructor(readonly iso: string) {}

  static crear(entrada: string, hoyIso: string): FechaCosecha {
    const iso = entrada.trim();
    if (!FORMATO.test(iso) || !FORMATO.test(hoyIso) || !esFechaReal(iso)) {
      throw new ValidationError('La fecha de cosecha debe tener formato YYYY-MM-DD.');
    }
    if (iso > hoyIso) {
      throw new ValidationError('La fecha de cosecha no puede ser futura.');
    }
    return new FechaCosecha(iso);
  }
}

function esFechaReal(iso: string): boolean {
  const [anio, mes, dia] = iso.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}
