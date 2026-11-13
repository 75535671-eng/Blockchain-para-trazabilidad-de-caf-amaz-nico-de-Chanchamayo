import { Pool } from 'pg';
import { PrediccionCalidadRepositoryPort } from '../../../application/ports/output/OutputPorts';
import { PrediccionCalidad } from '../../../domain/entities/PrediccionCalidad';
import { filasDe, invocar } from '../../../infrastructure/persistence/invocar';

type Fila = Record<string, unknown>;

export class PostgresPrediccionCalidadRepository implements PrediccionCalidadRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(prediccion: PrediccionCalidad): Promise<void> {
    await invocar(this.pool, 'insertar_prediccion', [
      prediccion.id,
      prediccion.loteId,
      prediccion.calidad,
      prediccion.modelo,
      prediccion.referencia,
      prediccion.createdAt,
    ]);
  }

  async listarPorLote(loteId: string): Promise<PrediccionCalidad[]> {
    return this.listarPorLotes([loteId]);
  }

  async listarPorLotes(loteIds: string[]): Promise<PrediccionCalidad[]> {
    if (loteIds.length === 0) {
      return [];
    }
    return filasDe(await invocar(this.pool, 'listar_predicciones_lotes', [loteIds])).map(mapPrediccion);
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
