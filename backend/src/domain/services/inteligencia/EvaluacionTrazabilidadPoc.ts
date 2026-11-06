import { EvaluacionModelo } from './EvaluacionModeloPoc';

export interface EvaluacionTrazabilidad extends EvaluacionModelo {
  decisionIntegracion: string;
}

/** Cifras de notebooks/poc_trazabilidad_prueba.py, ejecución local del 5 de noviembre de 2026. */
export function evaluacionTrazabilidadPoc(): EvaluacionTrazabilidad {
  return {
    estado: 'NO_CONCLUYENTE',
    algoritmo: 'Regresión logística',
    identificador: 'PoC RF-IA-02',
    dataset: 'notebooks/datos/dataset_prueba_poc_trazabilidad.csv',
    datasetDisponible: true,
    modeloExportado: true,
    registrosEntrenamiento: 150,
    registrosPrueba: 50,
    randomState: 42,
    metricasHistoricas: [
      { nombre: 'Accuracy regresión logística', resultado: 0.88, meta: 0.7 },
      { nombre: 'F1 macro regresión logística', resultado: 0.8782, meta: 0.65 },
      { nombre: 'Accuracy Random Forest', resultado: 0.86, meta: 0.7 },
      { nombre: 'F1 macro Random Forest', resultado: 0.8586, meta: 0.65 },
      { nombre: 'Accuracy Gradient Boosting', resultado: 0.84, meta: 0.7 },
      { nombre: 'F1 macro Gradient Boosting', resultado: 0.839, meta: 0.65 },
    ],
    decisionHistorica: 'GO',
    decisionIntegracion: 'GO CON CONDICIONES',
    limitaciones: [
      'Los 200 registros son de prueba. Cada etapa previa aparece con probabilidad 0,72 y el índice lleva ruido. No son lotes medidos en Chanchamayo.',
      'La etiqueta sale de un índice aditivo con umbral 2,15. Ese índice no entra al modelo, ni tampoco la etapa EXPORTACION.',
      'En este generador, la humedad ausente coincide con la falta de beneficio. Esas dos columnas repiten la misma información.',
      'La regresión logística quedó primera. El generador es aditivo, así que un modelo lineal tiene ventaja en este archivo.',
      'La decisión experimental es GO. La de integración sigue en GO CON CONDICIONES: el resultado no autoriza una exportación.',
      'TRAZA-002 queda junto al umbral: la etiqueta es Incompleta y la regresión logística responde Completa.',
    ],
  };
}
