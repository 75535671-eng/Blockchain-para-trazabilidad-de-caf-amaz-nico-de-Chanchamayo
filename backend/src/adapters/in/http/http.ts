import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { DomainError } from '../../../domain/errors/DomainError';
import { Actor } from '../../../application/dto/dtos';
import { TokenProviderPort, UsuarioRepositoryPort } from '../../../application/ports/output/OutputPorts';
import { AIConfigurationError } from '../../out/ai/ExternalAIAdapter';

export function autenticar(tokens: TokenProviderPort, usuarios: UsuarioRepositoryPort) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
      res.status(401).json({ error: 'Se requiere autenticación.' });
      return;
    }
    let payload: { usuarioId: string; rol: Actor['rol'] };
    try {
      payload = tokens.verificar(token);
    } catch {
      res.status(401).json({ error: 'La sesión no es válida.' });
      return;
    }
    usuarios
      .buscarPorId(payload.usuarioId)
      .then((usuario) => {
        if (!usuario) {
          res.status(401).json({ error: 'La sesión no es válida.' });
          return;
        }
        if (usuario.estado === 'bloqueada') {
          res.status(403).json({ error: 'Tu cuenta no está habilitada.' });
          return;
        }
        const rutaLibre = req.path === '/api/auth/cambiar-contrasena' || req.path === '/api/auth/sesion';
        if (usuario.debeCambiarPassword && !rutaLibre) {
          res.status(403).json({ error: 'Debes cambiar tu contraseña temporal antes de continuar.' });
          return;
        }
        res.locals.actor = {
          usuarioId: payload.usuarioId,
          rol: usuario.rol === 'PRODUCTOR' ? 'PRODUCTOR' : payload.rol,
        };
        next();
      })
      .catch(next);
  };
}

export function actorDe(res: Response): Actor {
  return res.locals.actor as Actor;
}

export function validarCuerpo<T>(schema: ZodSchema<T>, req: Request): T {
  return schema.parse(req.body);
}

export function manejarError(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'La solicitud no tiene un formato válido.' });
    return;
  }
  if (error instanceof DomainError) {
    const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'CONFLICT' ? 409 : error.code === 'FORBIDDEN' ? 403 : 400;
    res.status(status).json({ error: error.message });
    return;
  }
  if (error instanceof AIConfigurationError) {
    res.status(503).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'No se pudo completar la operación.' });
}
