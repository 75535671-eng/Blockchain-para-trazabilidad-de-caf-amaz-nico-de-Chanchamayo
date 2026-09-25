import express, { Express } from 'express';
import cors from 'cors';
import { AuthController, LoteController, ParcelaController, ProductorController } from '../../adapters/in/controllers/Controllers';
import { autenticar, manejarError } from '../../adapters/in/http/http';
import { TokenProviderPort } from '../../application/ports/output/OutputPorts';

export interface AppContainer {
  auth: AuthController;
  productores: ProductorController;
  parcelas: ParcelaController;
  lotes: LoteController;
  tokens: TokenProviderPort;
  corsOrigin: string;
}

export function createApp(container: AppContainer): Express {
  const app = express();
  app.use(cors({ origin: container.corsOrigin }));
  app.use(express.json());
  const requiereAuth = autenticar(container.tokens);

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ estado: 'ok' });
  });

  app.post('/api/auth/register', asyncHandler(container.auth.registrarUsuario));
  app.post('/api/auth/login', asyncHandler(container.auth.login));

  app.post('/api/productores', requiereAuth, asyncHandler(container.productores.crear));
  app.get('/api/productores', requiereAuth, asyncHandler(container.productores.listarTodos));
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

  app.use(manejarError);
  return app;
}

function asyncHandler(handler: (req: express.Request, res: express.Response) => Promise<void>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    handler(req, res).catch(next);
  };
}
