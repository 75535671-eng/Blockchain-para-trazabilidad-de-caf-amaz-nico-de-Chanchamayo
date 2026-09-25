import { ValidationError } from '../../domain/errors/DomainError';

/** Decisión de seguridad del PMV1. No es una regla del dominio del café. */
export function validarPasswordPlano(password: string): void {
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new ValidationError('La contraseña debe tener entre 8 y 72 caracteres e incluir letras y números.');
  }
}

export function hoyIso(fecha = new Date()): string {
  return fecha.toISOString().slice(0, 10);
}

export function nuevoId(): string {
  return crypto.randomUUID();
}
