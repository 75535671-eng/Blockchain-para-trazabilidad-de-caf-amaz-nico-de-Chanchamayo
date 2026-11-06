import { NotFoundError } from '../../domain/errors/DomainError';
import { entradaTrazabilidad } from '../../domain/services/inteligencia/EntradaTrazabilidad';
import { Actor, IntentoTrazabilidadDto } from '../dto/dtos';
import { EstimarTrazabilidadUseCase } from '../ports/input/UseCases';
import { EventoTrazabilidadRepositoryPort, LoteRepositoryPort, ParcelaRepositoryPort, PredictorTrazabilidadPort, ProductorRepositoryPort } from '../ports/output/OutputPorts';
import { exigirProductorVisible } from '../support/lotesVisibles';

export class EstimarTrazabilidad implements EstimarTrazabilidadUseCase {
  constructor(
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly eventos: EventoTrazabilidadRepositoryPort,
    private readonly predictor: PredictorTrazabilidadPort,
  ) {}

  async ejecutar(comando: { actor: Actor; loteId: string }): Promise<IntentoTrazabilidadDto> {
    const lote = await this.lotes.buscarPorId(comando.loteId);
    if (!lote) {
      throw new NotFoundError('El lote no existe.');
    }
    const parcela = await this.parcelas.buscarPorId(lote.parcelaId);
    if (!parcela) {
      throw new NotFoundError('La parcela del lote no existe.');
    }
    await exigirProductorVisible(this.productores, comando.actor, parcela.productorId);
    const eventos = await this.eventos.listarPorLote(lote.id);
    const entrada = entradaTrazabilidad(
      eventos.map((evento) => ({
        etapa: evento.etapa,
        fecha: evento.fecha,
        humedadPorcentaje: evento.variables?.humedadPorcentaje ?? null,
      })),
    );
    if (!entrada) {
      return {
        estado: 'datos_insuficientes',
        mensaje: 'No puede estimarse la trazabilidad. Registra al menos un evento anterior a la exportación.',
        entrada: null,
        estimacion: null,
      };
    }
    const estimacion = await this.predictor.predecir(entrada);
    return { estado: 'disponible', mensaje: null, entrada, estimacion };
  }
}
