import { Productor } from '../../domain/entities/Productor';
import { SolicitudRegistro } from '../../domain/entities/SolicitudRegistro';
import { Usuario } from '../../domain/entities/Usuario';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/DomainError';
import { Actor } from '../dto/dtos';
import {
  AprobarSolicitudUseCase,
  ListarSolicitudesUseCase,
  RechazarSolicitudUseCase,
  SolicitarRegistroUseCase,
  SolicitudRegistroDto,
} from '../ports/input/UseCases';
import {
  PasswordHasherPort,
  ProductorRepositoryPort,
  SolicitudRegistroRepositoryPort,
  UsuarioRepositoryPort,
} from '../ports/output/OutputPorts';
import { nuevoId, validarPasswordPlano } from '../support/apoyo';

const MENSAJE_SOLICITUD =
  'Tu solicitud de registro se ha enviado correctamente. El administrador revisará tus datos y podrás acceder cuando tu cuenta sea aprobada.';

export class SolicitarRegistro implements SolicitarRegistroUseCase {
  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly solicitudes: SolicitudRegistroRepositoryPort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async ejecutar(comando: {
    nombre: string;
    email: string;
    password: string;
    confirmacion: string;
    documento: string;
    telefono: string;
    organizacion?: string | null;
  }) {
    if (comando.password !== comando.confirmacion) {
      throw new ValidationError('Las contraseñas no coinciden.');
    }
    validarPasswordPlano(comando.password);
    const solicitud = SolicitudRegistro.crear({
      id: nuevoId(),
      nombre: comando.nombre,
      documento: comando.documento,
      telefono: comando.telefono,
      organizacion: comando.organizacion,
      email: comando.email,
      passwordHash: await this.hasher.hash(comando.password),
    });
    if (await this.usuarios.buscarPorEmail(solicitud.email.valor) || (await this.solicitudes.existeActivaPorEmail(solicitud.email.valor))) {
      throw new ConflictError('Ya existe un usuario con ese correo.');
    }
    if (
      (await this.productores.buscarPorDocumento(solicitud.documento.valor)) ||
      (await this.solicitudes.existeActivaPorDocumento(solicitud.documento.valor))
    ) {
      throw new ConflictError('Este productor ya se encuentra registrado');
    }
    await this.solicitudes.guardar(solicitud);
    return { mensaje: MENSAJE_SOLICITUD };
  }
}

export class ListarSolicitudes implements ListarSolicitudesUseCase {
  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly solicitudes: SolicitudRegistroRepositoryPort,
  ) {}

  async ejecutar(actor: Actor) {
    await exigirAdministrador(this.usuarios, actor);
    const lista = await this.solicitudes.listar();
    return lista.map(aSolicitudDto);
  }
}

export class AprobarSolicitud implements AprobarSolicitudUseCase {
  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly solicitudes: SolicitudRegistroRepositoryPort,
  ) {}

  async ejecutar(comando: { actor: Actor; solicitudId: string }) {
    await exigirAdministrador(this.usuarios, comando.actor);
    const solicitud = await this.solicitudes.buscarPorId(comando.solicitudId);
    if (!solicitud) {
      throw new NotFoundError('La solicitud no existe.');
    }
    if (solicitud.estado !== 'pendiente') {
      throw new ConflictError('Esta solicitud ya fue resuelta.');
    }
    if (await this.usuarios.buscarPorEmail(solicitud.email.valor)) {
      throw new ConflictError('Ya existe un usuario con ese correo.');
    }
    if (await this.productores.buscarPorDocumento(solicitud.documento.valor)) {
      throw new ConflictError('Este productor ya se encuentra registrado');
    }
    const usuario = Usuario.crear({
      id: nuevoId(),
      nombre: solicitud.nombre,
      email: solicitud.email.valor,
      passwordHash: solicitud.passwordHash,
      rol: 'PRODUCTOR',
      estado: 'activa',
      debeCambiarPassword: false,
    });
    const productor = Productor.crear({
      id: nuevoId(),
      usuarioId: usuario.id,
      nombre: solicitud.nombre,
      documento: solicitud.documento.valor,
      telefono: solicitud.telefono,
      organizacion: solicitud.organizacion,
    });
    await this.solicitudes.aprobar(solicitud.id, usuario, productor, comando.actor.usuarioId);
    const actualizada = await this.solicitudes.buscarPorId(solicitud.id);
    if (!actualizada) {
      throw new NotFoundError('La solicitud no existe.');
    }
    return aSolicitudDto(actualizada);
  }
}

export class RechazarSolicitud implements RechazarSolicitudUseCase {
  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly solicitudes: SolicitudRegistroRepositoryPort,
  ) {}

  async ejecutar(comando: { actor: Actor; solicitudId: string; motivo: string }) {
    await exigirAdministrador(this.usuarios, comando.actor);
    const motivo = comando.motivo.trim();
    if (motivo.length < 3 || motivo.length > 500) {
      throw new ValidationError('El motivo del rechazo debe tener entre 3 y 500 caracteres.');
    }
    const solicitud = await this.solicitudes.buscarPorId(comando.solicitudId);
    if (!solicitud) {
      throw new NotFoundError('La solicitud no existe.');
    }
    if (solicitud.estado !== 'pendiente') {
      throw new ConflictError('Esta solicitud ya fue resuelta.');
    }
    await this.solicitudes.rechazar(solicitud.id, comando.actor.usuarioId, motivo);
    const actualizada = await this.solicitudes.buscarPorId(solicitud.id);
    if (!actualizada) {
      throw new NotFoundError('La solicitud no existe.');
    }
    return aSolicitudDto(actualizada);
  }
}

async function exigirAdministrador(usuarios: UsuarioRepositoryPort, actor: Actor): Promise<void> {
  const actorReal = await usuarios.buscarPorId(actor.usuarioId);
  if (actor.rol !== 'ADMINISTRADOR' || !actorReal || actorReal.rol !== 'ADMINISTRADOR') {
    throw new ForbiddenError('Solo un administrador puede gestionar las solicitudes de registro.');
  }
}

export function aSolicitudDto(solicitud: SolicitudRegistro): SolicitudRegistroDto {
  return {
    id: solicitud.id,
    nombre: solicitud.nombre,
    documento: solicitud.documento.valor,
    telefono: solicitud.telefono,
    organizacion: solicitud.organizacion,
    email: solicitud.email.valor,
    estado: solicitud.estado,
    motivoRechazo: solicitud.motivoRechazo,
    fechaSolicitud: solicitud.fechaSolicitud.toISOString(),
    fechaResolucion: solicitud.fechaResolucion ? solicitud.fechaResolucion.toISOString() : null,
  };
}
