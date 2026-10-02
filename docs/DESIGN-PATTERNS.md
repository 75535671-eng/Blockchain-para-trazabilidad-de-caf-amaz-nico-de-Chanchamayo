# Patrones de diseño del PMV1

Los cinco patrones resuelven una necesidad del incremento. No decoran el código.

## Repository

Problema: los casos de uso necesitan guardar y consultar usuarios, productores, parcelas, lotes y análisis sin conocer SQL.

Dónde: `backend/src/application/ports/output/OutputPorts.ts` define los puertos. `backend/src/adapters/out/persistence/PostgresRepositories.ts` los implementa.

Por qué: el dominio y la aplicación se prueban con repositorios en memoria. PostgreSQL puede cambiarse sin tocar las reglas del lote.

Ejemplo: `RegistrarLote` depende de `LoteRepositoryPort`. En producción lo implementa `PostgresLoteRepository`.

## Dependency Injection

Problema: si el caso de uso crea `new PostgresLoteRepository()`, queda atado a PostgreSQL.

Dónde: `backend/src/infrastructure/configuration/container.ts` es la composición. Los constructores de los casos de uso reciben interfaces.

Por qué: las pruebas arman otro contenedor con dobles en memoria y un adaptador de IA falso.

Ejemplo: `createProductionContainer()` inyecta repositorios PostgreSQL, `BcryptPasswordHasher`, `JwtTokenProvider` y `ExternalAIAdapter`.

## Factory Method

Problema: crear un lote exige identificador único, fecha de cosecha válida y asociación con una parcela. Esa creación no debe repetirse en el controller.

Dónde: `backend/src/domain/services/LoteFactory.ts`.

Por qué: centraliza el formato `CHNY-AAAA-XXXXXXXX` y las invariantes del lote.

Ejemplo: `RegistrarLote` llama a `LoteFactory.crear(...)`. El controller solo envía los datos de entrada.

## Strategy

Problema: el indicador de coherencia no puede tratar igual una parcela con altitud y una sin altitud. Si no hay altitud, el análisis no debe inventarla.

Dónde: `backend/src/domain/services/analisis/EstrategiasAnalisis.ts`.

Por qué: `EstrategiaConAltitud` incluye la altitud como contexto. `EstrategiaSinAltitud` prohíbe inferirla y la confianza del dominio no supera MEDIA. `SelectorEstrategiaAnalisis` elige según el dato real de la parcela.

Ejemplo: `AnalizarLote` no contiene un condicional de negocio sobre la altitud. Pide la estrategia al selector.

## Adapter

Problema: la API de IA y PostgreSQL hablan otro idioma que el núcleo.

Dónde: `ExternalAIAdapter` en `backend/src/adapters/out/ai/ExternalAIAdapter.ts` implementa `AIServicePort`. Los repositorios PostgreSQL implementan los puertos de persistencia. Los controllers traducen HTTP a comandos.

Por qué: el proveedor se cambia con `AI_API_BASE_URL`, `AI_MODEL` y `AI_PROVIDER`, sin modificar el caso de uso. La clave permanece en el entorno del backend.

Ejemplo: `AnalizarLote` llama a `AIServicePort.completar`. El adaptador hace el HTTP y devuelve la clasificación, el resumen y las observaciones.
