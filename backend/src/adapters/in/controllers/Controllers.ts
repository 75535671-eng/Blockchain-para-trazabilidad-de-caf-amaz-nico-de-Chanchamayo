import { Request, Response } from 'express';
import { z } from 'zod';
import {
  AprobarSolicitudUseCase,
  CambiarContrasenaUseCase,
  ConsultarDniProductorUseCase,
  ConsultarSesionUseCase,
  CrearCuentaProductorUseCase,
  IniciarSesionUseCase,
  ListarSolicitudesUseCase,
  RechazarSolicitudUseCase,
  SolicitarRegistroUseCase,
} from '../../../application/ports/input/UseCases';
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
  OtorgarAdministradorUseCase,
  QuitarAdministradorUseCase,
  ConsultarEvaluacionModeloUseCase,
  ConsultarEvaluacionTrazabilidadUseCase,
  EstimarTrazabilidadUseCase,
  GenerarReporteTrazabilidadUseCase,
  ListarEventosUseCase,
  ListarEventosVisiblesUseCase,
  VerificarIntegridadEventoUseCase,
  ListarPrediccionesUseCase,
  ListarPrediccionesVisiblesUseCase,
  PredecirCalidadUseCase,
  RegistrarEventoUseCase,
  RegistrarLoteUseCase,
  RegistrarParcelaUseCase,
  RegistrarProductorUseCase,
} from '../../../application/ports/input/UseCases';

const registroSchema = z.object({
  nombre: z.string(),
  email: z.string(),
  password: z.string(),
  confirmacion: z.string(),
  documento: z.string(),
  telefono: z.string(),
  organizacion: z.string().nullable().optional(),
});

const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export class AuthController {
  constructor(
    private readonly registrar: SolicitarRegistroUseCase,
    private readonly iniciar: IniciarSesionUseCase,
    private readonly consultar: ConsultarSesionUseCase,
    private readonly cambiar: CambiarContrasenaUseCase,
    private readonly consultaDni: ConsultarDniProductorUseCase,
  ) {}

  registrarUsuario = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(registroSchema, req);
    res.status(201).json(await this.registrar.ejecutar(cuerpo));
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(loginSchema, req);
    res.status(200).json(await this.iniciar.ejecutar(cuerpo));
  };

  sesion = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.consultar.ejecutar(actorDe(res)));
  };

  cambiarContrasena = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(z.object({ password: z.string(), confirmacion: z.string() }), req);
    res.status(200).json(await this.cambiar.ejecutar({ actor: actorDe(res), ...cuerpo }));
  };

  consultarDocumento = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.consultaDni.consultarPublico(String(req.params.documento)));
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
    private readonly consultarDni: ConsultarDniProductorUseCase,
    private readonly otorgarAdministrador: OtorgarAdministradorUseCase,
    private readonly quitarAdministrador: QuitarAdministradorUseCase,
    private readonly crearCuenta: CrearCuentaProductorUseCase,
  ) {}

  crear = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(productorSchema, req);
    res.status(201).json(await this.registrar.ejecutar({ actor: actorDe(res), ...cuerpo }));
  };

  crearConCuenta = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(
      productorSchema.extend({ email: z.string(), password: z.string(), telefono: z.string() }),
      req,
    );
    res.status(201).json(await this.crearCuenta.ejecutar({ actor: actorDe(res), ...cuerpo }));
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

  otorgarRolAdministrador = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = z.object({ email: z.string().optional(), password: z.string().optional() }).parse(req.body ?? {});
    res.status(200).json(
      await this.otorgarAdministrador.ejecutar({ actor: actorDe(res), productorId: String(req.params.id), ...cuerpo }),
    );
  };

  quitarRolAdministrador = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(
      await this.quitarAdministrador.ejecutar({ actor: actorDe(res), productorId: String(req.params.id) }),
    );
  };

  consultarDocumento = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(
      await this.consultarDni.ejecutar({ actor: actorDe(res), documento: String(req.params.documento) }),
    );
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

const eventoSchema = z.object({
  etapa: z.string(),
  fecha: z.string(),
  descripcion: z.string(),
  metodoBeneficio: z.string().nullable().optional(),
  humedadPorcentaje: z.number().nullable().optional(),
});

export class EventoController {
  constructor(
    private readonly registrar: RegistrarEventoUseCase,
    private readonly listar: ListarEventosUseCase,
    private readonly listarVisibles: ListarEventosVisiblesUseCase,
    private readonly verificarIntegridad: VerificarIntegridadEventoUseCase,
  ) {}

  crear = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(eventoSchema, req);
    res.status(201).json(
      await this.registrar.ejecutar({
        actor: actorDe(res),
        loteId: String(req.params.id),
        etapa: cuerpo.etapa,
        fecha: cuerpo.fecha,
        descripcion: cuerpo.descripcion,
        metodoBeneficio: cuerpo.metodoBeneficio ?? null,
        humedadPorcentaje: cuerpo.humedadPorcentaje ?? null,
      }),
    );
  };

  listarDelLote = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.listar.ejecutar({ actor: actorDe(res), loteId: String(req.params.id) }));
  };

  listarTodos = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.listarVisibles.ejecutar(actorDe(res)));
  };

  verificar = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(
      await this.verificarIntegridad.ejecutar({ actor: actorDe(res), eventoId: String(req.params.id) }),
    );
  };
}

function consultaTexto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

export class InteligenciaController {
  constructor(
    private readonly predecir: PredecirCalidadUseCase,
    private readonly listar: ListarPrediccionesUseCase,
    private readonly listarVisibles: ListarPrediccionesVisiblesUseCase,
    private readonly evaluar: ConsultarEvaluacionModeloUseCase,
    private readonly estimar: EstimarTrazabilidadUseCase,
    private readonly evaluarTrazabilidad: ConsultarEvaluacionTrazabilidadUseCase,
  ) {}

  predecirUno = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.predecir.ejecutar({ actor: actorDe(res), loteId: String(req.params.id) }));
  };

  listarDelLote = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.listar.ejecutar({ actor: actorDe(res), loteId: String(req.params.id) }));
  };

  listarTodas = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.listarVisibles.ejecutar(actorDe(res)));
  };

  evaluacion = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.evaluar.ejecutar());
  };

  estimarTrazabilidad = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.estimar.ejecutar({ actor: actorDe(res), loteId: String(req.params.id) }));
  };

  evaluacionTrazabilidad = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.evaluarTrazabilidad.ejecutar());
  };
}

export class ReporteController {
  constructor(private readonly generar: GenerarReporteTrazabilidadUseCase) {}

  consultar = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(
      await this.generar.ejecutar({
        actor: actorDe(res),
        loteId: consultaTexto(req.query.loteId),
        productorId: consultaTexto(req.query.productorId),
        parcelaId: consultaTexto(req.query.parcelaId),
        desde: consultaTexto(req.query.desde),
        hasta: consultaTexto(req.query.hasta),
      }),
    );
  };
}

export class SolicitudController {
  constructor(
    private readonly listar: ListarSolicitudesUseCase,
    private readonly aprobar: AprobarSolicitudUseCase,
    private readonly rechazar: RechazarSolicitudUseCase,
  ) {}

  listarTodas = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.listar.ejecutar(actorDe(res)));
  };

  aprobarUna = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.aprobar.ejecutar({ actor: actorDe(res), solicitudId: String(req.params.id) }));
  };

  rechazarUna = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = validarCuerpo(z.object({ motivo: z.string() }), req);
    res.status(200).json(
      await this.rechazar.ejecutar({ actor: actorDe(res), solicitudId: String(req.params.id), motivo: cuerpo.motivo }),
    );
  };
}
