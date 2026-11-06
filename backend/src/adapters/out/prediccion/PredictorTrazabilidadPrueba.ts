import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EntradaPredictorTrazabilidad, PredictorTrazabilidadPort, ResultadoPredictorTrazabilidad } from '../../../application/ports/output/OutputPorts';

interface ModeloTrazabilidad {
  media: number[];
  escala: number[];
  clases: string[];
  coeficientes: number[][];
  intercepto: number[];
}

function cargarModelo(): ModeloTrazabilidad {
  const candidatos = [
    join(__dirname, 'modelo-trazabilidad.json'),
    join(__dirname, '../../../../src/adapters/out/prediccion/modelo-trazabilidad.json'),
  ];
  for (const ruta of candidatos) {
    if (!existsSync(ruta)) {
      continue;
    }
    return JSON.parse(readFileSync(ruta, 'utf8')) as ModeloTrazabilidad;
  }
  throw new Error('No se encontró modelo-trazabilidad.json.');
}

const modelo = cargarModelo();

/** Coeficientes de la PoC RF-IA-02. No autoriza la exportación del lote. */
export class PredictorTrazabilidadPrueba implements PredictorTrazabilidadPort {
  async predecir(entrada: EntradaPredictorTrazabilidad): Promise<ResultadoPredictorTrazabilidad> {
    const valores = [
      entrada.tieneBeneficio,
      entrada.tieneTrilla,
      entrada.tieneAlmacenamiento,
      entrada.tieneTraslado,
      entrada.ordenCronologico,
      entrada.humedadAusente,
      entrada.humedadPorcentaje,
      entrada.diasEntreExtremos,
    ];
    const escalado = valores.map((valor, indice) => (valor - modelo.media[indice]) / modelo.escala[indice]);
    const score = producto(modelo.coeficientes[0], escalado) + modelo.intercepto[0];
    const resultado = score > 0 ? modelo.clases[1] : modelo.clases[0];
    return {
      resultado,
      modelo: 'Regresión logística de prueba',
      referencia: 'Caso de uso 2 del PMV2. PoC RF-IA-02, entrenada con 150 registros de prueba y evaluada con 50. No autoriza la exportación.',
    };
  }
}

function producto(coeficientes: number[], valores: number[]): number {
  return coeficientes.reduce((total, coeficiente, indice) => total + coeficiente * valores[indice], 0);
}
