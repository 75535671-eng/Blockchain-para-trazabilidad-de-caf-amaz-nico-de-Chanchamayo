# Base de datos

MySQL local mediante XAMPP. El frontend no se conecta a MySQL.

1. Inicia MySQL en XAMPP.
2. Ejecuta `database/schema.sql` en phpMyAdmin o con el cliente `mysql`.
3. Copia `.env.example` a `backend/.env` y completa `DB_PASSWORD`, `JWT_SECRET`, `AI_API_KEY` y `SEED_ADMIN_PASSWORD`.
4. Desde `backend`, ejecuta `npm run seed` para crear el administrador inicial.

`analisis_lotes` guarda el indicador de coherencia del registro producido por la IA del PMV1, para poder consultarlo después sin repetir la llamada externa.
