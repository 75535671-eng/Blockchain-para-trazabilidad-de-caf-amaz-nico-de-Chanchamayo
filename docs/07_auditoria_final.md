# 07. Auditoría final integral

Rol: Auditor principal de calidad y seguridad. Entradas: `docs/03_auditoria_implementacion_furps.md`, `docs/06_auditoria_implementacion_owasp.md` y el árbol de trabajo del 13 de noviembre de 2026.

## Resumen ejecutivo

El incremento aplicó lo que los planes marcaron como seguro: nombres accesibles en el login, el párrafo de predicción alineado con `PredictorCalidadPrueba`, cabeceras del API, tope explícito de 100 kb, aviso de login rechazado sin secretos y un límite de intentos por correo dentro del proceso. La paginación, la verificación del certificado de la base y la cookie de sesión quedaron fuera, con evidencia de que el código anterior sigue en su sitio.

La suite del backend terminó en 42 pruebas aprobadas. El contrato de las rutas no cambió. El sistema puede seguir operando. No está cerrado en calidad ni en seguridad.

## Estado de calidad

Cumple parcialmente FURPS+.

- F-U1 y F-S1 están implementadas.
- F-P1 no está implementada: los listados siguen completos.
- Reliability no cambió: no hay reintento si la base o la IA fallan.
- El puntaje inicial fue 74 / 100. Performance sigue en 3,0 / 5, así que el cumplimiento global no pasa a completo.

## Estado de seguridad

Cumple parcialmente OWASP Top 10.

- Score de la auditoría 04: 6,1 / 10.
- Score de la auditoría 06, con el código de este incremento: 6,5 / 10 (65 / 100).
- O-M1, O-L1 y O-M2 están corregidas en el alcance del plan.
- O-A1 está parcialmente corregida: el cupo es por proceso, no entre instancias.
- O-C1 y O-A2 no están corregidas.
- No hay un hallazgo Crítico con explotación evidenciada en el repositorio.
- No se afirma un conteo de avisos de `npm audit`: la consulta de la auditoría 04 no completó.

## Funcionalidad

Se preservó la funcionalidad existente.

- Login, registro, listados y predicción conservan rutas, cuerpos y mensajes de negocio.
- El mensaje de solicitud pendiente o rechazada no se unificó con el de credenciales inválidas.
- La corrida `npx vitest run` en `backend` dio 42 aprobadas y 0 fallidas.
- No hay migración ni cambio de esquema.

Riesgo de regresión: bajo en este incremento. El límite de intentos puede responder 429 a un mismo correo dentro de un proceso después de 30 envíos en 15 minutos. Ese es el comportamiento pedido, no una rotura del login normal. La suite de API, con 13 usos de login, quedó por debajo de ese tope.

## Riesgo operativo

Medio.

El API publicado sigue, hasta un despliegue de este árbol, sin las cabeceras ni el límite de intentos. Aunque se despliegue, la verificación del certificado de PostgreSQL sigue desactivada fuera de localhost y el tope de intentos no se comparte entre procesos. Esos dos puntos sostienen el nivel medio. No se observó un fallo que deje el sistema actual inutilizable.

## Riesgos pendientes

1. Listados sin tope ni paginación.
2. `rejectUnauthorized: false` hacia la base cuando el host no es local.
3. Token en `sessionStorage`.
4. Límite de intentos solo en la memoria de cada proceso, con claves que no se purgan.
5. Bitácora de rechazos solo en consola, sin correo y sin almacén durable.
6. RLS activo y sin políticas, omitido por el rol del backend.
7. Consulta de componentes vulnerables no verificada en esta sesión.

## Observaciones

- Los controles nuevos están en el árbol de trabajo. No forman parte del despliegue publicado hasta que se publique este incremento.
- El mapa de intentos y las cabeceras no alteran el JSON de una petición aceptada.
- No se mezcló en este dictamen ningún entregable distinto de FURPS+ y OWASP.

## Recomendación final

Apto para producción con observaciones.

El flujo de negocio que ya está publicado se mantiene, las pruebas críticas del backend pasan y no queda un hallazgo Crítico abierto dentro de lo que este incremento podía corregir sin romper la conexión o la sesión. Las observaciones de certificado, sesión en el navegador, listados sin tope y límite de intentos no distribuido siguen abiertas y tienen que ir en el incremento siguiente, con prueba de conexión y de cliente antes de tocarlas.
