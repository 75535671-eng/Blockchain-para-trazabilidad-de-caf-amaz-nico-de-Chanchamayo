import { MENSAJE_PRODUCTOR_DUPLICADO } from '../../domain/catalogos/registro';
import { Productor } from '../../domain/entities/Productor';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/DomainError';
import { Actor } from '../dto/dtos';
import {
  ActualizarProductorUseCase,
  ConsultarDniProductorUseCase,
  EliminarProductorUseCase,
  ListarProductoresUseCase,
  OtorgarAdministradorUseCase,
  QuitarAdministradorUseCase,
  RegistrarProductorUseCase,
} from '../ports/input/UseCases';
import { ConsultaDniPort, PasswordHasherPort, ProductorRepositoryPort, UsuarioRepositoryPort } from '../ports/output/OutputPorts';
import { nuevoId, validarPasswordPlano } from '../support/apoyo';
import { Usuario } from '../../domain/entities/Usuario';
import { aProductorDto } from './RegistrarUsuario';

export class RegistrarProductor implements RegistrarProductorUseCase {
  constructor(private readonly productores: ProductorRepositoryPort) {}

  async ejecutar(comando: {
    actor: Actor;
    nombre: string;
    documento: string;
    telefono?: string | null;
    organizacion?: string | null;
  }) {
    exigirAdministrador(comando.actor);
    const productor = Productor.crear({
      id: nuevoId(),
      nombre: comando.nombre,
      documento: comando.documento,
      telefono: telefonoObligatorio(comando.telefono),
      organizacion: comando.organizacion,
    });
    if (await this.productores.buscarPorDocumento(productor.documento.valor)) {
      throw new ConflictError(MENSAJE_PRODUCTOR_DUPLICADO);
    }
    await this.productores.guardar(productor);
    return aProductorDto(productor);
  }
}

export class ListarProductores implements ListarProductoresUseCase {
  constructor(
    private readonly productores: ProductorRepositoryPort,
    private readonly usuarios: UsuarioRepositoryPort | null = null,
  ) {}

  async ejecutar(actor: Actor) {
    if (actor.rol === 'ADMINISTRADOR') {
      const lista = await this.productores.listar();
      const roles = new Map<string, 'ADMINISTRADOR' | 'PRODUCTOR'>();
      if (this.usuarios) {
        for (const productor of lista) {
          if (!productor.usuarioId || roles.has(productor.usuarioId)) {
            continue;
          }
          const cuenta = await this.usuarios.buscarPorId(productor.usuarioId);
          if (cuenta) {
            roles.set(productor.usuarioId, cuenta.rol);
          }
        }
      }
      return lista.map((productor) => ({
        ...aProductorDto(productor),
        rolCuenta: productor.usuarioId ? (roles.get(productor.usuarioId) ?? null) : null,
      }));
    }
    const propio = await this.productores.buscarPorUsuarioId(actor.usuarioId);
    return propio ? [aProductorDto(propio)] : [];
  }
}

export class OtorgarAdministrador implements OtorgarAdministradorUseCase {
  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async ejecutar(comando: { actor: Actor; productorId: string; email?: string | null; password?: string | null }) {
    const actorReal = await this.usuarios.buscarPorId(comando.actor.usuarioId);
    if (comando.actor.rol !== 'ADMINISTRADOR' || !actorReal || actorReal.rol !== 'ADMINISTRADOR') {
      throw new ForbiddenError('Solo un administrador puede otorgar permisos de administrador.');
    }
    const productor = await this.productores.buscarPorId(comando.productorId);
    if (!productor) {
      throw new NotFoundError('El productor no existe.');
    }
    if (productor.usuarioId === comando.actor.usuarioId) {
      throw new ForbiddenError('No puedes modificar tu propio rol.');
    }
    if (!productor.usuarioId) {
      const email = comando.email?.trim() ?? '';
      const password = comando.password ?? '';
      if (!email || !password) {
        throw new ValidationError('Indica el correo y la contraseña para crear el acceso de este productor.');
      }
      validarPasswordPlano(password);
      const usuario = Usuario.crear({
        id: nuevoId(),
        nombre: productor.nombre,
        email,
        passwordHash: await this.hasher.hash(password),
        rol: 'ADMINISTRADOR',
      });
      if (await this.usuarios.buscarPorEmail(usuario.email.valor)) {
        throw new ConflictError('Ya existe un usuario con ese correo.');
      }
      await this.productores.asignarCuenta(productor.id, usuario);
      return { id: usuario.id, nombre: productor.nombre, rol: 'ADMINISTRADOR' as const };
    }
    const destino = await this.usuarios.buscarPorId(productor.usuarioId);
    if (!destino) {
      throw new NotFoundError('La cuenta del productor no existe.');
    }
    if (destino.rol === 'ADMINISTRADOR') {
      throw new ConflictError('Este usuario ya es administrador.');
    }
    await this.usuarios.actualizarRol(destino.id, 'ADMINISTRADOR');
    return { id: destino.id, nombre: productor.nombre, rol: 'ADMINISTRADOR' as const };
  }
}

export class QuitarAdministrador implements QuitarAdministradorUseCase {
  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
  ) {}

  async ejecutar(comando: { actor: Actor; productorId: string }) {
    const actorReal = await this.usuarios.buscarPorId(comando.actor.usuarioId);
    if (comando.actor.rol !== 'ADMINISTRADOR' || !actorReal || actorReal.rol !== 'ADMINISTRADOR') {
      throw new ForbiddenError('Solo un administrador puede quitar permisos de administrador.');
    }
    const productor = await this.productores.buscarPorId(comando.productorId);
    if (!productor) {
      throw new NotFoundError('El productor no existe.');
    }
    if (!productor.usuarioId) {
      throw new ValidationError('Este productor no tiene una cuenta de usuario.');
    }
    if (productor.usuarioId === comando.actor.usuarioId) {
      throw new ForbiddenError('No puedes modificar tu propio rol.');
    }
    const destino = await this.usuarios.buscarPorId(productor.usuarioId);
    if (!destino) {
      throw new NotFoundError('La cuenta del productor no existe.');
    }
    if (destino.rol !== 'ADMINISTRADOR') {
      throw new ConflictError('Este usuario no tiene permisos de administrador.');
    }
    await this.usuarios.actualizarRol(destino.id, 'PRODUCTOR');
    return { id: destino.id, nombre: productor.nombre, rol: 'PRODUCTOR' as const };
  }
}

export class ActualizarProductor implements ActualizarProductorUseCase {
  constructor(private readonly productores: ProductorRepositoryPort) {}

  async ejecutar(comando: {
    actor: Actor;
    productorId: string;
    nombre: string;
    telefono?: string | null;
    organizacion?: string | null;
  }) {
    exigirAdministrador(comando.actor);
    const actual = await this.productores.buscarPorId(comando.productorId);
    if (!actual) {
      throw new NotFoundError('El productor no existe.');
    }
    const actualizado = actual.actualizar({
      ...comando,
      telefono: telefonoObligatorio(comando.telefono),
    });
    await this.productores.actualizar(actualizado);
    return aProductorDto(actualizado);
  }
}

export class EliminarProductor implements EliminarProductorUseCase {
  constructor(private readonly productores: ProductorRepositoryPort) {}

  async ejecutar(comando: { actor: Actor; productorId: string }): Promise<void> {
    exigirAdministrador(comando.actor);
    const actual = await this.productores.buscarPorId(comando.productorId);
    if (!actual) {
      throw new NotFoundError('El productor no existe.');
    }
    if (actual.usuarioId === comando.actor.usuarioId) {
      throw new ForbiddenError('No puedes eliminar tu propia cuenta.');
    }
    await this.productores.eliminar(actual.id, comando.actor.usuarioId);
  }
}

export class ConsultarDniProductor implements ConsultarDniProductorUseCase {
  constructor(private readonly consulta: ConsultaDniPort) {}

  async ejecutar(comando: { actor: Actor; documento: string }) {
    exigirAdministrador(comando.actor);
    const documento = comando.documento.trim();
    if (!/^(\d{8}|\d{11})$/.test(documento)) {
      throw new ValidationError('La consulta automática solo aplica a un DNI de 8 dígitos o un RUC de 11 dígitos.');
    }
    return this.consulta.consultar(documento);
  }
}

function exigirAdministrador(actor: Actor): void {
  if (actor.rol !== 'ADMINISTRADOR') {
    throw new ForbiddenError('Solo un administrador puede gestionar productores.');
  }
}

function telefonoObligatorio(valor: string | null | undefined): string {
  const texto = valor?.trim() ?? '';
  if (!texto) {
    throw new ValidationError('El teléfono es obligatorio.');
  }
  return texto;
}
