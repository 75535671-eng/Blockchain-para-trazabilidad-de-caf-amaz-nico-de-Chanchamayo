import express, { Express } from 'express';
import cors from 'cors';
import { AuthController, LoteController, ParcelaController, ProductorController, SolicitudController } from '../../adapters/in/controllers/Controllers';
import { autenticar, manejarError } from '../../adapters/in/http/http';
import { TokenProviderPort, UsuarioRepositoryPort } from '../../application/ports/output/OutputPorts';

export interface AppContainer {
  auth: AuthController;
  productores: ProductorController;
  parcelas: ParcelaController;
  lotes: LoteController;
  solicitudes: SolicitudController;
  tokens: TokenProviderPort;
  usuarios: UsuarioRepositoryPort;
  corsOrigin: string;
}

export function createApp(container: AppContainer): Express {
  const app = express();
  app.use(cors({ origin: container.corsOrigin }));
  app.use(express.json());
  const requiereAuth = autenticar(container.tokens, container.usuarios);

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ estado: 'ok' });
  });

  app.post('/api/auth/register', asyncHandler(container.auth.registrarUsuario));
  app.post('/api/auth/login', asyncHandler(container.auth.login));
  app.get('/api/auth/sesion', requiereAuth, asyncHandler(container.auth.sesion));
  app.post('/api/auth/cambiar-contrasena', requiereAuth, asyncHandler(container.auth.cambiarContrasena));

  app.post('/api/productores/cuentas', requiereAuth, asyncHandler(container.productores.crearConCuenta));
  app.post('/api/productores', requiereAuth, asyncHandler(container.productores.crear));
  app.get('/api/productores', requiereAuth, asyncHandler(container.productores.listarTodos));
  app.post('/api/productores/:id/rol-administrador', requiereAuth, asyncHandler(container.productores.otorgarRolAdministrador));
  app.post('/api/productores/:id/rol-productor', requiereAuth, asyncHandler(container.productores.quitarRolAdministrador));
  app.get('/api/productores/dni/:documento', requiereAuth, asyncHandler(container.productores.consultarDocumento));
  app.put('/api/productores/:id', requiereAuth, asyncHandler(container.productores.actualizarUno));
  app.delete('/api/productores/:id', requiereAuth, asyncHandler(container.productores.eliminarUno));

  app.post('/api/parcelas', requiereAuth, asyncHandler(container.parcelas.crear));
  app.get('/api/parcelas', requiereAuth, asyncHandler(container.parcelas.listarTodas));
  app.put('/api/parcelas/:id', requiereAuth, asyncHandler(container.parcelas.actualizarUna));
  app.delete('/api/parcelas/:id', requiereAuth, asyncHandler(container.parcelas.eliminarUna));

  app.post('/api/lotes', requiereAuth, asyncHandler(container.lotes.crear));
  app.get('/api/lotes', requiereAuth, asyncHandler(container.lotes.listarTodos));
  app.get('/api/lotes/:id', requiereAuth, asyncHandler(container.lotes.consultarUno));
  app.post('/api/lotes/:id/analisis', requiereAuth, asyncHandler(container.lotes.analizarUno));
  app.put('/api/lotes/:id', requiereAuth, asyncHandler(container.lotes.actualizarUno));
  app.delete('/api/lotes/:id', requiereAuth, asyncHandler(container.lotes.eliminarUno));

  app.get('/api/solicitudes', requiereAuth, asyncHandler(container.solicitudes.listarTodas));
  app.post('/api/solicitudes/:id/aprobar', requiereAuth, asyncHandler(container.solicitudes.aprobarUna));
  app.post('/api/solicitudes/:id/rechazar', requiereAuth, asyncHandler(container.solicitudes.rechazarUna));

  app.use(manejarError);
  return app;
}

function asyncHandler(handler: (req: express.Request, res: express.Response) => Promise<void>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    handler(req, res).catch(next);
  };
}
