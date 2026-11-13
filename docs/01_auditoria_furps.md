# 01. Auditoría FURPS+

Rol: Auditor Senior de Calidad de Software. Fecha de evidencia: 13 de noviembre de 2026. No se modificó código para emitir este informe.

Escala por categoría: 0 a 5. El puntaje global es el promedio sobre 100.

## Resumen ejecutivo

El sistema de trazabilidad de café de Chanchamayo cubre el flujo de negocio que está en la API y en la interfaz: cuentas, productores, parcelas, lotes, eventos, reporte, predicción de prueba y verificación de integridad. La arquitectura separa dominio, casos de uso y adaptadores. La calidad es parcial: la funcionalidad principal está, y quedan brechas de accesibilidad en el inicio de sesión, listados sin tope y una frase de `docs/API.md` que ya no describe el predictor que usa el contenedor de producción.

Puntaje global: **74 / 100**. Cumplimiento: parcial.

| Categoría | Puntaje | Lectura |
| --- | --- | --- |
| Functionality | 4,2 / 5 | Flujos principales presentes |
| Usability | 3,2 / 5 | Retroalimentación clara; el login no nombra los campos |
| Reliability | 4,0 / 5 | Errores de dominio controlados; sin reintentos |
| Performance | 3,0 / 5 | Hay índices; los listados no tienen tope |
| Supportability | 4,2 / 5 | Hexágono, pruebas y CI; un documento quedó desactualizado |

## Functionality

Implementado, con evidencia de rutas en `backend/src/infrastructure/http/app.ts`:

- Registro, inicio de sesión, sesión y cambio de contraseña.
- Productores, solicitudes, parcelas y lotes, con alta, consulta, actualización y baja.
- Eventos de trazabilidad, historial y verificación de anclaje.
- Predicción de calidad y estimación de trazabilidad.
- Reporte de trazabilidad y evaluación de los dos modelos de prueba.
- Salud del servicio en `GET /api/health`.

Parcial:

- La predicción usa `PredictorCalidadPrueba` en `backend/src/infrastructure/configuration/container.ts`. `docs/API.md` todavía dice que el adaptador de producción no tiene un modelo integrado y que no guarda resultados. El código y el documento no dicen lo mismo.
- La cadena de anclaje es de prueba (`CadenaPruebaAnclaje`), no una red pública. Está declarado en el propio adaptador.

Ausente en este código, y no se cuenta como fallo de lo ya construido porque la documentación de arquitectura lo deja fuera del incremento actual:

- Código QR.
- Red pública de blockchain.

Cobertura de negocio: el recorrido productor, parcela, lote, beneficio y etapas posteriores se puede registrar y consultar. La autorización de productor frente a administrador está en los casos de uso (`lotesVisibles.ts`, `ProductorUseCases.ts`).

## Usability

- Hay un tema claro y uno oscuro (`frontend/src/app/core/tema.service.ts`) y mensajes de error visibles en las pantallas de lotes, parcelas, eventos, reportes e inteligencia.
- El menú móvil expone `aria-expanded` y `aria-label` en `frontend/src/app/app.component.html`.
- El registro nombra los campos con texto visible en `frontend/src/app/features/auth/registro.component.html`.
- El inicio de sesión, en `frontend/src/app/features/auth/login.component.html`, envuelve los campos en `label`, pero el único texto es un icono con `aria-hidden="true"`. El nombre visible es el `placeholder`. El botón que muestra la contraseña dice «Ver» u «Ocultar» y no tiene `aria-label`.

## Reliability

- `manejarError` en `backend/src/adapters/in/http/http.ts` responde 400, 403, 404 o 409 según el error de dominio, y 500 con un mensaje genérico. El stack no sale en el JSON.
- Aprobar una solicitud, eliminar un productor y asignar una cuenta usan `transaccion` en `PostgresRepositories.ts`.
- La consulta de DNI y la llamada a la IA tienen tiempo máximo (`ConsultaDniAdapter.ts`, `ExternalAIAdapter.ts`). Si fallan, el registro manual sigue y el análisis no se inventa.
- No hay reintento ni cola si la base o la IA no responden.

## Performance

- Las migraciones crean índices por productor, parcela, lote, evento y predicción.
- `GET /api/lotes`, `GET /api/productores`, `GET /api/parcelas` y `GET /api/eventos` devuelven el conjunto completo. Con la carga de prueba (200 lotes y 800 eventos) el cliente recibe todo el listado en una respuesta.
- Cada consulta del adaptador es una llamada a una función de PostgreSQL. No se observó una consulta construida por concatenación de entrada del usuario.

## Supportability

- El dominio no importa Express, `pg` ni Angular. Lo comprueba `backend/tests/domain/dominio.test.ts`.
- Los adaptadores no contienen `SELECT`, `INSERT`, `UPDATE`, `DELETE` ni `FROM`. Lo comprueba `backend/tests/architecture/adaptadores.test.ts`.
- El flujo de `.github/workflows/ci.yml` instala, analiza, prueba y compila backend y frontend con Node 22.
- La última corrida local de Vitest, previa a cualquier cambio de esta auditoría, dejó 41 pruebas aprobadas.
- `docs/API.md` quedó detrás del contenedor en el párrafo de predicción.

## Brechas

1. El inicio de sesión no da un nombre accesible a correo, contraseña y al control de visibilidad.
2. Los listados no tienen paginación ni un tope de filas.
3. `docs/API.md` describe un predictor no integrado que el contenedor ya no usa.

## Riesgos

- Un lector del API puede creer que la predicción no se guarda, y operar el sistema con esa premisa.
- Un listado que crezca por encima de la carga de prueba aumenta el tiempo de respuesta y el tamaño de la página.
- Un lector de pantalla puede no anunciar los campos del login.

## Recomendaciones de alto nivel

Corregir el nombre accesible del login y la frase desactualizada del API antes de tocar contratos. Dejar la paginación para un incremento que cambie a la vez el cliente y el servidor, porque hoy la interfaz espera el arreglo completo.
