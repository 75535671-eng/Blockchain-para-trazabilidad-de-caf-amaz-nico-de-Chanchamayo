import { EventoTrazabilidad } from '../../domain/entities/EventoTrazabilidad';
import { NotFoundError } from '../../domain/errors/DomainError';
import { Actor, VerificacionIntegridadDto } from '../dto/dtos';
import { VerificarIntegridadEventoUseCase } from '../ports/input/UseCases';
import {
  AnclajeIntegridadPort,
  EventoTrazabilidadRepositoryPort,
  LoteRepositoryPort,
  ParcelaRepositoryPort,
  ProductorRepositoryPort,
  ReferenciaAnclaje,
  ReferenciaAnclajeRepositoryPort,
} from '../ports/output/OutputPorts';
import { hashEvento } from '../services/hashIntegridad';
import { nuevoId } from '../support/apoyo';
import { exigirProductorVisible } from '../support/lotesVisibles';

export class AnclarIntegridadEvento {
  constructor(
    private readonly anclaje: AnclajeIntegridadPort,
    private readonly referencias: ReferenciaAnclajeRepositoryPort,
  ) {}

  async ejecutar(evento: EventoTrazabilidad): Promise<ReferenciaAnclaje> {
    const hash = hashEvento(evento);
    const emitido = await this.anclaje.anclar(hash);
    const referencia: ReferenciaAnclaje = {
      id: nuevoId(),
      eventoId: evento.id,
      hash,
      red: emitido.red,
      identificador: emitido.identificador,
      fecha: emitido.fecha,
    };
    await this.referencias.guardar(referencia);
    return referencia;
  }
}

export class VerificarIntegridadEvento implements VerificarIntegridadEventoUseCase {
  constructor(
    private readonly eventos: EventoTrazabilidadRepositoryPort,
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly referencias: ReferenciaAnclajeRepositoryPort,
    private readonly anclaje: AnclajeIntegridadPort,
  ) {}

  async ejecutar(comando: { actor: Actor; eventoId: string }): Promise<VerificacionIntegridadDto> {
    const evento = await this.eventos.buscarPorId(comando.eventoId);
    if (!evento) {
      throw new NotFoundError('El evento no existe.');
    }
    const lote = await this.lotes.buscarPorId(evento.loteId);
    if (!lote) {
      throw new NotFoundError('El lote no existe.');
    }
    const parcela = await this.parcelas.buscarPorId(lote.parcelaId);
    if (!parcela) {
      throw new NotFoundError('La parcela del lote no existe.');
    }
    await exigirProductorVisible(this.productores, comando.actor, parcela.productorId);
    const referencia = await this.referencias.buscarPorEvento(evento.id);
    if (!referencia) {
      return {
        eventoId: evento.id,
        estado: 'sin_anclaje',
        mensaje: 'El evento todavía no está anclado.',
        hash: null,
        red: null,
        identificador: null,
      };
    }
    const hash = hashEvento(evento);
    if (hash !== referencia.hash) {
      return {
        eventoId: evento.id,
        estado: 'fallida',
        mensaje: 'El contenido del evento no coincide con el anclaje.',
        hash: null,
        red: null,
        identificador: null,
      };
    }
    if (!(await this.anclaje.verificar(hash, referencia.identificador))) {
      return {
        eventoId: evento.id,
        estado: 'fallida',
        mensaje: 'El anclaje no confirma el hash del evento.',
        hash: null,
        red: null,
        identificador: null,
      };
    }
    return {
      eventoId: evento.id,
      estado: 'verificada',
      mensaje: 'El contenido coincide con el anclaje.',
      hash: referencia.hash,
      red: referencia.red,
      identificador: referencia.identificador,
    };
  }
}
