import { AnalisisLote } from '../../../domain/entities/AnalisisLote';
import { Lote } from '../../../domain/entities/Lote';
import { Parcela } from '../../../domain/entities/Parcela';
import { Productor } from '../../../domain/entities/Productor';
import { Usuario } from '../../../domain/entities/Usuario';
import { RolUsuario } from '../../../domain/entities/Usuario';
import { SolicitudAnalisis, RespuestaAnalisisIa } from '../../../domain/services/analisis/AnalisisLoteModelo';

export interface UsuarioRepositoryPort {
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
}

export interface RegistroCuentaProductorPort {
  guardar(usuario: Usuario, productor: Productor): Promise<void>;
}

export interface ProductorRepositoryPort {
  guardar(productor: Productor): Promise<void>;
  actualizar(productor: Productor): Promise<void>;
  eliminar(id: string): Promise<void>;
  buscarPorId(id: string): Promise<Productor | null>;
  buscarPorUsuarioId(usuarioId: string): Promise<Productor | null>;
  buscarPorDocumento(documento: string): Promise<Productor | null>;
  listar(): Promise<Productor[]>;
}

export interface ParcelaRepositoryPort {
  guardar(parcela: Parcela): Promise<void>;
  actualizar(parcela: Parcela): Promise<void>;
  eliminar(id: string): Promise<void>;
  buscarPorId(id: string): Promise<Parcela | null>;
  buscarPorProductorYNombre(productorId: string, nombre: string): Promise<Parcela | null>;
  listar(): Promise<Parcela[]>;
  listarPorProductor(productorId: string): Promise<Parcela[]>;
}

export interface LoteRepositoryPort {
  guardar(lote: Lote): Promise<void>;
  actualizar(lote: Lote): Promise<void>;
  eliminar(id: string): Promise<void>;
  buscarPorId(id: string): Promise<Lote | null>;
  buscarPorCodigo(codigo: string): Promise<Lote | null>;
  listar(): Promise<Lote[]>;
  listarPorParcelas(parcelaIds: string[]): Promise<Lote[]>;
}

export interface AnalisisLoteRepositoryPort {
  guardar(analisis: AnalisisLote): Promise<void>;
  eliminarPorLote(loteId: string): Promise<void>;
  buscarUltimoPorLote(loteId: string): Promise<AnalisisLote | null>;
}

export interface PasswordHasherPort {
  hash(plano: string): Promise<string>;
  verificar(plano: string, hash: string): Promise<boolean>;
}

export interface TokenProviderPort {
  emitir(payload: { usuarioId: string; rol: RolUsuario }): string;
  verificar(token: string): { usuarioId: string; rol: RolUsuario };
}

export interface AIServicePort {
  completar(solicitud: SolicitudAnalisis): Promise<RespuestaAnalisisIa>;
}
