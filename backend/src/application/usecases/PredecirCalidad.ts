import { PrediccionCalidad } from '../../domain/entities/PrediccionCalidad';
import { NotFoundError } from '../../domain/errors/DomainError';
import { ausenciasParaPrediccion } from '../../domain/services/inteligencia/DatosPrediccion';
import { Actor, IntentoPrediccionDto, PrediccionCalidadDto, VariablesCalidadDto } from '../dto/dtos';
import { ListarPrediccionesUseCase, ListarPrediccionesVisiblesUseCase, PredecirCalidadUseCase } from '../ports/input/UseCases';
import {
  EventoTrazabilidadRepositoryPort,
  LoteRepositoryPort,
  ParcelaRepositoryPort,
  PrediccionCalidadRepositoryPort,
  PredictorCalidadPort,
  ProductorRepositoryPort,
} from '../ports/output/OutputPorts';
import { nuevoId } from '../support/apoyo';
import { exigirProductorVisible, lotesVisibles } from '../support/lotesVisibles';

export class PredecirCalidad implements PredecirCalidadUseCase {
  constructor(
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly eventos: EventoTrazabilidadRepositoryPort,
    private readonly predicciones: PrediccionCalidadRepositoryPort,
    private readonly predictor: PredictorCalidadPort,
  ) {}

  async ejecutar(comando: { actor: Actor; loteId: string }): Promise<IntentoPrediccionDto> {
    const contexto = await cargarContexto(
      { lotes: this.lotes, parcelas: this.parcelas, productores: this.productores, eventos: this.eventos },
      comando.actor,
      comando.loteId,
    );
    const ausentes = ausenciasParaPrediccion(contexto.variables);
    if (ausentes.length > 0) {
      return {
        estado: 'datos_insuficientes',
        mensaje: `No puede realizarse el análisis. Faltan datos suficientes: ${ausentes.join(', ')}.`,
        variables: contexto.variables,
        prediccion: null,
      };
    }
    const resultado = await this.predictor.predecir({
      loteId: contexto.loteId,
      variedad: contexto.variables.variedad ?? '',
      altitudMsnm: contexto.variables.altitudMsnm ?? 0,
      metodoBeneficio: contexto.variables.metodoBeneficio ?? '',
      humedadPorcentaje: contexto.variables.humedadPorcentaje ?? 0,
    });
    if (resultado.estado === 'no_disponible') {
      return {
        estado: 'no_disponible',
        mensaje: resultado.motivo,
        variables: contexto.variables,
        prediccion: null,
      };
    }
    const prediccion = PrediccionCalidad.crear({
      id: nuevoId(),
      loteId: contexto.loteId,
      calidad: resultado.calidad,
      modelo: resultado.modelo,
      referencia: resultado.referencia,
    });
    await this.predicciones.guardar(prediccion);
    return {
      estado: 'disponible',
      mensaje: null,
      variables: contexto.variables,
      prediccion: aPrediccionDto(prediccion),
    };
  }
}

export class ListarPredicciones implements ListarPrediccionesUseCase {
  constructor(
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly predicciones: PrediccionCalidadRepositoryPort,
  ) {}

  async ejecutar(comando: { actor: Actor; loteId: string }): Promise<PrediccionCalidadDto[]> {
    const lote = await this.lotes.buscarPorId(comando.loteId);
    if (!lote) {
      throw new NotFoundError('El lote no existe.');
    }
    const parcela = await this.parcelas.buscarPorId(lote.parcelaId);
    if (!parcela) {
      throw new NotFoundError('La parcela del lote no existe.');
    }
    await exigirProductorVisible(this.productores, comando.actor, parcela.productorId);
    const lista = await this.predicciones.listarPorLote(lote.id);
    return lista.map(aPrediccionDto);
  }
}

export class ListarPrediccionesVisibles implements ListarPrediccionesVisiblesUseCase {
  constructor(
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly predicciones: PrediccionCalidadRepositoryPort,
  ) {}

  async ejecutar(actor: Actor): Promise<PrediccionCalidadDto[]> {
    const lotes = await lotesVisibles(this.lotes, this.parcelas, this.productores, actor);
    const lista = await this.predicciones.listarPorLotes(lotes.map((lote) => lote.id));
    return lista.map(aPrediccionDto);
  }
}

async function cargarContexto(
  deps: {
    lotes: LoteRepositoryPort;
    parcelas: ParcelaRepositoryPort;
    productores: ProductorRepositoryPort;
    eventos: EventoTrazabilidadRepositoryPort;
  },
  actor: Actor,
  loteId: string,
): Promise<{ loteId: string; variables: VariablesCalidadDto }> {
  const lote = await deps.lotes.buscarPorId(loteId);
  if (!lote) {
    throw new NotFoundError('El lote no existe.');
  }
  const parcela = await deps.parcelas.buscarPorId(lote.parcelaId);
  if (!parcela) {
    throw new NotFoundError('La parcela del lote no existe.');
  }
  await exigirProductorVisible(deps.productores, actor, parcela.productorId);
  const eventos = await deps.eventos.listarPorLote(lote.id);
  const beneficio = [...eventos].reverse().find((evento) => evento.etapa === 'BENEFICIO' && evento.variables);
  return {
    loteId: lote.id,
    variables: {
      variedad: lote.variedad,
      altitudMsnm: parcela.altitudMsnm,
      metodoBeneficio: beneficio?.variables?.metodoBeneficio ?? null,
      humedadPorcentaje: beneficio?.variables?.humedadPorcentaje ?? null,
    },
  };
}

export function aPrediccionDto(prediccion: PrediccionCalidad): PrediccionCalidadDto {
  return {
    id: prediccion.id,
    loteId: prediccion.loteId,
    calidad: prediccion.calidad,
    modelo: prediccion.modelo,
    referencia: prediccion.referencia,
    createdAt: prediccion.createdAt.toISOString(),
  };
}
