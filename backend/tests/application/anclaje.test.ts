import { describe, expect, it } from 'vitest';
import { GENESIS_CADENA_PRUEBA, identificadorEslabon } from '../../src/adapters/out/anclaje/CadenaPruebaAnclaje';
import { hashEvento } from '../../src/application/services/hashIntegridad';
import { hoyIso } from '../../src/application/support/apoyo';
import { ListarEventos, RegistrarEvento } from '../../src/application/usecases/EventoUseCases';
import { VerificarIntegridadEvento } from '../../src/application/usecases/IntegridadEvento';
import { IniciarSesion } from '../../src/application/usecases/IniciarSesion';
import { RegistrarLote } from '../../src/application/usecases/LoteUseCases';
import { RegistrarParcela } from '../../src/application/usecases/ParcelaUseCases';
import { RegistrarUsuario } from '../../src/application/usecases/RegistrarUsuario';
import { contenidoCanonico } from '../../src/domain/services/integridad/ContenidoCanonico';
import { EventoTrazabilidad } from '../../src/domain/entities/EventoTrazabilidad';
import { Usuario } from '../../src/domain/entities/Usuario';
import { integridadDePrueba } from '../support/anclaje';
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
  const integridad = integridadDePrueba(memoria);
  const hasher = new HasherFijo();
  const tokens = new TokensFijos();
  return {
    memoria,
    eventosRepo: eventos,
    registrar: new RegistrarUsuario(usuarios, productores, new MemoriaRegistro(memoria), hasher),
    login: new IniciarSesion(usuarios, productores, new MemoriaSolicitudes(memoria), hasher, tokens),
    parcelas: new RegistrarParcela(parcelas, productores),
    lotes: new RegistrarLote(lotes, parcelas, productores),
    eventos: new RegistrarEvento(eventos, lotes, parcelas, productores, integridad.anclar),
    listarEventos: new ListarEventos(eventos, lotes, parcelas, productores, integridad.referencias),
    verificar: new VerificarIntegridadEvento(eventos, lotes, parcelas, productores, integridad.referencias, integridad.cadena),
  };
}

async function loteDe(app: ReturnType<typeof sistema>, nombre: string, email: string, documento: string) {
  const usuario = await app.registrar.ejecutar({ nombre, email, password: 'Cafe1234', documento });
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
  return { actor, lote };
}

describe('HU-08 y HU-09', () => {
  it('al registrar un evento calcula el hash, lo ancla y guarda la referencia', async () => {
    const app = sistema();
    const { actor, lote } = await loteDe(app, 'Ana Quispe', 'ana-anclaje@example.com', '12345678');
    const creado = await app.eventos.ejecutar({
      actor,
      loteId: lote.id,
      etapa: 'BENEFICIO',
      fecha: hoyIso(),
      descripcion: 'Beneficio lavado y secado hasta pergamino.',
      metodoBeneficio: 'Lavado',
      humedadPorcentaje: 11.5,
    });
    const guardado = app.memoria.eventos[0];
    const canonico = contenidoCanonico(guardado);
    expect(canonico).toContain(`lote=${lote.id}`);
    expect(canonico).toContain('etapa=BENEFICIO');
    expect(canonico).toContain('metodo=Lavado');
    expect(canonico).toContain('humedad=11.50');
    expect(canonico.split('\n').map((linea) => linea.split('=')[0])).toEqual([
      'lote',
      'etapa',
      'fecha',
      'descripcion',
      'metodo',
      'humedad',
    ]);
    expect(creado.anclaje?.hash).toBe(hashEvento(guardado));
    expect(creado.anclaje?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(creado.anclaje?.red).toBe('cadena-prueba');
    expect(creado.anclaje?.identificador).toBe(identificadorEslabon(GENESIS_CADENA_PRUEBA, creado.anclaje?.hash ?? ''));
    expect(app.memoria.anclajes).toHaveLength(1);
    expect(app.memoria.anclajes[0]).toMatchObject({
      eventoId: creado.id,
      hash: creado.anclaje?.hash,
      red: 'cadena-prueba',
      identificador: creado.anclaje?.identificador,
    });

    const traslado = await app.eventos.ejecutar({
      actor,
      loteId: lote.id,
      etapa: 'TRASLADO',
      fecha: hoyIso(),
      descripcion: 'Salida de la parcela hacia el almacén.',
    });
    expect(contenidoCanonico(app.memoria.eventos[1])).not.toContain('metodo=');
    expect(traslado.anclaje?.identificador).toBe(
      identificadorEslabon(creado.anclaje?.identificador ?? '', traslado.anclaje?.hash ?? ''),
    );
    const lista = await app.listarEventos.ejecutar({ actor, loteId: lote.id });
    expect(lista.map((evento) => evento.anclaje?.identificador).sort()).toEqual(
      [creado.anclaje?.identificador, traslado.anclaje?.identificador].sort(),
    );
  });

  it('verifica un evento anclado y muestra hash, red e identificador', async () => {
    const app = sistema();
    const { actor, lote } = await loteDe(app, 'Ana Quispe', 'ana-verificar@example.com', '12345678');
    const creado = await app.eventos.ejecutar({
      actor,
      loteId: lote.id,
      etapa: 'ALMACENAMIENTO',
      fecha: hoyIso(),
      descripcion: 'Pergamino en el almacén de la cooperativa.',
    });
    const verificacion = await app.verificar.ejecutar({ actor, eventoId: creado.id });
    expect(verificacion.estado).toBe('verificada');
    expect(verificacion.mensaje).toMatch(/coincide/);
    expect(verificacion.hash).toBe(creado.anclaje?.hash);
    expect(verificacion.red).toBe('cadena-prueba');
    expect(verificacion.identificador).toBe(creado.anclaje?.identificador);
  });

  it('la verificación falla si cambia la descripción', async () => {
    const app = sistema();
    const { actor, lote } = await loteDe(app, 'Ana Quispe', 'ana-alterado@example.com', '12345678');
    const creado = await app.eventos.ejecutar({
      actor,
      loteId: lote.id,
      etapa: 'TRASLADO',
      fecha: hoyIso(),
      descripcion: 'Salida de la parcela hacia el almacén.',
    });
    const guardado = app.memoria.eventos[0];
    app.memoria.eventos[0] = EventoTrazabilidad.reconstituir({
      id: guardado.id,
      loteId: guardado.loteId,
      etapa: guardado.etapa,
      fecha: guardado.fecha,
      descripcion: 'Descripción alterada después del anclaje.',
      variables: guardado.variables,
      createdAt: guardado.createdAt,
    });
    expect(hashEvento(app.memoria.eventos[0])).not.toBe(creado.anclaje?.hash);
    const verificacion = await app.verificar.ejecutar({ actor, eventoId: creado.id });
    expect(verificacion.estado).toBe('fallida');
    expect(verificacion.mensaje).toMatch(/no coincide/);
    expect(verificacion.hash).toBeNull();
    expect(verificacion.identificador).toBeNull();
  });

  it('un productor no verifica un lote ajeno y el administrador sí', async () => {
    const app = sistema();
    const propio = await loteDe(app, 'Ana Quispe', 'ana-acceso-anclaje@example.com', '12345678');
    const ajeno = await loteDe(app, 'Rosa Quispe', 'rosa-acceso-anclaje@example.com', '87654321');
    const creado = await app.eventos.ejecutar({
      actor: propio.actor,
      loteId: propio.lote.id,
      etapa: 'EXPORTACION',
      fecha: hoyIso(),
      descripcion: 'Lote embarcado desde el origen.',
    });
    await expect(app.verificar.ejecutar({ actor: ajeno.actor, eventoId: creado.id })).rejects.toThrow(/otro productor/);
    app.memoria.usuarios.push(
      Usuario.crear({
        id: 'admin-anclaje',
        nombre: 'Administrador',
        email: 'admin-anclaje@test.local',
        passwordHash: 'hash:no-importa',
        rol: 'ADMINISTRADOR',
      }),
    );
    const comoAdmin = await app.verificar.ejecutar({
      actor: { usuarioId: 'admin-anclaje', rol: 'ADMINISTRADOR' },
      eventoId: creado.id,
    });
    expect(comoAdmin.estado).toBe('verificada');
    expect(comoAdmin.identificador).toBe(creado.anclaje?.identificador);
  });

  it('un evento sin anclaje informa que todavía no está anclado', async () => {
    const app = sistema();
    const { actor, lote } = await loteDe(app, 'Ana Quispe', 'ana-sin-anclaje@example.com', '12345678');
    const evento = EventoTrazabilidad.crear({
      id: 'evento-sin-anclaje',
      loteId: lote.id,
      etapa: 'TRILLA',
      fecha: hoyIso(),
      fechaCosecha: lote.fechaCosecha,
      hoyIso: hoyIso(),
      descripcion: 'Trilla registrada antes de anclar.',
    });
    await app.eventosRepo.guardar(evento);
    const verificacion = await app.verificar.ejecutar({ actor, eventoId: evento.id });
    expect(verificacion.estado).toBe('sin_anclaje');
    expect(verificacion.mensaje).toBe('El evento todavía no está anclado.');
    expect(verificacion.hash).toBeNull();
    expect(verificacion.red).toBeNull();
    expect(app.memoria.anclajes).toHaveLength(0);
  });
});
