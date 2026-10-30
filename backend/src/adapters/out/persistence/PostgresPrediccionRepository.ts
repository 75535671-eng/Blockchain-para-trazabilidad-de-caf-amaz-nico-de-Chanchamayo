import { Pool, QueryResult } from 'pg';
import { PrediccionCalidadRepositoryPort } from '../../../application/ports/output/OutputPorts';
import { PrediccionCalidad } from '../../../domain/entities/PrediccionCalidad';

type Fila = Record<string, unknown>;

export class PostgresPrediccionCalidadRepository implements PrediccionCalidadRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(prediccion: PrediccionCalidad): Promise<void> {
    await this.pool.query(
      `INSERT INTO predicciones_calidad (id, lote_id, calidad, modelo, referencia, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [prediccion.id, prediccion.loteId, prediccion.calidad, prediccion.modelo, prediccion.referencia, prediccion.createdAt],
    );
  }

  async listarPorLote(loteId: string): Promise<PrediccionCalidad[]> {
    return this.listarPorLotes([loteId]);
  }

  async listarPorLotes(loteIds: string[]): Promise<PrediccionCalidad[]> {
    if (loteIds.length === 0) {
      return [];
    }
    const resultado = await this.pool.query(
      `SELECT * FROM predicciones_calidad
       WHERE lote_id = ANY($1::uuid[])
       ORDER BY created_at ASC, id ASC`,
      [loteIds],
    );
    return filas(resultado).map(mapPrediccion);
  }
}

function mapPrediccion(row: Fila): PrediccionCalidad {
  return PrediccionCalidad.crear({
    id: String(row.id),
    loteId: String(row.lote_id),
    calidad: String(row.calidad),
    modelo: String(row.modelo),
    referencia: String(row.referencia),
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(String(row.created_at)),
  });
}

function filas(resultado: QueryResult): Fila[] {
  return resultado.rows as Fila[];
}
