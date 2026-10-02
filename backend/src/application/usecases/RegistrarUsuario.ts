import { Productor } from '../../domain/entities/Productor';
import { Usuario } from '../../domain/entities/Usuario';
import { ConflictError, ForbiddenError, ValidationError } from '../../domain/errors/DomainError';
import { Actor, ProductorDto, UsuarioDto } from '../dto/dtos';
import { CrearCuentaProductorUseCase, RegistrarUsuarioUseCase } from '../ports/input/UseCases';
import { PasswordHasherPort, ProductorRepositoryPort, RegistroCuentaProductorPort, UsuarioRepositoryPort } from '../ports/output/OutputPorts';
import { nuevoId, validarPasswordPlano } from '../support/apoyo';

export class RegistrarUsuario implements RegistrarUsuarioUseCase {
  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly registro: RegistroCuentaProductorPort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async ejecutar(comando: {
    nombre: string;
    email: string;
    password: string;
    documento: string;
    telefono?: string | null;
    organizacion?: string | null;
  }): Promise<UsuarioDto> {
    validarPasswordPlano(comando.password);
    const usuario = Usuario.crear({
      id: nuevoId(),
      nombre: comando.nombre,
      email: comando.email,
      passwordHash: await this.hasher.hash(comando.password),
      rol: 'PRODUCTOR',
    });
    const productor = Productor.crear({
      id: nuevoId(),
      usuarioId: usuario.id,
      nombre: comando.nombre,
      documento: comando.documento,
      telefono: comando.telefono,
      organizacion: comando.organizacion,
    });
    if (await this.usuarios.buscarPorEmail(usuario.email.valor)) {
      throw new ConflictError('Ya existe un usuario con ese correo.');
    }
    if (await this.productores.buscarPorDocumento(productor.documento.valor)) {
      throw new ConflictError('Ya existe un productor con ese documento.');
    }
    await this.registro.guardar(usuario, productor);
    return aUsuarioDto(usuario);
  }
}

export class CrearCuentaProductor implements CrearCuentaProductorUseCase {
  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly registro: RegistroCuentaProductorPort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async ejecutar(comando: {
    actor: Actor;
    nombre: string;
    email: string;
    password: string;
    documento: string;
    telefono?: string | null;
    organizacion?: string | null;
  }) {
    const actorReal = await this.usuarios.buscarPorId(comando.actor.usuarioId);
    if (comando.actor.rol !== 'ADMINISTRADOR' || !actorReal || actorReal.rol !== 'ADMINISTRADOR') {
      throw new ForbiddenError('Solo un administrador puede crear cuentas de productor.');
    }
    validarPasswordPlano(comando.password);
    const usuario = Usuario.crear({
      id: nuevoId(),
      nombre: comando.nombre,
      email: comando.email,
      passwordHash: await this.hasher.hash(comando.password),
      rol: 'PRODUCTOR',
      estado: 'activa',
      debeCambiarPassword: true,
    });
    const productor = Productor.crear({
      id: nuevoId(),
      usuarioId: usuario.id,
      nombre: comando.nombre,
      documento: comando.documento,
      telefono: comando.telefono,
      organizacion: comando.organizacion,
    });
    if (!productor.telefono) {
      throw new ValidationError('El teléfono es obligatorio.');
    }
    if (await this.usuarios.buscarPorEmail(usuario.email.valor)) {
      throw new ConflictError('Ya existe un usuario con ese correo.');
    }
    if (await this.productores.buscarPorDocumento(productor.documento.valor)) {
      throw new ConflictError('Este productor ya se encuentra registrado');
    }
    await this.registro.guardar(usuario, productor);
    return { productor: aProductorDto(productor), usuario: aUsuarioDto(usuario), passwordTemporal: comando.password };
  }
}

export function aUsuarioDto(usuario: Usuario): UsuarioDto {
    return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email.valor,
    rol: usuario.rol,
    debeCambiarPassword: usuario.debeCambiarPassword,
  };
}

export function aProductorDto(productor: Productor): ProductorDto {
  return {
    id: productor.id,
    usuarioId: productor.usuarioId,
    nombre: productor.nombre,
    documento: productor.documento.valor,
    telefono: productor.telefono,
    organizacion: productor.organizacion,
  };
}
