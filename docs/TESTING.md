# Pruebas del PMV1

El dominio se prueba sin MySQL y sin la API de IA.

- `backend/tests/domain`: value objects, factory, estrategias y ausencia de imports prohibidos.
- `backend/tests/application`: casos de uso con repositorios en memoria. Incluye el rechazo de una respuesta de IA inválida, sin persistirla.
- `backend/tests/api`: flujo HTTP con Supertest y un adaptador de IA sustituido por una respuesta fija.

Ejecución:

```bash
cd backend
npm test
```

Los repositorios MySQL se ejercitan al usar la API contra XAMPP. No forman parte del pipeline porque el CI no levanta MySQL.

## Criterios cubiertos por las pruebas automáticas

- Registro de productor, parcela y lote con identificador `CHNY-`.
- El lote consultado referencia su parcela.
- Un análisis con clasificación desconocida no se guarda.
- La API recorre registro, login, parcela, lote, consulta y análisis.

La colección manual para Postman sigue los cuerpos descritos en `docs/API.md`.
