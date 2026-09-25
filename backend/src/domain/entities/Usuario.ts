import { Email } from '../valueobjects/Email';
import { ValidationError } from '../errors/DomainError';

export type RolUsuario = 'ADMINISTRADOR' | 'PRODUCTOR';

export class Usuario {
  private constructor(
    readonly id: string,
    readonly nombre: string,
    readonly email: Email,
    readonly passwordHash: string,
    readonly rol: RolUsuario,
    readonly createdAt: Date,
  ) {}

  static crear(props: {
    id: string;
    nombre: string;
    email: string;
    passwordHash: string;
    rol: RolUsuario;
    createdAt?: Date;
  }): Usuario {
    const nombre = props.nombre.trim();
    if (nombre.length < 2 || nombre.length > 120) {
      throw new ValidationError('El nombre del usuario debe tener entre 2 y 120 caracteres.');
    }
    if (!props.passwordHash.trim()) {
      throw new ValidationError('El usuario requiere una contraseña protegida.');
    }
    return new Usuario(
      props.id,
      nombre,
      Email.crear(props.email),
      props.passwordHash,
      props.rol,
      props.createdAt ?? new Date(),
    );
  }

  static reconstituir(props: {
    id: string;
    nombre: string;
    email: string;
    passwordHash: string;
    rol: RolUsuario;
    createdAt: Date;
  }): Usuario {
    return Usuario.crear(props);
  }
}
