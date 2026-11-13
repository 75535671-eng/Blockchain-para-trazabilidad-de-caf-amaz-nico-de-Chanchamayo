import { Pool } from 'pg';
import { ReferenciaAnclaje, ReferenciaAnclajeRepositoryPort } from '../../../application/ports/output/OutputPorts';
import { filasDe, invocar, primeraDe } from '../../../infrastructure/persistence/invocar';

type Fila = Record<string, unknown>;

export class PostgresReferenciaAnclajeRepository implements ReferenciaAnclajeRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(referencia: ReferenciaAnclaje): Promise<void> {
    await invocar(this.pool, 'insertar_referencia_anclaje', [
      referencia.id,
      referencia.eventoId,
      referencia.hash,
      referencia.red,
      referencia.identificador,
      referencia.fecha,
    ]);
  }

  async buscarPorEvento(eventoId: string): Promise<ReferenciaAnclaje | null> {
    const fila = primeraDe(await invocar(this.pool, 'buscar_referencia_por_evento', [eventoId]));
    return fila ? mapReferencia(fila) : null;
  }

  async listarPorEventos(eventoIds: string[]): Promise<ReferenciaAnclaje[]> {
    if (eventoIds.length === 0) {
      return [];
    }
    return filasDe(await invocar(this.pool, 'listar_referencias_eventos', [eventoIds])).map(mapReferencia);
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
