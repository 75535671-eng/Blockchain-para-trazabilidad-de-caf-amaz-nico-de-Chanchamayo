import { PredictorCalidadPort, ResultadoPredictorCalidad } from '../../../application/ports/output/OutputPorts';

export class PredictorCalidadNoIntegrado implements PredictorCalidadPort {
  async predecir(): Promise<ResultadoPredictorCalidad> {
    return {
      estado: 'no_disponible',
      motivo: 'No puede realizarse la predicción. No hay un modelo de calidad validado e integrado.',
    };
  }
}
