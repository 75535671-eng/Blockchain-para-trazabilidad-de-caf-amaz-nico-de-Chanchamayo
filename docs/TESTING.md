# Pruebas del PMV1

El dominio se prueba sin PostgreSQL y sin la API de IA.

- `backend/tests/domain`: value objects, factory, estrategias y ausencia de imports prohibidos.
- `backend/tests/application`: casos de uso con repositorios en memoria. Incluye el rechazo de una respuesta de IA inválida, sin persistirla.
- `backend/tests/api`: flujo HTTP con Supertest y un adaptador de IA sustituido por una respuesta fija.

Ejecución:

```bash
cd backend
npm test
```

Los repositorios PostgreSQL se ejercitan al usar la API contra Supabase. No forman parte del pipeline porque el CI no levanta PostgreSQL ni llama a la API de IA.

## Criterios cubiertos por las pruebas automáticas

- Registro de productor, parcela y lote con identificador `CHNY-`.
- El lote consultado referencia su parcela.
- Un análisis con clasificación desconocida no se guarda.
- La API recorre una cuenta de productor, el cambio de contraseña temporal, parcela, lote, consulta y análisis.
- Una solicitud pública queda pendiente, no inicia sesión, y solo entra después de que un administrador la aprueba. El rechazo guarda el motivo y no da acceso.
- Un productor no puede eliminar productores. Un administrador sí, y desaparecen la cuenta, las parcelas y los lotes de ese productor. Los de otro productor permanecen. Si el productor no existe, la respuesta es un error.

La colección manual para Postman sigue los cuerpos descritos en `docs/API.md`.
