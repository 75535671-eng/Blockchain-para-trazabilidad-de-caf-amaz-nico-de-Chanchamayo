# Base de datos

PostgreSQL en Supabase. El frontend no se conecta a Supabase ni a PostgreSQL: solo consume la API del backend.

1. En el proyecto de Supabase, abre el SQL Editor.
2. Ejecuta `database/migrations/001_pmv1_inicial.sql`, luego `002_productor_documento_unico.sql`, `003_cuentas_y_solicitudes.sql` y `004_auditoria_eliminacion.sql`.
3. Copia `.env.example` a `backend/.env`. Completa `DATABASE_URL`, `JWT_SECRET`, `AI_API_KEY` y `SEED_ADMIN_PASSWORD`. No subas ese archivo.
4. Usa la cadena de conexión directa o el pooler en modo sesión, puerto 5432. El pooler de transacción (puerto 6543) no conviene con el cliente `pg`.
5. Desde `backend`, ejecuta `npm run seed` para crear el administrador inicial si todavía no existe.

El script no borra tablas. Si esas tablas ya existen con otra estructura, revísalas antes de volver a aplicarlo.

`analisis_lotes` guarda el indicador de coherencia del registro producido por la IA del PMV1, para poder consultarlo después sin repetir la llamada externa.

RLS queda activo y sin políticas. El rol de base de datos del backend omite RLS; la autorización se hace en los casos de uso. La clave anónima de Supabase no se usa en Angular.
