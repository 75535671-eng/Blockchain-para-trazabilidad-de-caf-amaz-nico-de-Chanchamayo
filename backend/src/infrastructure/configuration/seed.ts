import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { Usuario } from '../../domain/entities/Usuario';
import { BcryptPasswordHasher } from '../../adapters/out/security/SecurityAdapters';
import { leerConfig } from './container';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

async function seed(): Promise<void> {
  const config = leerConfig();
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@chanchamayo.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  if (!password) {
    throw new Error('SEED_ADMIN_PASSWORD es obligatorio para crear el administrador.');
  }
  const pool = mysql.createPool({
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
    user: config.dbUser,
    password: config.dbPassword,
  });
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (rows.length > 0) {
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
  await pool.query(
    'INSERT INTO usuarios (id, nombre, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
    [usuario.id, usuario.nombre, usuario.email.valor, usuario.passwordHash, usuario.rol],
  );
  console.log(`Administrador creado: ${email}`);
  await pool.end();
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudo crear el administrador.');
  process.exit(1);
});
