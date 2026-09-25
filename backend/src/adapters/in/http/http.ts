import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { DomainError } from '../../../domain/errors/DomainError';
import { Actor } from '../../../application/dto/dtos';
import { TokenProviderPort } from '../../../application/ports/output/OutputPorts';
import { AIConfigurationError } from '../../out/ai/ExternalAIAdapter';

export function autenticar(tokens: TokenProviderPort) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
      res.status(401).json({ error: 'Se requiere autenticación.' });
      return;
    }
    try {
      res.locals.actor = tokens.verificar(token);
      next();
    } catch {
      res.status(401).json({ error: 'La sesión no es válida.' });
    }
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
