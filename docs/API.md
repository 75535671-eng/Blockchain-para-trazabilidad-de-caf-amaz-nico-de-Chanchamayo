# API del PMV1

Base: `http://localhost:3000/api`

Las respuestas de error usan `{ "error": "mensaje" }` y no incluyen stack traces.

## Público

### POST /api/auth/register

Crea una solicitud `pendiente`. No crea la cuenta ni devuelve token. La contraseña se guarda solo como hash bcrypt. Incluye `confirmacion` y `telefono`.

### POST /api/auth/login

Devuelve `token`, `usuario` (con `debeCambiarPassword`) y `productorId`. Una solicitud pendiente o rechazada no inicia sesión. Una cuenta `bloqueada` tampoco.

### POST /api/auth/cambiar-contrasena

Requiere sesión. Reemplaza el hash y deja `debe_cambiar_password` en falso. Mientras esa marca esté activa, el resto de rutas autenticadas responde 403.

## Con Bearer token

### Productores

- `POST /api/productores/cuentas` — administrador. Crea la ficha y la cuenta `PRODUCTOR` activa, con cambio obligatorio de contraseña. La respuesta incluye `passwordTemporal` una sola vez.
- `POST /api/productores` — administrador. Ficha sin cuenta. El teléfono es obligatorio y el DNI o RUC no puede repetirse.
- `GET /api/solicitudes`, `POST /api/solicitudes/:id/aprobar` y `POST /api/solicitudes/:id/rechazar` — administrador. Aprobar crea usuario y ficha en una transacción. Rechazar guarda el motivo y conserva la solicitud.
- `GET /api/productores` — administrador ve todos; productor ve el suyo.
- `GET /api/productores/dni/:documento` — administrador. Con un DNI de 8 dígitos o un RUC de 11, consulta el nombre en api.apis.net.pe usando `DNI_API_URL`, `RUC_API_URL` y `DNI_API_TOKEN`. Si la API falla o no encuentra el documento, responde sin nombre y el registro manual sigue disponible.
- `PUT /api/productores/:id` — administrador.
- `DELETE /api/productores/:id` — administrador. Borra en una transacción la ficha, la cuenta vinculada, sus parcelas, lotes, análisis y solicitudes propias. No toca datos de otros productores. Deja un registro de auditoría con la fecha, el administrador y el identificador del productor, sin datos personales.

### Parcelas

- `POST /api/parcelas` — el distrito debe ser La Merced, Perené, Pichanaqui, San Ramón, San Luis de Shuaro, Vitoc o Sangani, y el productor debe existir.
- `GET /api/parcelas`

```json
{
  "productorId": "uuid",
  "nombre": "Parcela Norte",
  "distrito": "San Ramón",
  "localidad": "La Esperanza",
  "areaHectareas": 2.5,
  "altitudMsnm": 1450,
  "latitud": -11.12,
  "longitud": -75.35
}
```

### Lotes

- `POST /api/lotes` — la variedad debe ser Caturra, Typica, Bourbon o Pache.
- `GET /api/lotes`
- `GET /api/lotes/:id` — lote, parcela, productor y último análisis.
- `POST /api/lotes/:id/analisis` — indicador de coherencia del registro.

```json
{
  "parcelaId": "uuid",
  "fechaCosecha": "2026-06-10",
  "cantidadKg": 300,
  "variedad": "Caturra",
  "observaciones": "Primera cosecha"
}
```

El análisis devuelve la consulta del lote con `ultimoAnalisis`: estrategia, clasificación de coherencia del registro (`COHERENTE`, `REVISAR` o `INSUFICIENTE`), resumen, observaciones, confianza y proveedor. No certifica calidad del café. Si el proveedor externo falla, la API responde con error y no guarda un análisis simulado.

### Eventos de trazabilidad

- `POST /api/lotes/:id/eventos` — registra el evento y, si la etapa es beneficio, sus variables en una sola transacción.
- `GET /api/lotes/:id/eventos` — devuelve los eventos del lote por fecha. El productor solo consulta sus lotes.

```json
{
  "etapa": "BENEFICIO",
  "fecha": "2026-08-01",
  "descripcion": "Beneficio lavado hasta pergamino.",
  "metodoBeneficio": "Lavado",
  "humedadPorcentaje": 11.5
}
```

Las etapas son `BENEFICIO`, `TRILLA`, `ALMACENAMIENTO`, `TRASLADO` y `EXPORTACION`. El método es `Lavado`, `Honey` o `Natural`. La humedad va de 0 a 100, con hasta dos decimales. En las etapas distintas de beneficio no se envían variables. La fecha no puede ser anterior a la cosecha ni futura. Una puntuación de catación enviada en el cuerpo se ignora y no se guarda.

- `GET /api/eventos` — eventos visibles para el usuario, ordenados por fecha. El productor solo ve los de sus lotes.

### Predicción de calidad

La predicción no reutiliza el análisis de coherencia. El adaptador de producción no tiene un modelo validado integrado, así que no inventa ni guarda resultados.

- `POST /api/lotes/:id/prediccion` — revisa variedad, altitud, método y humedad del último beneficio. Responde `datos_insuficientes` o `no_disponible`, con `prediccion` en null. Solo persistiría una fila si un modelo real devolviera un resultado.
- `GET /api/lotes/:id/predicciones` — predicciones realmente guardadas de ese lote.
- `GET /api/predicciones` — predicciones visibles para el usuario.
- `GET /api/modelo/evaluacion` — estado de la PoC RF-IA-01. El estado es `NO_CONCLUYENTE`. Las métricas históricas no miden calidad de los lotes del sistema y no incluyen `hash_blockchain_valid`.

### Reportes

- `GET /api/reportes/trazabilidad` — consulta real de lotes visibles. Filtros opcionales: `loteId`, `productorId`, `parcelaId`, `desde` y `hasta` (`YYYY-MM-DD`). Si no hay filas, `disponible` es false y el mensaje es `No hay información disponible para generar el reporte.` Un productor no puede filtrar por otro productor.
