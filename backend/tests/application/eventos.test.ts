import { describe, expect, it } from 'vitest';
import { hoyIso } from '../../src/application/support/apoyo';
import { ListarEventos, RegistrarEvento } from '../../src/application/usecases/EventoUseCases';
import { EliminarLote, RegistrarLote } from '../../src/application/usecases/LoteUseCases';
import { RegistrarParcela } from '../../src/application/usecases/ParcelaUseCases';
import { EliminarProductor } from '../../src/application/usecases/ProductorUseCases';
import { RegistrarUsuario } from '../../src/application/usecases/RegistrarUsuario';
import { AnalisisLote } from '../../src/domain/entities/AnalisisLote';
import { Usuario } from '../../src/domain/entities/Usuario';
import { IniciarSesion } from '../../src/application/usecases/IniciarSesion';
import {
  HasherFijo,
  Memoria,
  MemoriaEventos,
  MemoriaLotes,
  MemoriaParcelas,
  MemoriaProductores,
  MemoriaRegistro,
  MemoriaSolicitudes,
  MemoriaUsuarios,
  TokensFijos,
} from '../support/memoria';

function sistema() {
  const memoria = new Memoria();
  const usuarios = new MemoriaUsuarios(memoria);
  const productores = new MemoriaProductores(memoria);
  const parcelas = new MemoriaParcelas(memoria);
  const lotes = new MemoriaLotes(memoria);
  const eventos = new MemoriaEventos(memoria);
  const hasher = new HasherFijo();
  const tokens = new TokensFijos();
  return {
    memoria,
    registrar: new RegistrarUsuario(usuarios, productores, new MemoriaRegistro(memoria), hasher),
    login: new IniciarSesion(usuarios, productores, new MemoriaSolicitudes(memoria), hasher, tokens),
    parcelas: new RegistrarParcela(parcelas, productores),
    lotes: new RegistrarLote(lotes, parcelas, productores),
    eventos: new RegistrarEvento(eventos, lotes, parcelas, productores),
    listarEventos: new ListarEventos(eventos, lotes, parcelas, productores),
    eliminarLote: new EliminarLote(lotes, parcelas, productores),
    eliminarProductor: new EliminarProductor(productores),
  };
}

async function loteDe(app: ReturnType<typeof sistema>, nombre: string, email: string, documento: string) {
  const usuario = await app.registrar.ejecutar({
    nombre,
    email,
    password: 'Cafe1234',
    documento,
  });
  const sesion = await app.login.ejecutar({ email, password: 'Cafe1234' });
  const actor = { usuarioId: usuario.id, rol: usuario.rol };
  const parcela = await app.parcelas.ejecutar({
    actor,
    productorId: sesion.productorId ?? '',
    nombre: 'Parcela Norte',
    distrito: 'San Ramón',
    areaHectareas: 2,
    altitudMsnm: 1450,
  });
  const lote = await app.lotes.ejecutar({
    actor,
    parcelaId: parcela.id,
    fechaCosecha: '2026-06-10',
    cantidadKg: 300,
    variedad: 'Caturra',
  });
  return { actor, lote, productorId: sesion.productorId ?? '' };
}

describe('HU-008 y HU-009', () => {
  it('guarda el beneficio y sus variables juntos y permite consultarlos', async () => {
    const app = sistema();
    const { actor, lote } = await loteDe(app, 'Ana Quispe', 'ana-evento@example.com', '12345678');
    const creado = await app.eventos.ejecutar({
      actor,
      loteId: lote.id,
      etapa: 'BENEFICIO',
      fecha: hoyIso(),
      descripcion: 'Beneficio lavado y secado hasta pergamino.',
      metodoBeneficio: 'Lavado',
      humedadPorcentaje: 11.5,
    });
    expect(creado.variables?.metodoBeneficio).toBe('Lavado');
    expect(creado.variables?.humedadPorcentaje).toBe(11.5);
    expect(app.memoria.eventos).toHaveLength(1);
    const lista = await app.listarEventos.ejecutar({ actor, loteId: lote.id });
    expect(lista.map((evento) => evento.id)).toEqual([creado.id]);
    const traslado = await app.eventos.ejecutar({
      actor,
      loteId: lote.id,
      etapa: 'TRASLADO',
      fecha: hoyIso(),
      descripcion: 'Salida de la parcela hacia el almacén.',
    });
    expect(traslado.variables).toBeNull();
    const orden = await app.listarEventos.ejecutar({ actor, loteId: lote.id });
    expect(orden).toHaveLength(2);
  });

  it('no guarda el evento cuando la variable o la etapa no cumplen', async () => {
    const app = sistema();
    const { actor, lote } = await loteDe(app, 'Rosa Quispe', 'rosa-evento@example.com', '87654321');
    await expect(
      app.eventos.ejecutar({
        actor,
        loteId: lote.id,
        etapa: 'BENEFICIO',
        fecha: hoyIso(),
        descripcion: 'Beneficio sin humedad.',
        metodoBeneficio: 'Natural',
      }),
    ).rejects.toThrow(/humedad/);
    await expect(
      app.eventos.ejecutar({
        actor,
        loteId: lote.id,
        etapa: 'TRASLADO',
        fecha: hoyIso(),
        descripcion: 'Traslado con una variable que no corresponde.',
        humedadPorcentaje: 12,
      }),
    ).rejects.toThrow(/no registra variables/);
    await expect(
      app.eventos.ejecutar({
        actor,
        loteId: lote.id,
        etapa: 'TRILLA',
        fecha: '2026-01-01',
        descripcion: 'Trilla anterior a la cosecha.',
      }),
    ).rejects.toThrow(/anterior a la cosecha/);
    expect(app.memoria.eventos).toHaveLength(0);
  });

  it('impide a un productor registrar eventos en el lote de otro', async () => {
    const app = sistema();
    const propio = await loteDe(app, 'Ana Quispe', 'ana-acceso@example.com', '12345678');
    const ajeno = await loteDe(app, 'Rosa Quispe', 'rosa-acceso@example.com', '87654321');
    await expect(
      app.eventos.ejecutar({
        actor: ajeno.actor,
        loteId: propio.lote.id,
        etapa: 'TRASLADO',
        fecha: hoyIso(),
        descripcion: 'Intento sobre un lote ajeno.',
      }),
    ).rejects.toThrow(/otro productor/);
    expect(app.memoria.eventos).toHaveLength(0);
  });

  it('al eliminar el lote desaparecen juntos sus eventos, variables y análisis', async () => {
    const app = sistema();
    const { actor, lote } = await loteDe(app, 'Ana Quispe', 'ana-borrar@example.com', '12345678');
    await app.eventos.ejecutar({
      actor,
      loteId: lote.id,
      etapa: 'BENEFICIO',
      fecha: hoyIso(),
      descripcion: 'Beneficio que debe borrarse con el lote.',
      metodoBeneficio: 'Honey',
      humedadPorcentaje: 10,
    });
    app.memoria.analisis.push(
      AnalisisLote.crear({
        id: 'analisis-1',
        loteId: lote.id,
        estrategia: 'CON_ALTITUD',
        clasificacion: 'COHERENTE',
        resumen: 'El registro se sostiene.',
        observaciones: [],
        confianza: 'MEDIA',
        proveedor: 'mock',
      }),
    );
    await app.eliminarLote.ejecutar({ actor, loteId: lote.id });
    expect(app.memoria.lotes).toHaveLength(0);
    expect(app.memoria.eventos).toHaveLength(0);
    expect(app.memoria.analisis).toHaveLength(0);
  });

  it('al eliminar un productor conserva los eventos del otro', async () => {
    const memoria = new Memoria();
    const usuarios = new MemoriaUsuarios(memoria);
    const productores = new MemoriaProductores(memoria);
    const parcelas = new MemoriaParcelas(memoria);
    const lotes = new MemoriaLotes(memoria);
    const eventos = new MemoriaEventos(memoria);
    const hasher = new HasherFijo();
    const tokens = new TokensFijos();
    const registrar = new RegistrarUsuario(usuarios, productores, new MemoriaRegistro(memoria), hasher);
    const login = new IniciarSesion(usuarios, productores, new MemoriaSolicitudes(memoria), hasher, tokens);
    const registrarParcela = new RegistrarParcela(parcelas, productores);
    const registrarLote = new RegistrarLote(lotes, parcelas, productores);
    const registrarEvento = new RegistrarEvento(eventos, lotes, parcelas, productores);
    const ana = await registrar.ejecutar({
      nombre: 'Ana Quispe',
      email: 'ana-prod@example.com',
      password: 'Cafe1234',
      documento: '12345678',
    });
    const sesionAna = await login.ejecutar({ email: 'ana-prod@example.com', password: 'Cafe1234' });
    const actorAna = { usuarioId: ana.id, rol: ana.rol };
    const parcelaAna = await registrarParcela.ejecutar({
      actor: actorAna,
      productorId: sesionAna.productorId ?? '',
      nombre: 'Parcela Norte',
      distrito: 'San Ramón',
      areaHectareas: 1,
    });
    const loteAna = await registrarLote.ejecutar({
      actor: actorAna,
      parcelaId: parcelaAna.id,
      fechaCosecha: '2026-06-10',
      cantidadKg: 80,
      variedad: 'Typica',
    });
    await registrarEvento.ejecutar({
      actor: actorAna,
      loteId: loteAna.id,
      etapa: 'ALMACENAMIENTO',
      fecha: hoyIso(),
      descripcion: 'Pergamino en el almacén de la cooperativa.',
    });
    const rosa = await registrar.ejecutar({
      nombre: 'Rosa Quispe',
      email: 'rosa-prod@example.com',
      password: 'Cafe1234',
      documento: '87654321',
    });
    const sesionRosa = await login.ejecutar({ email: 'rosa-prod@example.com', password: 'Cafe1234' });
    const actorRosa = { usuarioId: rosa.id, rol: rosa.rol };
    const parcelaRosa = await registrarParcela.ejecutar({
      actor: actorRosa,
      productorId: sesionRosa.productorId ?? '',
      nombre: 'Parcela Sur',
      distrito: 'Vitoc',
      areaHectareas: 1,
    });
    const loteRosa = await registrarLote.ejecutar({
      actor: actorRosa,
      parcelaId: parcelaRosa.id,
      fechaCosecha: '2026-06-10',
      cantidadKg: 40,
      variedad: 'Pache',
    });
    const eventoRosa = await registrarEvento.ejecutar({
      actor: actorRosa,
      loteId: loteRosa.id,
      etapa: 'EXPORTACION',
      fecha: hoyIso(),
      descripcion: 'Lote embarcado desde el origen.',
    });
    memoria.usuarios.push(
      Usuario.crear({
        id: 'admin-1',
        nombre: 'Administrador',
        email: 'admin@test.local',
        passwordHash: 'hash:no-importa',
        rol: 'ADMINISTRADOR',
      }),
    );
    await new EliminarProductor(productores).ejecutar({
      actor: { usuarioId: 'admin-1', rol: 'ADMINISTRADOR' },
      productorId: sesionAna.productorId ?? '',
    });
    expect(memoria.eventos.map((evento) => evento.id)).toEqual([eventoRosa.id]);
    expect(memoria.lotes.map((lote) => lote.id)).toEqual([loteRosa.id]);
  });
});
