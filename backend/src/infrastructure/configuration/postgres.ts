import { Pool, types } from 'pg';

// DATE llega como texto YYYY-MM-DD. Evita el desfase de zona al leer la cosecha.
types.setTypeParser(1082, (value: string) => value);

export function crearPoolPostgres(databaseUrl: string): Pool {
  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(databaseUrl);
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    // Supabase presenta un certificado que Node no valida con la CA por defecto.
    // La autorización sigue en el backend: esta conexión no usa la clave anónima.
    ssl: local ? undefined : { rejectUnauthorized: false },
  });
}
