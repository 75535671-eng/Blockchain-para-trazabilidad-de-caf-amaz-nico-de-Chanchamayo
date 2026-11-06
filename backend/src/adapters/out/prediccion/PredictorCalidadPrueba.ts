import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EntradaPrediccionCalidad, PredictorCalidadPort, ResultadoPredictorCalidad } from '../../../application/ports/output/OutputPorts';

interface ModeloPrueba {
  media: number[];
  escala: number[];
  variedades: string[];
  metodos: string[];
  clases: string[];
  coef_clase: number[][];
  intercepto_clase: number[];
  media_puntaje: number[];
  escala_puntaje: number[];
  variedades_puntaje: string[];
  metodos_puntaje: string[];
  coef_puntaje: number[];
  intercepto_puntaje: number;
}

function cargarModelo(): ModeloPrueba {
  const candidatos = [
    join(__dirname, 'modelo-prueba.json'),
    join(__dirname, '../../../../src/adapters/out/prediccion/modelo-prueba.json'),
  ];
  for (const ruta of candidatos) {
    if (!existsSync(ruta)) {
      continue;
    }
    return JSON.parse(readFileSync(ruta, 'utf8')) as ModeloPrueba;
  }
  throw new Error('No se encontró modelo-prueba.json.');
}

const modelo = cargarModelo();

/**
 * Coeficientes de la regresión logística y de la regresión lineal
 * entrenadas en notebooks/poc_calidad_prueba.py (semilla 42, 150/50).
 * El archivo modelo-prueba.json es esa exportación. No certifica la taza.
 */
export class PredictorCalidadPrueba implements PredictorCalidadPort {
  async predecir(entrada: EntradaPrediccionCalidad): Promise<ResultadoPredictorCalidad> {
    const clase = vector(entrada, modelo.media, modelo.escala, modelo.variedades, modelo.metodos);
    const puntaje = vector(entrada, modelo.media_puntaje, modelo.escala_puntaje, modelo.variedades_puntaje, modelo.metodos_puntaje);
    if (!clase || !puntaje) {
      return {
        estado: 'no_disponible',
        motivo: 'No puede realizarse la predicción. La variedad o el método de beneficio no están en el modelo de prueba.',
      };
    }
    const scores = modelo.coef_clase.map((coeficientes, indice) => producto(coeficientes, clase) + modelo.intercepto_clase[indice]);
    const ganadora = scores.indexOf(Math.max(...scores));
    const estimado = producto(modelo.coef_puntaje, puntaje) + modelo.intercepto_puntaje;
    return {
      estado: 'disponible',
      calidad: modelo.clases[ganadora],
      modelo: 'Regresión logística de prueba',
      referencia: `Puntaje estimado: ${estimado.toFixed(2)}. Caso de uso 2 del PMV2, entrenado con 150 registros de prueba y evaluado con 50. No certifica la calidad en taza.`,
    };
  }
}

function vector(
  entrada: EntradaPrediccionCalidad,
  media: number[],
  escala: number[],
  variedades: string[],
  metodos: string[],
): number[] | null {
  if (!variedades.includes(entrada.variedad) || !metodos.includes(entrada.metodoBeneficio)) {
    return null;
  }
  return [
    (entrada.altitudMsnm - media[0]) / escala[0],
    (entrada.humedadPorcentaje - media[1]) / escala[1],
    ...variedades.map((valor) => (valor === entrada.variedad ? 1 : 0)),
    ...metodos.map((valor) => (valor === entrada.metodoBeneficio ? 1 : 0)),
  ];
}

function producto(coeficientes: number[], valores: number[]): number {
  return coeficientes.reduce((total, coeficiente, indice) => total + coeficiente * valores[indice], 0);
}
