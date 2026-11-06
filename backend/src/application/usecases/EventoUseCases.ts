import { EventoTrazabilidad } from '../../domain/entities/EventoTrazabilidad';
import { ForbiddenError, NotFoundError } from '../../domain/errors/DomainError';
import { Actor, EventoTrazabilidadDto } from '../dto/dtos';
import { ListarEventosUseCase, ListarEventosVisiblesUseCase, RegistrarEventoUseCase } from '../ports/input/UseCases';
import {
  EventoTrazabilidadRepositoryPort,
  LoteRepositoryPort,
  ParcelaRepositoryPort,
  ProductorRepositoryPort,
  ReferenciaAnclaje,
  ReferenciaAnclajeRepositoryPort,
} from '../ports/output/OutputPorts';
import { hoyIso, nuevoId } from '../support/apoyo';
import { lotesVisibles } from '../support/lotesVisibles';
import { AnclarIntegridadEvento } from './IntegridadEvento';

export class RegistrarEvento implements RegistrarEventoUseCase {
  constructor(
    private readonly eventos: EventoTrazabilidadRepositoryPort,
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly anclarIntegridad: AnclarIntegridadEvento,
  ) {}

  async ejecutar(comando: {
    actor: Actor;
    loteId: string;
    etapa: string;
    fecha: string;
    descripcion: string;
    metodoBeneficio?: string | null;
    humedadPorcentaje?: number | null;
  }): Promise<EventoTrazabilidadDto> {
    const lote = await this.lotes.buscarPorId(comando.loteId);
    if (!lote) {
      throw new NotFoundError('El lote no existe.');
    }
    const parcela = await this.parcelas.buscarPorId(lote.parcelaId);
    if (!parcela) {
      throw new NotFoundError('La parcela del lote no existe.');
    }
    await exigirAccesoAlLote(this.productores, comando.actor, parcela.productorId);
    const informaVariables =
      Boolean(comando.metodoBeneficio?.trim()) || typeof comando.humedadPorcentaje === 'number';
    const evento = EventoTrazabilidad.crear({
      id: nuevoId(),
      loteId: lote.id,
      etapa: comando.etapa,
      fecha: comando.fecha,
      fechaCosecha: lote.fechaCosecha.iso,
      hoyIso: hoyIso(),
      descripcion: comando.descripcion,
      variables:
        comando.etapa.trim() === 'BENEFICIO' || informaVariables
          ? {
              id: nuevoId(),
              metodoBeneficio: comando.metodoBeneficio ?? '',
              humedadPorcentaje: typeof comando.humedadPorcentaje === 'number' ? comando.humedadPorcentaje : Number.NaN,
            }
          : null,
    });
    await this.eventos.guardar(evento);
    const referencia = await this.anclarIntegridad.ejecutar(evento);
    return aEventoDto(evento, referencia);
  }
}

export class ListarEventos implements ListarEventosUseCase {
  constructor(
    private readonly eventos: EventoTrazabilidadRepositoryPort,
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly referencias: ReferenciaAnclajeRepositoryPort,
  ) {}

  async ejecutar(comando: { actor: Actor; loteId: string }): Promise<EventoTrazabilidadDto[]> {
    const lote = await this.lotes.buscarPorId(comando.loteId);
    if (!lote) {
      throw new NotFoundError('El lote no existe.');
    }
    const parcela = await this.parcelas.buscarPorId(lote.parcelaId);
    if (!parcela) {
      throw new NotFoundError('La parcela del lote no existe.');
    }
    await exigirAccesoAlLote(this.productores, comando.actor, parcela.productorId);
    const eventos = await this.eventos.listarPorLote(lote.id);
    return eventosConAnclaje(eventos, this.referencias);
  }
}

async function exigirAccesoAlLote(
  productores: ProductorRepositoryPort,
  actor: Actor,
  productorId: string,
): Promise<void> {
  if (actor.rol === 'ADMINISTRADOR') {
    return;
  }
  const propio = await productores.buscarPorUsuarioId(actor.usuarioId);
  if (!propio || propio.id !== productorId) {
    throw new ForbiddenError('No puedes acceder a información de otro productor.');
  }
}

export class ListarEventosVisibles implements ListarEventosVisiblesUseCase {
  constructor(
    private readonly eventos: EventoTrazabilidadRepositoryPort,
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly referencias: ReferenciaAnclajeRepositoryPort,
  ) {}

  async ejecutar(actor: Actor): Promise<EventoTrazabilidadDto[]> {
    const lotes = await lotesVisibles(this.lotes, this.parcelas, this.productores, actor);
    const eventos = await this.eventos.listarPorLotes(lotes.map((lote) => lote.id));
    return eventosConAnclaje(eventos, this.referencias);
  }
}

async function eventosConAnclaje(
  eventos: EventoTrazabilidad[],
  referencias: ReferenciaAnclajeRepositoryPort,
): Promise<EventoTrazabilidadDto[]> {
  const anclajes = await referencias.listarPorEventos(eventos.map((evento) => evento.id));
  const porEvento = new Map(anclajes.map((anclaje) => [anclaje.eventoId, anclaje]));
  return eventos.map((evento) => aEventoDto(evento, porEvento.get(evento.id) ?? null));
}

export function aEventoDto(evento: EventoTrazabilidad, anclaje?: ReferenciaAnclaje | null): EventoTrazabilidadDto {
  const dto: EventoTrazabilidadDto = {
    id: evento.id,
    loteId: evento.loteId,
    etapa: evento.etapa,
    fecha: evento.fecha,
    descripcion: evento.descripcion,
    variables: evento.variables
      ? {
          id: evento.variables.id,
          metodoBeneficio: evento.variables.metodoBeneficio,
          humedadPorcentaje: evento.variables.humedadPorcentaje,
        }
      : null,
    createdAt: evento.createdAt.toISOString(),
  };
  if (anclaje !== undefined) {
    dto.anclaje = anclaje
      ? {
          hash: anclaje.hash,
          red: anclaje.red,
          identificador: anclaje.identificador,
          fecha: anclaje.fecha.toISOString(),
        }
      : null;
  }
  return dto;
}
