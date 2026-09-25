import { Request, Response } from 'express';
import { z } from 'zod';
import { IniciarSesionUseCase, RegistrarUsuarioUseCase } from '../../../application/ports/input/UseCases';
import { actorDe, validarCuerpo } from '../http/http';
import {
  ActualizarLoteUseCase,
  ActualizarParcelaUseCase,
  EliminarLoteUseCase,
  EliminarParcelaUseCase,
  EliminarProductorUseCase,
  ActualizarProductorUseCase,
  AnalizarLoteUseCase,
  ConsultarLoteUseCase,
  ListarLotesUseCase,
  ListarParcelasUseCase,
  ListarProductoresUseCase,
  RegistrarLoteUseCase,
  RegistrarParcelaUseCase,
  RegistrarProductorUseCase,
} from '../../../application/ports/input/UseCases';

const registroSchema = z.object({
  nombre: z.string(),
  email: z.string(),
  password: z.string(),
  documento: z.string(),
  telefono: z.string().nullable().optional(),
  organizacion: z.string().nullable().optional(),
});

const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export class AuthController {
  constructor(
    private readonly registrar: RegistrarUsuarioUseCase,
    private readonly iniciar: IniciarSesionUseCase,
  ) {}

  registrarUsuario = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(registroSchema, req);
    res.status(201).json(await this.registrar.ejecutar(cuerpo));
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(loginSchema, req);
    res.status(200).json(await this.iniciar.ejecutar(cuerpo));
  };
}

const productorSchema = z.object({
  nombre: z.string(),
  documento: z.string(),
  telefono: z.string().nullable().optional(),
  organizacion: z.string().nullable().optional(),
});

const productorUpdateSchema = z.object({
  nombre: z.string(),
  telefono: z.string().nullable().optional(),
  organizacion: z.string().nullable().optional(),
});

export class ProductorController {
  constructor(
    private readonly registrar: RegistrarProductorUseCase,
    private readonly listar: ListarProductoresUseCase,
    private readonly actualizar: ActualizarProductorUseCase,
    private readonly eliminar: EliminarProductorUseCase,
  ) {}

  crear = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(productorSchema, req);
    res.status(201).json(await this.registrar.ejecutar({ actor: actorDe(res), ...cuerpo }));
  };

  listarTodos = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.listar.ejecutar(actorDe(res)));
  };

  actualizarUno = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(productorUpdateSchema, req);
    res.status(200).json(
      await this.actualizar.ejecutar({ actor: actorDe(res), productorId: String(req.params.id), ...cuerpo }),
    );
  };

  eliminarUno = async (req: Request, res: Response): Promise<void> => {
    await this.eliminar.ejecutar({ actor: actorDe(res), productorId: String(req.params.id) });
    res.status(204).send();
  };
}

const parcelaSchema = z.object({
  productorId: z.string(),
  nombre: z.string(),
  distrito: z.string(),
  localidad: z.string().nullable().optional(),
  areaHectareas: z.number(),
  altitudMsnm: z.number().int().nullable().optional(),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
});

export class ParcelaController {
  constructor(
    private readonly registrar: RegistrarParcelaUseCase,
    private readonly listar: ListarParcelasUseCase,
    private readonly actualizar: ActualizarParcelaUseCase,
    private readonly eliminar: EliminarParcelaUseCase,
  ) {}

  crear = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(parcelaSchema, req);
    res.status(201).json(await this.registrar.ejecutar({ actor: actorDe(res), ...cuerpo }));
  };

  listarTodas = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.listar.ejecutar(actorDe(res)));
  };

  actualizarUna = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(parcelaSchema, req);
    res.status(200).json(
      await this.actualizar.ejecutar({ actor: actorDe(res), parcelaId: String(req.params.id), ...cuerpo }),
    );
  };

  eliminarUna = async (req: Request, res: Response): Promise<void> => {
    await this.eliminar.ejecutar({ actor: actorDe(res), parcelaId: String(req.params.id) });
    res.status(204).send();
  };
}

const loteSchema = z.object({
  parcelaId: z.string(),
  fechaCosecha: z.string(),
  cantidadKg: z.number(),
  variedad: z.string(),
  observaciones: z.string().nullable().optional(),
});

export class LoteController {
  constructor(
    private readonly registrar: RegistrarLoteUseCase,
    private readonly listar: ListarLotesUseCase,
    private readonly consultar: ConsultarLoteUseCase,
    private readonly analizar: AnalizarLoteUseCase,
    private readonly actualizar: ActualizarLoteUseCase,
    private readonly eliminar: EliminarLoteUseCase,
  ) {}

  crear = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(loteSchema, req);
    res.status(201).json(await this.registrar.ejecutar({ actor: actorDe(res), ...cuerpo }));
  };

  listarTodos = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.listar.ejecutar(actorDe(res)));
  };

  consultarUno = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.consultar.ejecutar({ actor: actorDe(res), loteId: String(req.params.id) }));
  };

  analizarUno = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(await this.analizar.ejecutar({ actor: actorDe(res), loteId: String(req.params.id) }));
  };

  actualizarUno = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(loteSchema, req);
    res.status(200).json(
      await this.actualizar.ejecutar({ actor: actorDe(res), loteId: String(req.params.id), ...cuerpo }),
    );
  };

  eliminarUno = async (req: Request, res: Response): Promise<void> => {
    await this.eliminar.ejecutar({ actor: actorDe(res), loteId: String(req.params.id) });
    res.status(204).send();
  };
}
