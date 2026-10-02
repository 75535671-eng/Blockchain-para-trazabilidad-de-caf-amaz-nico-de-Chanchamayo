import path from 'path';
import dotenv from 'dotenv';
import { AuthController, LoteController, ParcelaController, ProductorController, SolicitudController } from '../../adapters/in/controllers/Controllers';
import { ExternalAIAdapter } from '../../adapters/out/ai/ExternalAIAdapter';
import { ConsultaDniAdapter } from '../../adapters/out/dni/ConsultaDniAdapter';
import {
  PostgresAnalisisLoteRepository,
  PostgresLoteRepository,
  PostgresParcelaRepository,
  PostgresProductorRepository,
  PostgresRegistroCuenta,
  PostgresSolicitudRegistroRepository,
  PostgresUsuarioRepository,
} from '../../adapters/out/persistence/PostgresRepositories';
import { BcryptPasswordHasher, JwtTokenProvider } from '../../adapters/out/security/SecurityAdapters';
import { ActualizarProductor, ConsultarDniProductor, EliminarProductor, ListarProductores, OtorgarAdministrador, QuitarAdministrador, RegistrarProductor } from '../../application/usecases/ProductorUseCases';
import { AnalizarLote } from '../../application/usecases/AnalizarLote';
import { CambiarContrasena, ConsultarSesion, IniciarSesion } from '../../application/usecases/IniciarSesion';
import { ActualizarLote, ConsultarLote, EliminarLote, ListarLotes, RegistrarLote } from '../../application/usecases/LoteUseCases';
import { ActualizarParcela, EliminarParcela, ListarParcelas, RegistrarParcela } from '../../application/usecases/ParcelaUseCases';
import { CrearCuentaProductor } from '../../application/usecases/RegistrarUsuario';
import { AprobarSolicitud, ListarSolicitudes, RechazarSolicitud, SolicitarRegistro } from '../../application/usecases/SolicitudRegistroUseCases';
import { EstrategiaConAltitud, EstrategiaSinAltitud, SelectorEstrategiaAnalisis } from '../../domain/services/analisis/EstrategiasAnalisis';
import { AppContainer } from '../http/app';
import { crearPoolPostgres } from './postgres';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export interface AppConfig {
  port: number;
  corsOrigin: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiProvider: string;
  dniApiUrl: string;
  rucApiUrl: string;
  dniApiToken: string;
}

export function leerConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 3000),
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:4200',
    databaseUrl: env.DATABASE_URL ?? '',
    jwtSecret: env.JWT_SECRET ?? '',
    jwtExpiresIn: env.JWT_EXPIRES_IN ?? '8h',
    aiBaseUrl: env.AI_API_BASE_URL ?? '',
    aiApiKey: env.AI_API_KEY ?? '',
    aiModel: env.AI_MODEL ?? '',
    aiProvider: env.AI_PROVIDER ?? 'openai-compatible',
    dniApiUrl: env.DNI_API_URL ?? '',
    rucApiUrl: env.RUC_API_URL ?? '',
    dniApiToken: env.DNI_API_TOKEN ?? '',
  };
}

export function createProductionContainer(config = leerConfig()): AppContainer {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET es obligatorio.');
  }
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL es obligatorio.');
  }
  const pool = crearPoolPostgres(config.databaseUrl);
  const usuarios = new PostgresUsuarioRepository(pool);
  const productores = new PostgresProductorRepository(pool);
  const parcelas = new PostgresParcelaRepository(pool);
  const lotes = new PostgresLoteRepository(pool);
  const analisis = new PostgresAnalisisLoteRepository(pool);
  const solicitudes = new PostgresSolicitudRegistroRepository(pool);
  const hasher = new BcryptPasswordHasher();
  const tokens = new JwtTokenProvider(config.jwtSecret, config.jwtExpiresIn);
  const consultaDni = new ConsultarDniProductor(
    new ConsultaDniAdapter({ dniUrl: config.dniApiUrl, rucUrl: config.rucApiUrl, token: config.dniApiToken }),
  );
  const selector = new SelectorEstrategiaAnalisis(new EstrategiaConAltitud(), new EstrategiaSinAltitud());
  const ia = new ExternalAIAdapter({
    baseUrl: config.aiBaseUrl,
    apiKey: config.aiApiKey,
    model: config.aiModel,
    provider: config.aiProvider,
  });
  return {
    corsOrigin: config.corsOrigin,
    tokens,
    usuarios,
    auth: new AuthController(
      new SolicitarRegistro(usuarios, productores, solicitudes, hasher),
      new IniciarSesion(usuarios, productores, solicitudes, hasher, tokens),
      new ConsultarSesion(usuarios),
      new CambiarContrasena(usuarios, hasher),
      consultaDni,
    ),
    productores: new ProductorController(
      new RegistrarProductor(productores),
      new ListarProductores(productores, usuarios),
      new ActualizarProductor(productores),
      new EliminarProductor(productores),
      consultaDni,
      new OtorgarAdministrador(usuarios, productores, hasher),
      new QuitarAdministrador(usuarios, productores),
      new CrearCuentaProductor(usuarios, productores, new PostgresRegistroCuenta(pool), hasher),
    ),
    solicitudes: new SolicitudController(
      new ListarSolicitudes(usuarios, solicitudes),
      new AprobarSolicitud(usuarios, productores, solicitudes),
      new RechazarSolicitud(usuarios, solicitudes),
    ),
    parcelas: new ParcelaController(
      new RegistrarParcela(parcelas, productores),
      new ListarParcelas(parcelas, productores),
      new ActualizarParcela(parcelas, productores),
      new EliminarParcela(parcelas, productores),
    ),
    lotes: new LoteController(
      new RegistrarLote(lotes, parcelas, productores),
      new ListarLotes(lotes, parcelas, productores),
      new ConsultarLote(lotes, parcelas, productores, analisis),
      new AnalizarLote(lotes, parcelas, productores, analisis, ia, selector),
      new ActualizarLote(lotes, parcelas, productores),
      new EliminarLote(lotes, parcelas, productores, analisis),
    ),
  };
}
