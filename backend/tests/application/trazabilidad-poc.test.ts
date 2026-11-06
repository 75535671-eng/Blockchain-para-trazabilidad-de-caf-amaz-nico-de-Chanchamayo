import { describe, expect, it } from 'vitest';
import { PredictorTrazabilidadPrueba } from '../../src/adapters/out/prediccion/PredictorTrazabilidadPrueba';
import { entradaTrazabilidad } from '../../src/domain/services/inteligencia/EntradaTrazabilidad';
import { evaluacionTrazabilidadPoc } from '../../src/domain/services/inteligencia/EvaluacionTrazabilidadPoc';

describe('PoC RF-IA-02', () => {
  it('arma la entrada de TRAZA-002 y la regresión logística responde Completa', async () => {
    const entrada = entradaTrazabilidad([
      { etapa: 'BENEFICIO', fecha: '2026-01-01', humedadPorcentaje: 11.58 },
      { etapa: 'TRILLA', fecha: '2026-01-10', humedadPorcentaje: null },
      { etapa: 'ALMACENAMIENTO', fecha: '2026-01-18', humedadPorcentaje: null },
      { etapa: 'EXPORTACION', fecha: '2026-02-01', humedadPorcentaje: null },
    ]);
    expect(entrada).toEqual({
      tieneBeneficio: 1,
      tieneTrilla: 1,
      tieneAlmacenamiento: 1,
      tieneTraslado: 0,
      ordenCronologico: 1,
      humedadAusente: 0,
      humedadPorcentaje: 11.58,
      diasEntreExtremos: 17,
    });
    const prediccion = await new PredictorTrazabilidadPrueba().predecir(entrada!);
    expect(prediccion.resultado).toBe('Completa');
    expect(prediccion.referencia).toMatch(/RF-IA-02/);
  });

  it('pide un evento previo cuando solo hay exportación', () => {
    expect(entradaTrazabilidad([{ etapa: 'EXPORTACION', fecha: '2026-02-01', humedadPorcentaje: null }])).toBeNull();
  });

  it('deja la decisión experimental en GO y la integración condicionada', () => {
    const evaluacion = evaluacionTrazabilidadPoc();
    expect(evaluacion.identificador).toBe('PoC RF-IA-02');
    expect(evaluacion.decisionHistorica).toBe('GO');
    expect(evaluacion.decisionIntegracion).toBe('GO CON CONDICIONES');
    expect(evaluacion.estado).toBe('NO_CONCLUYENTE');
    expect(evaluacion.metricasHistoricas).toHaveLength(6);
  });
});
