import { ConflictError, NotFoundError } from '../../src/domain/errors/DomainError';
import { AnalisisLote } from '../../src/domain/entities/AnalisisLote';
import { Lote } from '../../src/domain/entities/Lote';
import { Parcela } from '../../src/domain/entities/Parcela';
import { Productor } from '../../src/domain/entities/Productor';
import { SolicitudRegistro } from '../../src/domain/entities/SolicitudRegistro';
import { Usuario } from '../../src/domain/entities/Usuario';
import {
  AnalisisLoteRepositoryPort,
  LoteRepositoryPort,
  ParcelaRepositoryPort,
  PasswordHasherPort,
  ProductorRepositoryPort,
  RegistroCuentaProductorPort,
  SolicitudRegistroRepositoryPort,
  TokenProviderPort,
  UsuarioRepositoryPort,
} from '../../src/application/ports/output/OutputPorts';
import { RolUsuario } from '../../src/domain/entities/Usuario';

export class Memoria {
  usuarios: Usuario[] = [];
  productores: Productor[] = [];
  solicitudes: SolicitudRegistro[] = [];
  parcelas: Parcela[] = [];
  lotes: Lote[] = [];
  analisis: AnalisisLote[] = [];
  auditoria: { administradorId: string; productorId: string; fecha: Date }[] = [];
}

export class MemoriaUsuarios implements UsuarioRepositoryPort {
  constructor(private readonly memoria: Memoria) {}
  async buscarPorEmail(email: string) {
    return this.memoria.usuarios.find((usuario) => usuario.email.valor === email) ?? null;
  }
  async buscarPorId(id: string) {
    return this.memoria.usuarios.find((usuario) => usuario.id === id) ?? null;
  }
  async actualizarRol(id: string, rol: RolUsuario) {
    this.memoria.usuarios = this.memoria.usuarios.map((usuario) => (usuario.id === id ? usuario.conRol(rol) : usuario));
  }
  async actualizarPassword(id: string, passwordHash: string) {
    this.memoria.usuarios = this.memoria.usuarios.map((usuario) =>
      usuario.id === id ? usuario.conPassword(passwordHash) : usuario,
    );
  }
}

export class MemoriaSolicitudes implements SolicitudRegistroRepositoryPort {
  constructor(private readonly memoria: Memoria) {}
  async guardar(solicitud: SolicitudRegistro) {
    this.memoria.solicitudes.push(solicitud);
  }
  async buscarPorId(id: string) {
    return this.memoria.solicitudes.find((solicitud) => solicitud.id === id) ?? null;
  }
  async buscarRecientePorEmail(email: string) {
    return [...this.memoria.solicitudes].reverse().find((solicitud) => solicitud.email.valor === email) ?? null;
  }
  async existeActivaPorEmail(email: string) {
    return this.memoria.solicitudes.some(
      (solicitud) => solicitud.email.valor === email && solicitud.estado !== 'rechazada',
    );
  }
  async existeActivaPorDocumento(documento: string) {
    return this.memoria.solicitudes.some(
      (solicitud) => solicitud.documento.valor === documento && solicitud.estado !== 'rechazada',
    );
  }
  async listar() {
    return [...this.memoria.solicitudes];
  }
  async aprobar(solicitudId: string, usuario: Usuario, productor: Productor, administradorId: string) {
    const actual = this.memoria.solicitudes.find((solicitud) => solicitud.id === solicitudId);
    if (!actual || actual.estado !== 'pendiente') {
      throw new ConflictError('Esta solicitud ya fue resuelta.');
    }
    this.memoria.usuarios.push(usuario);
    this.memoria.productores.push(productor);
    this.reemplazar(
      SolicitudRegistro.crear({
        id: actual.id,
        nombre: actual.nombre,
        documento: actual.documento.valor,
        telefono: actual.telefono,
        organizacion: actual.organizacion,
        email: actual.email.valor,
        passwordHash: actual.passwordHash,
        estado: 'aprobada',
        fechaSolicitud: actual.fechaSolicitud,
        fechaResolucion: new Date(),
        administradorId,
        usuarioId: usuario.id,
        productorId: productor.id,
      }),
    );
  }
  async rechazar(solicitudId: string, administradorId: string, motivo: string) {
    const actual = this.memoria.solicitudes.find((solicitud) => solicitud.id === solicitudId);
    if (!actual || actual.estado !== 'pendiente') {
      throw new ConflictError('Esta solicitud ya fue resuelta.');
    }
    this.reemplazar(
      SolicitudRegistro.crear({
        id: actual.id,
        nombre: actual.nombre,
        documento: actual.documento.valor,
        telefono: actual.telefono,
        organizacion: actual.organizacion,
        email: actual.email.valor,
        passwordHash: actual.passwordHash,
        estado: 'rechazada',
        motivoRechazo: motivo,
        fechaSolicitud: actual.fechaSolicitud,
        fechaResolucion: new Date(),
        administradorId,
      }),
    );
  }
  private reemplazar(solicitud: SolicitudRegistro) {
    this.memoria.solicitudes = this.memoria.solicitudes.map((actual) => (actual.id === solicitud.id ? solicitud : actual));
  }
}

export class MemoriaRegistro implements RegistroCuentaProductorPort {
  constructor(private readonly memoria: Memoria) {}
  async guardar(usuario: Usuario, productor: Productor) {
    this.memoria.usuarios.push(usuario);
    this.memoria.productores.push(productor);
  }
}

export class MemoriaProductores implements ProductorRepositoryPort {
  constructor(private readonly memoria: Memoria) {}
  async guardar(productor: Productor) {
    this.memoria.productores.push(productor);
  }
  async actualizar(productor: Productor) {
    this.memoria.productores = this.memoria.productores.map((actual) => (actual.id === productor.id ? productor : actual));
  }
  async eliminar(id: string, administradorId: string) {
    const productor = this.memoria.productores.find((actual) => actual.id === id);
    if (!productor) {
      throw new NotFoundError('El productor no existe.');
    }
    if (productor.usuarioId === administradorId) {
      throw new ConflictError('No puedes eliminar tu propia cuenta.');
    }
    const parcelas = this.memoria.parcelas.filter((parcela) => parcela.productorId === id).map((parcela) => parcela.id);
    const lotes = this.memoria.lotes.filter((lote) => parcelas.includes(lote.parcelaId)).map((lote) => lote.id);
    this.memoria.analisis = this.memoria.analisis.filter((analisis) => !lotes.includes(analisis.loteId));
    this.memoria.lotes = this.memoria.lotes.filter((lote) => !lotes.includes(lote.id));
    this.memoria.parcelas = this.memoria.parcelas.filter((parcela) => parcela.productorId !== id);
    this.memoria.solicitudes = this.memoria.solicitudes.flatMap((solicitud) => {
      const esSuya =
        solicitud.productorId === id ||
        solicitud.usuarioId === productor.usuarioId ||
        solicitud.documento.valor === productor.documento.valor;
      if (esSuya) {
        return [];
      }
      if (productor.usuarioId && solicitud.administradorId === productor.usuarioId) {
        return [
          SolicitudRegistro.crear({
            id: solicitud.id,
            nombre: solicitud.nombre,
            documento: solicitud.documento.valor,
            telefono: solicitud.telefono,
            organizacion: solicitud.organizacion,
            email: solicitud.email.valor,
            passwordHash: solicitud.passwordHash,
            estado: solicitud.estado,
            motivoRechazo: solicitud.motivoRechazo,
            fechaSolicitud: solicitud.fechaSolicitud,
            fechaResolucion: solicitud.fechaResolucion,
            usuarioId: solicitud.usuarioId,
            productorId: solicitud.productorId,
          }),
        ];
      }
      return [solicitud];
    });
    this.memoria.productores = this.memoria.productores.filter((actual) => actual.id !== id);
    if (productor.usuarioId) {
      this.memoria.usuarios = this.memoria.usuarios.filter((usuario) => usuario.id !== productor.usuarioId);
    }
    this.memoria.auditoria.push({ administradorId, productorId: id, fecha: new Date() });
  }
  async buscarPorId(id: string) {
    return this.memoria.productores.find((productor) => productor.id === id) ?? null;
  }
  async buscarPorUsuarioId(usuarioId: string) {
    return this.memoria.productores.find((productor) => productor.usuarioId === usuarioId) ?? null;
  }
  async buscarPorDocumento(documento: string) {
    return this.memoria.productores.find((productor) => productor.documento.valor === documento) ?? null;
  }
  async listar() {
    return [...this.memoria.productores];
  }
  async asignarCuenta(productorId: string, usuario: Usuario) {
    const actual = this.memoria.productores.find((productor) => productor.id === productorId);
    if (!actual || actual.usuarioId) {
      throw new ConflictError('Este productor ya tiene una cuenta.');
    }
    if (this.memoria.usuarios.some((cuenta) => cuenta.email.valor === usuario.email.valor)) {
      throw new ConflictError('Ya existe un usuario con ese correo.');
    }
    this.memoria.usuarios.push(usuario);
    this.memoria.productores = this.memoria.productores.map((productor) =>
      productor.id === productorId ? productor.conUsuario(usuario.id) : productor,
    );
  }
}

export class MemoriaParcelas implements ParcelaRepositoryPort {
  constructor(private readonly memoria: Memoria) {}
  async guardar(parcela: Parcela) {
    this.memoria.parcelas.push(parcela);
  }
  async actualizar(parcela: Parcela) {
    const indice = this.memoria.parcelas.findIndex((item) => item.id === parcela.id);
    if (indice >= 0) {
      this.memoria.parcelas[indice] = parcela;
    }
  }
  async eliminar(id: string) {
    const tieneLotes = this.memoria.lotes.some((lote) => lote.parcelaId === id);
    if (tieneLotes) {
      throw new ConflictError('No se puede eliminar esta parcela porque tiene registros asociados.');
    }
    this.memoria.parcelas = this.memoria.parcelas.filter((parcela) => parcela.id !== id);
  }
  async buscarPorId(id: string) {
    return this.memoria.parcelas.find((parcela) => parcela.id === id) ?? null;
  }
  async buscarPorProductorYNombre(productorId: string, nombre: string) {
    const buscado = nombre.trim().toLowerCase();
    return (
      this.memoria.parcelas.find(
        (parcela) => parcela.productorId === productorId && parcela.nombre.trim().toLowerCase() === buscado,
      ) ?? null
    );
  }
  async listar() {
    return [...this.memoria.parcelas];
  }
  async listarPorProductor(productorId: string) {
    return this.memoria.parcelas.filter((parcela) => parcela.productorId === productorId);
  }
}

export class MemoriaLotes implements LoteRepositoryPort {
  constructor(private readonly memoria: Memoria) {}
  async guardar(lote: Lote) {
    this.memoria.lotes.push(lote);
  }
  async actualizar(lote: Lote) {
    const indice = this.memoria.lotes.findIndex((item) => item.id === lote.id);
    if (indice >= 0) {
      this.memoria.lotes[indice] = lote;
    }
  }
  async eliminar(id: string) {
    this.memoria.lotes = this.memoria.lotes.filter((lote) => lote.id !== id);
  }
  async buscarPorId(id: string) {
    return this.memoria.lotes.find((lote) => lote.id === id) ?? null;
  }
  async buscarPorCodigo(codigo: string) {
    return this.memoria.lotes.find((lote) => lote.codigo.valor === codigo) ?? null;
  }
  async listar() {
    return [...this.memoria.lotes];
  }
  async listarPorParcelas(parcelaIds: string[]) {
    return this.memoria.lotes.filter((lote) => parcelaIds.includes(lote.parcelaId));
  }
}

export class MemoriaAnalisis implements AnalisisLoteRepositoryPort {
  constructor(private readonly memoria: Memoria) {}
  async guardar(analisis: AnalisisLote) {
    this.memoria.analisis.push(analisis);
  }
  async eliminarPorLote(loteId: string) {
    this.memoria.analisis = this.memoria.analisis.filter((analisis) => analisis.loteId !== loteId);
  }
  async buscarUltimoPorLote(loteId: string) {
    const encontrados = this.memoria.analisis.filter((analisis) => analisis.loteId === loteId);
    return encontrados.at(-1) ?? null;
  }
}

export class HasherFijo implements PasswordHasherPort {
  async hash(plano: string) {
    return `hash:${plano}`;
  }
  async verificar(plano: string, hash: string) {
    return hash === `hash:${plano}`;
  }
}

export class TokensFijos implements TokenProviderPort {
  emitir(payload: { usuarioId: string; rol: RolUsuario }) {
    return `${payload.usuarioId}|${payload.rol}`;
  }
  verificar(token: string) {
    const [usuarioId, rol] = token.split('|');
    return { usuarioId, rol: rol as RolUsuario };
  }
}
