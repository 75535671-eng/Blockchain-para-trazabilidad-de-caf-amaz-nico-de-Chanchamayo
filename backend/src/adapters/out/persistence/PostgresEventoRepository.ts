import { Pool } from 'pg';
import { EventoTrazabilidadRepositoryPort } from '../../../application/ports/output/OutputPorts';
import { EventoTrazabilidad, VariableBeneficio } from '../../../domain/entities/EventoTrazabilidad';
import { NotFoundError, ValidationError } from '../../../domain/errors/DomainError';
import { filasDe, invocar, primeraDe } from '../../../infrastructure/persistence/invocar';

type Fila = Record<string, unknown>;

export class PostgresEventoTrazabilidadRepository implements EventoTrazabilidadRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async guardar(evento: EventoTrazabilidad): Promise<void> {
    try {
      await invocar(this.pool, 'registrar_evento', [
        evento.id,
        evento.loteId,
        evento.etapa,
        evento.fecha,
        evento.descripcion,
        evento.createdAt,
        evento.variables?.id ?? null,
        evento.variables?.metodoBeneficio ?? null,
        evento.variables?.humedadPorcentaje ?? null,
      ]);
    } catch (error) {
      if (esClaveForanea(error)) {
        throw new NotFoundError('El lote no existe.');
      }
      if (esRestriccion(error)) {
        throw new ValidationError('La información del evento no cumple las validaciones.');
      }
      throw error;
    }
  }

  async buscarPorId(id: string): Promise<EventoTrazabilidad | null> {
    const lote = primeraDe(await invocar(this.pool, 'lote_de_evento', [id]));
    if (!lote) {
      return null;
    }
    const eventos = await this.listarPorLote(String(lote.lote_id));
    return eventos.find((evento) => evento.id === id) ?? null;
  }

  async listarPorLote(loteId: string): Promise<EventoTrazabilidad[]> {
    return this.listarPorLotes([loteId]);
  }

  async listarPorLotes(loteIds: string[]): Promise<EventoTrazabilidad[]> {
    if (loteIds.length === 0) {
      return [];
    }
    return filasDe(await invocar(this.pool, 'listar_eventos_lote', [loteIds])).map(mapEvento);
  }
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

function esClaveForanea(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23503';
}

function esRestriccion(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23514';
}
