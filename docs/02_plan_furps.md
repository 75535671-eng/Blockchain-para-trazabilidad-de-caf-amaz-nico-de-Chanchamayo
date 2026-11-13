# 02. Plan FURPS+

Rol: Arquitecto de Software. Entrada: `docs/01_auditoria_furps.md`.

El sistema ya funciona y está publicado. Ninguna acción de este plan cambia el contrato de los listados ni el aspecto general de las pantallas.

## Estrategia de preservación

- No se modifican rutas, cuerpos ni códigos de estado ya documentados, salvo el texto de un documento.
- Los cambios de interfaz se limitan a atributos de accesibilidad. Los textos visibles del login se mantienen.
- La paginación queda fuera de este incremento.
- Validación: `npm test` en `backend` y revisión del HTML del login.
- Rollback: revertir el commit de este incremento. No hay migración de datos.

## Roadmap

1. Este incremento: nombre accesible del login y corrección de `docs/API.md`.
2. Incremento posterior, con cambio coordinado de API y Angular: tope o paginación de listados.

## Mejoras priorizadas

### F-U1. Nombre accesible en el inicio de sesión

- Objetivo: que correo, contraseña y el botón de visibilidad tengan un nombre que no dependa solo del placeholder.
- Justificación: brecha de Usability en `frontend/src/app/features/auth/login.component.html`.
- Prioridad: Media.
- Riesgo: bajo. No cambia la validación ni el envío del formulario.
- Dependencias: ninguna.
- Validación: el HTML del login contiene `aria-label` en los dos campos y en el botón. El placeholder visible no cambia.
- Rollback: quitar esos atributos.
- Este incremento: sí.

### F-S1. Alinear la documentación de la predicción

- Objetivo: que `docs/API.md` describa el predictor que instancia `container.ts`.
- Justificación: el contenedor usa `PredictorCalidadPrueba` y el documento dice que no hay modelo integrado.
- Prioridad: Baja.
- Riesgo: bajo. No cambia código de ejecución.
- Dependencias: ninguna.
- Validación: el párrafo de predicción menciona el modelo de prueba y que el resultado no certifica la taza.
- Rollback: restaurar el párrafo anterior.
- Este incremento: sí.

### F-P1. Tope de los listados

- Objetivo: evitar que `GET /api/lotes` y los listados vecinos crezcan sin límite.
- Justificación: brecha de Performance. Hoy devuelven el conjunto completo y Angular lo recorre.
- Prioridad: Media.
- Riesgo: alto si se aplica ahora. El cliente trata la respuesta como un arreglo, no como una página.
- Dependencias: cambio simultáneo de `app.ts`, los repositorios y los componentes de lista.
- Validación, cuando se haga: las pantallas de lotes, parcelas y productores siguen mostrando los registros actuales, incluida la carga de prueba.
- Rollback: volver a la respuesta de arreglo completo.
- Este incremento: no.

## Orden recomendado

F-U1, después F-S1. F-P1 queda diferida.

## Riesgos de ejecución

El único riesgo funcional de lo que sí se aplica es un atributo mal escrito que deje el formulario igual de usable que hoy. No hay cambio de persistencia.

## Estrategia de preservación de funcionalidad

Inicio de sesión, registro, lotes y predicción se ejercitan con la suite existente. No se agregan campos obligatorios ni se ocultan controles.
