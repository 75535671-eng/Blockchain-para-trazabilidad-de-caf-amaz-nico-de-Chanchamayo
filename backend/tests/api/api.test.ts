import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AuthController, LoteController, ParcelaController, ProductorController, SolicitudController } from '../../src/adapters/in/controllers/Controllers';
import { ExternalAIAdapter } from '../../src/adapters/out/ai/ExternalAIAdapter';
import { createApp } from '../../src/infrastructure/http/app';
import { AnalizarLote } from '../../src/application/usecases/AnalizarLote';
import { CambiarContrasena, ConsultarSesion, IniciarSesion } from '../../src/application/usecases/IniciarSesion';
import { ActualizarLote, ConsultarLote, EliminarLote, ListarLotes, RegistrarLote } from '../../src/application/usecases/LoteUseCases';
import { ActualizarParcela, EliminarParcela, ListarParcelas, RegistrarParcela } from '../../src/application/usecases/ParcelaUseCases';
import { ActualizarProductor, ConsultarDniProductor, EliminarProductor, ListarProductores, OtorgarAdministrador, QuitarAdministrador, RegistrarProductor } from '../../src/application/usecases/ProductorUseCases';
import { CrearCuentaProductor } from '../../src/application/usecases/RegistrarUsuario';
import { AprobarSolicitud, ListarSolicitudes, RechazarSolicitud, SolicitarRegistro } from '../../src/application/usecases/SolicitudRegistroUseCases';
import { Usuario } from '../../src/domain/entities/Usuario';
import { EstrategiaConAltitud, EstrategiaSinAltitud, SelectorEstrategiaAnalisis } from '../../src/domain/services/analisis/EstrategiasAnalisis';
import {
  HasherFijo,
  Memoria,
  MemoriaAnalisis,
  MemoriaLotes,
  MemoriaParcelas,
  MemoriaProductores,
  MemoriaRegistro,
  MemoriaSolicitudes,
  MemoriaUsuarios,
  TokensFijos,
} from '../support/memoria';

function appDePrueba() {
  const memoria = new Memoria();
  const usuarios = new MemoriaUsuarios(memoria);
  const productores = new MemoriaProductores(memoria);
  const parcelas = new MemoriaParcelas(memoria);
  const lotes = new MemoriaLotes(memoria);
  const analisis = new MemoriaAnalisis(memoria);
  const tokens = new TokensFijos();
  const hasher = new HasherFijo();
  const solicitudes = new MemoriaSolicitudes(memoria);
  const ia = new ExternalAIAdapter(
    { baseUrl: 'http://ia.local/v1', apiKey: 'test-key', model: 'modelo', provider: 'mock' },
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    clasificacion: 'REVISAR',
                    resumen: 'La cantidad es alta para el área.',
                    observaciones: ['Conviene revisar el pesaje.'],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
  );
  const selector = new SelectorEstrategiaAnalisis(new EstrategiaConAltitud(), new EstrategiaSinAltitud());
  memoria.usuarios.push(
    Usuario.crear({
      id: 'admin-1',
      nombre: 'Administrador',
      email: 'admin@test.local',
      passwordHash: 'hash:no-importa',
      rol: 'ADMINISTRADOR',
    }),
  );
  const consultaDni = new ConsultarDniProductor({
    async consultar() {
      return { nombre: 'Ana Quispe', estado: 'encontrado' };
    },
  });
  return createApp({
    corsOrigin: 'http://localhost:4200',
    tokens,
    usuarios,
    auth: new AuthController(
      new SolicitarRegistro(usuarios, productores, solicitudes, hasher),
      new IniciarSesion(usuarios, productores, solicitudes, hasher, tokens),
      new ConsultarSesion(usuarios),
      new CambiarContrasena(usuarios, hasher),
      consultaDni,
    ),
    productores: new ProductorController(
      new RegistrarProductor(productores),
      new ListarProductores(productores, usuarios),
      new ActualizarProductor(productores),
      new EliminarProductor(productores),
      consultaDni,
      new OtorgarAdministrador(usuarios, productores, hasher),
      new QuitarAdministrador(usuarios, productores),
      new CrearCuentaProductor(usuarios, productores, new MemoriaRegistro(memoria), hasher),
    ),
    solicitudes: new SolicitudController(
      new ListarSolicitudes(usuarios, solicitudes),
      new AprobarSolicitud(usuarios, productores, solicitudes),
      new RechazarSolicitud(usuarios, solicitudes),
    ),
    parcelas: new ParcelaController(
      new RegistrarParcela(parcelas, productores),
      new ListarParcelas(parcelas, productores),
      new ActualizarParcela(parcelas, productores),
      new EliminarParcela(parcelas, productores),
    ),
    lotes: new LoteController(
      new RegistrarLote(lotes, parcelas, productores),
      new ListarLotes(lotes, parcelas, productores),
      new ConsultarLote(lotes, parcelas, productores, analisis),
      new AnalizarLote(lotes, parcelas, productores, analisis, ia, selector),
      new ActualizarLote(lotes, parcelas, productores),
      new EliminarLote(lotes, parcelas, productores, analisis),
    ),
  });
}

async function entrarComoProductor(
  app: ReturnType<typeof appDePrueba>,
  datos: { nombre: string; email: string; password: string; documento: string; telefono: string },
) {
  const admin = { Authorization: 'Bearer admin-1|ADMINISTRADOR' };
  const creado = await request(app).post('/api/productores/cuentas').set(admin).send(datos);
  expect(creado.status).toBe(201);
  const temporal = await request(app).post('/api/auth/login').send({ email: datos.email, password: datos.password });
  expect(temporal.status).toBe(200);
  expect(temporal.body.usuario.debeCambiarPassword).toBe(true);
  const cambio = await request(app)
    .post('/api/auth/cambiar-contrasena')
    .set({ Authorization: `Bearer ${temporal.body.token}` })
    .send({ password: datos.password, confirmacion: datos.password });
  expect(cambio.status).toBe(200);
  const login = await request(app).post('/api/auth/login').send({ email: datos.email, password: datos.password });
  expect(login.status).toBe(200);
  expect(login.body.usuario.debeCambiarPassword).toBe(false);
  return { token: login.body.token as string, productorId: login.body.productorId as string };
}

describe('API REST', () => {
  it('recorre registro, autenticación, parcela, lote, consulta y análisis', async () => {
    const app = appDePrueba();
    const sesion = await entrarComoProductor(app, {
      nombre: 'Luis Pérez',
      email: 'luis@example.com',
      password: 'Cafe1234',
      documento: '11223344',
      telefono: '900111222',
    });
    const auth = { Authorization: `Bearer ${sesion.token}` };
    const productores = await request(app).get('/api/productores').set(auth);
    const parcela = await request(app).post('/api/parcelas').set(auth).send({
      productorId: productores.body[0].id,
      nombre: 'Parcela Alta',
      distrito: 'Vitoc',
      areaHectareas: 1.5,
      altitudMsnm: 1600,
    });
    expect(parcela.status).toBe(201);
    const duplicada = await request(app).post('/api/parcelas').set(auth).send({
      productorId: productores.body[0].id,
      nombre: 'Parcela Alta',
      distrito: 'San Ramón',
      areaHectareas: 1,
    });
    expect(duplicada.status).toBe(409);
    expect(duplicada.body.error).toBe('Ya existe una parcela con este nombre.');
    const listado = await request(app).get('/api/parcelas').set(auth);
    expect(listado.body.filter((item: { nombre: string }) => item.nombre === 'Parcela Alta')).toHaveLength(1);
    const lote = await request(app).post('/api/lotes').set(auth).send({
      parcelaId: parcela.body.id,
      fechaCosecha: '2026-05-20',
      cantidadKg: 900,
      variedad: 'Bourbon',
    });
    expect(lote.status).toBe(201);
    expect(lote.body.codigo).toMatch(/^CHNY-/);
    const consulta = await request(app).get(`/api/lotes/${lote.body.id}`).set(auth);
    expect(consulta.body.lote.parcelaId).toBe(parcela.body.id);
    const analisis = await request(app).post(`/api/lotes/${lote.body.id}/analisis`).set(auth).send({});
    expect(analisis.status).toBe(201);
    expect(analisis.body.ultimoAnalisis.clasificacion).toBe('REVISAR');
    expect(analisis.body.ultimoAnalisis.proveedor).toBe('mock');
    const norte = await request(app).post('/api/parcelas').set(auth).send({
      productorId: productores.body[0].id,
      nombre: 'Parcela Norte',
      distrito: 'San Ramón',
      areaHectareas: 1.2,
    });
    expect(norte.status).toBe(201);
    const norteDuplicada = await request(app).post('/api/parcelas').set(auth).send({
      productorId: productores.body[0].id,
      nombre: 'Parcela Norte',
      distrito: 'La Merced',
      areaHectareas: 3,
    });
    expect(norteDuplicada.status).toBe(409);
    expect(norteDuplicada.body.error).toBe('Ya existe una parcela con este nombre.');
    const trasRechazo = await request(app).get('/api/parcelas').set(auth);
    expect(trasRechazo.body.filter((item: { nombre: string }) => item.nombre === 'Parcela Norte')).toHaveLength(1);
    const parcelaEditada = await request(app).put(`/api/parcelas/${parcela.body.id}`).set(auth).send({
      productorId: productores.body[0].id,
      nombre: 'Parcela Baja',
      distrito: 'San Ramón',
      areaHectareas: 2,
      altitudMsnm: 1200,
    });
    expect(parcelaEditada.status).toBe(200);
    expect(parcelaEditada.body.nombre).toBe('Parcela Baja');
    const loteEditado = await request(app).put(`/api/lotes/${lote.body.id}`).set(auth).send({
      parcelaId: parcela.body.id,
      fechaCosecha: '2026-06-01',
      cantidadKg: 450,
      variedad: 'Caturra',
    });
    expect(loteEditado.status).toBe(200);
    expect(loteEditado.body.codigo).toBe(lote.body.codigo);
    expect(loteEditado.body.variedad).toBe('Caturra');
    const bloqueada = await request(app).delete(`/api/parcelas/${parcela.body.id}`).set(auth);
    expect(bloqueada.status).toBe(409);
    expect(bloqueada.body.error).toBe('No se puede eliminar esta parcela porque tiene registros asociados.');
    const loteBorrado = await request(app).delete(`/api/lotes/${lote.body.id}`).set(auth);
    expect(loteBorrado.status).toBe(204);
    const lotesTrasBorrar = await request(app).get('/api/lotes').set(auth);
    expect(lotesTrasBorrar.body.some((item: { id: string }) => item.id === lote.body.id)).toBe(false);
    const consultaBorrada = await request(app).get(`/api/lotes/${lote.body.id}`).set(auth);
    expect(consultaBorrada.status).toBe(404);
    const libre = await request(app).post('/api/parcelas').set(auth).send({
      productorId: productores.body[0].id,
      nombre: 'Parcela Libre',
      distrito: 'San Ramón',
      areaHectareas: 1,
    });
    expect(libre.status).toBe(201);
    const borrada = await request(app).delete(`/api/parcelas/${libre.body.id}`).set(auth);
    expect(borrada.status).toBe(204);
    const trasBorrar = await request(app).get('/api/parcelas').set(auth);
    expect(trasBorrar.body.some((item: { id: string }) => item.id === libre.body.id)).toBe(false);
    const inexistente = await request(app).delete('/api/parcelas/00000000-0000-0000-0000-000000000000').set(auth);
    expect(inexistente.status).toBe(404);
  });

  it('impide un productor duplicado y rechaza distrito o variedad fuera de la lista', async () => {
    const app = appDePrueba();
    const auth = { Authorization: 'Bearer admin-1|ADMINISTRADOR' };
    const creado = await request(app).post('/api/productores').set(auth).send({
      nombre: 'Grace Gamarra',
      documento: '44556677',
      telefono: '964111222',
      organizacion: 'Valle',
    });
    expect(creado.status).toBe(201);
    const duplicado = await request(app).post('/api/productores').set(auth).send({
      nombre: 'Otra persona',
      documento: '44556677',
      telefono: '964111223',
    });
    expect(duplicado.status).toBe(409);
    expect(duplicado.body.error).toBe('Este productor ya se encuentra registrado');
    const sinTelefono = await request(app).post('/api/productores').set(auth).send({
      nombre: 'Sin teléfono',
      documento: '12345678',
    });
    expect(sinTelefono.status).toBe(400);
    const consulta = await request(app).get('/api/productores/dni/44556677').set(auth);
    expect(consulta.status).toBe(200);
    expect(consulta.body).toEqual({ nombre: 'Ana Quispe', estado: 'encontrado' });
    const consultaPublica = await request(app).get('/api/auth/documento/12345678');
    expect(consultaPublica.status).toBe(200);
    expect(consultaPublica.body).toEqual({ nombre: 'Ana Quispe', estado: 'encontrado' });
    const documentoCorto = await request(app).get('/api/auth/documento/1234');
    expect(documentoCorto.status).toBe(400);
    const distrito = await request(app).post('/api/parcelas').set(auth).send({
      productorId: creado.body.id,
      nombre: 'Fundo Alto',
      distrito: 'Chanchamayo',
      areaHectareas: 1,
    });
    expect(distrito.status).toBe(400);
    const parcela = await request(app).post('/api/parcelas').set(auth).send({
      productorId: creado.body.id,
      nombre: 'Fundo Alto',
      distrito: 'La Merced',
      localidad: 'Centro',
      areaHectareas: 1.5,
      altitudMsnm: 1200,
    });
    expect(parcela.status).toBe(201);
    expect(parcela.body.distrito).toBe('La Merced');
    const variedad = await request(app).post('/api/lotes').set(auth).send({
      parcelaId: parcela.body.id,
      fechaCosecha: '2026-05-20',
      cantidadKg: 10,
      variedad: 'Catimor',
    });
    expect(variedad.status).toBe(400);
    const lote = await request(app).post('/api/lotes').set(auth).send({
      parcelaId: parcela.body.id,
      fechaCosecha: '2026-05-20',
      cantidadKg: 10,
      variedad: 'Pache',
    });
    expect(lote.status).toBe(201);
    expect(lote.body.variedad).toBe('Pache');
  });

  it('solo un administrador persistido puede otorgar ese rol, y el productor lo recibe al volver a entrar', async () => {
    const app = appDePrueba();
    const rosa = await entrarComoProductor(app, {
      nombre: 'Rosa Quispe',
      email: 'rosa@example.com',
      password: 'Cafe1234',
      documento: '87654321',
      telefono: '999888777',
    });
    const login = { body: { token: rosa.token } };
    const authProductor = { Authorization: `Bearer ${rosa.token}` };
    const listaPropia = await request(app).get('/api/productores').set(authProductor);
    expect(listaPropia.body).toHaveLength(1);
    const productorId = listaPropia.body[0].id as string;

    const pedro = await entrarComoProductor(app, {
      nombre: 'Pedro León',
      email: 'pedro@example.com',
      password: 'Cafe1234',
      documento: '12344321',
      telefono: '999111222',
    });
    const loginPedro = { body: { token: pedro.token } };
    const listaAjena = await request(app).get('/api/productores').set(authProductor);
    expect(listaAjena.body).toHaveLength(1);
    expect(listaAjena.body[0].documento).toBe('87654321');

    const rechazoPropio = await request(app).post(`/api/productores/${productorId}/rol-administrador`).set(authProductor);
    expect(rechazoPropio.status).toBe(403);
    const rechazoAjeno = await request(app)
      .post(`/api/productores/${productorId}/rol-administrador`)
      .set({ Authorization: `Bearer ${loginPedro.body.token}` });
    expect(rechazoAjeno.status).toBe(403);
    const rolFalsificado = await request(app)
      .post(`/api/productores/${productorId}/rol-administrador`)
      .set({ Authorization: `Bearer ${listaPropia.body[0].usuarioId}|ADMINISTRADOR` });
    expect(rolFalsificado.status).toBe(403);

    const authAdmin = { Authorization: 'Bearer admin-1|ADMINISTRADOR' };
    const otorgado = await request(app).post(`/api/productores/${productorId}/rol-administrador`).set(authAdmin);
    expect(otorgado.status).toBe(200);
    expect(otorgado.body).toMatchObject({ nombre: 'Rosa Quispe', rol: 'ADMINISTRADOR' });
    const repetido = await request(app).post(`/api/productores/${productorId}/rol-administrador`).set(authAdmin);
    expect(repetido.status).toBe(409);

    const sesionVigente = await request(app).get('/api/auth/sesion').set(authProductor);
    expect(sesionVigente.body.rol).toBe('ADMINISTRADOR');
    const reingreso = await request(app).post('/api/auth/login').send({ email: 'rosa@example.com', password: 'Cafe1234' });
    expect(reingreso.body.usuario.rol).toBe('ADMINISTRADOR');
    const directorio = await request(app)
      .get('/api/productores')
      .set({ Authorization: `Bearer ${reingreso.body.token}` });
    const fichaRosa = directorio.body.find((item: { nombre: string }) => item.nombre === 'Rosa Quispe');
    expect(fichaRosa.documento).toBe('87654321');
    expect(fichaRosa.telefono).toBe('999888777');
    expect(directorio.body.length).toBeGreaterThan(1);

    const tokenAdminRosa = reingreso.body.token as string;
    const quitarse = await request(app)
      .post(`/api/productores/${productorId}/rol-productor`)
      .set({ Authorization: `Bearer ${tokenAdminRosa}` });
    expect(quitarse.status).toBe(403);
    const pedroNoPuede = await request(app)
      .post(`/api/productores/${productorId}/rol-productor`)
      .set({ Authorization: `Bearer ${loginPedro.body.token}` });
    expect(pedroNoPuede.status).toBe(403);

    const retirado = await request(app).post(`/api/productores/${productorId}/rol-productor`).set(authAdmin);
    expect(retirado.status).toBe(200);
    expect(retirado.body).toMatchObject({ nombre: 'Rosa Quispe', rol: 'PRODUCTOR' });
    const repetirRetiro = await request(app).post(`/api/productores/${productorId}/rol-productor`).set(authAdmin);
    expect(repetirRetiro.status).toBe(409);

    const sesionRetirada = await request(app).get('/api/auth/sesion').set({ Authorization: `Bearer ${tokenAdminRosa}` });
    expect(sesionRetirada.body.rol).toBe('PRODUCTOR');
    const listaTrasRetiro = await request(app).get('/api/productores').set({ Authorization: `Bearer ${tokenAdminRosa}` });
    expect(listaTrasRetiro.body).toHaveLength(1);
    expect(listaTrasRetiro.body[0].documento).toBe('87654321');
    const vuelta = await request(app).post('/api/auth/login').send({ email: 'rosa@example.com', password: 'Cafe1234' });
    expect(vuelta.body.usuario.rol).toBe('PRODUCTOR');
  });

  it('otorga permisos a un productor sin cuenta y permite iniciar sesión como administrador', async () => {
    const app = appDePrueba();
    const authAdmin = { Authorization: 'Bearer admin-1|ADMINISTRADOR' };
    const creado = await request(app).post('/api/productores').set(authAdmin).send({
      nombre: 'Ficha Nueva',
      documento: '11223344',
      telefono: '900111222',
    });
    expect(creado.status).toBe(201);
    expect(creado.body.usuarioId).toBeNull();
    const sinAcceso = await request(app).post(`/api/productores/${creado.body.id}/rol-administrador`).set(authAdmin).send({});
    expect(sinAcceso.status).toBe(400);
    const otorgado = await request(app)
      .post(`/api/productores/${creado.body.id}/rol-administrador`)
      .set(authAdmin)
      .send({ email: 'ficha@example.com', password: 'Cafe1234' });
    expect(otorgado.status).toBe(200);
    expect(otorgado.body).toMatchObject({ nombre: 'Ficha Nueva', rol: 'ADMINISTRADOR' });
    const ingreso = await request(app).post('/api/auth/login').send({ email: 'ficha@example.com', password: 'Cafe1234' });
    expect(ingreso.status).toBe(200);
    expect(ingreso.body.usuario.rol).toBe('ADMINISTRADOR');
    const directorio = await request(app).get('/api/productores').set(authAdmin);
    const ficha = directorio.body.find((item: { documento: string }) => item.documento === '11223344');
    expect(ficha.rolCuenta).toBe('ADMINISTRADOR');
    expect(ficha.usuarioId).toBe(otorgado.body.id);
    const repetido = await request(app)
      .post(`/api/productores/${creado.body.id}/rol-administrador`)
      .set(authAdmin)
      .send({ email: 'otra@example.com', password: 'Cafe1234' });
    expect(repetido.status).toBe(409);
  });

  it('crea cuentas temporales, obliga el cambio y resuelve solicitudes sin acceso anticipado', async () => {
    const app = appDePrueba();
    const admin = { Authorization: 'Bearer admin-1|ADMINISTRADOR' };
    const creado = await request(app).post('/api/productores/cuentas').set(admin).send({
      nombre: 'Cuenta Temporal',
      documento: '80808083',
      telefono: '900000083',
      email: 'temporal@example.com',
      password: 'Cafe1234',
    });
    expect(creado.status).toBe(201);
    expect(creado.body.passwordTemporal).toBe('Cafe1234');
    expect(creado.body.usuario.debeCambiarPassword).toBe(true);
    const temporal = await request(app).post('/api/auth/login').send({ email: 'temporal@example.com', password: 'Cafe1234' });
    expect(temporal.body.usuario.debeCambiarPassword).toBe(true);
    const bloqueado = await request(app).get('/api/parcelas').set({ Authorization: `Bearer ${temporal.body.token}` });
    expect(bloqueado.status).toBe(403);
    const cambio = await request(app)
      .post('/api/auth/cambiar-contrasena')
      .set({ Authorization: `Bearer ${temporal.body.token}` })
      .send({ password: 'Nueva123', confirmacion: 'Nueva123' });
    expect(cambio.status).toBe(200);
    expect(cambio.body.debeCambiarPassword).toBe(false);
    const vieja = await request(app).post('/api/auth/login').send({ email: 'temporal@example.com', password: 'Cafe1234' });
    expect(vieja.status).toBe(400);
    const nueva = await request(app).post('/api/auth/login').send({ email: 'temporal@example.com', password: 'Nueva123' });
    expect(nueva.status).toBe(200);
    const panel = await request(app).get('/api/parcelas').set({ Authorization: `Bearer ${nueva.body.token}` });
    expect(panel.status).toBe(200);

    const solicitud = await request(app).post('/api/auth/register').send({
      nombre: 'Solicitud Ana',
      email: 'solicitud@example.com',
      password: 'Cafe1234',
      confirmacion: 'Cafe1234',
      documento: '80808084',
      telefono: '900000084',
    });
    expect(solicitud.status).toBe(201);
    expect(solicitud.body.mensaje).toContain('solicitud de registro se ha enviado');
    const pendiente = await request(app).post('/api/auth/login').send({ email: 'solicitud@example.com', password: 'Cafe1234' });
    expect(pendiente.status).toBe(403);
    const duplicada = await request(app).post('/api/auth/register').send({
      nombre: 'Otra',
      email: 'solicitud@example.com',
      password: 'Cafe1234',
      confirmacion: 'Cafe1234',
      documento: '80808085',
      telefono: '900000085',
    });
    expect(duplicada.status).toBe(409);
    const productorNoLista = await request(app).get('/api/solicitudes').set({ Authorization: `Bearer ${nueva.body.token}` });
    expect(productorNoLista.status).toBe(403);
    const lista = await request(app).get('/api/solicitudes').set(admin);
    const id = lista.body.find((item: { email: string }) => item.email === 'solicitud@example.com').id as string;
    const aprobada = await request(app).post(`/api/solicitudes/${id}/aprobar`).set(admin);
    expect(aprobada.status).toBe(200);
    expect(aprobada.body.estado).toBe('aprobada');
    const repetir = await request(app).post(`/api/solicitudes/${id}/aprobar`).set(admin);
    expect(repetir.status).toBe(409);
    const ingreso = await request(app).post('/api/auth/login').send({ email: 'solicitud@example.com', password: 'Cafe1234' });
    expect(ingreso.status).toBe(200);
    expect(ingreso.body.usuario.rol).toBe('PRODUCTOR');

    const otra = await request(app).post('/api/auth/register').send({
      nombre: 'Solicitud Rechazo',
      email: 'rechazo@example.com',
      password: 'Cafe1234',
      confirmacion: 'Cafe1234',
      documento: '80808086',
      telefono: '900000086',
      organizacion: 'Valle',
    });
    expect(otra.status).toBe(201);
    const pendientes = await request(app).get('/api/solicitudes').set(admin);
    const idRechazo = pendientes.body.find((item: { email: string }) => item.email === 'rechazo@example.com').id as string;
    const rechazada = await request(app).post(`/api/solicitudes/${idRechazo}/rechazar`).set(admin).send({ motivo: 'Datos incompletos' });
    expect(rechazada.status).toBe(200);
    expect(rechazada.body.estado).toBe('rechazada');
    expect(rechazada.body.motivoRechazo).toBe('Datos incompletos');
    const sinAcceso = await request(app).post('/api/auth/login').send({ email: 'rechazo@example.com', password: 'Cafe1234' });
    expect(sinAcceso.status).toBe(403);
    const conservada = await request(app).get('/api/solicitudes').set(admin);
    expect(conservada.body.some((item: { email: string; estado: string }) => item.email === 'rechazo@example.com' && item.estado === 'rechazada')).toBe(true);
  });

  it('elimina al productor con sus datos y niega la operación a un productor', async () => {
    const app = appDePrueba();
    const admin = { Authorization: 'Bearer admin-1|ADMINISTRADOR' };
    const propio = await entrarComoProductor(app, {
      nombre: 'Borrar Demo',
      email: 'borrar@example.com',
      password: 'Cafe1234',
      documento: '10000011',
      telefono: '900000011',
    });
    const ajeno = await entrarComoProductor(app, {
      nombre: 'Conservar Demo',
      email: 'conservar@example.com',
      password: 'Cafe1234',
      documento: '10000012',
      telefono: '900000012',
    });
    const authPropio = { Authorization: `Bearer ${propio.token}` };
    const parcela = await request(app).post('/api/parcelas').set(authPropio).send({
      productorId: propio.productorId,
      nombre: 'Parcela Borrar',
      distrito: 'Vitoc',
      areaHectareas: 1,
      altitudMsnm: 1500,
    });
    expect(parcela.status).toBe(201);
    const lote = await request(app).post('/api/lotes').set(authPropio).send({
      parcelaId: parcela.body.id,
      fechaCosecha: '2026-05-20',
      cantidadKg: 100,
      variedad: 'Bourbon',
    });
    expect(lote.status).toBe(201);
    const analisis = await request(app).post(`/api/lotes/${lote.body.id}/analisis`).set(authPropio).send({});
    expect(analisis.status).toBe(201);
    const parcelaAjena = await request(app).post('/api/parcelas').set({ Authorization: `Bearer ${ajeno.token}` }).send({
      productorId: ajeno.productorId,
      nombre: 'Parcela Conservar',
      distrito: 'San Ramón',
      areaHectareas: 1.2,
    });
    expect(parcelaAjena.status).toBe(201);

    const prohibido = await request(app).delete(`/api/productores/${propio.productorId}`).set(authPropio);
    expect(prohibido.status).toBe(403);
    const sigue = await request(app).get('/api/parcelas').set(admin);
    expect(sigue.body.some((item: { id: string }) => item.id === parcela.body.id)).toBe(true);

    const fallo = await request(app).delete('/api/productores/00000000-0000-4000-8000-000000000099').set(admin);
    expect(fallo.status).toBe(404);
    expect(fallo.status).not.toBe(204);
    const intacto = await request(app).get('/api/productores').set(admin);
    expect(intacto.body.some((item: { id: string }) => item.id === propio.productorId)).toBe(true);

    const borrado = await request(app).delete(`/api/productores/${propio.productorId}`).set(admin);
    expect(borrado.status).toBe(204);
    const login = await request(app).post('/api/auth/login').send({ email: 'borrar@example.com', password: 'Cafe1234' });
    expect(login.status).not.toBe(200);
    const productores = await request(app).get('/api/productores').set(admin);
    expect(productores.body.some((item: { id: string }) => item.id === propio.productorId)).toBe(false);
    expect(productores.body.some((item: { id: string }) => item.id === ajeno.productorId)).toBe(true);
    const parcelas = await request(app).get('/api/parcelas').set(admin);
    expect(parcelas.body.some((item: { id: string }) => item.id === parcela.body.id)).toBe(false);
    expect(parcelas.body.some((item: { id: string }) => item.id === parcelaAjena.body.id)).toBe(true);
    const loteBorrado = await request(app).get(`/api/lotes/${lote.body.id}`).set(admin);
    expect(loteBorrado.status).toBe(404);
    const ajenoSigue = await request(app).post('/api/auth/login').send({ email: 'conservar@example.com', password: 'Cafe1234' });
    expect(ajenoSigue.status).toBe(200);
  });
});
