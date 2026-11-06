import { EvaluacionTrazabilidad, evaluacionTrazabilidadPoc } from '../../domain/services/inteligencia/EvaluacionTrazabilidadPoc';
import { ConsultarEvaluacionTrazabilidadUseCase } from '../ports/input/UseCases';

export class ConsultarEvaluacionTrazabilidad implements ConsultarEvaluacionTrazabilidadUseCase {
  ejecutar(): Promise<EvaluacionTrazabilidad> {
    return Promise.resolve(evaluacionTrazabilidadPoc());
  }
}
