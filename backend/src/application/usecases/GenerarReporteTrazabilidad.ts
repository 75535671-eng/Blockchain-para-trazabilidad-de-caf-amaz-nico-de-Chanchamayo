import { ValidationError } from '../../domain/errors/DomainError';
import { Actor, ReporteTrazabilidadDto } from '../dto/dtos';
import { GenerarReporteTrazabilidadUseCase } from '../ports/input/UseCases';
import {
  EventoTrazabilidadRepositoryPort,
  LoteRepositoryPort,
  ParcelaRepositoryPort,
  ProductorRepositoryPort,
} from '../ports/output/OutputPorts';
import { exigirProductorVisible, lotesVisibles } from '../support/lotesVisibles';
import { aEventoDto } from './EventoUseCases';

const SIN_INFORMACION = 'No hay información disponible para generar el reporte.';
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class GenerarReporteTrazabilidad implements GenerarReporteTrazabilidadUseCase {
  constructor(
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly eventos: EventoTrazabilidadRepositoryPort,
  ) {}

  async ejecutar(comando: {
    actor: Actor;
    loteId?: string | null;
    productorId?: string | null;
    parcelaId?: string | null;
    desde?: string | null;
    hasta?: string | null;
  }): Promise<ReporteTrazabilidadDto> {
    const desde = fechaOpcional(comando.desde, 'La fecha inicial');
    const hasta = fechaOpcional(comando.hasta, 'La fecha final');
    if (desde && hasta && desde > hasta) {
      throw new ValidationError('La fecha inicial no puede ser posterior a la fecha final.');
    }
    if (comando.productorId) {
      await exigirProductorVisible(this.productores, comando.actor, comando.productorId);
    }
    const visibles = await lotesVisibles(this.lotes, this.parcelas, this.productores, comando.actor);
    const parcelas = await this.parcelas.listar();
    const productores = await this.productores.listar();
    const eventos = await this.eventos.listarPorLotes(visibles.map((lote) => lote.id));
    const lotes = visibles.filter((lote) => {
      if (comando.loteId && lote.id !== comando.loteId) {
        return false;
      }
      if (comando.parcelaId && lote.parcelaId !== comando.parcelaId) {
        return false;
      }
      if (comando.productorId) {
        const parcela = parcelas.find((item) => item.id === lote.parcelaId);
        if (!parcela || parcela.productorId !== comando.productorId) {
          return false;
        }
      }
      return true;
    });
    const filas = lotes.flatMap((lote) => {
      const parcela = parcelas.find((item) => item.id === lote.parcelaId);
      const productor = productores.find((item) => item.id === parcela?.productorId);
      if (!parcela || !productor) {
        return [];
      }
      const delLote = eventos.filter((evento) => {
        if (evento.loteId !== lote.id) {
          return false;
        }
        if (desde && evento.fecha < desde) {
          return false;
        }
        if (hasta && evento.fecha > hasta) {
          return false;
        }
        return true;
      });
      if ((desde || hasta) && delLote.length === 0) {
        return [];
      }
      return [
        {
          loteId: lote.id,
          codigo: lote.codigo.valor,
          estado: lote.estado,
          variedad: lote.variedad,
          fechaCosecha: lote.fechaCosecha.iso,
          cantidadKg: lote.cantidad.valor,
          productor: productor.nombre,
          organizacion: productor.organizacion,
          parcela: parcela.nombre,
          distrito: parcela.distrito,
          localidad: parcela.localidad,
          altitudMsnm: parcela.altitudMsnm,
          eventos: delLote.map((evento) => aEventoDto(evento)),
        },
      ];
    });
    if (filas.length === 0) {
      return { disponible: false, mensaje: SIN_INFORMACION, lotes: [] };
    }
    return { disponible: true, mensaje: null, lotes: filas };
  }
}

function fechaOpcional(valor: string | null | undefined, etiqueta: string): string | null {
  if (!valor?.trim()) {
    return null;
  }
  const fecha = valor.trim();
  if (!FECHA.test(fecha)) {
    throw new ValidationError(`${etiqueta} debe tener formato YYYY-MM-DD.`);
  }
  return fecha;
}
