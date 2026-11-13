# 06. Auditoría de implementación OWASP

Rol: Auditor independiente de seguridad. Entradas: `docs/04_auditoria_owasp.md`, `docs/05_plan_owasp.md` y el árbol de trabajo del 13 de noviembre de 2026.

No se da por corregida una vulnerabilidad que no esté en el código leído. La auditoría inicial puntuó 6,1 / 10 y no se modificó código para emitirla. Esta revisión mira el código posterior al plan.

## Estado de cada vulnerabilidad

### O-A1. Límite de intentos de login y de registro

Estado: parcialmente corregida.

Evidencia:

- `backend/src/adapters/in/http/limite.ts` cuenta por el campo `email` del cuerpo, en minúsculas, con tope y ventana. No usa la IP.
- `createApp` aplica ese middleware, con 30 intentos y 15 minutos, solo en `POST /api/auth/login` y `POST /api/auth/register`, después de `express.json`.
- Al superar el tope responde 429 y `{ error: "Demasiados intentos. Espera un momento e inténtalo de nuevo." }`.
- `tests/adapters/limite.test.ts` cubre el paso del segundo intento y el rechazo del tercero con un tope de prueba de 2.

Lo que falta para darla por corregida: el mapa vive en la memoria de un proceso. No se comparte entre instancias ni sobrevive a un reinicio. En un alojamiento que levanta varios procesos, cada uno tiene su propio cupo de 30. Las claves que ya no se consultan no se borran del mapa.

### O-M1. Cabeceras mínimas del API

Estado: corregida en el alcance del plan.

Evidencia: el middleware de `backend/src/infrastructure/http/app.ts` envía `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` y `X-Frame-Options: DENY` en las respuestas del API Express.

El HTML de Angular no pasa por este middleware. El plan acotó el control al API.

### O-L1. Registro de un inicio de sesión rechazado

Estado: corregida en el alcance del plan.

Evidencia: `IniciarSesion.ts` escribe `console.warn('Inicio de sesión rechazado.')` solo en el fallo genérico de credenciales, después de los mensajes de solicitud pendiente o rechazada. El texto no incluye correo ni contraseña. El error que ve el usuario sigue siendo «El correo o la contraseña no son válidos.»

La suite lo mostró en stderr en los casos que ya rechazaban credenciales, y esas pruebas siguieron aprobadas.

El aviso queda en la consola del proceso. No hay tabla ni servicio de bitácora. El plan no pedía más que ese aviso.

### O-M2. Límite explícito del cuerpo JSON

Estado: corregida.

Evidencia: `express.json({ limit: '100kb' })` en `createApp`. Es el mismo tope que Express aplica si no se indica otro. Las 8 pruebas de `tests/api/api.test.ts` siguieron aprobadas.

### O-C1. Verificación del certificado de PostgreSQL

Estado: no corregida.

Evidencia: `backend/src/infrastructure/configuration/postgres.ts` mantiene `rejectUnauthorized: false` cuando el host no es local. El plan la dejó fuera de este incremento.

### O-A2. Token fuera de sessionStorage

Estado: no corregida.

Evidencia: `frontend/src/app/core/auth.service.ts` sigue guardando y leyendo el token con `sessionStorage`. El plan la dejó fuera de este incremento.

## Hallazgos nuevos del cambio

- El mapa de `limite.ts` no expira claves inactivas. Un volumen grande de correos distintos retiene una entrada por correo hasta que el proceso termina. Severidad baja: es memoria del proceso, no datos de contraseña.
- El mismo contador sirve para login y registro. Un correo que agota el cupo en una ruta queda bloqueado también en la otra durante la ventana. Está dentro de lo escrito en el plan y no cambia el mensaje de una solicitud pendiente o rechazada.

No se observó un cambio del mensaje de negocio de solicitud pendiente o rechazada. No se movió el token a una cookie. No se activó la verificación estricta del certificado.

## Regresiones

`npx vitest run` en `backend`: 42 pruebas aprobadas, 0 fallidas. Las rutas autenticadas y los cuerpos documentados no cambiaron. Un login por debajo de 30 intentos en la misma instancia sigue el flujo anterior.

## Score actualizado

Se mantienen los puntajes de la auditoría 04 donde el código no cambió. Se mueven solo las categorías con evidencia nueva.

| Categoría | Antes | Ahora | Motivo |
| --- | --- | --- | --- |
| Broken Access Control | 7,5 | 7,5 | Sin cambio |
| Cryptographic Failures | 6 | 6 | `rejectUnauthorized: false` sigue |
| Injection | 8 | 8 | Sin cambio |
| Insecure Design | 6,5 | 6,5 | Sin cambio |
| Security Misconfiguration | 4 | 5,5 | Cabeceras y tope de 100 kb presentes. RLS sin políticas sigue |
| Vulnerable Components | 6 | 6 | `npm audit` no se pudo completar en la auditoría 04 y no se repitió aquí. No hay CVE contado |
| Authentication Failures | 5,5 | 6,5 | Hay límite por correo en el proceso. El token sigue en `sessionStorage` y el cupo no es global |
| Integrity Failures | 7 | 7 | Sin cambio |
| Logging Failures | 4 | 5 | Hay aviso de rechazo, sin identificador y solo en consola |
| SSRF | 7 | 7 | Sin cambio |

Promedio: (7,5 + 6 + 8 + 6,5 + 5,5 + 6 + 6,5 + 7 + 5 + 7) / 10 = **6,5 / 10** (65 / 100).

Cumplimiento: parcial. No hay hallazgo Crítico nuevo. El hallazgo Alto de fuerza bruta quedó atenuado dentro de un proceso y no eliminado entre instancias. El hallazgo Medio del certificado sigue igual.

## Riesgos residuales

- Fuerza bruta repartida entre varias instancias del API.
- Sesión TLS hacia la base sin verificación del certificado.
- Token legible por script en `sessionStorage` si apareciera XSS.
- Crecimiento del mapa de intentos en un proceso de larga vida.
- El sitio publicado no tiene estos controles hasta que se despliegue este árbol.

## Conclusión

De las cuatro remediaciones previstas para este incremento, tres están aplicadas en el alcance escrito (O-M1, O-L1, O-M2) y O-A1 está aplicada a medias por el almacén en memoria. O-C1 y O-A2 siguen abiertas, como el plan lo dejó. No se observó una regresión funcional en la suite.
