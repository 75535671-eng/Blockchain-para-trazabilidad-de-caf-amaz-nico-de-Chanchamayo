# API del PMV1

Base: `http://localhost:3000/api`

Las respuestas de error usan `{ "error": "mensaje" }` y no incluyen stack traces.

## Público

### POST /api/auth/register

Crea un usuario productor y su ficha.

```json
{
  "nombre": "Ana Quispe",
  "email": "ana@example.com",
  "password": "Cafe1234",
  "documento": "12345678",
  "telefono": "964000000",
  "organizacion": "Cooperativa Valle"
}
```

### POST /api/auth/login

```json
{ "email": "ana@example.com", "password": "Cafe1234" }
```

Devuelve `token`, `usuario` y `productorId`.

## Con Bearer token

### Productores

- `POST /api/productores` — administrador. HU-002.
- `GET /api/productores` — administrador ve todos; productor ve el suyo.
- `PUT /api/productores/:id` — administrador.

### Parcelas

- `POST /api/parcelas`
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

- `POST /api/lotes`
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

El análisis devuelve la consulta del lote con `ultimoAnalisis`: estrategia, clasificación (`COHERENTE`, `REVISAR` o `INSUFICIENTE`), resumen, observaciones, confianza y proveedor.
