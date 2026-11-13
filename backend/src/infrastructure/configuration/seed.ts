import path from 'path';
import dotenv from 'dotenv';
import { Usuario } from '../../domain/entities/Usuario';
import { BcryptPasswordHasher } from '../../adapters/out/security/SecurityAdapters';
import { invocar, primeraDe } from '../persistence/invocar';
import { leerConfig } from './container';
import { crearPoolPostgres } from './postgres';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

async function seed(): Promise<void> {
  const config = leerConfig();
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@chanchamayo.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  if (!password) {
    throw new Error('SEED_ADMIN_PASSWORD es obligatorio para crear el administrador.');
  }
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL es obligatorio.');
  }
  const pool = crearPoolPostgres(config.databaseUrl);
  const existente = primeraDe(await invocar(pool, 'buscar_usuario_por_email', [email]));
  if (existente) {
    console.log('El administrador ya existe.');
    await pool.end();
    return;
  }
  const hasher = new BcryptPasswordHasher();
  const usuario = Usuario.crear({
    id: crypto.randomUUID(),
    nombre: 'Administrador',
    email,
    passwordHash: await hasher.hash(password),
    rol: 'ADMINISTRADOR',
  });
  await invocar(pool, 'insertar_usuario', [
    usuario.id,
    usuario.nombre,
    usuario.email.valor,
    usuario.passwordHash,
    usuario.rol,
    usuario.estado,
    usuario.debeCambiarPassword,
    usuario.createdAt,
  ]);
  console.log(`Administrador creado: ${email}`);
  await pool.end();
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudo crear el administrador.');
  process.exit(1);
});
