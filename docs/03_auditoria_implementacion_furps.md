# 03. Auditoría de implementación FURPS+

Rol: Auditor independiente. Entradas: `docs/01_auditoria_furps.md`, `docs/02_plan_furps.md` y el árbol de trabajo del 13 de noviembre de 2026.

No se da por aplicada ninguna mejora que no esté en un archivo leído o en la corrida de pruebas de esta revisión.

## Comparación antes / después

| Categoría | Antes (`01`) | Después de este incremento |
| --- | --- | --- |
| Functionality | 4,2 / 5. El párrafo de predicción no coincidía con el contenedor | El párrafo de `docs/API.md` coincide con `PredictorCalidadPrueba`. Las rutas no cambiaron |
| Usability | 3,2 / 5. El login no nombraba correo, contraseña ni el control de visibilidad | Esos tres controles tienen `aria-label`. El texto visible sigue igual |
| Reliability | 4,0 / 5 | Sin cambio. Sigue sin reintentos ni cola |
| Performance | 3,0 / 5. Listados sin tope | Sin cambio. F-P1 no se aplicó |
| Supportability | 4,2 / 5. El API documentado iba detrás del contenedor | El documento de predicción quedó alineado. La suite pasó de 41 a 42 pruebas |

Puntaje global de la auditoría inicial: 74 / 100. Con las dos mejoras de este incremento y la paginación todavía abierta, el cumplimiento sigue siendo parcial. No se recalcula un entero nuevo: Performance no se movió.

## Estado de cada mejora

### F-U1. Nombre accesible en el inicio de sesión

Estado: implementada.

Evidencia en `frontend/src/app/features/auth/login.component.html`:

- El correo conserva el placeholder «Correo electrónico» y tiene `aria-label="Correo electrónico"`.
- La contraseña conserva el placeholder «Contraseña» y tiene `aria-label="Contraseña"`.
- El botón de visibilidad conserva el texto «Ver» u «Ocultar» y recibe `aria-label` «Mostrar contraseña» u «Ocultar contraseña».

No se agregaron campos ni se cambió el envío del formulario.

### F-S1. Alinear la documentación de la predicción

Estado: implementada.

Evidencia:

- `backend/src/infrastructure/configuration/container.ts` instancia `PredictorCalidadPrueba`.
- `docs/API.md`, sección «Predicción de calidad», dice que el contenedor de producción usa el modelo de prueba exportado de la PoC, que la respuesta puede ser `disponible` y que el resultado no certifica la calidad en taza.

El párrafo ya no afirma que no hay modelo integrado ni que no se guardan resultados.

### F-P1. Tope de los listados

Estado: no implementada.

Evidencia: `GET /api/lotes`, `GET /api/productores`, `GET /api/parcelas` y `GET /api/eventos` en `backend/src/infrastructure/http/app.ts` siguen sin parámetro de página ni de tope. El plan la dejó fuera de este incremento. No se observó un cambio a medias.

## Regresiones y pruebas

- `npx vitest run` en `backend`, 13 de noviembre de 2026: 11 archivos, 42 pruebas aprobadas, 0 fallidas. La prueba nueva es `tests/adapters/limite.test.ts` y pertenece al incremento de seguridad, no a FURPS.
- No cambió el contrato de listados, login, registro ni predicción.
- No hay migración.

No se ejecutó el navegador: el cambio de interfaz son tres atributos y el texto visible del login no cambió. La evidencia es el HTML leído.

## Riesgos residuales

- Los listados siguen devolviendo el conjunto completo. Con la carga de prueba eso ya es un volumen visible.
- Reliability no se tocó: si la base o la IA no responden, no hay reintento.
- El código de este incremento está en el árbol de trabajo. El sitio publicado no lo incluye hasta un despliegue.

## Conclusión de cumplimiento

El plan FURPS+ de este incremento se cumplió en lo que debía aplicarse: F-U1 y F-S1 están en el código y en el documento. F-P1 permanece diferida, como el propio plan indicaba. Cumplimiento del plan: completo para el alcance de este incremento. Cumplimiento FURPS+ del sistema: parcial, por la paginación y la ausencia de reintentos.
