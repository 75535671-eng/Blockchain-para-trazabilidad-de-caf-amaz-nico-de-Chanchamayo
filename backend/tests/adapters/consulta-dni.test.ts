import { describe, expect, it } from 'vitest';
import { ConsultaDniAdapter } from '../../src/adapters/out/dni/ConsultaDniAdapter';

function respuesta(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('consulta de DNI', () => {
  it('no llama a la red si falta la URL', async () => {
    let llamadas = 0;
    const adapter = new ConsultaDniAdapter({ dniUrl: '', rucUrl: '', token: 'secreto' }, async () => {
      llamadas += 1;
      return respuesta({});
    });
    await expect(adapter.consultar('12345678')).resolves.toEqual({ nombre: null, estado: 'no_configurado' });
    expect(llamadas).toBe(0);
  });

  it('arma el nombre con apellidos y nombres y envía el token', async () => {
    const adapter = new ConsultaDniAdapter(
      { dniUrl: 'https://api.ejemplo.test/dni?numero={documento}', rucUrl: 'https://api.ejemplo.test/ruc?numero={documento}', token: 'token-prueba' },
      async (url, init) => {
        expect(url).toBe('https://api.ejemplo.test/dni?numero=12345678');
        expect(new Headers(init.headers).get('authorization')).toBe('Bearer token-prueba');
        return respuesta({
          data: { apellidoPaterno: 'Gamarra', apellidoMaterno: 'López', nombres: 'Grace' },
        });
      },
    );
    await expect(adapter.consultar('12345678')).resolves.toEqual({
      nombre: 'Gamarra López Grace',
      estado: 'encontrado',
    });
  });

  it('consulta un RUC en su URL y usa la razón social', async () => {
    const adapter = new ConsultaDniAdapter(
      { dniUrl: 'https://api.ejemplo.test/dni?numero={documento}', rucUrl: 'https://api.ejemplo.test/ruc?numero={documento}', token: 'token-prueba' },
      async (url) => {
        expect(url).toBe('https://api.ejemplo.test/ruc?numero=20100017491');
        return respuesta({ razonSocial: 'SUNAT' });
      },
    );
    await expect(adapter.consultar('20100017491')).resolves.toEqual({ nombre: 'SUNAT', estado: 'encontrado' });
  });

  it('permite el registro manual si la API falla', async () => {
    const adapter = new ConsultaDniAdapter({ dniUrl: 'https://api.ejemplo.test/dni/{documento}', rucUrl: '', token: '' }, async () => {
      throw new Error('sin red');
    });
    await expect(adapter.consultar('12345678')).resolves.toEqual({ nombre: null, estado: 'error' });
  });
});
