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
