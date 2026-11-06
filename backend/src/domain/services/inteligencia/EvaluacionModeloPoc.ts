export interface MetricaHistorica {
  nombre: string;
  resultado: number;
  meta: number;
}

export interface EvaluacionModelo {
  estado: 'NO_CONCLUYENTE';
  algoritmo: string;
  identificador: string;
  dataset: string;
  datasetDisponible: boolean;
  modeloExportado: boolean;
  registrosEntrenamiento: number;
  registrosPrueba: number;
  randomState: number;
  metricasHistoricas: MetricaHistorica[];
  decisionHistorica: string;
  limitaciones: string[];
}

/** Cifras de notebooks/poc_calidad_prueba.py. Los coeficientes viven en modelo-prueba.json. */
export function evaluacionModeloPoc(): EvaluacionModelo {
  return {
    estado: 'NO_CONCLUYENTE',
    algoritmo: 'Regresión logística',
    identificador: 'PoC RF-IA-01',
    dataset: 'notebooks/datos/dataset_prueba_poc_cafe.csv',
    datasetDisponible: true,
    modeloExportado: true,
    registrosEntrenamiento: 150,
    registrosPrueba: 50,
    randomState: 42,
    metricasHistoricas: [
      { nombre: 'Accuracy regresión logística', resultado: 0.8, meta: 0.7 },
      { nombre: 'F1 macro regresión logística', resultado: 0.7857, meta: 0.65 },
      { nombre: 'Accuracy Random Forest', resultado: 0.66, meta: 0.7 },
      { nombre: 'F1 macro Random Forest', resultado: 0.6257, meta: 0.65 },
      { nombre: 'Accuracy Gradient Boosting', resultado: 0.64, meta: 0.7 },
      { nombre: 'F1 macro Gradient Boosting', resultado: 0.6181, meta: 0.65 },
    ],
    decisionHistorica: 'GO CON CONDICIONES',
    limitaciones: [
      'Los 200 registros son de prueba y fueron generados con una regla conocida y ruido. No son cosechas medidas en Chanchamayo.',
      'La puntuación de catación no entra al modelo. La clase de calidad se deriva de esa puntuación solo como etiqueta.',
      'La regresión logística superó el umbral experimental. Random Forest y Gradient Boosting no lo superaron.',
      'El generador es aditivo, así que un modelo lineal tiene ventaja en este archivo. Eso no predice el ganador con datos reales.',
      'La decisión de integración queda condicionada a repetir el protocolo con un dataset de origen documentado.',
      'Los coeficientes están en la API como modelo de prueba. El resultado se muestra en el lote y no certifica la calidad en taza.',
      'No se clasifica la validez de un hash ni la etapa de destino. Esas salidas no dependen de la altitud ni de la humedad.',
    ],
  };
}
