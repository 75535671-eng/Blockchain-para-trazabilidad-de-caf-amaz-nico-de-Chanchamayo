import { randomUUID } from 'node:crypto';
import { QueryResult } from 'pg';
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

type Fila = Record<string, unknown>;

export class PostgresUsuarioRepository implements UsuarioRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const resultado = await this.pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const fila = primera(resultado);
    return fila ? mapUsuario(fila) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const resultado = await this.pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    const fila = primera(resultado);
    return fila ? mapUsuario(fila) : null;
  }

  async actualizarRol(id: string, rol: RolUsuario): Promise<void> {
    await this.pool.query('UPDATE usuarios SET rol = $1 WHERE id = $2', [rol, id]);
  }

  async actualizarPassword(id: string, passwordHash: string): Promise<void> {
    await this.pool.query('UPDATE usuarios SET password_hash = $1, debe_cambiar_password = FALSE WHERE id = $2', [
      passwordHash,
      id,
    ]);
  }
}

export class PostgresRegistroCuenta implements RegistroCuentaProductorPort {
  constructor(private readonly pool: Pool) {}

  async guardar(usuario: Usuario, productor: Productor): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO usuarios (id, nombre, email, password_hash, rol, estado, debe_cambiar_password, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          usuario.id,
          usuario.nombre,
          usuario.email.valor,
          usuario.passwordHash,
          usuario.rol,
          usuario.estado,
          usuario.debeCambiarPassword,
          usuario.createdAt,
        ],
      );
      await client.query(
        `INSERT INTO productores (id, usuario_id, nombre, documento_identidad, telefono, organizacion, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          productor.id,
          productor.usuarioId,
          productor.nombre,
          productor.documento.valor,
          productor.telefono,
          productor.organizacion,
          productor.createdAt,
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export class PostgresSolicitudRegistroRepository implements SolicitudRegistroRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(solicitud: SolicitudRegistro): Promise<void> {
    await this.pool.query(
      `INSERT INTO solicitudes_registro
        (id, nombre, documento_identidad, telefono, organizacion, email, password_hash, estado, fecha_solicitud)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        solicitud.id,
        solicitud.nombre,
        solicitud.documento.valor,
        solicitud.telefono,
        solicitud.organizacion,
        solicitud.email.valor,
        solicitud.passwordHash,
        solicitud.estado,
        solicitud.fechaSolicitud,
      ],
    );
  }

  async buscarPorId(id: string): Promise<SolicitudRegistro | null> {
    const resultado = await this.pool.query('SELECT * FROM solicitudes_registro WHERE id = $1', [id]);
    const fila = primera(resultado);
    return fila ? mapSolicitud(fila) : null;
  }

  async buscarRecientePorEmail(email: string): Promise<SolicitudRegistro | null> {
    const resultado = await this.pool.query(
      'SELECT * FROM solicitudes_registro WHERE email = $1 ORDER BY fecha_solicitud DESC LIMIT 1',
      [email],
    );
    const fila = primera(resultado);
    return fila ? mapSolicitud(fila) : null;
  }

  async existeActivaPorEmail(email: string): Promise<boolean> {
    const resultado = await this.pool.query(
      `SELECT 1 FROM solicitudes_registro WHERE email = $1 AND estado IN ('pendiente', 'aprobada') LIMIT 1`,
      [email],
    );
    return filas(resultado).length > 0;
  }

  async existeActivaPorDocumento(documento: string): Promise<boolean> {
    const resultado = await this.pool.query(
      `SELECT 1 FROM solicitudes_registro WHERE documento_identidad = $1 AND estado IN ('pendiente', 'aprobada') LIMIT 1`,
      [documento],
    );
    return filas(resultado).length > 0;
  }

  async listar(): Promise<SolicitudRegistro[]> {
    const resultado = await this.pool.query('SELECT * FROM solicitudes_registro ORDER BY fecha_solicitud DESC');
    return filas(resultado).map(mapSolicitud);
  }

  async aprobar(solicitudId: string, usuario: Usuario, productor: Productor, administradorId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const bloqueada = await client.query('SELECT estado FROM solicitudes_registro WHERE id = $1 FOR UPDATE', [solicitudId]);
      const estado = primera(bloqueada)?.estado;
      if (estado !== 'pendiente') {
        throw new ConflictError('Esta solicitud ya fue resuelta.');
      }
      await client.query(
        `INSERT INTO usuarios (id, nombre, email, password_hash, rol, estado, debe_cambiar_password, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          usuario.id,
          usuario.nombre,
          usuario.email.valor,
          usuario.passwordHash,
          usuario.rol,
          usuario.estado,
          usuario.debeCambiarPassword,
          usuario.createdAt,
        ],
      );
      await client.query(
        `INSERT INTO productores (id, usuario_id, nombre, documento_identidad, telefono, organizacion, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          productor.id,
          productor.usuarioId,
          productor.nombre,
          productor.documento.valor,
          productor.telefono,
          productor.organizacion,
          productor.createdAt,
        ],
      );
      await client.query(
        `UPDATE solicitudes_registro
         SET estado = 'aprobada', fecha_resolucion = NOW(), administrador_id = $2, usuario_id = $3, productor_id = $4
         WHERE id = $1 AND estado = 'pendiente'`,
        [solicitudId, administradorId, usuario.id, productor.id],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (esCorreoDuplicado(error)) {
        throw new ConflictError('Ya existe un usuario con ese correo.');
      }
      if (esDocumentoDuplicado(error)) {
        throw new ConflictError('Este productor ya se encuentra registrado');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async rechazar(solicitudId: string, administradorId: string, motivo: string): Promise<void> {
    const resultado = await this.pool.query(
      `UPDATE solicitudes_registro
       SET estado = 'rechazada', motivo_rechazo = $2, fecha_resolucion = NOW(), administrador_id = $3
       WHERE id = $1 AND estado = 'pendiente'`,
      [solicitudId, motivo, administradorId],
    );
    if (resultado.rowCount !== 1) {
      throw new ConflictError('Esta solicitud ya fue resuelta.');
    }
  }
}

export class PostgresProductorRepository implements ProductorRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(productor: Productor): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO productores (id, usuario_id, nombre, documento_identidad, telefono, organizacion, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          productor.id,
          productor.usuarioId,
          productor.nombre,
          productor.documento.valor,
          productor.telefono,
          productor.organizacion,
          productor.createdAt,
        ],
      );
    } catch (error) {
      if (esDocumentoDuplicado(error)) {
        throw new ConflictError(MENSAJE_PRODUCTOR_DUPLICADO);
      }
      throw error;
    }
  }

  async actualizar(productor: Productor): Promise<void> {
    await this.pool.query(
      `UPDATE productores SET nombre = $1, telefono = $2, organizacion = $3 WHERE id = $4`,
      [productor.nombre, productor.telefono, productor.organizacion, productor.id],
    );
  }

  async eliminar(id: string, administradorId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const productor = await client.query('SELECT id, usuario_id, documento_identidad FROM productores WHERE id = $1 FOR UPDATE', [id]);
      const fila = primera(productor);
      if (!fila) {
        throw new NotFoundError('El productor no existe.');
      }
      const usuarioId = fila.usuario_id == null ? null : String(fila.usuario_id);
      if (usuarioId === administradorId) {
        throw new ConflictError('No puedes eliminar tu propia cuenta.');
      }
      if (usuarioId) {
        await client.query(
          `UPDATE solicitudes_registro SET administrador_id = NULL
           WHERE administrador_id = $1 AND productor_id IS DISTINCT FROM $2`,
          [usuarioId, id],
        );
      }
      await client.query(
        `DELETE FROM solicitudes_registro
         WHERE productor_id = $1
            OR ($2::uuid IS NOT NULL AND usuario_id = $2)
            OR documento_identidad = $3`,
        [id, usuarioId, String(fila.documento_identidad)],
      );
      await client.query(
        `DELETE FROM analisis_lotes
         WHERE lote_id IN (
           SELECT lotes.id FROM lotes
           JOIN parcelas ON parcelas.id = lotes.parcela_id
           WHERE parcelas.productor_id = $1
         )`,
        [id],
      );
      await client.query(
        `DELETE FROM lotes
         WHERE parcela_id IN (SELECT id FROM parcelas WHERE productor_id = $1)`,
        [id],
      );
      await client.query('DELETE FROM parcelas WHERE productor_id = $1', [id]);
      const borrado = await client.query('DELETE FROM productores WHERE id = $1', [id]);
      if (borrado.rowCount !== 1) {
        throw new NotFoundError('El productor no existe.');
      }
      if (usuarioId) {
        await client.query('DELETE FROM usuarios WHERE id = $1 AND id <> $2', [usuarioId, administradorId]);
      }
      await client.query(
        'INSERT INTO auditoria_eliminaciones (id, administrador_id, productor_id) VALUES ($1, $2, $3)',
        [randomUUID(), administradorId, id],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      if (esClaveForanea(error)) {
        throw new ConflictError('No se pudo eliminar el productor porque otro registro todavía depende de él.');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async buscarPorId(id: string): Promise<Productor | null> {
    return this.uno('SELECT * FROM productores WHERE id = $1', [id]);
  }

  async buscarPorUsuarioId(usuarioId: string): Promise<Productor | null> {
    return this.uno('SELECT * FROM productores WHERE usuario_id = $1', [usuarioId]);
  }

  async buscarPorDocumento(documento: string): Promise<Productor | null> {
    return this.uno('SELECT * FROM productores WHERE documento_identidad = $1', [documento]);
  }

  async listar(): Promise<Productor[]> {
    const resultado = await this.pool.query('SELECT * FROM productores ORDER BY nombre');
    return filas(resultado).map(mapProductor);
  }

  async asignarCuenta(productorId: string, usuario: Usuario): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO usuarios (id, nombre, email, password_hash, rol, estado, debe_cambiar_password, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          usuario.id,
          usuario.nombre,
          usuario.email.valor,
          usuario.passwordHash,
          usuario.rol,
          usuario.estado,
          usuario.debeCambiarPassword,
          usuario.createdAt,
        ],
      );
      const actualizado = await client.query(
        'UPDATE productores SET usuario_id = $1 WHERE id = $2 AND usuario_id IS NULL',
        [usuario.id, productorId],
      );
      if (actualizado.rowCount !== 1) {
        throw new ConflictError('Este productor ya tiene una cuenta.');
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (esCorreoDuplicado(error)) {
        throw new ConflictError('Ya existe un usuario con ese correo.');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private async uno(sql: string, params: string[]): Promise<Productor | null> {
    const resultado = await this.pool.query(sql, params);
    const fila = primera(resultado);
    return fila ? mapProductor(fila) : null;
  }
}

export class PostgresParcelaRepository implements ParcelaRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(parcela: Parcela): Promise<void> {
    await this.pool.query(
      `INSERT INTO parcelas
        (id, productor_id, nombre, distrito, localidad, area_hectareas, altitud_msnm, latitud, longitud, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
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
      ],
    );
  }

  async actualizar(parcela: Parcela): Promise<void> {
    await this.pool.query(
      `UPDATE parcelas
       SET productor_id = $1, nombre = $2, distrito = $3, localidad = $4, area_hectareas = $5,
           altitud_msnm = $6, latitud = $7, longitud = $8
       WHERE id = $9`,
      [
        parcela.productorId,
        parcela.nombre,
        parcela.distrito,
        parcela.localidad,
        parcela.area.valor,
        parcela.altitudMsnm,
        parcela.coordenadas?.latitud ?? null,
        parcela.coordenadas?.longitud ?? null,
        parcela.id,
      ],
    );
  }

  async eliminar(id: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM parcelas WHERE id = $1', [id]);
    } catch (error) {
      if (esClaveForanea(error)) {
        throw new ConflictError('No se puede eliminar esta parcela porque tiene registros asociados.');
      }
      throw error;
    }
  }

  async buscarPorId(id: string): Promise<Parcela | null> {
    const resultado = await this.pool.query('SELECT * FROM parcelas WHERE id = $1', [id]);
    const fila = primera(resultado);
    return fila ? mapParcela(fila) : null;
  }

  async buscarPorProductorYNombre(productorId: string, nombre: string): Promise<Parcela | null> {
    const resultado = await this.pool.query(
      'SELECT * FROM parcelas WHERE productor_id = $1 AND nombre = $2 LIMIT 1',
      [productorId, nombre],
    );
    const fila = primera(resultado);
    return fila ? mapParcela(fila) : null;
  }

  async listar(): Promise<Parcela[]> {
    const resultado = await this.pool.query('SELECT * FROM parcelas ORDER BY nombre');
    return filas(resultado).map(mapParcela);
  }

  async listarPorProductor(productorId: string): Promise<Parcela[]> {
    const resultado = await this.pool.query(
      'SELECT * FROM parcelas WHERE productor_id = $1 ORDER BY nombre',
      [productorId],
    );
    return filas(resultado).map(mapParcela);
  }
}

export class PostgresLoteRepository implements LoteRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(lote: Lote): Promise<void> {
    await this.pool.query(
      `INSERT INTO lotes
        (id, codigo, parcela_id, fecha_cosecha, cantidad_kg, variedad, observaciones, estado, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        lote.id,
        lote.codigo.valor,
        lote.parcelaId,
        lote.fechaCosecha.iso,
        lote.cantidad.valor,
        lote.variedad,
        lote.observaciones,
        lote.estado,
        lote.createdAt,
      ],
    );
  }

  async actualizar(lote: Lote): Promise<void> {
    await this.pool.query(
      `UPDATE lotes
       SET parcela_id = $1, fecha_cosecha = $2, cantidad_kg = $3, variedad = $4, observaciones = $5
       WHERE id = $6`,
      [lote.parcelaId, lote.fechaCosecha.iso, lote.cantidad.valor, lote.variedad, lote.observaciones, lote.id],
    );
  }

  async eliminar(id: string): Promise<void> {
    await this.pool.query('DELETE FROM lotes WHERE id = $1', [id]);
  }

  async buscarPorId(id: string): Promise<Lote | null> {
    const resultado = await this.pool.query('SELECT * FROM lotes WHERE id = $1', [id]);
    const fila = primera(resultado);
    return fila ? mapLote(fila) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Lote | null> {
    const resultado = await this.pool.query('SELECT * FROM lotes WHERE codigo = $1', [codigo]);
    const fila = primera(resultado);
    return fila ? mapLote(fila) : null;
  }

  async listar(): Promise<Lote[]> {
    const resultado = await this.pool.query('SELECT * FROM lotes ORDER BY created_at DESC');
    return filas(resultado).map(mapLote);
  }

  async listarPorParcelas(parcelaIds: string[]): Promise<Lote[]> {
    if (parcelaIds.length === 0) {
      return [];
    }
    const resultado = await this.pool.query(
      'SELECT * FROM lotes WHERE parcela_id = ANY($1::uuid[]) ORDER BY created_at DESC',
      [parcelaIds],
    );
    return filas(resultado).map(mapLote);
  }
}

export class PostgresAnalisisLoteRepository implements AnalisisLoteRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(analisis: AnalisisLote): Promise<void> {
    await this.pool.query(
      `INSERT INTO analisis_lotes
        (id, lote_id, estrategia, clasificacion, resumen, observaciones, confianza, proveedor, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
      [
        analisis.id,
        analisis.loteId,
        analisis.estrategia,
        analisis.clasificacion,
        analisis.resumen,
        JSON.stringify(analisis.observaciones),
        analisis.confianza,
        analisis.proveedor,
        analisis.createdAt,
      ],
    );
  }

  async eliminarPorLote(loteId: string): Promise<void> {
    await this.pool.query('DELETE FROM analisis_lotes WHERE lote_id = $1', [loteId]);
  }

  async buscarUltimoPorLote(loteId: string): Promise<AnalisisLote | null> {
    const resultado = await this.pool.query(
      'SELECT * FROM analisis_lotes WHERE lote_id = $1 ORDER BY created_at DESC LIMIT 1',
      [loteId],
    );
    const fila = primera(resultado);
    return fila ? mapAnalisis(fila) : null;
  }
}

function primera(resultado: QueryResult): Fila | null {
  const fila = filas(resultado)[0];
  return fila ?? null;
}

function filas(resultado: QueryResult): Fila[] {
  return resultado.rows as Fila[];
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
  return Productor.crear({
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
