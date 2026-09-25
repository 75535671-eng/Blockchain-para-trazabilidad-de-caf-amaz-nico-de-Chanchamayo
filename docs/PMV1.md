# PMV1 — Validar el problema y la solución inicial

Problema: dificultad para garantizar una trazabilidad integrada y verificable de los lotes de café amazónico de Chanchamayo.

Este incremento cubre usuarios, autenticación, productores, parcelas, lotes, registro, consulta, arquitectura hexagonal e IA. No implementa eventos de cadena, blockchain, Polygon, contratos ni QR.

## Historias y criterios

### HU-001

Como usuario autorizado necesito registrarme e iniciar sesión para acceder de forma segura a las funcionalidades del sistema.

- Given un correo que no existe, when la persona se registra con datos válidos, then el sistema crea un usuario productor y su ficha.
- Given credenciales válidas, when inicia sesión, then recibe un token.
- Given credenciales inválidas, when inicia sesión, then el acceso se rechaza.

### HU-002

Como administrador necesito registrar y gestionar productores para mantener actualizada la información de los participantes.

- Given un administrador autenticado, when registra un productor, then el productor queda disponible para consulta.
- Given un productor autenticado, when intenta registrar productores, then el sistema lo rechaza.
- Given un productor existente, when el administrador actualiza nombre, teléfono u organización, then la ficha cambia y el documento se conserva.

### HU-003

Como productor necesito registrar información de mi parcela para asociarla con la producción de café.

- Given un productor autenticado, when registra una parcela propia, then la parcela queda ligada a ese productor.
- Given un productor, when intenta usar el identificador de otro productor, then el sistema lo rechaza.

### HU-004

Como productor necesito registrar un lote de café asociado a una parcela para identificar su origen.

- Given una parcela registrada, when el productor registra un lote, then el sistema genera un identificador único y relaciona el lote con la parcela.
- Given un lote registrado, when se consulta, then se ve el lote junto con su parcela y su productor.

## IA del PMV1

Problema que atiende: el registro inicial puede guardarse con cifras que no se sostienen entre sí, y todavía no existen eventos posteriores para contrastarlo.

Datos que recibe: código, variedad, fecha, kilogramos, observaciones, parcela, distrito, localidad, área, altitud si existe, nombre del productor y organización. No recibe documento, correo ni contraseña.

Indicador: clasificación de coherencia del registro (`COHERENTE`, `REVISAR` o `INSUFICIENTE`), un resumen y observaciones. La confianza (`BAJA`, `MEDIA`, `ALTA`) la calcula el dominio según los datos presentes, no el modelo.

Validación: si la respuesta no trae una clasificación o un resumen válido, no se guarda.

Valor: antes de ampliar la cadena, el usuario puede ver si el origen registrado merece revisión.

`analisis_lotes` existe para conservar ese resultado y mostrarlo en la consulta del lote.

## Trazabilidad

| Historia | Caso de uso | Input port | Adapter de salida |
|---|---|---|---|
| HU-001 | RegistrarUsuario, IniciarSesion | RegistrarUsuarioUseCase, IniciarSesionUseCase | RegistroCuentaProductorPort, UsuarioRepositoryPort, PasswordHasherPort, TokenProviderPort |
| HU-002 | RegistrarProductor, ListarProductores, ActualizarProductor | mismos nombres UseCase | ProductorRepositoryPort |
| HU-003 | RegistrarParcela, ListarParcelas | mismos nombres UseCase | ParcelaRepositoryPort |
| HU-004 | RegistrarLote, ListarLotes, ConsultarLote | mismos nombres UseCase | LoteRepositoryPort, LoteFactory |
| IA | AnalizarLote | AnalizarLoteUseCase | AIServicePort → ExternalAIAdapter, AnalisisLoteRepositoryPort |

Los controllers viven en `backend/src/adapters/in/controllers/Controllers.ts`. El frontend consume esas rutas desde `frontend/src/app`.
