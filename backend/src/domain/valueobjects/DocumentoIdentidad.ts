import { ValidationError } from '../errors/DomainError';

/**
 * Decisión de diseño del PMV1, no un requisito literal de la consigna:
 * el productor se identifica con DNI (8 dígitos) o RUC (11 dígitos),
 * formatos habituales en Perú.
 */
export class DocumentoIdentidad {
  private constructor(readonly valor: string) {}

  static crear(entrada: string): DocumentoIdentidad {
    const valor = entrada.trim();
    if (!/^(\d{8}|\d{11})$/.test(valor)) {
      throw new ValidationError('El documento debe ser un DNI de 8 dígitos o un RUC de 11 dígitos.');
    }
    return new DocumentoIdentidad(valor);
  }
}
