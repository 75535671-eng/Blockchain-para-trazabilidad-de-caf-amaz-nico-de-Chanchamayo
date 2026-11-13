import { NextFunction, Request, Response } from 'express';

/**
 * Limita intentos por un campo del cuerpo, no por la IP del proxy.
 * Así un alojamiento compartido no junta a todos los usuarios en un solo cupo.
 */
export function limitePorCampo(campo: string, maximo: number, ventanaMs: number) {
  const marcas = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const ahora = Date.now();
    const crudo = req.body?.[campo];
    const clave = typeof crudo === 'string' && crudo.trim() ? crudo.trim().toLowerCase() : 'sin-correo';
    const previas = (marcas.get(clave) ?? []).filter((marca) => ahora - marca < ventanaMs);
    if (previas.length >= maximo) {
      res.status(429).json({ error: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.' });
      return;
    }
    previas.push(ahora);
    marcas.set(clave, previas);
    next();
  };
}
