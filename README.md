# Blockchain para la trazabilidad de café amazónico de Chanchamayo

PMV1: validar el problema y una solución inicial de trazabilidad.

El problema es la dificultad para garantizar una trazabilidad integrada y verificable de los lotes de café amazónico de Chanchamayo. Este incremento permite registrar usuarios, productores, parcelas y lotes, consultarlos y pedir un indicador de coherencia del registro. Blockchain, eventos de cadena y QR quedan para PMV2 y PMV3. No hay un cuarto PMV en la documentación actual.

## Arquitectura

Hexagonal. El detalle está en `docs/ARCHITECTURE.md` y los patrones en `docs/DESIGN-PATTERNS.md`.

```
frontend Angular → API Express → caso de uso → dominio → PostgreSQL (Supabase) / API de IA
```

## Tecnologías

- Frontend: Angular, TypeScript, HTML y SCSS.
- Backend: Node.js, Express y TypeScript.
- Base de datos: PostgreSQL en Supabase. El acceso SQL queda en el adaptador del backend.
- Control de versiones: Git y GitHub.
- Pruebas de API: Postman o las pruebas automáticas con Supertest.
- Entorno: Cursor.
- IA: API compatible con OpenAI, llamada solo desde el backend.

## Instalación

Requiere Node.js 22 y un proyecto de Supabase con la migración aplicada.

```bash
cd backend
npm install
cd ../frontend
npm install
```

Copia `.env.example` a `backend/.env`. Completa `DATABASE_URL`, `JWT_SECRET`, `AI_API_KEY`, `SEED_ADMIN_PASSWORD` y `DNI_API_TOKEN`. No subas ese archivo.

Ejecuta `database/migrations/001_pmv1_inicial.sql` en el SQL Editor de Supabase. El detalle está en `database/README.md` y las decisiones en `docs/DECISIONS.md`. Luego:

```bash
cd backend
npm run seed
```

## Ejecución

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm start
```

Frontend: `http://localhost:4200`. API: `http://localhost:3000/api`.

## IA

`AI_API_BASE_URL`, `AI_API_KEY`, `AI_MODEL` y `AI_PROVIDER` definen el proveedor. La clave no se escribe en el código ni se envía al frontend. El indicador revisa la coherencia de los datos ya registrados del lote.

## Pruebas

```bash
cd backend
npm test
```

El pipeline de `.github/workflows/ci.yml` instala, analiza, prueba y construye backend y frontend. No despliega.
