import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { AuthController, LoteController, ParcelaController, ProductorController } from '../../adapters/in/controllers/Controllers';
import { ExternalAIAdapter } from '../../adapters/out/ai/ExternalAIAdapter';
import {
  MySQLAnalisisLoteRepository,
  MySQLLoteRepository,
  MySQLParcelaRepository,
  MySQLProductorRepository,
  MySQLRegistroCuenta,
  MySQLUsuarioRepository,
} from '../../adapters/out/persistence/MySQLRepositories';
import { BcryptPasswordHasher, JwtTokenProvider } from '../../adapters/out/security/SecurityAdapters';
import { ActualizarProductor, EliminarProductor, ListarProductores, RegistrarProductor } from '../../application/usecases/ProductorUseCases';
import { AnalizarLote } from '../../application/usecases/AnalizarLote';
import { IniciarSesion } from '../../application/usecases/IniciarSesion';
import { ActualizarLote, ConsultarLote, EliminarLote, ListarLotes, RegistrarLote } from '../../application/usecases/LoteUseCases';
import { ActualizarParcela, EliminarParcela, ListarParcelas, RegistrarParcela } from '../../application/usecases/ParcelaUseCases';
import { RegistrarUsuario } from '../../application/usecases/RegistrarUsuario';
import { EstrategiaConAltitud, EstrategiaSinAltitud, SelectorEstrategiaAnalisis } from '../../domain/services/analisis/EstrategiasAnalisis';
import { AppContainer } from '../http/app';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export interface AppConfig {
  port: number;
  corsOrigin: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiProvider: string;
}

export function leerConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 3000),
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:4200',
    dbHost: env.DB_HOST ?? 'localhost',
    dbPort: Number(env.DB_PORT ?? 3306),
    dbName: env.DB_NAME ?? 'cafe_chanchamayo',
    dbUser: env.DB_USER ?? 'root',
    dbPassword: env.DB_PASSWORD ?? '',
    jwtSecret: env.JWT_SECRET ?? '',
    jwtExpiresIn: env.JWT_EXPIRES_IN ?? '8h',
    aiBaseUrl: env.AI_API_BASE_URL ?? '',
    aiApiKey: env.AI_API_KEY ?? '',
    aiModel: env.AI_MODEL ?? '',
    aiProvider: env.AI_PROVIDER ?? 'openai-compatible',
  };
}

export function createProductionContainer(config = leerConfig()): AppContainer {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET es obligatorio.');
  }
  const pool = mysql.createPool({
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
    user: config.dbUser,
    password: config.dbPassword,
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
  });
  const usuarios = new MySQLUsuarioRepository(pool);
  const productores = new MySQLProductorRepository(pool);
  const parcelas = new MySQLParcelaRepository(pool);
  const lotes = new MySQLLoteRepository(pool);
  const analisis = new MySQLAnalisisLoteRepository(pool);
  const hasher = new BcryptPasswordHasher();
  const tokens = new JwtTokenProvider(config.jwtSecret, config.jwtExpiresIn);
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
    auth: new AuthController(
      new RegistrarUsuario(usuarios, productores, new MySQLRegistroCuenta(pool), hasher),
      new IniciarSesion(usuarios, productores, hasher, tokens),
    ),
    productores: new ProductorController(
      new RegistrarProductor(productores),
      new ListarProductores(productores),
      new ActualizarProductor(productores),
      new EliminarProductor(productores),
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
