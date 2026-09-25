import { describe, expect, it } from 'vitest';
import { AIServicePort } from '../../src/application/ports/output/OutputPorts';
import { AnalizarLote } from '../../src/application/usecases/AnalizarLote';
import { IniciarSesion } from '../../src/application/usecases/IniciarSesion';
import { ConsultarLote, RegistrarLote } from '../../src/application/usecases/LoteUseCases';
import { RegistrarParcela } from '../../src/application/usecases/ParcelaUseCases';
import { RegistrarUsuario } from '../../src/application/usecases/RegistrarUsuario';
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
    login: new IniciarSesion(usuarios, productores, hasher, tokens),
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
});
