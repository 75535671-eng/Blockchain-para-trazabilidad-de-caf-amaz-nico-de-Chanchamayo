import { Pool, QueryResult } from 'pg';
import { ReferenciaAnclaje, ReferenciaAnclajeRepositoryPort } from '../../../application/ports/output/OutputPorts';

type Fila = Record<string, unknown>;

export class PostgresReferenciaAnclajeRepository implements ReferenciaAnclajeRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(referencia: ReferenciaAnclaje): Promise<void> {
    await this.pool.query(
      `INSERT INTO referencias_anclaje (id, evento_id, hash_evento, red, identificador_transaccion, fecha)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [referencia.id, referencia.eventoId, referencia.hash, referencia.red, referencia.identificador, referencia.fecha],
    );
  }

  async buscarPorEvento(eventoId: string): Promise<ReferenciaAnclaje | null> {
    const resultado = await this.pool.query(
      `SELECT id, evento_id, hash_evento, red, identificador_transaccion, fecha
       FROM referencias_anclaje
       WHERE evento_id = $1`,
      [eventoId],
    );
    const fila = filas(resultado)[0];
    return fila ? mapReferencia(fila) : null;
  }

  async listarPorEventos(eventoIds: string[]): Promise<ReferenciaAnclaje[]> {
    if (eventoIds.length === 0) {
      return [];
    }
    const resultado = await this.pool.query(
      `SELECT id, evento_id, hash_evento, red, identificador_transaccion, fecha
       FROM referencias_anclaje
       WHERE evento_id = ANY($1::uuid[])`,
      [eventoIds],
    );
    return filas(resultado).map(mapReferencia);
  }
}

function mapReferencia(row: Fila): ReferenciaAnclaje {
  return {
    id: String(row.id),
    eventoId: String(row.evento_id),
    hash: String(row.hash_evento),
    red: String(row.red),
    identificador: String(row.identificador_transaccion),
    fecha: row.fecha instanceof Date ? row.fecha : new Date(String(row.fecha)),
  };
}

function filas(resultado: QueryResult): Fila[] {
  return resultado.rows as Fila[];
}
