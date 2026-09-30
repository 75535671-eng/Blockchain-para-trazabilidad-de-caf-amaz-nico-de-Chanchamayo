// Configuración de conexión a la Base de Datos PostgreSQL
export const dbConfig = {
  host: (globalThis as any).process?.env?.DB_HOST || 'localhost',
  port: Number((globalThis as any).process?.env?.DB_PORT) || 5432,
  user: (globalThis as any).process?.env?.DB_USER || 'postgres',
  password: (globalThis as any).process?.env?.DB_PASSWORD || 'postgres',
  database: (globalThis as any).process?.env?.DB_NAME || 'trazabilidad_cafe',
};

export function checkDatabaseConnection(): void {
  console.log(' Módulo de configuración de PostgreSQL cargado correctamente.');
}