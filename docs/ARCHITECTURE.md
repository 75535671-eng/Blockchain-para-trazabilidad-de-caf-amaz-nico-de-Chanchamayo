# Arquitectura del PMV1

El sistema separa frontend, backend y base de datos.

```
Angular → HTTP → Controller → Input Port → Use Case → Domain
                                              ↓
                                         Output Port
                                              ↓
                                   MySQL Adapter / ExternalAIAdapter
```

El dominio no importa Express, Angular, MySQL, mysql2, Axios ni un SDK de IA.

## Capas

- `backend/src/domain`: entidades, value objects y servicios de negocio.
- `backend/src/application`: casos de uso, DTO y puertos de entrada y salida.
- `backend/src/adapters/in`: controllers y autenticación HTTP.
- `backend/src/adapters/out`: MySQL, hash, JWT y la API externa de IA.
- `backend/src/infrastructure`: configuración, inyección de dependencias y servidor.

## Decisiones de diseño del PMV1

No son requisitos literales de la consigna. Están aquí para poder defenderlas.

- El registro público crea un usuario `PRODUCTOR` y su ficha de productor en la misma transacción. El administrador inicial se crea con `npm run seed`.
- El documento del productor acepta DNI de 8 dígitos o RUC de 11 dígitos.
- La altitud, si se informa, debe estar entre 1 y 6000 m s. n. m. No se impone un recorte geográfico de Chanchamayo.
- La contraseña exige longitud, letras y números. Es una decisión de seguridad, no del café.
- El PMV1 no expone borrado de lotes. No es una regla permanente del dominio; simplemente este incremento no tiene ese caso de uso.
- El token de sesión viaja en el header `Authorization`. El frontend lo guarda en `sessionStorage`.
- `analisis_lotes` persiste el indicador de coherencia para consultarlo con el lote sin repetir la llamada a la IA.

## Extensión hacia PMV2 y PMV3

PMV2 puede agregar un puerto de eventos de trazabilidad y un puerto de blockchain como nuevos adapters. El lote ya tiene `estado`, hoy escrito como `REGISTRADO`.

PMV3 puede agregar validación de registros, QR, seguridad, rendimiento y usabilidad sobre los mismos puertos. Esos componentes no se implementan ahora. No hay un cuarto PMV en la documentación actual.
