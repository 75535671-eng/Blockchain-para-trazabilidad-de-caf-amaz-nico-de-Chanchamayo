import { describe, expect, it } from 'vitest';
import { AIServicePort } from '../../src/application/ports/output/OutputPorts';
import { AnalizarLote } from '../../src/application/usecases/AnalizarLote';
import { IniciarSesion } from '../../src/application/usecases/IniciarSesion';
import { ConsultarLote, RegistrarLote } from '../../src/application/usecases/LoteUseCases';
import { RegistrarParcela } from '../../src/application/usecases/ParcelaUseCases';
import { EliminarProductor } from '../../src/application/usecases/ProductorUseCases';
import { RegistrarUsuario } from '../../src/application/usecases/RegistrarUsuario';
import { Usuario } from '../../src/domain/entities/Usuario';
import { SolicitudAnalisis } from '../../src/domain/services/analisis/AnalisisLoteModelo';
import { EstrategiaConAltitud, EstrategiaSinAltitud, SelectorEstrategiaAnalisis } from '../../src/domain/services/analisis/EstrategiasAnalisis';
import {
  HasherFijo,
  Memoria,
  MemoriaAnalisis,
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
  const analisis = new MemoriaAnalisis(memoria);
  const hasher = new HasherFijo();
  const tokens = new TokensFijos();
  return {
    memoria,
    registrar: new RegistrarUsuario(usuarios, productores, new MemoriaRegistro(memoria), hasher),
    login: new IniciarSesion(usuarios, productores, new MemoriaSolicitudes(memoria), hasher, tokens),
    parcelas: new RegistrarParcela(parcelas, productores),
    lotes: new RegistrarLote(lotes, parcelas, productores),
    consultar: new ConsultarLote(lotes, parcelas, productores, analisis),
    analizar: (ia: AIServicePort) =>
      new AnalizarLote(
        lotes,
        parcelas,
        productores,
        analisis,
        ia,
        new SelectorEstrategiaAnalisis(new EstrategiaConAltitud(), new EstrategiaSinAltitud()),
      ),
  };
}

describe('casos de uso del PMV1', () => {
  it('registra usuario, parcela y lote relacionado', async () => {
    const app = sistema();
    const usuario = await app.registrar.ejecutar({
      nombre: 'Ana Quispe',
      email: 'ana@example.com',
      password: 'Cafe1234',
      documento: '12345678',
    });
    const sesion = await app.login.ejecutar({ email: 'ana@example.com', password: 'Cafe1234' });
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
    const consulta = await app.consultar.ejecutar({ actor, loteId: lote.id });
    expect(lote.codigo).toMatch(/^CHNY-2026-/);
    expect(consulta.lote.parcelaId).toBe(parcela.id);
    expect(consulta.productor.documento).toBe('12345678');
    expect(consulta.ultimoAnalisis).toBeNull();
  });

  it('no persiste un análisis si la IA responde con un formato inválido', async () => {
    const app = sistema();
    const usuario = await app.registrar.ejecutar({
      nombre: 'Ana Quispe',
      email: 'ana2@example.com',
      password: 'Cafe1234',
      documento: '87654321',
    });
    const sesion = await app.login.ejecutar({ email: 'ana2@example.com', password: 'Cafe1234' });
    const actor = { usuarioId: usuario.id, rol: usuario.rol };
    const parcela = await app.parcelas.ejecutar({
      actor,
      productorId: sesion.productorId ?? '',
      nombre: 'Parcela Sur',
      distrito: 'Pichanaqui',
      areaHectareas: 1,
    });
    const lote = await app.lotes.ejecutar({
      actor,
      parcelaId: parcela.id,
      fechaCosecha: '2026-07-01',
      cantidadKg: 80,
      variedad: 'Typica',
    });
    const ia: AIServicePort = {
      async completar(_solicitud: SolicitudAnalisis) {
        return { clasificacion: 'DUDOSO', resumen: 'no vale', observaciones: [], proveedor: 'mock' };
      },
    };
    await expect(app.analizar(ia).ejecutar({ actor, loteId: lote.id })).rejects.toThrow(/clasificación/);
    expect(app.memoria.analisis).toHaveLength(0);
  });

  it('al eliminar un productor conserva el otro y solo audita identificadores', async () => {
    const app = sistema();
    const ana = await app.registrar.ejecutar({
      nombre: 'Ana Quispe',
      email: 'ana3@example.com',
      password: 'Cafe1234',
      documento: '12345678',
    });
    const sesion = await app.login.ejecutar({ email: 'ana3@example.com', password: 'Cafe1234' });
    const actor = { usuarioId: ana.id, rol: ana.rol };
    const parcela = await app.parcelas.ejecutar({
      actor,
      productorId: sesion.productorId ?? '',
      nombre: 'Parcela Norte',
      distrito: 'San Ramón',
      areaHectareas: 2,
      altitudMsnm: 1450,
    });
    await app.lotes.ejecutar({
      actor,
      parcelaId: parcela.id,
      fechaCosecha: '2026-06-10',
      cantidadKg: 300,
      variedad: 'Caturra',
    });
    const otra = await app.registrar.ejecutar({
      nombre: 'Rosa Quispe',
      email: 'rosa3@example.com',
      password: 'Cafe1234',
      documento: '87654321',
    });
    const sesionOtra = await app.login.ejecutar({ email: 'rosa3@example.com', password: 'Cafe1234' });
    const parcelaOtra = await app.parcelas.ejecutar({
      actor: { usuarioId: otra.id, rol: otra.rol },
      productorId: sesionOtra.productorId ?? '',
      nombre: 'Parcela Sur',
      distrito: 'Vitoc',
      areaHectareas: 1,
    });
    app.memoria.usuarios.push(
      Usuario.crear({
        id: 'admin-1',
        nombre: 'Administrador',
        email: 'admin@test.local',
        passwordHash: 'hash:no-importa',
        rol: 'ADMINISTRADOR',
      }),
    );
    const eliminar = new EliminarProductor(new MemoriaProductores(app.memoria));
    await expect(eliminar.ejecutar({ actor, productorId: sesion.productorId ?? '' })).rejects.toThrow(/administrador/);
    expect(app.memoria.parcelas).toHaveLength(2);
    await expect(eliminar.ejecutar({ actor: { usuarioId: 'admin-1', rol: 'ADMINISTRADOR' }, productorId: 'no-existe' })).rejects.toThrow(/no existe/);
    expect(app.memoria.auditoria).toHaveLength(0);
    await eliminar.ejecutar({ actor: { usuarioId: 'admin-1', rol: 'ADMINISTRADOR' }, productorId: sesion.productorId ?? '' });
    expect(app.memoria.productores.map((productor) => productor.id)).toEqual([sesionOtra.productorId]);
    expect(app.memoria.parcelas.map((item) => item.id)).toEqual([parcelaOtra.id]);
    expect(app.memoria.lotes).toHaveLength(0);
    expect(app.memoria.usuarios.some((usuario) => usuario.id === ana.id)).toBe(false);
    expect(app.memoria.usuarios.some((usuario) => usuario.id === otra.id)).toBe(true);
    expect(app.memoria.auditoria).toEqual([
      expect.objectContaining({ administradorId: 'admin-1', productorId: sesion.productorId }),
    ]);
    expect(JSON.stringify(app.memoria.auditoria)).not.toMatch(/Cafe1234|password|Ana Quispe|12345678/);
    await expect(app.login.ejecutar({ email: 'ana3@example.com', password: 'Cafe1234' })).rejects.toThrow(/no son válidos/);
  });
});
