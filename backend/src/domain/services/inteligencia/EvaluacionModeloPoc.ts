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
  datasetDisponible: false;
  modeloExportado: false;
  registrosEntrenamiento: number;
  registrosPrueba: number;
  randomState: number;
  metricasHistoricas: MetricaHistorica[];
  decisionHistorica: string;
  limitaciones: string[];
}

/** Cifras copiadas de la salida guardada en notebooks/PoC_RF_IA_01.ipynb. No se recalculan. */
export function evaluacionModeloPoc(): EvaluacionModelo {
  return {
    estado: 'NO_CONCLUYENTE',
    algoritmo: 'Random Forest',
    identificador: 'PoC RF-IA-01',
    dataset: 'dataset_trazabilidad_cafe_60_lotes.xlsx',
    datasetDisponible: false,
    modeloExportado: false,
    registrosEntrenamiento: 48,
    registrosPrueba: 12,
    randomState: 42,
    metricasHistoricas: [
      { nombre: 'Accuracy calidad_tipo', resultado: 1, meta: 0.8 },
      { nombre: 'F1 macro calidad_tipo', resultado: 1, meta: 0.75 },
    ],
    decisionHistorica: 'GO - CUMPLE RF-IA-01',
    limitaciones: [
      'Estas cifras son la salida histórica del notebook. No describen un modelo integrado ni autorizan predicciones sobre los lotes del sistema.',
      'El archivo del dataset no está en el repositorio, así que las métricas no pueden recalcularse.',
      'El modelo no quedó exportado.',
      'La prueba usó 12 casos y el entrenamiento 48.',
      'La puntuación de catación formaba parte de las entradas y está ligada a la clase de calidad.',
      'Los identificadores del experimento no corresponden a los lotes CHNY registrados en el sistema.',
      'scikit-learn advirtió que el F1 micro ignora pos_label. Esa métrica queda fuera de este panel porque no mide la calidad del lote.',
      'El notebook no guarda una fecha de evaluación que pueda citarse.',
    ],
  };
}
