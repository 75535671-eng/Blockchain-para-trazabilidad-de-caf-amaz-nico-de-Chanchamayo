# Decisiones técnicas del PMV1

Registro de cambios que actualizan el prompt base. No describe resultados de uso ni métricas que no se hayan medido.

## Persistencia: PostgreSQL en Supabase

Situación anterior: MySQL local con XAMPP y el paquete `mysql2`.

Decisión: el backend se conecta a PostgreSQL con el cliente `pg` y la variable `DATABASE_URL`. El cliente oficial de Supabase no se usa para leer ni escribir tablas.

Motivo: los repositorios ya expresan SQL y el registro de una cuenta productora necesita una transacción. Encapsular `pg` en `PostgresRepositories` mantiene el puerto. Añadir también `@supabase/supabase-js` duplicaría el acceso a los mismos datos.

El frontend sigue llamando solo a la API REST.

La migración reproducible es `database/migrations/001_pmv1_inicial.sql`. No borra tablas. El script anterior de MySQL no se ejecuta contra Supabase.

RLS queda habilitado y sin políticas. La conexión del backend usa el rol de base de datos, que omite RLS, así que la identidad y los permisos se validan en los casos de uso. Angular no recibe claves de Supabase.

## Autenticación: se conserva el mecanismo actual

Inspección: `usuarios.password_hash` guarda el hash bcrypt. `BcryptPasswordHasher` implementa `PasswordHasherPort`. `JwtTokenProvider` emite y verifica el token del backend. El rol (`ADMINISTRADOR` o `PRODUCTOR`) vive en la misma fila, junto con `estado` (`activa` o `bloqueada`) y `debe_cambiar_password`. El productor se relaciona por `productores.usuario_id`. `solicitudes_registro` guarda la petición pública; la cuenta solo se crea al aprobarla. No se usa Supabase Auth.

Decisión de esta actualización: no adoptar Supabase Auth todavía.

Motivo: ya existe un solo sistema de credenciales, desacoplado por puertos, y las historias HU-001 a HU-004 dependen de ese token y de esos roles. Pasar a Supabase Auth exigiría otro cliente junto a `pg`, dejar de guardar `password_hash` y volver a crear las cuentas: el hash bcrypt no se importa. No hay en el repositorio un inventario de cuentas de Supabase que justifique esa migración.

Efecto: no se eliminan cuentas ni contraseñas. El esquema PostgreSQL mantiene `password_hash`.

Si más adelante se adopta Supabase Auth, los archivos a cambiar antes de borrar hashes serían:

- `backend/src/domain/entities/Usuario.ts`
- `backend/src/application/usecases/RegistrarUsuario.ts`
- `backend/src/application/usecases/IniciarSesion.ts`
- `backend/src/application/ports/output/OutputPorts.ts`
- `backend/src/adapters/out/security/SecurityAdapters.ts`
- `backend/src/adapters/in/http/http.ts`
- `backend/src/infrastructure/configuration/container.ts`
- `backend/src/infrastructure/configuration/seed.ts`
- `database/migrations/001_pmv1_inicial.sql`
- `frontend/src/app/core/auth.service.ts`

El identificador de `auth.users` pasaría a ser `usuarios.id` o `productores.usuario_id`. El backend seguiría comprobando el rol en cada caso de uso.

## Eliminación de un productor

La eliminación corre en una transacción del backend: análisis, lotes, parcelas, solicitudes propias, ficha y la fila de `usuarios` vinculada. Si esa cuenta había resuelto solicitudes de otras personas, solo se vacía `administrador_id` en esas filas. `auditoria_eliminaciones` guarda la fecha, el administrador y el identificador del productor. No hay archivos por productor fuera de la base. La cuenta se borra en `usuarios`; no se usa Supabase Auth ni `service_role`.

## IA: una sola función inicial

La función ya implementada se conserva: revisar la coherencia del registro de un lote y devolver `COHERENTE`, `REVISAR` o `INSUFICIENTE`, un resumen y observaciones.

Usa solo datos que el PMV1 ya guarda: lote, parcela y nombre u organización del productor. No recibe documento, correo ni contraseña. La confianza la calcula el dominio según los datos presentes. No es una estimación de calidad, una predicción de cosecha ni una clasificación agronómica.

Flujo: frontend, API REST, controller, caso de uso `AnalizarLote`, `AIServicePort`, `ExternalAIAdapter`, API externa compatible con OpenAI. La clave está en `AI_API_KEY`. Si la API no responde, el adaptador devuelve error y no fabrica un análisis exitoso. Las pruebas usan un doble de `AIServicePort`.

`analisis_lotes` se conserva para mostrar ese resultado en la consulta del lote. No es una tabla de blockchain, QR ni de un modelo predictivo.

## Fuera de esta actualización

Blockchain, eventos de cadena, anclajes, QR, IPFS y modelos predictivos siguen fuera del PMV1. Los capítulos académicos en formato de documento no están en el repositorio como texto editable; no se reescribieron.
