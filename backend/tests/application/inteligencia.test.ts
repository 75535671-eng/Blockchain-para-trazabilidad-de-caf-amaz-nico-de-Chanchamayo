import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { PredictorCalidadNoIntegrado } from '../../src/adapters/out/prediccion/PredictorCalidadNoIntegrado';
import { PredictorCalidadPrueba } from '../../src/adapters/out/prediccion/PredictorCalidadPrueba';
import { hoyIso } from '../../src/application/support/apoyo';
import { ListarEventos, RegistrarEvento } from '../../src/application/usecases/EventoUseCases';
import { ConsultarEvaluacionModelo } from '../../src/application/usecases/ConsultarEvaluacionModelo';
import { IniciarSesion } from '../../src/application/usecases/IniciarSesion';
import { RegistrarLote } from '../../src/application/usecases/LoteUseCases';
import { RegistrarParcela } from '../../src/application/usecases/ParcelaUseCases';
import { PredecirCalidad } from '../../src/application/usecases/PredecirCalidad';
import { RegistrarUsuario } from '../../src/application/usecases/RegistrarUsuario';
import { PredictorCalidadPort } from '../../src/application/ports/output/OutputPorts';
import { integridadDePrueba } from '../support/anclaje';
import {
  HasherFijo,
  Memoria,
  MemoriaEventos,
  MemoriaLotes,
  MemoriaParcelas,
  MemoriaPredicciones,
  MemoriaProductores,
  MemoriaRegistro,
  MemoriaSolicitudes,
  MemoriaUsuarios,
  TokensFijos,
} from '../support/memoria';

function sistema(predictor: PredictorCalidadPort = new PredictorCalidadNoIntegrado()) {
  const memoria = new Memoria();
  const usuarios = new MemoriaUsuarios(memoria);
  const productores = new MemoriaProductores(memoria);
  const parcelas = new MemoriaParcelas(memoria);
  const lotes = new MemoriaLotes(memoria);
  const eventos = new MemoriaEventos(memoria);
  const predicciones = new MemoriaPredicciones(memoria);
  const integridad = integridadDePrueba(memoria);
  const hasher = new HasherFijo();
  const tokens = new TokensFijos();
  return {
    memoria,
    registrar: new RegistrarUsuario(usuarios, productores, new MemoriaRegistro(memoria), hasher),
    login: new IniciarSesion(usuarios, productores, new MemoriaSolicitudes(memoria), hasher, tokens),
    parcelas: new RegistrarParcela(parcelas, productores),
    lotes: new RegistrarLote(lotes, parcelas, productores),
    eventos: new RegistrarEvento(eventos, lotes, parcelas, productores, integridad.anclar),
    listarEventos: new ListarEventos(eventos, lotes, parcelas, productores, integridad.referencias),
    predecir: new PredecirCalidad(lotes, parcelas, productores, eventos, predicciones, predictor),
  };
}

async function loteConBeneficio(app: ReturnType<typeof sistema>, altitud: number | null) {
  const usuario = await app.registrar.ejecutar({
    nombre: 'Ana Quispe',
    email: 'ana-ia@example.com',
    password: 'Cafe1234',
    documento: '12345678',
  });
  const sesion = await app.login.ejecutar({ email: 'ana-ia@example.com', password: 'Cafe1234' });
  const actor = { usuarioId: usuario.id, rol: usuario.rol };
  const parcela = await app.parcelas.ejecutar({
    actor,
    productorId: sesion.productorId ?? '',
    nombre: 'Parcela Norte',
    distrito: 'San Ramón',
    areaHectareas: 2,
    altitudMsnm: altitud,
  });
  const lote = await app.lotes.ejecutar({
    actor,
    parcelaId: parcela.id,
    fechaCosecha: '2026-06-10',
    cantidadKg: 120,
    variedad: 'Caturra',
  });
  await app.eventos.ejecutar({
    actor,
    loteId: lote.id,
    etapa: 'BENEFICIO',
    fecha: '2026-06-10',
    descripcion: 'Beneficio lavado.',
    metodoBeneficio: 'Lavado',
    humedadPorcentaje: 11,
  });
  await app.eventos.ejecutar({
    actor,
    loteId: lote.id,
    etapa: 'EXPORTACION',
    fecha: hoyIso(),
    descripcion: 'Salida del origen.',
  });
  return { actor, lote };
}

describe('HU-007, HU-010 y HU-011', () => {
  it('ordena el historial por fecha y deja la exportación después del beneficio', async () => {
    const app = sistema();
    const { actor, lote } = await loteConBeneficio(app, 1400);
    const historial = await app.listarEventos.ejecutar({ actor, loteId: lote.id });
    expect(historial.map((evento) => evento.etapa)).toEqual(['BENEFICIO', 'EXPORTACION']);
    expect(historial[0].variables?.humedadPorcentaje).toBe(11);
    expect(historial[1].variables).toBeNull();
  });

  it('no guarda una predicción si faltan datos o si el modelo no está integrado', async () => {
    const incompleto = sistema();
    const sinAltitud = await loteConBeneficio(incompleto, null);
    const falta = await incompleto.predecir.ejecutar({ actor: sinAltitud.actor, loteId: sinAltitud.lote.id });
    expect(falta.estado).toBe('datos_insuficientes');
    expect(falta.prediccion).toBeNull();
    expect(incompleto.memoria.predicciones).toHaveLength(0);

    const completo = sistema();
    const listo = await loteConBeneficio(completo, 1450);
    const bloqueado = await completo.predecir.ejecutar({ actor: listo.actor, loteId: listo.lote.id });
    expect(bloqueado.estado).toBe('no_disponible');
    expect(bloqueado.mensaje).toMatch(/modelo de calidad validado/);
    expect(bloqueado.variables.metodoBeneficio).toBe('Lavado');
    expect(completo.memoria.predicciones).toHaveLength(0);
  });

  it('guarda la predicción solo cuando el puerto devuelve un resultado válido', async () => {
    const predictor: PredictorCalidadPort = {
      async predecir() {
        return {
          estado: 'disponible',
          calidad: 'Especial',
          modelo: 'doble-de-prueba',
          referencia: 'Respuesta fija del puerto de prueba.',
        };
      },
    };
    const app = sistema(predictor);
    const { actor, lote } = await loteConBeneficio(app, 1500);
    const resultado = await app.predecir.ejecutar({ actor, loteId: lote.id });
    expect(resultado.estado).toBe('disponible');
    expect(resultado.prediccion?.modelo).toBe('doble-de-prueba');
    expect(app.memoria.predicciones).toHaveLength(1);
  });

  it('presenta la PoC como evaluación no concluyente y separada del adaptador de coherencia', async () => {
    const evaluacion = await new ConsultarEvaluacionModelo().ejecutar();
    expect(evaluacion.estado).toBe('NO_CONCLUYENTE');
    expect(evaluacion.metricasHistoricas).toHaveLength(6);
    expect(evaluacion.decisionHistorica).toBe('GO CON CONDICIONES');
    expect(evaluacion.datasetDisponible).toBe(true);
    expect(JSON.stringify(evaluacion)).not.toMatch(/hash_blockchain/i);
    const predictor = readFileSync(join(__dirname, '../../src/adapters/out/prediccion/PredictorCalidadNoIntegrado.ts'), 'utf8');
    const caso = readFileSync(join(__dirname, '../../src/application/usecases/PredecirCalidad.ts'), 'utf8');
    expect(predictor).not.toMatch(/ExternalAIAdapter|AnalizarLote/);
    expect(caso).not.toMatch(/ExternalAIAdapter|AnalizarLote/);
    const integrado = readFileSync(join(__dirname, '../../src/adapters/out/prediccion/PredictorCalidadPrueba.ts'), 'utf8');
    expect(integrado).not.toMatch(/ExternalAIAdapter|AnalizarLote/);
  });

  it('devuelve categoría y puntaje con el modelo exportado de la prueba', async () => {
    const predictor = new PredictorCalidadPrueba();
    const alto = await predictor.predecir({
      loteId: 'lote-prueba',
      variedad: 'Typica',
      altitudMsnm: 1600,
      metodoBeneficio: 'Lavado',
      humedadPorcentaje: 11,
    });
    expect(alto.estado).toBe('disponible');
    if (alto.estado === 'disponible') {
      expect(alto.calidad).toBe('Especial');
      expect(alto.referencia).toContain('86.79');
      expect(alto.modelo).toBe('Regresión logística de prueba');
    }
    const bajo = await predictor.predecir({
      loteId: 'lote-prueba',
      variedad: 'Pache',
      altitudMsnm: 1000,
      metodoBeneficio: 'Natural',
      humedadPorcentaje: 12.5,
    });
    expect(bajo.estado).toBe('disponible');
    if (bajo.estado === 'disponible') {
      expect(bajo.calidad).toBe('Comercial');
      expect(bajo.referencia).toContain('75.71');
    }
  });
});
