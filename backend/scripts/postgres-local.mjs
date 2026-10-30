import path from 'node:path';
import { existsSync } from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

const databaseDir = path.resolve(process.cwd(), '.local-pg');
const postgres = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password: 'CafeLocal123',
  port: 5432,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

if (!existsSync(path.join(databaseDir, 'PG_VERSION'))) {
  await postgres.initialise();
}

await postgres.start();
console.log('PostgreSQL local escuchando en 127.0.0.1:5432');
