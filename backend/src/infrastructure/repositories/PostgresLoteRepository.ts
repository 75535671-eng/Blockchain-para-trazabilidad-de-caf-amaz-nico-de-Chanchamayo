import { ILoteRepository } from '../../domain/ILoteRepository';
import { Lote, EstadoLote } from '../../domain/Lote';
import { pool } from '../database/db';

export class PostgresLoteRepository implements ILoteRepository {
  async guardar(lote: Lote): Promise<Lote> {
    const query = `
      INSERT INTO lote (codigo_lote, id_parcela, variedad, peso_kg, altitud_msnm, fecha_cosecha, estado, hash_verificacion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, codigo_lote, id_parcela, variedad, peso_kg, altitud_msnm, fecha_cosecha, estado, hash_verificacion;
    `;
    const values = [
      lote.codigoLote,
      lote.idParcela,
      lote.variedad,
      lote.pesoKg,
      lote.altitudMsnm,
      lote.fechaCosecha,
      lote.estado,
      lote.hashVerificacion
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];

    return new Lote({
      id: row.id,
      codigoLote: row.codigo_lote,
      idParcela: row.id_parcela,
      variedad: row.variedad,
      pesoKg: Number(row.peso_kg),
      altitudMsnm: row.altitud_msnm,
      fechaCosecha: new Date(row.fecha_cosecha),
      estado: row.estado as EstadoLote,
      hashVerificacion: row.hash_verificacion
    });
  }

  async obtenerPorCodigo(codigoLote: string): Promise<Lote | null> {
    const query = `SELECT * FROM lote WHERE codigo_lote = $1`;
    const result = await pool.query(query, [codigoLote]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return new Lote({
      id: row.id,
      codigoLote: row.codigo_lote,
      idParcela: row.id_parcela,
      variedad: row.variedad,
      pesoKg: Number(row.peso_kg),
      altitudMsnm: row.altitud_msnm,
      fechaCosecha: new Date(row.fecha_cosecha),
      estado: row.estado as EstadoLote,
      hashVerificacion: row.hash_verificacion
    });
  }

  async listarTodos(): Promise<Lote[]> {
    const query = `SELECT * FROM lote ORDER BY creado_en DESC`;
    const result = await pool.query(query);

    return result.rows.map(row => new Lote({
      id: row.id,
      codigoLote: row.codigo_lote,
      idParcela: row.id_parcela,
      variedad: row.variedad,
      pesoKg: Number(row.peso_kg),
      altitudMsnm: row.altitud_msnm,
      fechaCosecha: new Date(row.fecha_cosecha),
      estado: row.estado as EstadoLote,
      hashVerificacion: row.hash_verificacion
    }));
  }
}
