$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Esc([string]$s) {
  if ($null -eq $s) { return "" }
  return [System.Security.SecurityElement]::Escape($s)
}

function Run([string]$text, [int]$size, [bool]$bold, [string]$font) {
  $b = ""
  if ($bold) { $b = "<w:b/>" }
  $safe = Esc $text
  return "<w:r><w:rPr><w:rFonts w:ascii=`"$font`" w:hAnsi=`"$font`" w:cs=`"$font`"/><w:sz w:val=`"$size`"/><w:szCs w:val=`"$size`"/><w:color w:val=`"000000`"/>$b</w:rPr><w:t xml:space=`"preserve`">$safe</w:t></w:r>"
}

function Para([string]$text, [int]$size, [bool]$bold, [string]$font, [int]$before, [int]$after, [string]$align) {
  $jc = ""
  if ($align) { $jc = "<w:jc w:val=`"$align`"/>" }
  return "<w:p><w:pPr><w:spacing w:before=`"$before`" w:after=`"$after`"/>$jc</w:pPr>$(Run $text $size $bold $font)</w:p>"
}

function Title([string]$text) { Para $text 36 $true "Calibri" 0 200 "center" }
function Sub([string]$text) { Para $text 22 $false "Calibri" 0 360 "center" }
function H([string]$text) { Para $text 28 $true "Calibri" 360 120 "left" }
function Body([string]$text) { Para $text 24 $false "Calibri" 0 120 "left" }
function Bullet([string]$text) { Para ("•  " + $text) 24 $false "Calibri" 40 40 "left" }
function Code([string]$text) { Para $text 20 $false "Consolas" 40 40 "left" }

function Doc([string]$path, [string[]]$blocks) {
  $body = ($blocks -join "") + "<w:sectPr><w:pgSz w:w=`"12240`" w:h=`"15840`"/><w:pgMar w:top=`"1134`" w:right=`"1134`" w:bottom=`"1134`" w:left=`"1134`"/></w:sectPr>"
  $document = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>$body</w:body>
</w:document>
"@
  $styles = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:color w:val="000000"/><w:sz w:val="24"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="120"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
</w:styles>
"@
  $contentTypes = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
"@
  $rels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"@
  $docRels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"@
  $tmp = Join-Path $env:TEMP ("docx-" + [guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Path (Join-Path $tmp "_rels") | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $tmp "word\_rels") | Out-Null
  [IO.File]::WriteAllText((Join-Path $tmp "[Content_Types].xml"), $contentTypes, [Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText((Join-Path $tmp "_rels\.rels"), $rels, [Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText((Join-Path $tmp "word\document.xml"), $document, [Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText((Join-Path $tmp "word\styles.xml"), $styles, [Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText((Join-Path $tmp "word\_rels\document.xml.rels"), $docRels, [Text.UTF8Encoding]::new($false))
  if (Test-Path $path) { Remove-Item $path -Force }
  [IO.Compression.ZipFile]::CreateFromDirectory($tmp, $path)
  Remove-Item $tmp -Recurse -Force
}

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

$inst = @(
  (Title "Documento de instalación"),
  (Sub "PMV1 — Trazabilidad de café amazónico de Chanchamayo"),
  (Body "Este documento explica cómo instalar y ejecutar el producto mínimo viable en una computadora local. El frontend no se conecta a Supabase ni a la API de inteligencia artificial. Esas conexiones ocurren solo en el backend."),
  (H "1. Requisitos"),
  (Bullet "Un proyecto de Supabase con PostgreSQL. El frontend no usa la clave anónima."),
  (Bullet "Node.js 22 o superior y npm. En este equipo Node quedó instalado en C:\Program Files\nodejs."),
  (Bullet "Git, solo si el código se obtiene desde el repositorio."),
  (Bullet "Una clave de la API de Gemini, creada en Google AI Studio. No se escribe en el código ni se sube a GitHub."),
  (H "2. Obtener el código"),
  (Body "El repositorio público es:"),
  (Code "https://github.com/75535671-eng/Blockchain-para-trazabilidad-de-caf-amaz-nico-de-Chanchamayo"),
  (Body "Clonar o descargar el proyecto y abrir la carpeta raíz, la que contiene las carpetas backend, frontend, database y docs."),
  (H "3. Instalar dependencias"),
  (Body "En PowerShell, con Node en el PATH:"),
  (Code "cd backend"),
  (Code "npm install"),
  (Code "cd ..\frontend"),
  (Code "npm install"),
  (Body "Si npm no se reconoce, anteponer esta línea en la misma ventana:"),
  (Code '$env:Path = "C:\Program Files\nodejs;" + $env:Path'),
  (H "4. Configurar el entorno"),
  (Body "Copiar el archivo .env.example de la raíz a backend\.env. Completar solo en ese archivo local:"),
  (Bullet "DATABASE_URL: cadena de PostgreSQL de Supabase, conexión directa o pooler en modo sesión, puerto 5432."),
  (Bullet "JWT_SECRET: una frase larga elegida para firmar los tokens de sesión."),
  (Bullet "JWT_EXPIRES_IN=8h y CORS_ORIGIN=http://localhost:4200."),
  (Bullet "AI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai"),
  (Bullet "AI_API_KEY: la clave de Gemini. AI_MODEL=gemini-3.5-flash-lite. AI_PROVIDER=gemini."),
  (Bullet "SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD: correo y contraseña del administrador inicial."),
  (Body "backend\.env está en .gitignore. No se sube al repositorio. .env.example se sube con esas claves vacías."),
  (H "5. Crear la base de datos"),
  (Bullet "En el SQL Editor de Supabase, ejecutar database\migrations\001_pmv1_inicial.sql."),
  (Bullet "El script crea usuarios, productores, parcelas, lotes y analisis_lotes. No borra datos."),
  (Body "También puede aplicarse con psql usando DATABASE_URL. No usar el pooler de transacción del puerto 6543."),
  (H "6. Crear el administrador"),
  (Body "Desde la carpeta backend:"),
  (Code "npm run seed"),
  (Body "El comando lee SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD y crea el usuario administrador. No guarda esa contraseña en el código fuente."),
  (H "7. Ejecutar el sistema"),
  (Body "Terminal 1, carpeta backend:"),
  (Code "npm run dev"),
  (Body "Debe aparecer: API escuchando en el puerto 3000."),
  (Body "Terminal 2, carpeta frontend:"),
  (Code "npm start"),
  (Body "Abrir el navegador en http://localhost:4200. La API queda en http://localhost:3000/api."),
  (H "8. Primer acceso"),
  (Bullet "Ingresar con el correo y la contraseña definidos en SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD."),
  (Bullet "El administrador registra productores, o una persona crea su cuenta de productor en la pantalla de registro."),
  (Bullet "Con un productor se registran parcelas y, sobre una parcela, lotes."),
  (Bullet "En Análisis IA se elige un lote y se pulsa Analizar lote. El indicador lo calcula el backend con la clave guardada en el entorno."),
  (H "9. Comprobación"),
  (Bullet "http://localhost:3000/api/health responde estado ok."),
  (Bullet "En la carpeta backend, npm test ejecuta las pruebas de dominio, casos de uso y API."),
  (Bullet "Si el análisis responde que el servicio no está configurado, revisar que AI_API_KEY tenga valor y reiniciar npm run dev."),
  (H "10. Qué no hace falta instalar"),
  (Body "No se instala XAMPP ni PHP. La base es PostgreSQL en Supabase. No se instala Polygon, una billetera ni un nodo de blockchain: eso corresponde a incrementos posteriores y no forma parte de este PMV.")
)

$hex = @(
  (Title "Código fuente estructurado"),
  (Sub "Arquitectura hexagonal del PMV1"),
  (Body "El código separa el negocio de Express, Angular y PostgreSQL. El dominio no importa esos marcos. La aplicación habla con el exterior solo a través de puertos, y los adaptadores los implementan."),
  (H "1. Vista general"),
  (Code "Angular  ->  HTTP  ->  Controller  ->  Input Port  ->  Use Case  ->  Domain"),
  (Code "                                                      |"),
  (Code "                                                 Output Port"),
  (Code "                                                      |"),
  (Code "                                  PostgreSQL  /  seguridad  /  API de IA"),
  (H "2. Árbol del backend"),
  (Code "backend/src/domain"),
  (Code "  entities          Usuario, Productor, Parcela, Lote, AnalisisLote"),
  (Code "  valueobjects      Email, DocumentoIdentidad, FechaCosecha, CantidadKg,"),
  (Code "                    AreaHectareas, Coordenadas, IdentificadorLote"),
  (Code "  services          LoteFactory y estrategias de análisis"),
  (Code "  errors            ValidationError, NotFoundError, ConflictError, ForbiddenError"),
  (Code "backend/src/application"),
  (Code "  dto               Datos que cruzan la frontera de la aplicación"),
  (Code "  ports/input       Casos de uso que el exterior puede pedir"),
  (Code "  ports/output      Repositorios, hasher, token y servicio de IA"),
  (Code "  usecases          Registrar, listar, consultar, actualizar, eliminar y analizar"),
  (Code "backend/src/adapters/in"),
  (Code "  controllers       Traducen HTTP a comandos"),
  (Code "  http              Autenticación Bearer y respuestas de error"),
  (Code "backend/src/adapters/out"),
  (Code "  persistence       PostgresRepositories"),
  (Code "  security          Bcrypt y JWT"),
  (Code "  ai                ExternalAIAdapter"),
  (Code "backend/src/infrastructure"),
  (Code "  configuration     container.ts y seed.ts"),
  (Code "  http              app.ts y server.ts"),
  (H "3. Árbol del frontend y de la base"),
  (Code "frontend/src/app"),
  (Code "  core              ApiService, AuthService, guard, interceptor, tema"),
  (Code "  features          login, registro, inicio, productores, parcelas, lotes, análisis"),
  (Code "  shared            vistas de lote y sondeo del análisis"),
  (Code "database/migrations/001_pmv1_inicial.sql"),
  (Body "El frontend solo llama a http://localhost:3000/api. No contiene SQL ni la clave de IA."),
  (H "4. Regla de dependencia"),
  (Body "El dominio no conoce Express, Angular, PostgreSQL, pg, Axios ni un SDK de inteligencia artificial. Los casos de uso dependen de interfaces. container.ts, en infraestructura, es el único lugar que une esas interfaces con PostgreSQL, bcrypt, JWT y la API externa."),
  (H "5. Puertos de entrada"),
  (Body "Cada operación pública tiene un input port: registro e inicio de sesión, registro, listado, actualización y eliminación de productores, parcelas y lotes, consulta de lote y análisis. El controller obtiene el actor del token y llama al caso de uso. No abre una conexión a PostgreSQL."),
  (H "6. Puertos de salida"),
  (Bullet "ProductorRepositoryPort, ParcelaRepositoryPort, LoteRepositoryPort y AnalisisLoteRepositoryPort."),
  (Bullet "UsuarioRepositoryPort y RegistroCuentaProductorPort, este último en una transacción de usuario más productor."),
  (Bullet "PasswordHasherPort y TokenProviderPort."),
  (Bullet "AIServicePort, implementado por ExternalAIAdapter."),
  (H "7. Patrones usados"),
  (Bullet "Repository: los casos de uso guardan y consultan sin escribir SQL. PostgresRepositories implementa los puertos."),
  (Bullet "Inyección de dependencias: los constructores reciben interfaces. container.ts arma la composición de producción. Las pruebas arman otra con memoria."),
  (Bullet "Factory Method: LoteFactory crea el código CHNY-AAAA-XXXXXXXX y valida la fecha de cosecha."),
  (Bullet "Strategy: SelectorEstrategiaAnalisis elige EstrategiaConAltitud o EstrategiaSinAltitud. Si no hay altitud, la confianza del dominio no supera MEDIA."),
  (Bullet "Adapter: ExternalAIAdapter traduce la API de Gemini al puerto AIServicePort. Los repositorios PostgreSQL traducen las tablas a entidades."),
  (H "8. Relaciones que el código respeta"),
  (Body "productores se relacionan con parcelas por productor_id. parcelas se relacionan con lotes por parcela_id. lotes se relacionan con analisis_lotes por lote_id. No hay ON DELETE CASCADE. Si un productor tiene parcelas, o una parcela tiene lotes, el caso de uso responde conflicto y el registro permanece. Al eliminar un lote, el caso de uso pide borrar sus análisis y después el lote, para no dejar un análisis sin lote."),
  (H "9. Dónde no está la clave"),
  (Body "AI_API_KEY se lee del entorno del backend dentro de ExternalAIAdapter. El frontend no la recibe. El archivo backend\.env no está en el repositorio.")
)

$pmv = @(
  (Title "PMV funcional"),
  (Sub "Validación del problema y de la solución inicial"),
  (Body "El problema es la dificultad para garantizar una trazabilidad integrada y verificable de los lotes de café amazónico de Chanchamayo. Este PMV permite registrar y consultar usuarios, productores, parcelas y lotes, y pedir un indicador de coherencia del registro. No implementa blockchain, contratos, Polygon ni código QR."),
  (H "1. Qué queda funcionando"),
  (Bullet "Registro público de un productor: crea el usuario y la ficha en la misma transacción."),
  (Bullet "Inicio de sesión con token Bearer. El frontend lo guarda en sessionStorage."),
  (Bullet "Administrador: registra, edita y consulta productores. Puede eliminar un productor solo si no tiene parcelas."),
  (Bullet "Parcelas: alta, edición, listado y eliminación. No se elimina una parcela que todavía tiene lotes."),
  (Bullet "Lotes: alta, edición, listado, consulta y eliminación. El código CHNY permanece único y no se edita."),
  (Bullet "Análisis IA: indicador COHERENTE, REVISAR o INSUFICIENTE, con resumen, observaciones y confianza calculada en el dominio."),
  (Bullet "Modo claro y modo oscuro, y navegación en escritorio y en móvil."),
  (H "2. Relación de los datos"),
  (Body "Productor, parcela, lote y análisis no se copian como textos sueltos en el frontend. Cada pantalla vuelve a consultar la API. El nombre del productor sale de productores.id. El nombre de la parcela sale de parcelas.id. El análisis se pide con el identificador del lote y el backend arma el contexto con los datos actuales."),
  (Code "Productor  ->  Parcela  ->  Lote  ->  Análisis IA"),
  (Body "Si se cambia el nombre del productor, las parcelas y los lotes muestran el nombre nuevo al consultar de nuevo, porque guardan el identificador y no una copia del nombre. Si se cambia el nombre de la parcela, el listado de lotes y Análisis IA muestran el nombre nuevo por la misma razón."),
  (H "3. Historias cubiertas"),
  (Bullet "HU-001. Registro e inicio de sesión. Credenciales inválidas no entran."),
  (Bullet "HU-002. El administrador gestiona productores. Un productor no puede registrar a otros productores."),
  (Bullet "HU-003. El productor registra su parcela. No puede usar el identificador de otro productor."),
  (Bullet "HU-004. El productor registra un lote sobre una parcela. La consulta muestra lote, parcela y productor."),
  (H "4. Indicador de IA"),
  (Body "El análisis no certifica calidad de taza. Revisa si los datos ya guardados del lote se sostienen entre sí. Envía código, variedad, fecha, kilogramos, observaciones, parcela, distrito, localidad, área, altitud si existe, nombre del productor y organización. No envía documento, correo ni contraseña."),
  (Body "La pantalla Análisis IA muestra Analizando lote... mientras espera la respuesta real. Al terminar, actualiza clasificación, confianza, resumen y observaciones sin recargar el navegador. Mientras esa pantalla sigue abierta, consulta el lote cada 5 segundos y se detiene al salir."),
  (H "5. Integridad al eliminar"),
  (Bullet "Productor con parcelas: no se elimina. Mensaje: No se puede eliminar este productor porque tiene parcelas asociadas."),
  (Bullet "Parcela con lotes: no se elimina. Mensaje: No se puede eliminar esta parcela porque tiene registros asociados."),
  (Bullet "Lote: se elimina de PostgreSQL junto con sus análisis. Deja de aparecer en Lotes y en Análisis IA."),
  (Bullet "Dos parcelas del mismo productor no pueden llamarse igual."),
  (H "6. Cómo demostrarlo"),
  (Bullet "Aplicar la migración en Supabase, completar DATABASE_URL, y luego iniciar el backend en el puerto 3000 y el frontend en el puerto 4200."),
  (Bullet "Entrar con el administrador creado por npm run seed, o con un productor registrado."),
  (Bullet "Registrar una parcela y un lote. Consultar el lote y comprobar productor, parcela y kilogramos."),
  (Bullet "En Análisis IA, pulsar Analizar lote y esperar el indicador real."),
  (Bullet "Editar el nombre de la parcela y volver a consultar el lote: el nombre nuevo aparece sin editar el lote."),
  (Bullet "Intentar eliminar la parcela mientras tenga un lote: el sistema la conserva."),
  (Bullet "Eliminar el lote: desaparece del listado y de Análisis IA."),
  (H "7. Fuera de este PMV"),
  (Body "Eventos de trazabilidad, blockchain, contratos inteligentes, Polygon, IPFS, billetera y código QR no están implementados. Corresponden a los incrementos siguientes. No existe un cuarto PMV en la documentación del proyecto.")
)

Doc (Join-Path $dir "01-Documento-de-instalacion.docx") $inst
Doc (Join-Path $dir "02-Codigo-fuente-estructurado.docx") $hex
Doc (Join-Path $dir "03-PMV-funcional.docx") $pmv
Write-Output "OK"
