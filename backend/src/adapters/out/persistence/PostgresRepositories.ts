import { randomUUID } from 'node:crypto';
import { AnalisisLote } from '../../../domain/entities/AnalisisLote';
import { Lote } from '../../../domain/entities/Lote';
import { Parcela } from '../../../domain/entities/Parcela';
import { Productor } from '../../../domain/entities/Productor';
import { SolicitudRegistro } from '../../../domain/entities/SolicitudRegistro';
import { Usuario, RolUsuario } from '../../../domain/entities/Usuario';
import { MENSAJE_PRODUCTOR_DUPLICADO } from '../../../domain/catalogos/registro';
import { ConflictError, NotFoundError } from '../../../domain/errors/DomainError';
import { FechaCosecha } from '../../../domain/valueobjects/FechaCosecha';
import { IdentificadorLote } from '../../../domain/valueobjects/IdentificadorLote';
import {
  AnalisisLoteRepositoryPort,
  LoteRepositoryPort,
  ParcelaRepositoryPort,
  ProductorRepositoryPort,
  RegistroCuentaProductorPort,
  SolicitudRegistroRepositoryPort,
  UsuarioRepositoryPort,
} from '../../../application/ports/output/OutputPorts';
import { Pool } from 'pg';
import { conteo, filasDe, invocar, primeraDe, transaccion } from '../../../infrastructure/persistence/invocar';

type Fila = Record<string, unknown>;

export class PostgresUsuarioRepository implements UsuarioRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const fila = primeraDe(await invocar(this.pool, 'buscar_usuario_por_email', [email]));
    return fila ? mapUsuario(fila) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const fila = primeraDe(await invocar(this.pool, 'buscar_usuario_por_id', [id]));
    return fila ? mapUsuario(fila) : null;
  }

  async actualizarRol(id: string, rol: RolUsuario): Promise<void> {
    await invocar(this.pool, 'actualizar_rol_usuario', [id, rol]);
  }

  async actualizarPassword(id: string, passwordHash: string): Promise<void> {
    await invocar(this.pool, 'actualizar_password_usuario', [id, passwordHash]);
  }
}

export class PostgresRegistroCuenta implements RegistroCuentaProductorPort {
  constructor(private readonly pool: Pool) {}

  async guardar(usuario: Usuario, productor: Productor): Promise<void> {
    await transaccion(this.pool, async (client) => {
      await invocar(client, 'insertar_usuario', datosUsuario(usuario));
      await invocar(client, 'insertar_productor', datosProductor(productor));
    });
  }
}

export class PostgresSolicitudRegistroRepository implements SolicitudRegistroRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(solicitud: SolicitudRegistro): Promise<void> {
    await invocar(this.pool, 'insertar_solicitud', [
      solicitud.id,
      solicitud.nombre,
      solicitud.documento.valor,
      solicitud.telefono,
      solicitud.organizacion,
      solicitud.email.valor,
      solicitud.passwordHash,
      solicitud.estado,
      solicitud.fechaSolicitud,
    ]);
  }

  async buscarPorId(id: string): Promise<SolicitudRegistro | null> {
    const fila = primeraDe(await invocar(this.pool, 'buscar_solicitud_por_id', [id]));
    return fila ? mapSolicitud(fila) : null;
  }

  async buscarRecientePorEmail(email: string): Promise<SolicitudRegistro | null> {
    const fila = primeraDe(await invocar(this.pool, 'buscar_solicitud_reciente_por_email', [email]));
    return fila ? mapSolicitud(fila) : null;
  }

  async existeActivaPorEmail(email: string): Promise<boolean> {
    return primeraDe(await invocar(this.pool, 'buscar_solicitud_activa_por_email', [email])) != null;
  }

  async existeActivaPorDocumento(documento: string): Promise<boolean> {
    return primeraDe(await invocar(this.pool, 'buscar_solicitud_activa_por_documento', [documento])) != null;
  }

  async listar(): Promise<SolicitudRegistro[]> {
    return filasDe(await invocar(this.pool, 'listar_solicitudes')).map(mapSolicitud);
  }

  async aprobar(solicitudId: string, usuario: Usuario, productor: Productor, administradorId: string): Promise<void> {
    try {
      await transaccion(this.pool, async (client) => {
        const bloqueada = primeraDe(await invocar(client, 'bloquear_solicitud', [solicitudId]));
        if (bloqueada?.estado !== 'pendiente') {
          throw new ConflictError('Esta solicitud ya fue resuelta.');
        }
        await invocar(client, 'insertar_usuario', datosUsuario(usuario));
        await invocar(client, 'insertar_productor', datosProductor(productor));
        await invocar(client, 'marcar_solicitud_aprobada', [solicitudId, administradorId, usuario.id, productor.id]);
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      if (esCorreoDuplicado(error)) {
        throw new ConflictError('Ya existe un usuario con ese correo.');
      }
      if (esDocumentoDuplicado(error)) {
        throw new ConflictError('Este productor ya se encuentra registrado');
      }
      throw error;
    }
  }

  async rechazar(solicitudId: string, administradorId: string, motivo: string): Promise<void> {
    const resultado = await invocar(this.pool, 'rechazar_solicitud', [solicitudId, motivo, administradorId]);
    if (conteo(resultado) !== 1) {
      throw new ConflictError('Esta solicitud ya fue resuelta.');
    }
  }
}

export class PostgresProductorRepository implements ProductorRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(productor: Productor): Promise<void> {
    try {
      await invocar(this.pool, 'insertar_productor', datosProductor(productor));
    } catch (error) {
      if (esDocumentoDuplicado(error)) {
        throw new ConflictError(MENSAJE_PRODUCTOR_DUPLICADO);
      }
      throw error;
    }
  }

  async actualizar(productor: Productor): Promise<void> {
    await invocar(this.pool, 'actualizar_productor', [
      productor.nombre,
      productor.telefono,
      productor.organizacion,
      productor.id,
    ]);
  }

  async eliminar(id: string, administradorId: string): Promise<void> {
    try {
      await transaccion(this.pool, async (client) => {
        const fila = primeraDe(await invocar(client, 'bloquear_productor', [id]));
        if (!fila) {
          throw new NotFoundError('El productor no existe.');
        }
        const usuarioId = fila.usuario_id == null ? null : String(fila.usuario_id);
        if (usuarioId === administradorId) {
          throw new ConflictError('No puedes eliminar tu propia cuenta.');
        }
        if (usuarioId) {
          await invocar(client, 'soltar_administrador_solicitudes', [usuarioId, id]);
        }
        await invocar(client, 'borrar_solicitudes_productor', [id, usuarioId, String(fila.documento_identidad)]);
        await invocar(client, 'borrar_trazabilidad_productor', [id]);
        await invocar(client, 'borrar_analisis_productor', [id]);
        await invocar(client, 'borrar_lotes_productor', [id]);
        await invocar(client, 'borrar_parcelas_productor', [id]);
        const borrado = await invocar(client, 'borrar_productor', [id]);
        if (conteo(borrado) !== 1) {
          throw new NotFoundError('El productor no existe.');
        }
        if (usuarioId) {
          await invocar(client, 'borrar_usuario_ajeno', [usuarioId, administradorId]);
        }
        await invocar(client, 'registrar_auditoria_eliminacion', [randomUUID(), administradorId, id]);
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      if (esClaveForanea(error)) {
        throw new ConflictError('No se pudo eliminar el productor porque otro registro todavía depende de él.');
      }
      throw error;
    }
  }

  async buscarPorId(id: string): Promise<Productor | null> {
    const fila = primeraDe(await invocar(this.pool, 'buscar_productor_por_id', [id]));
    return fila ? mapProductor(fila) : null;
  }

  async buscarPorUsuarioId(usuarioId: string): Promise<Productor | null> {
    const fila = primeraDe(await invocar(this.pool, 'buscar_productor_por_usuario', [usuarioId]));
    return fila ? mapProductor(fila) : null;
  }

  async buscarPorDocumento(documento: string): Promise<Productor | null> {
    const fila = primeraDe(await invocar(this.pool, 'buscar_productor_por_documento', [documento]));
    return fila ? mapProductor(fila) : null;
  }

  async listar(): Promise<Productor[]> {
    return filasDe(await invocar(this.pool, 'listar_productores')).map(mapProductor);
  }

  async asignarCuenta(productorId: string, usuario: Usuario): Promise<void> {
    try {
      await transaccion(this.pool, async (client) => {
        await invocar(client, 'insertar_usuario', datosUsuario(usuario));
        const actualizado = await invocar(client, 'asignar_cuenta_productor', [usuario.id, productorId]);
        if (conteo(actualizado) !== 1) {
          throw new ConflictError('Este productor ya tiene una cuenta.');
        }
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      if (esCorreoDuplicado(error)) {
        throw new ConflictError('Ya existe un usuario con ese correo.');
      }
      throw error;
    }
  }
}

export class PostgresParcelaRepository implements ParcelaRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(parcela: Parcela): Promise<void> {
    await invocar(this.pool, 'insertar_parcela', [
      parcela.id,
      parcela.productorId,
      parcela.nombre,
      parcela.distrito,
      parcela.localidad,
      parcela.area.valor,
      parcela.altitudMsnm,
      parcela.coordenadas?.latitud ?? null,
      parcela.coordenadas?.longitud ?? null,
      parcela.createdAt,
    ]);
  }

  async actualizar(parcela: Parcela): Promise<void> {
    await invocar(this.pool, 'actualizar_parcela', [
      parcela.productorId,
      parcela.nombre,
      parcela.distrito,
      parcela.localidad,
      parcela.area.valor,
      parcela.altitudMsnm,
      parcela.coordenadas?.latitud ?? null,
      parcela.coordenadas?.longitud ?? null,
      parcela.id,
    ]);
  }

  async eliminar(id: string): Promise<void> {
    try {
      await invocar(this.pool, 'borrar_parcela', [id]);
    } catch (error) {
      if (esClaveForanea(error)) {
        throw new ConflictError('No se puede eliminar esta parcela porque tiene registros asociados.');
      }
      throw error;
    }
  }

  async buscarPorId(id: string): Promise<Parcela | null> {
    const fila = primeraDe(await invocar(this.pool, 'buscar_parcela_por_id', [id]));
    return fila ? mapParcela(fila) : null;
  }

  async buscarPorProductorYNombre(productorId: string, nombre: string): Promise<Parcela | null> {
    const fila = primeraDe(await invocar(this.pool, 'buscar_parcela_por_productor_nombre', [productorId, nombre]));
    return fila ? mapParcela(fila) : null;
  }

  async listar(): Promise<Parcela[]> {
    return filasDe(await invocar(this.pool, 'listar_parcelas')).map(mapParcela);
  }

  async listarPorProductor(productorId: string): Promise<Parcela[]> {
    return filasDe(await invocar(this.pool, 'listar_parcelas_productor', [productorId])).map(mapParcela);
  }
}

export class PostgresLoteRepository implements LoteRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(lote: Lote): Promise<void> {
    await invocar(this.pool, 'insertar_lote', [
      lote.id,
      lote.codigo.valor,
      lote.parcelaId,
      lote.fechaCosecha.iso,
      lote.cantidad.valor,
      lote.variedad,
      lote.observaciones,
      lote.estado,
      lote.createdAt,
    ]);
  }

  async actualizar(lote: Lote): Promise<void> {
    await invocar(this.pool, 'actualizar_lote', [
      lote.parcelaId,
      lote.fechaCosecha.iso,
      lote.cantidad.valor,
      lote.variedad,
      lote.observaciones,
      lote.id,
    ]);
  }

  async eliminar(id: string): Promise<void> {
    await invocar(this.pool, 'eliminar_lote', [id]);
  }

  async buscarPorId(id: string): Promise<Lote | null> {
    const fila = primeraDe(await invocar(this.pool, 'buscar_lote_por_id', [id]));
    return fila ? mapLote(fila) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Lote | null> {
    const fila = primeraDe(await invocar(this.pool, 'buscar_lote_por_codigo', [codigo]));
    return fila ? mapLote(fila) : null;
  }

  async listar(): Promise<Lote[]> {
    return filasDe(await invocar(this.pool, 'listar_lotes')).map(mapLote);
  }

  async listarPorParcelas(parcelaIds: string[]): Promise<Lote[]> {
    if (parcelaIds.length === 0) {
      return [];
    }
    return filasDe(await invocar(this.pool, 'listar_lotes_por_parcelas', [parcelaIds])).map(mapLote);
  }
}

export class PostgresAnalisisLoteRepository implements AnalisisLoteRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(analisis: AnalisisLote): Promise<void> {
    await invocar(this.pool, 'insertar_analisis', [
      analisis.id,
      analisis.loteId,
      analisis.estrategia,
      analisis.clasificacion,
      analisis.resumen,
      JSON.stringify(analisis.observaciones),
      analisis.confianza,
      analisis.proveedor,
      analisis.createdAt,
    ]);
  }

  async eliminarPorLote(loteId: string): Promise<void> {
    await invocar(this.pool, 'borrar_analisis_lote', [loteId]);
  }

  async buscarUltimoPorLote(loteId: string): Promise<AnalisisLote | null> {
    const fila = primeraDe(await invocar(this.pool, 'ultimo_analisis_lote', [loteId]));
    return fila ? mapAnalisis(fila) : null;
  }
}

function datosUsuario(usuario: Usuario): unknown[] {
  return [
    usuario.id,
    usuario.nombre,
    usuario.email.valor,
    usuario.passwordHash,
    usuario.rol,
    usuario.estado,
    usuario.debeCambiarPassword,
    usuario.createdAt,
  ];
}

function datosProductor(productor: Productor): unknown[] {
  return [
    productor.id,
    productor.usuarioId,
    productor.nombre,
    productor.documento.valor,
    productor.telefono,
    productor.organizacion,
    productor.createdAt,
  ];
}

function esClaveForanea(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23503';
}

function esCorreoDuplicado(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== '23505') {
    return false;
  }
  const detalle = error as { constraint?: string; detail?: string };
  if (detalle.constraint) {
    return detalle.constraint.includes('email');
  }
  return (detalle.detail ?? '').includes('email');
}

function esDocumentoDuplicado(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== '23505') {
    return false;
  }
  const detalle = error as { constraint?: string; detail?: string };
  if (detalle.constraint) {
    return detalle.constraint === 'uq_productores_documento';
  }
  return (detalle.detail ?? '').includes('documento_identidad');
}

function mapUsuario(row: Fila): Usuario {
  return Usuario.reconstituir({
    id: String(row.id),
    nombre: String(row.nombre),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    rol: row.rol as RolUsuario,
    estado: row.estado === 'bloqueada' ? 'bloqueada' : 'activa',
    debeCambiarPassword: row.debe_cambiar_password === true,
    createdAt: comoFecha(row.created_at),
  });
}

function mapSolicitud(row: Fila): SolicitudRegistro {
  return SolicitudRegistro.crear({
    id: String(row.id),
    nombre: String(row.nombre),
    documento: String(row.documento_identidad),
    telefono: String(row.telefono),
    organizacion: row.organizacion == null ? null : String(row.organizacion),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    estado: row.estado as SolicitudRegistro['estado'],
    motivoRechazo: row.motivo_rechazo == null ? null : String(row.motivo_rechazo),
    fechaSolicitud: comoFecha(row.fecha_solicitud),
    fechaResolucion: row.fecha_resolucion == null ? null : comoFecha(row.fecha_resolucion),
    administradorId: row.administrador_id == null ? null : String(row.administrador_id),
    usuarioId: row.usuario_id == null ? null : String(row.usuario_id),
    productorId: row.productor_id == null ? null : String(row.productor_id),
  });
}

function mapProductor(row: Fila): Productor {
  return Productor.reconstituir({
    id: String(row.id),
    usuarioId: row.usuario_id == null ? null : String(row.usuario_id),
    nombre: String(row.nombre),
    documento: String(row.documento_identidad),
    telefono: row.telefono == null ? null : String(row.telefono),
    organizacion: row.organizacion == null ? null : String(row.organizacion),
    createdAt: comoFecha(row.created_at),
  });
}

function mapParcela(row: Fila): Parcela {
  return Parcela.crear({
    id: String(row.id),
    productorId: String(row.productor_id),
    nombre: String(row.nombre),
    distrito: String(row.distrito),
    localidad: row.localidad == null ? null : String(row.localidad),
    areaHectareas: Number(row.area_hectareas),
    altitudMsnm: row.altitud_msnm == null ? null : Number(row.altitud_msnm),
    latitud: row.latitud == null ? null : Number(row.latitud),
    longitud: row.longitud == null ? null : Number(row.longitud),
    createdAt: comoFecha(row.created_at),
  });
}

function mapLote(row: Fila): Lote {
  const fecha = String(row.fecha_cosecha).slice(0, 10);
  return Lote.crear({
    id: String(row.id),
    codigo: IdentificadorLote.desdeTexto(String(row.codigo)),
    parcelaId: String(row.parcela_id),
    fechaCosecha: FechaCosecha.crear(fecha, fecha),
    cantidadKg: Number(row.cantidad_kg),
    variedad: String(row.variedad),
    observaciones: row.observaciones == null ? null : String(row.observaciones),
    createdAt: comoFecha(row.created_at),
  });
}

function mapAnalisis(row: Fila): AnalisisLote {
  return AnalisisLote.crear({
    id: String(row.id),
    loteId: String(row.lote_id),
    estrategia: row.estrategia as AnalisisLote['estrategia'],
    clasificacion: row.clasificacion as AnalisisLote['clasificacion'],
    resumen: String(row.resumen),
    observaciones: observacionesDe(row.observaciones),
    confianza: row.confianza as AnalisisLote['confianza'],
    proveedor: String(row.proveedor),
    createdAt: comoFecha(row.created_at),
  });
}

function observacionesDe(valor: unknown): string[] {
  const datos = typeof valor === 'string' ? JSON.parse(valor) : valor;
  if (!Array.isArray(datos) || datos.some((item) => typeof item !== 'string')) {
    throw new Error('Las observaciones guardadas no tienen un formato válido.');
  }
  return datos;
}

function comoFecha(valor: unknown): Date {
  return valor instanceof Date ? valor : new Date(String(valor));
}
