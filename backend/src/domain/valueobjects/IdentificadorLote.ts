import { ValidationError } from '../errors/DomainError';

const FORMATO = /^CHNY-\d{4}-[A-F0-9]{8}$/;

export class IdentificadorLote {
  private constructor(readonly valor: string) {}

  static desdeTexto(entrada: string): IdentificadorLote {
    const valor = entrada.trim().toUpperCase();
    if (!FORMATO.test(valor)) {
      throw new ValidationError('El identificador del lote no cumple el formato CHNY-AAAA-XXXXXXXX.');
    }
    return new IdentificadorLote(valor);
  }

  static generar(anio: number, semilla: string): IdentificadorLote {
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      throw new ValidationError('El año del identificador del lote no es válido.');
    }
    const limpio = semilla.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (limpio.length < 8) {
      throw new ValidationError('No hay semilla suficiente para generar el identificador del lote.');
    }
    return new IdentificadorLote(`CHNY-${anio}-${limpio.slice(0, 8)}`);
  }
}
