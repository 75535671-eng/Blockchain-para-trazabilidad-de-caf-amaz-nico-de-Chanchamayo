# 05. Plan OWASP Top 10

Rol: Arquitecto de Seguridad. Entrada: `docs/04_auditoria_owasp.md`.

No se cambia el mensaje de una solicitud pendiente o rechazada: es una regla de negocio ya publicada. No se mueve el token a una cookie. No se activa la verificación estricta del certificado de Supabase en este incremento, porque `postgres.ts` la tiene desactivada para que la conexión actual funcione.

## Estrategia para preservar funcionalidad

- El login correcto, por debajo del límite, responde igual que hoy.
- Las cabeceras nuevas no alteran el JSON ni el origen CORS.
- El límite del cuerpo se deja en 100 kb, que es el tope que Express ya aplica si no se indica otro.
- Validación: `npm test` en `backend`. Los 13 usos de `/auth/login` del archivo de API quedan bajo el tope de 30.
- Rollback: revertir el commit. No hay migración.

## Roadmap de remediación

1. Este incremento: límite por correo, cabeceras, límite explícito del cuerpo y registro del rechazo sin contraseña.
2. Incremento posterior, con prueba de conexión: verificación del certificado de la base.
3. Incremento posterior, con cambio del cliente Angular: cookie de sesión además del encabezado Bearer, o en su lugar.

## Vulnerabilidades

### O-A1. Límite de intentos de login y de registro

- Riesgo: prueba repetida de contraseñas contra `POST /api/auth/login` y alta masiva en el registro.
- Prioridad: Alto.
- Impacto: cuentas y solicitudes.
- Componentes: `backend/src/infrastructure/http/app.ts` y un límite nuevo junto a los adaptadores de entrada.
- Mitigación: 30 solicitudes por correo cada 15 minutos. La clave es el correo del cuerpo, no la IP compartida del proxy. Al superar el tope, HTTP 429 y el mensaje «Demasiados intentos. Espera un momento e inténtalo de nuevo.»
- Validación: un correo por debajo de 30 sigue entrando. La suite de API no llega al tope.
- Rollback: quitar el middleware de esas dos rutas.
- Este incremento: sí.

### O-M1. Cabeceras mínimas del API

- Riesgo: el navegador no recibe `nosniff`, política de referrer ni restricción de marco en las respuestas del API.
- Prioridad: Medio.
- Impacto: respuestas HTTP del API. El HTML de Angular lo sirve el alojamiento estático, no este middleware.
- Componentes: `createApp`.
- Mitigación: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`.
- Validación: una respuesta del API incluye las tres cabeceras y el mismo cuerpo JSON.
- Rollback: quitar el middleware.
- Este incremento: sí.

### O-L1. Registro de un inicio de sesión rechazado

- Riesgo: no queda rastro de credenciales inválidas.
- Prioridad: Medio.
- Impacto: operación. No cambia el mensaje que ve el usuario.
- Componentes: `IniciarSesion.ts`.
- Mitigación: un aviso de consola «Inicio de sesión rechazado.» sin correo y sin contraseña, solo en el fallo genérico de credenciales.
- Validación: el mensaje HTTP sigue siendo «El correo o la contraseña no son válidos.»
- Rollback: quitar el aviso.
- Este incremento: sí.

### O-M2. Límite explícito del cuerpo JSON

- Riesgo: el tope existe solo como valor por omisión de Express.
- Prioridad: Bajo.
- Impacto: cuerpos de las peticiones.
- Componentes: `express.json` en `createApp`.
- Mitigación: `limit: '100kb'`, igual al valor por omisión actual.
- Validación: las peticiones de la suite, todas pequeñas, siguen en 2xx o en el 4xx de negocio que ya esperan.
- Rollback: volver a `express.json()`.
- Este incremento: sí.

### O-C1. Verificación del certificado de PostgreSQL

- Riesgo: `rejectUnauthorized: false` fuera de localhost.
- Prioridad: Alto.
- Impacto: toda lectura y escritura.
- Componentes: `postgres.ts`.
- Mitigación diferida: probar la cadena de Supabase en un entorno de ensayo antes de rechazar certificados no válidos.
- Validación diferida: `GET /api/health` no basta; hace falta una consulta real de login contra la base publicada.
- Rollback: volver a no verificar.
- Este incremento: no. Aplicarlo ahora puede dejar la aplicación publicada sin base.

### O-A2. Token fuera de sessionStorage

- Riesgo: un XSS futuro podría leer el token.
- Prioridad: Medio.
- Impacto: `auth.service.ts` y todas las llamadas con Bearer.
- Mitigación diferida: cookie `HttpOnly` y `Secure`, manteniendo el encabezado durante la transición.
- Validación diferida: login, recarga y cierre de sesión en el sitio publicado.
- Rollback: volver a `sessionStorage`.
- Este incremento: no. El cliente actual dejaría de enviar la sesión.

## Orden recomendado

O-A1, O-M1, O-L1 y O-M2 en este incremento. O-C1 y O-A2 quedan diferidos.

## Riesgos de implementación

Si el límite contara la IP del proxy, todos los usuarios compartirían el cupo. Por eso la clave es el correo. Treinta intentos en quince minutos cubren la suite (13 llamadas de login en `api.test.ts`) y el uso normal de una persona.
