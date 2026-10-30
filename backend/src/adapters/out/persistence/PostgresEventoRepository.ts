import { Pool, PoolClient, QueryResult } from 'pg';
import { EventoTrazabilidadRepositoryPort } from '../../../application/ports/output/OutputPorts';
import { EventoTrazabilidad, VariableBeneficio } from '../../../domain/entities/EventoTrazabilidad';
import { NotFoundError, ValidationError } from '../../../domain/errors/DomainError';

type Fila = Record<string, unknown>;

export class PostgresEventoTrazabilidadRepository implements EventoTrazabilidadRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(evento: EventoTrazabilidad): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO eventos_trazabilidad (id, lote_id, etapa, fecha, descripcion, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [evento.id, evento.loteId, evento.etapa, evento.fecha, evento.descripcion, evento.createdAt],
      );
      if (evento.variables) {
        await client.query(
          `INSERT INTO variables_productivas (id, evento_id, lote_id, metodo_beneficio, humedad_porcentaje)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            evento.variables.id,
            evento.id,
            evento.loteId,
            evento.variables.metodoBeneficio,
            evento.variables.humedadPorcentaje,
          ],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (esClaveForanea(error)) {
        throw new NotFoundError('El lote no existe.');
      }
      if (esRestriccion(error)) {
        throw new ValidationError('La información del evento no cumple las validaciones.');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async listarPorLote(loteId: string): Promise<EventoTrazabilidad[]> {
    return this.listarPorLotes([loteId]);
  }

  async listarPorLotes(loteIds: string[]): Promise<EventoTrazabilidad[]> {
    if (loteIds.length === 0) {
      return [];
    }
    const resultado = await this.pool.query(
      `SELECT eventos.id,
              eventos.lote_id,
              eventos.etapa,
              eventos.fecha,
              eventos.descripcion,
              eventos.created_at,
              variables.id AS variable_id,
              variables.metodo_beneficio,
              variables.humedad_porcentaje
       FROM eventos_trazabilidad eventos
       LEFT JOIN variables_productivas variables ON variables.evento_id = eventos.id
       WHERE eventos.lote_id = ANY($1::uuid[])
       ORDER BY eventos.fecha ASC, eventos.created_at ASC, eventos.id ASC`,
      [loteIds],
    );
    return filas(resultado).map(mapEvento);
  }
}

export async function borrarTrazabilidadDeLote(client: PoolClient, loteId: string): Promise<void> {
  await client.query('DELETE FROM predicciones_calidad WHERE lote_id = $1', [loteId]);
  await client.query('DELETE FROM variables_productivas WHERE lote_id = $1', [loteId]);
  await client.query('DELETE FROM eventos_trazabilidad WHERE lote_id = $1', [loteId]);
}

export async function borrarTrazabilidadDeProductor(client: PoolClient, productorId: string): Promise<void> {
  const lotesDelProductor = `SELECT lotes.id FROM lotes
    JOIN parcelas ON parcelas.id = lotes.parcela_id
    WHERE parcelas.productor_id = $1`;
  await client.query(`DELETE FROM predicciones_calidad WHERE lote_id IN (${lotesDelProductor})`, [productorId]);
  await client.query(`DELETE FROM variables_productivas WHERE lote_id IN (${lotesDelProductor})`, [productorId]);
  await client.query(`DELETE FROM eventos_trazabilidad WHERE lote_id IN (${lotesDelProductor})`, [productorId]);
}

function mapEvento(row: Fila): EventoTrazabilidad {
  const variables =
    row.variable_id == null
      ? null
      : VariableBeneficio.crear({
          id: String(row.variable_id),
          metodoBeneficio: String(row.metodo_beneficio),
          humedadPorcentaje: Number(row.humedad_porcentaje),
        });
  return EventoTrazabilidad.reconstituir({
    id: String(row.id),
    loteId: String(row.lote_id),
    etapa: String(row.etapa),
    fecha: String(row.fecha).slice(0, 10),
    descripcion: String(row.descripcion),
    variables,
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(String(row.created_at)),
  });
}

function filas(resultado: QueryResult): Fila[] {
  return resultado.rows as Fila[];
}

function esClaveForanea(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23503';
}

function esRestriccion(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23514';
}
