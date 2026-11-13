import { describe, expect, it, vi } from 'vitest';
import { limitePorCampo } from '../../src/adapters/in/http/limite';

describe('límite de intentos', () => {
  it('deja pasar hasta el máximo y después responde 429', () => {
    const limite = limitePorCampo('email', 2, 60_000);
    const req = { body: { email: 'Ana@Chanchamayo.local' } };
    const primero = respuesta();
    const segundo = respuesta();
    const tercero = respuesta();
    limite(req as never, primero.res as never, primero.next);
    limite(req as never, segundo.res as never, segundo.next);
    limite(req as never, tercero.res as never, tercero.next);
    expect(primero.next).toHaveBeenCalledOnce();
    expect(segundo.next).toHaveBeenCalledOnce();
    expect(tercero.res.status).toHaveBeenCalledWith(429);
    expect(tercero.next).not.toHaveBeenCalled();
  });
});

function respuesta() {
  const next = vi.fn();
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return { res, next };
}
