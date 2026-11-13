# 04. Auditoría OWASP Top 10

Rol: Auditor de Seguridad. Fecha de evidencia: 13 de noviembre de 2026. No se corrigió código para emitir este informe.

Severidad: Crítico, Alto, Medio, Bajo. El score global es el promedio de las diez categorías sobre 10, expresado también sobre 100.

Score global: **6,1 / 10** (61 / 100). Cumplimiento: parcial. No hay un hallazgo Crítico con evidencia de explotación en el repositorio.

## Broken Access Control

- Estado: controlado con reservas.
- Evidencia: las rutas de negocio en `backend/src/infrastructure/http/app.ts` pasan por `autenticar`. Los casos de uso distinguen administrador y productor (`ProductorUseCases.ts`, `lotesVisibles.ts`). En `backend/src/adapters/in/http/http.ts`, si la cuenta guardada es `PRODUCTOR`, el rol del actor queda en productor aunque el token diga otra cosa.
- Impacto: un productor no administra cuentas ajenas por el rol firmado en el token.
- Probabilidad: baja, porque el token se verifica con el secreto.
- Severidad: Bajo.
- Puntaje: 7,5 / 10.

## Cryptographic Failures

- Estado: parcial.
- Evidencia: `BcryptPasswordHasher` usa bcrypt con costo 10. `JwtTokenProvider` firma el token y `container.ts` exige `JWT_SECRET`, con caducidad por defecto de 8 horas. `backend/src/infrastructure/configuration/postgres.ts` usa `rejectUnauthorized: false` cuando el host no es local.
- Impacto: un atacante en la ruta hacia Supabase podría observar la sesión TLS si presenta otro certificado. Las contraseñas no se guardan en claro.
- Probabilidad: media en la red del proveedor, baja en un uso local.
- Severidad: Medio.
- Puntaje: 6 / 10.

## Injection

- Estado: controlado en el código revisado.
- Evidencia: los adaptadores llaman funciones con parámetros (`invocar.ts`). El cuerpo se valida con Zod antes de los casos de uso. El documento que entra a la URL de DNI o RUC pasa por `encodeURIComponent` en `ConsultaDniAdapter.ts`.
- Impacto: no se encontró una consulta armada con texto del usuario.
- Probabilidad: baja.
- Severidad: Bajo.
- Puntaje: 8 / 10.

## Insecure Design

- Estado: parcial y declarado.
- Evidencia: el anclaje es una cadena de prueba, no una red pública (`CadenaPruebaAnclaje.ts`). La contraseña temporal de una cuenta creada por el administrador se devuelve una sola vez; `docs/API.md` lo dice. La predicción de prueba anuncia que no certifica la taza.
- Impacto: alguien puede tomar el anclaje de prueba por una prueba en una red pública si no lee ese texto.
- Probabilidad: media en una lectura apresurada, no como fallo de autenticación.
- Severidad: Bajo.
- Puntaje: 6,5 / 10.

## Security Misconfiguration

- Estado: incompleto.
- Evidencia: `createApp` activa CORS con el origen configurado y `express.json()` sin límite explícito. No se envían `X-Content-Type-Options`, `Referrer-Policy` ni `X-Frame-Options`. El README de la base indica RLS activo y sin políticas, y que el rol del backend omite RLS. No hay límite de intentos en `POST /api/auth/login` ni en el registro.
- Impacto: fuerza bruta de contraseñas y respuestas del API sin las cabeceras mínimas.
- Probabilidad: media en un API público.
- Severidad: Medio.
- Puntaje: 4 / 10.

## Vulnerable and Outdated Components

- Estado: no demostrado en este análisis.
- Evidencia: `backend/package.json` fija Express 4.21, `pg` 8.23, `jsonwebtoken` 9.0 y `bcryptjs` 2.4. El flujo de CI no ejecuta `npm audit`. En esta sesión el registro de avisos de npm no respondió (`ECONNRESET`), así que no hay un conteo de avisos verificable.
- Impacto: desconocido hasta una consulta exitosa al registro.
- Probabilidad: no cuantificada.
- Severidad: Bajo, como falta de control de proceso, no como CVE confirmado.
- Puntaje: 6 / 10.

## Authentication Failures

- Estado: parcial.
- Evidencia: `backend/src/application/support/apoyo.ts` exige contraseña de 8 a 72 caracteres con letras y números. El fallo de credenciales usa el mensaje «El correo o la contraseña no son válidos.» (`IniciarSesion.ts`). Una solicitud pendiente o rechazada sí recibe un mensaje distinto, así que se puede saber si ese correo tiene una solicitud. No hay límite de intentos. El token vive en `sessionStorage` (`frontend/src/app/core/auth.service.ts`).
- Impacto: prueba de contraseñas repetida y robo del token si hubiera XSS.
- Probabilidad: media para la fuerza bruta, baja para XSS porque no se encontró `innerHTML` con datos del usuario en el recorrido revisado.
- Severidad: Alto el límite de intentos ausente; Medio el token en `sessionStorage`.
- Puntaje: 5,5 / 10.

## Software and Data Integrity Failures

- Estado: parcial.
- Evidencia: el evento guarda un hash SHA-256 del contenido canónico sin documento del productor (`hashIntegridad.ts`). La verificación recalcula ese hash. No hay firma del artefacto de despliegue ni integridad de subrecursos en `frontend/src/index.html`.
- Impacto: un evento alterado en base puede detectarse al verificar. Un script de terceros no está anclado porque la página no carga CDN en el `index.html` revisado.
- Probabilidad: baja.
- Severidad: Bajo.
- Puntaje: 7 / 10.

## Security Logging and Monitoring Failures

- Estado: incompleto.
- Evidencia: `manejarError` escribe el error 500 en consola y no el cuerpo. `auditoria_eliminaciones` guarda administrador, productor y fecha, sin documento ni contraseña (`004_auditoria_eliminacion.sql`). No hay un registro de intentos de inicio de sesión rechazados.
- Impacto: no se puede reconstruir un ataque de contraseñas desde el propio sistema.
- Probabilidad: media si el API está expuesto.
- Severidad: Medio.
- Puntaje: 4 / 10.

## Server-Side Request Forgery

- Estado: acotado.
- Evidencia: la URL de DNI o RUC sale de la configuración, no del cuerpo libre. El documento va codificado y la llamada corta a los 8 segundos. La URL de la IA también sale de la configuración (`ExternalAIAdapter.ts`).
- Impacto: un operador con acceso al entorno podría apuntar esas variables a otro host. El usuario autenticado no elige el host.
- Probabilidad: baja.
- Severidad: Bajo.
- Puntaje: 7 / 10.

## Hallazgos que condicionan el plan

1. No hay límite de intentos de login ni de registro. Severidad Alta.
2. La conexión a PostgreSQL no verifica el certificado fuera de localhost. Severidad Media. Cambiarlo puede cortar la base actual.
3. El token está en `sessionStorage`. Severidad Media. Pasarlo a cookie rompería el cliente que envía `Authorization: Bearer`.
4. Faltan cabeceras mínimas en las respuestas del API. Severidad Media.
5. No se registran los rechazos de inicio de sesión. Severidad Media.
