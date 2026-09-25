import { AnalisisLote } from '../../domain/entities/AnalisisLote';
import { ContextoAnalisis, limitarConfianza, validarRespuestaAnalisis } from '../../domain/services/analisis/AnalisisLoteModelo';
import { SelectorEstrategiaAnalisis } from '../../domain/services/analisis/EstrategiasAnalisis';
import { ConsultaLoteDto } from '../dto/dtos';
import { AnalizarLoteUseCase } from '../ports/input/UseCases';
import {
  AIServicePort,
  AnalisisLoteRepositoryPort,
  LoteRepositoryPort,
  ParcelaRepositoryPort,
  ProductorRepositoryPort,
} from '../ports/output/OutputPorts';
import { nuevoId } from '../support/apoyo';
import { consultarLote } from './LoteUseCases';

export class AnalizarLote implements AnalizarLoteUseCase {
  constructor(
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly analisis: AnalisisLoteRepositoryPort,
    private readonly ia: AIServicePort,
    private readonly selector: SelectorEstrategiaAnalisis,
  ) {}

  async ejecutar(comando: { actor: import('../dto/dtos').Actor; loteId: string }) {
    const deps = {
      lotes: this.lotes,
      parcelas: this.parcelas,
      productores: this.productores,
      analisis: this.analisis,
    };
    const consulta = await consultarLote(deps, comando.actor, comando.loteId);
    const contexto = contextoDe(consulta);
    const estrategia = this.selector.seleccionar(consulta.parcela.altitudMsnm);
    const cruda = await this.ia.completar(estrategia.construirSolicitud(contexto));
    const validada = validarRespuestaAnalisis(cruda);
    const guardado = AnalisisLote.crear({
      id: nuevoId(),
      loteId: consulta.lote.id,
      estrategia: estrategia.nombre,
      clasificacion: validada.clasificacion,
      resumen: validada.resumen,
      observaciones: validada.observaciones,
      confianza: limitarConfianza(estrategia.confianza(contexto), estrategia.nombre),
      proveedor: validada.proveedor,
    });
    await this.analisis.guardar(guardado);
    return consultarLote(deps, comando.actor, comando.loteId);
  }
}

function contextoDe(consulta: ConsultaLoteDto): ContextoAnalisis {
  return {
    codigoLote: consulta.lote.codigo,
    variedad: consulta.lote.variedad,
    fechaCosecha: consulta.lote.fechaCosecha,
    cantidadKg: consulta.lote.cantidadKg,
    observaciones: consulta.lote.observaciones,
    parcela: consulta.parcela.nombre,
    distrito: consulta.parcela.distrito,
    localidad: consulta.parcela.localidad,
    areaHectareas: consulta.parcela.areaHectareas,
    altitudMsnm: consulta.parcela.altitudMsnm,
    productor: consulta.productor.nombre,
    organizacion: consulta.productor.organizacion,
  };
}
