import { Email } from '../valueobjects/Email';
import { ValidationError } from '../errors/DomainError';

export type RolUsuario = 'ADMINISTRADOR' | 'PRODUCTOR';
export type EstadoCuenta = 'activa' | 'bloqueada';

export class Usuario {
  private constructor(
    readonly id: string,
    readonly nombre: string,
    readonly email: Email,
    readonly passwordHash: string,
    readonly rol: RolUsuario,
    readonly estado: EstadoCuenta,
    readonly debeCambiarPassword: boolean,
    readonly createdAt: Date,
  ) {}

  static crear(props: {
    id: string;
    nombre: string;
    email: string;
    passwordHash: string;
    rol: RolUsuario;
    estado?: EstadoCuenta;
    debeCambiarPassword?: boolean;
    createdAt?: Date;
  }): Usuario {
    const nombre = props.nombre.trim();
    if (nombre.length < 2 || nombre.length > 120) {
      throw new ValidationError('El nombre del usuario debe tener entre 2 y 120 caracteres.');
    }
    if (!props.passwordHash.trim()) {
      throw new ValidationError('El usuario requiere una contraseña protegida.');
    }
    const estado = props.estado ?? 'activa';
    if (estado !== 'activa' && estado !== 'bloqueada') {
      throw new ValidationError('El estado de la cuenta no es válido.');
    }
    return new Usuario(
      props.id,
      nombre,
      Email.crear(props.email),
      props.passwordHash,
      props.rol,
      estado,
      props.debeCambiarPassword ?? false,
      props.createdAt ?? new Date(),
    );
  }

  static reconstituir(props: {
    id: string;
    nombre: string;
    email: string;
    passwordHash: string;
    rol: RolUsuario;
    estado: EstadoCuenta;
    debeCambiarPassword: boolean;
    createdAt: Date;
  }): Usuario {
    return Usuario.crear(props);
  }

  conRol(rol: RolUsuario): Usuario {
    return new Usuario(
      this.id,
      this.nombre,
      this.email,
      this.passwordHash,
      rol,
      this.estado,
      this.debeCambiarPassword,
      this.createdAt,
    );
  }

  conPassword(passwordHash: string): Usuario {
    if (!passwordHash.trim()) {
      throw new ValidationError('El usuario requiere una contraseña protegida.');
    }
    return new Usuario(this.id, this.nombre, this.email, passwordHash, this.rol, this.estado, false, this.createdAt);
  }
}
