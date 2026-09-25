import { ValidationError } from '../errors/DomainError';

const FORMATO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(readonly valor: string) {}

  static crear(entrada: string): Email {
    const valor = entrada.trim().toLowerCase();
    if (valor.length < 5 || valor.length > 180 || !FORMATO.test(valor)) {
      throw new ValidationError('El correo electrónico no tiene un formato válido.');
    }
    return new Email(valor);
  }
}
