import { ConflictError } from '../../src/domain/errors/DomainError';
import { AnalisisLote } from '../../src/domain/entities/AnalisisLote';
import { Lote } from '../../src/domain/entities/Lote';
import { Parcela } from '../../src/domain/entities/Parcela';
import { Productor } from '../../src/domain/entities/Productor';
import { Usuario } from '../../src/domain/entities/Usuario';
import {
  AnalisisLoteRepositoryPort,
  LoteRepositoryPort,
  ParcelaRepositoryPort,
  PasswordHasherPort,
  ProductorRepositoryPort,
  RegistroCuentaProductorPort,
  TokenProviderPort,
  UsuarioRepositoryPort,
} from '../../src/application/ports/output/OutputPorts';
import { RolUsuario } from '../../src/domain/entities/Usuario';

export class Memoria {
  usuarios: Usuario[] = [];
  productores: Productor[] = [];
  parcelas: Parcela[] = [];
  lotes: Lote[] = [];
  analisis: AnalisisLote[] = [];
}

export class MemoriaUsuarios implements UsuarioRepositoryPort {
  constructor(private readonly memoria: Memoria) {}
  async buscarPorEmail(email: string) {
    return this.memoria.usuarios.find((usuario) => usuario.email.valor === email) ?? null;
  }
  async buscarPorId(id: string) {
    return this.memoria.usuarios.find((usuario) => usuario.id === id) ?? null;
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
  async eliminar(id: string) {
    const tieneParcelas = this.memoria.parcelas.some((parcela) => parcela.productorId === id);
    if (tieneParcelas) {
      throw new ConflictError('No se puede eliminar este productor porque tiene parcelas asociadas.');
    }
    this.memoria.productores = this.memoria.productores.filter((productor) => productor.id !== id);
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
