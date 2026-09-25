import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { AnalisisLote } from '../../../domain/entities/AnalisisLote';
import { Lote } from '../../../domain/entities/Lote';
import { Parcela } from '../../../domain/entities/Parcela';
import { Productor } from '../../../domain/entities/Productor';
import { Usuario, RolUsuario } from '../../../domain/entities/Usuario';
import { ConflictError } from '../../../domain/errors/DomainError';
import { FechaCosecha } from '../../../domain/valueobjects/FechaCosecha';
import { IdentificadorLote } from '../../../domain/valueobjects/IdentificadorLote';
import {
  AnalisisLoteRepositoryPort,
  LoteRepositoryPort,
  ParcelaRepositoryPort,
  ProductorRepositoryPort,
  RegistroCuentaProductorPort,
  UsuarioRepositoryPort,
} from '../../../application/ports/output/OutputPorts';
import { Pool } from 'mysql2/promise';

export class MySQLUsuarioRepository implements UsuarioRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM usuarios WHERE email = ?', [email]);
    return rows[0] ? mapUsuario(rows[0]) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM usuarios WHERE id = ?', [id]);
    return rows[0] ? mapUsuario(rows[0]) : null;
  }
}

export class MySQLRegistroCuenta implements RegistroCuentaProductorPort {
  constructor(private readonly pool: Pool) {}

  async guardar(usuario: Usuario, productor: Productor): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        `INSERT INTO usuarios (id, nombre, email, password_hash, rol, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [usuario.id, usuario.nombre, usuario.email.valor, usuario.passwordHash, usuario.rol, usuario.createdAt],
      );
      await connection.query(
        `INSERT INTO productores (id, usuario_id, nombre, documento_identidad, telefono, organizacion, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export class MySQLProductorRepository implements ProductorRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(productor: Productor): Promise<void> {
    await this.pool.query(
      `INSERT INTO productores (id, usuario_id, nombre, documento_identidad, telefono, organizacion, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
  }

  async actualizar(productor: Productor): Promise<void> {
    await this.pool.query(
      `UPDATE productores SET nombre = ?, telefono = ?, organizacion = ? WHERE id = ?`,
      [productor.nombre, productor.telefono, productor.organizacion, productor.id],
    );
  }

  async eliminar(id: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM productores WHERE id = ?', [id]);
    } catch (error) {
      const errno = (error as { errno?: number }).errno;
      if (errno === 1451) {
        throw new ConflictError('No se puede eliminar este productor porque tiene parcelas asociadas.');
      }
      throw error;
    }
  }

  async buscarPorId(id: string): Promise<Productor | null> {
    return this.uno('SELECT * FROM productores WHERE id = ?', [id]);
  }

  async buscarPorUsuarioId(usuarioId: string): Promise<Productor | null> {
    return this.uno('SELECT * FROM productores WHERE usuario_id = ?', [usuarioId]);
  }

  async buscarPorDocumento(documento: string): Promise<Productor | null> {
    return this.uno('SELECT * FROM productores WHERE documento_identidad = ?', [documento]);
  }

  async listar(): Promise<Productor[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM productores ORDER BY nombre');
    return rows.map(mapProductor);
  }

  private async uno(sql: string, params: string[]): Promise<Productor | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(sql, params);
    return rows[0] ? mapProductor(rows[0]) : null;
  }
}

export class MySQLParcelaRepository implements ParcelaRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(parcela: Parcela): Promise<void> {
    await this.pool.query(
      `INSERT INTO parcelas
        (id, productor_id, nombre, distrito, localidad, area_hectareas, altitud_msnm, latitud, longitud, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
       SET productor_id = ?, nombre = ?, distrito = ?, localidad = ?, area_hectareas = ?, altitud_msnm = ?, latitud = ?, longitud = ?
       WHERE id = ?`,
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
      await this.pool.query('DELETE FROM parcelas WHERE id = ?', [id]);
    } catch (error) {
      const errno = (error as { errno?: number }).errno;
      if (errno === 1451) {
        throw new ConflictError('No se puede eliminar esta parcela porque tiene registros asociados.');
      }
      throw error;
    }
  }

  async buscarPorId(id: string): Promise<Parcela | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM parcelas WHERE id = ?', [id]);
    return rows[0] ? mapParcela(rows[0]) : null;
  }

  async buscarPorProductorYNombre(productorId: string, nombre: string): Promise<Parcela | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT * FROM parcelas WHERE productor_id = ? AND nombre = ? LIMIT 1',
      [productorId, nombre],
    );
    return rows[0] ? mapParcela(rows[0]) : null;
  }

  async listar(): Promise<Parcela[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM parcelas ORDER BY nombre');
    return rows.map(mapParcela);
  }

  async listarPorProductor(productorId: string): Promise<Parcela[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT * FROM parcelas WHERE productor_id = ? ORDER BY nombre',
      [productorId],
    );
    return rows.map(mapParcela);
  }
}

export class MySQLLoteRepository implements LoteRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(lote: Lote): Promise<void> {
    await this.pool.query(
      `INSERT INTO lotes
        (id, codigo, parcela_id, fecha_cosecha, cantidad_kg, variedad, observaciones, estado, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
       SET parcela_id = ?, fecha_cosecha = ?, cantidad_kg = ?, variedad = ?, observaciones = ?
       WHERE id = ?`,
      [lote.parcelaId, lote.fechaCosecha.iso, lote.cantidad.valor, lote.variedad, lote.observaciones, lote.id],
    );
  }

  async eliminar(id: string): Promise<void> {
    await this.pool.query('DELETE FROM lotes WHERE id = ?', [id]);
  }

  async buscarPorId(id: string): Promise<Lote | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM lotes WHERE id = ?', [id]);
    return rows[0] ? mapLote(rows[0]) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Lote | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM lotes WHERE codigo = ?', [codigo]);
    return rows[0] ? mapLote(rows[0]) : null;
  }

  async listar(): Promise<Lote[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM lotes ORDER BY created_at DESC');
    return rows.map(mapLote);
  }

  async listarPorParcelas(parcelaIds: string[]): Promise<Lote[]> {
    if (parcelaIds.length === 0) {
      return [];
    }
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT * FROM lotes WHERE parcela_id IN (${parcelaIds.map(() => '?').join(',')}) ORDER BY created_at DESC`,
      parcelaIds,
    );
    return rows.map(mapLote);
  }
}

export class MySQLAnalisisLoteRepository implements AnalisisLoteRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(analisis: AnalisisLote): Promise<void> {
    await this.pool.query<ResultSetHeader>(
      `INSERT INTO analisis_lotes
        (id, lote_id, estrategia, clasificacion, resumen, observaciones, confianza, proveedor, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    await this.pool.query('DELETE FROM analisis_lotes WHERE lote_id = ?', [loteId]);
  }

  async buscarUltimoPorLote(loteId: string): Promise<AnalisisLote | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT * FROM analisis_lotes WHERE lote_id = ? ORDER BY created_at DESC LIMIT 1',
      [loteId],
    );
    return rows[0] ? mapAnalisis(rows[0]) : null;
  }
}

function mapUsuario(row: RowDataPacket): Usuario {
  return Usuario.reconstituir({
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    passwordHash: row.password_hash,
    rol: row.rol as RolUsuario,
    createdAt: new Date(row.created_at),
  });
}

function mapProductor(row: RowDataPacket): Productor {
  return Productor.crear({
    id: row.id,
    usuarioId: row.usuario_id,
    nombre: row.nombre,
    documento: row.documento_identidad,
    telefono: row.telefono,
    organizacion: row.organizacion,
    createdAt: new Date(row.created_at),
  });
}

function mapParcela(row: RowDataPacket): Parcela {
  return Parcela.crear({
    id: row.id,
    productorId: row.productor_id,
    nombre: row.nombre,
    distrito: row.distrito,
    localidad: row.localidad,
    areaHectareas: Number(row.area_hectareas),
    altitudMsnm: row.altitud_msnm == null ? null : Number(row.altitud_msnm),
    latitud: row.latitud == null ? null : Number(row.latitud),
    longitud: row.longitud == null ? null : Number(row.longitud),
    createdAt: new Date(row.created_at),
  });
}

function mapLote(row: RowDataPacket): Lote {
  const fecha = String(row.fecha_cosecha).slice(0, 10);
  return Lote.crear({
    id: row.id,
    codigo: IdentificadorLote.desdeTexto(row.codigo),
    parcelaId: row.parcela_id,
    fechaCosecha: FechaCosecha.crear(fecha, fecha),
    cantidadKg: Number(row.cantidad_kg),
    variedad: row.variedad,
    observaciones: row.observaciones,
    createdAt: new Date(row.created_at),
  });
}

function mapAnalisis(row: RowDataPacket): AnalisisLote {
  const observaciones = typeof row.observaciones === 'string' ? JSON.parse(row.observaciones) : row.observaciones;
  return AnalisisLote.crear({
    id: row.id,
    loteId: row.lote_id,
    estrategia: row.estrategia,
    clasificacion: row.clasificacion,
    resumen: row.resumen,
    observaciones,
    confianza: row.confianza,
    proveedor: row.proveedor,
    createdAt: new Date(row.created_at),
  });
}
