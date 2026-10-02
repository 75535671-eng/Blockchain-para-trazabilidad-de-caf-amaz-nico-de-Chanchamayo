import { ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/DomainError';
import { CambiarContrasenaUseCase, ConsultarSesionUseCase, IniciarSesionUseCase } from '../ports/input/UseCases';
import { Actor } from '../dto/dtos';
import {
  PasswordHasherPort,
  ProductorRepositoryPort,
  SolicitudRegistroRepositoryPort,
  TokenProviderPort,
  UsuarioRepositoryPort,
} from '../ports/output/OutputPorts';
import { validarPasswordPlano } from '../support/apoyo';
import { aUsuarioDto } from './RegistrarUsuario';

export class IniciarSesion implements IniciarSesionUseCase {
  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly solicitudes: SolicitudRegistroRepositoryPort,
    private readonly hasher: PasswordHasherPort,
    private readonly tokens: TokenProviderPort,
  ) {}

  async ejecutar(comando: { email: string; password: string }) {
    const usuario = await this.usuarios.buscarPorEmail(comando.email.trim().toLowerCase());
    if (usuario?.estado === 'bloqueada') {
      throw new ForbiddenError('Tu cuenta no está habilitada.');
    }
    const valido = usuario ? await this.hasher.verificar(comando.password, usuario.passwordHash) : false;
    if (!usuario || !valido) {
      if (!usuario) {
        const solicitud = await this.solicitudes.buscarRecientePorEmail(comando.email.trim().toLowerCase());
        if (solicitud?.estado === 'pendiente') {
          throw new ForbiddenError('Tu solicitud de registro aún no ha sido aprobada.');
        }
        if (solicitud?.estado === 'rechazada') {
          throw new ForbiddenError('Tu solicitud de registro fue rechazada.');
        }
      }
      throw new ValidationError('El correo o la contraseña no son válidos.');
    }
    const productor = await this.productores.buscarPorUsuarioId(usuario.id);
    return {
      token: this.tokens.emitir({ usuarioId: usuario.id, rol: usuario.rol }),
      usuario: aUsuarioDto(usuario),
      productorId: productor?.id ?? null,
    };
  }
}

export class CambiarContrasena implements CambiarContrasenaUseCase {
  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async ejecutar(comando: { actor: Actor; password: string; confirmacion: string }) {
    if (comando.password !== comando.confirmacion) {
      throw new ValidationError('Las contraseñas no coinciden.');
    }
    validarPasswordPlano(comando.password);
    const usuario = await this.usuarios.buscarPorId(comando.actor.usuarioId);
    if (!usuario) {
      throw new NotFoundError('La sesión no corresponde a un usuario.');
    }
    if (usuario.estado === 'bloqueada') {
      throw new ForbiddenError('Tu cuenta no está habilitada.');
    }
    const hash = await this.hasher.hash(comando.password);
    await this.usuarios.actualizarPassword(usuario.id, hash);
    return aUsuarioDto(usuario.conPassword(hash));
  }
}

export class ConsultarSesion implements ConsultarSesionUseCase {
  constructor(private readonly usuarios: UsuarioRepositoryPort) {}

  async ejecutar(actor: Actor) {
    const usuario = await this.usuarios.buscarPorId(actor.usuarioId);
    if (!usuario) {
      throw new NotFoundError('La sesión no corresponde a un usuario.');
    }
    return aUsuarioDto(usuario);
  }
}
