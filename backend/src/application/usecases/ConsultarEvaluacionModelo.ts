import { EvaluacionModelo, evaluacionModeloPoc } from '../../domain/services/inteligencia/EvaluacionModeloPoc';
import { ConsultarEvaluacionModeloUseCase } from '../ports/input/UseCases';

export class ConsultarEvaluacionModelo implements ConsultarEvaluacionModeloUseCase {
  ejecutar(): Promise<EvaluacionModelo> {
    return Promise.resolve(evaluacionModeloPoc());
  }
}
