import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AuthController, LoteController, ParcelaController, ProductorController } from '../../src/adapters/in/controllers/Controllers';
import { ExternalAIAdapter } from '../../src/adapters/out/ai/ExternalAIAdapter';
import { createApp } from '../../src/infrastructure/http/app';
import { AnalizarLote } from '../../src/application/usecases/AnalizarLote';
import { IniciarSesion } from '../../src/application/usecases/IniciarSesion';
import { ActualizarLote, ConsultarLote, EliminarLote, ListarLotes, RegistrarLote } from '../../src/application/usecases/LoteUseCases';
import { ActualizarParcela, EliminarParcela, ListarParcelas, RegistrarParcela } from '../../src/application/usecases/ParcelaUseCases';
import { ActualizarProductor, EliminarProductor, ListarProductores, RegistrarProductor } from '../../src/application/usecases/ProductorUseCases';
import { RegistrarUsuario } from '../../src/application/usecases/RegistrarUsuario';
import { EstrategiaConAltitud, EstrategiaSinAltitud, SelectorEstrategiaAnalisis } from '../../src/domain/services/analisis/EstrategiasAnalisis';
import {
  HasherFijo,
  Memoria,
  MemoriaAnalisis,
  MemoriaLotes,
  MemoriaParcelas,
  MemoriaProductores,
  MemoriaRegistro,
  MemoriaUsuarios,
  TokensFijos,
} from '../support/memoria';

function appDePrueba() {
  const memoria = new Memoria();
  const usuarios = new MemoriaUsuarios(memoria);
  const productores = new MemoriaProductores(memoria);
  const parcelas = new MemoriaParcelas(memoria);
  const lotes = new MemoriaLotes(memoria);
  const analisis = new MemoriaAnalisis(memoria);
  const tokens = new TokensFijos();
  const hasher = new HasherFijo();
  const ia = new ExternalAIAdapter(
    { baseUrl: 'http://ia.local/v1', apiKey: 'test-key', model: 'modelo', provider: 'mock' },
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    clasificacion: 'REVISAR',
                    resumen: 'La cantidad es alta para el área.',
                    observaciones: ['Conviene revisar el pesaje.'],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
  );
  const selector = new SelectorEstrategiaAnalisis(new EstrategiaConAltitud(), new EstrategiaSinAltitud());
  return createApp({
    corsOrigin: 'http://localhost:4200',
    tokens,
    auth: new AuthController(
      new RegistrarUsuario(usuarios, productores, new MemoriaRegistro(memoria), hasher),
      new IniciarSesion(usuarios, productores, hasher, tokens),
    ),
    productores: new ProductorController(
      new RegistrarProductor(productores),
      new ListarProductores(productores),
      new ActualizarProductor(productores),
      new EliminarProductor(productores),
    ),
    parcelas: new ParcelaController(
      new RegistrarParcela(parcelas, productores),
      new ListarParcelas(parcelas, productores),
      new ActualizarParcela(parcelas, productores),
      new EliminarParcela(parcelas, productores),
    ),
    lotes: new LoteController(
      new RegistrarLote(lotes, parcelas, productores),
      new ListarLotes(lotes, parcelas, productores),
      new ConsultarLote(lotes, parcelas, productores, analisis),
      new AnalizarLote(lotes, parcelas, productores, analisis, ia, selector),
      new ActualizarLote(lotes, parcelas, productores),
      new EliminarLote(lotes, parcelas, productores, analisis),
    ),
  });
}

describe('API REST', () => {
  it('recorre registro, autenticación, parcela, lote, consulta y análisis', async () => {
    const app = appDePrueba();
    const registro = await request(app).post('/api/auth/register').send({
      nombre: 'Luis Pérez',
      email: 'luis@example.com',
      password: 'Cafe1234',
      documento: '11223344',
    });
    expect(registro.status).toBe(201);
    const login = await request(app).post('/api/auth/login').send({ email: 'luis@example.com', password: 'Cafe1234' });
    expect(login.status).toBe(200);
    const token = login.body.token as string;
    const auth = { Authorization: `Bearer ${token}` };
    const productores = await request(app).get('/api/productores').set(auth);
    const parcela = await request(app).post('/api/parcelas').set(auth).send({
      productorId: productores.body[0].id,
      nombre: 'Parcela Alta',
      distrito: 'Chanchamayo',
      areaHectareas: 1.5,
      altitudMsnm: 1600,
    });
    expect(parcela.status).toBe(201);
    const duplicada = await request(app).post('/api/parcelas').set(auth).send({
      productorId: productores.body[0].id,
      nombre: 'Parcela Alta',
      distrito: 'San Ramón',
      areaHectareas: 1,
    });
    expect(duplicada.status).toBe(409);
    expect(duplicada.body.error).toBe('Ya existe una parcela con este nombre.');
    const listado = await request(app).get('/api/parcelas').set(auth);
    expect(listado.body.filter((item: { nombre: string }) => item.nombre === 'Parcela Alta')).toHaveLength(1);
    const lote = await request(app).post('/api/lotes').set(auth).send({
      parcelaId: parcela.body.id,
      fechaCosecha: '2026-05-20',
      cantidadKg: 900,
      variedad: 'Catimor',
    });
    expect(lote.status).toBe(201);
    expect(lote.body.codigo).toMatch(/^CHNY-/);
    const consulta = await request(app).get(`/api/lotes/${lote.body.id}`).set(auth);
    expect(consulta.body.lote.parcelaId).toBe(parcela.body.id);
    const analisis = await request(app).post(`/api/lotes/${lote.body.id}/analisis`).set(auth).send({});
    expect(analisis.status).toBe(201);
    expect(analisis.body.ultimoAnalisis.clasificacion).toBe('REVISAR');
    expect(analisis.body.ultimoAnalisis.proveedor).toBe('mock');
    const norte = await request(app).post('/api/parcelas').set(auth).send({
      productorId: productores.body[0].id,
      nombre: 'Parcela Norte',
      distrito: 'San Ramón',
      areaHectareas: 1.2,
    });
    expect(norte.status).toBe(201);
    const norteDuplicada = await request(app).post('/api/parcelas').set(auth).send({
      productorId: productores.body[0].id,
      nombre: 'Parcela Norte',
      distrito: 'La Merced',
      areaHectareas: 3,
    });
    expect(norteDuplicada.status).toBe(409);
    expect(norteDuplicada.body.error).toBe('Ya existe una parcela con este nombre.');
    const trasRechazo = await request(app).get('/api/parcelas').set(auth);
    expect(trasRechazo.body.filter((item: { nombre: string }) => item.nombre === 'Parcela Norte')).toHaveLength(1);
    const parcelaEditada = await request(app).put(`/api/parcelas/${parcela.body.id}`).set(auth).send({
      productorId: productores.body[0].id,
      nombre: 'Parcela Baja',
      distrito: 'San Ramón',
      areaHectareas: 2,
      altitudMsnm: 1200,
    });
    expect(parcelaEditada.status).toBe(200);
    expect(parcelaEditada.body.nombre).toBe('Parcela Baja');
    const loteEditado = await request(app).put(`/api/lotes/${lote.body.id}`).set(auth).send({
      parcelaId: parcela.body.id,
      fechaCosecha: '2026-06-01',
      cantidadKg: 450,
      variedad: 'Caturra',
    });
    expect(loteEditado.status).toBe(200);
    expect(loteEditado.body.codigo).toBe(lote.body.codigo);
    expect(loteEditado.body.variedad).toBe('Caturra');
    const bloqueada = await request(app).delete(`/api/parcelas/${parcela.body.id}`).set(auth);
    expect(bloqueada.status).toBe(409);
    expect(bloqueada.body.error).toBe('No se puede eliminar esta parcela porque tiene registros asociados.');
    const loteBorrado = await request(app).delete(`/api/lotes/${lote.body.id}`).set(auth);
    expect(loteBorrado.status).toBe(204);
    const lotesTrasBorrar = await request(app).get('/api/lotes').set(auth);
    expect(lotesTrasBorrar.body.some((item: { id: string }) => item.id === lote.body.id)).toBe(false);
    const consultaBorrada = await request(app).get(`/api/lotes/${lote.body.id}`).set(auth);
    expect(consultaBorrada.status).toBe(404);
    const libre = await request(app).post('/api/parcelas').set(auth).send({
      productorId: productores.body[0].id,
      nombre: 'Parcela Libre',
      distrito: 'San Ramón',
      areaHectareas: 1,
    });
    expect(libre.status).toBe(201);
    const borrada = await request(app).delete(`/api/parcelas/${libre.body.id}`).set(auth);
    expect(borrada.status).toBe(204);
    const trasBorrar = await request(app).get('/api/parcelas').set(auth);
    expect(trasBorrar.body.some((item: { id: string }) => item.id === libre.body.id)).toBe(false);
    const inexistente = await request(app).delete('/api/parcelas/00000000-0000-0000-0000-000000000000').set(auth);
    expect(inexistente.status).toBe(404);
  });
});
