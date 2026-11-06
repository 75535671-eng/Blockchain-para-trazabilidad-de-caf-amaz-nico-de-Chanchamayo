import { AnalisisLote } from '../../../domain/entities/AnalisisLote';
import { EventoTrazabilidad } from '../../../domain/entities/EventoTrazabilidad';
import { Lote } from '../../../domain/entities/Lote';
import { PrediccionCalidad } from '../../../domain/entities/PrediccionCalidad';
import { Parcela } from '../../../domain/entities/Parcela';
import { Productor } from '../../../domain/entities/Productor';
import { SolicitudRegistro } from '../../../domain/entities/SolicitudRegistro';
import { Usuario, RolUsuario } from '../../../domain/entities/Usuario';
import { SolicitudAnalisis, RespuestaAnalisisIa } from '../../../domain/services/analisis/AnalisisLoteModelo';

export interface UsuarioRepositoryPort {
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
  actualizarRol(id: string, rol: RolUsuario): Promise<void>;
  actualizarPassword(id: string, passwordHash: string): Promise<void>;
}

export interface SolicitudRegistroRepositoryPort {
  guardar(solicitud: SolicitudRegistro): Promise<void>;
  buscarPorId(id: string): Promise<SolicitudRegistro | null>;
  buscarRecientePorEmail(email: string): Promise<SolicitudRegistro | null>;
  existeActivaPorEmail(email: string): Promise<boolean>;
  existeActivaPorDocumento(documento: string): Promise<boolean>;
  listar(): Promise<SolicitudRegistro[]>;
  aprobar(solicitudId: string, usuario: Usuario, productor: Productor, administradorId: string): Promise<void>;
  rechazar(solicitudId: string, administradorId: string, motivo: string): Promise<void>;
}

export interface RegistroCuentaProductorPort {
  guardar(usuario: Usuario, productor: Productor): Promise<void>;
}

export interface ProductorRepositoryPort {
  guardar(productor: Productor): Promise<void>;
  actualizar(productor: Productor): Promise<void>;
  eliminar(id: string, administradorId: string): Promise<void>;
  buscarPorId(id: string): Promise<Productor | null>;
  buscarPorUsuarioId(usuarioId: string): Promise<Productor | null>;
  buscarPorDocumento(documento: string): Promise<Productor | null>;
  listar(): Promise<Productor[]>;
  asignarCuenta(productorId: string, usuario: Usuario): Promise<void>;
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

export interface EventoTrazabilidadRepositoryPort {
  guardar(evento: EventoTrazabilidad): Promise<void>;
  buscarPorId(id: string): Promise<EventoTrazabilidad | null>;
  listarPorLote(loteId: string): Promise<EventoTrazabilidad[]>;
  listarPorLotes(loteIds: string[]): Promise<EventoTrazabilidad[]>;
}

export interface ReferenciaAnclaje {
  id: string;
  eventoId: string;
  hash: string;
  red: string;
  identificador: string;
  fecha: Date;
}

export interface AnclajeEmitido {
  red: string;
  identificador: string;
  fecha: Date;
}

export interface AnclajeIntegridadPort {
  anclar(hash: string): Promise<AnclajeEmitido>;
  verificar(hash: string, identificador: string): Promise<boolean>;
}

export interface ReferenciaAnclajeRepositoryPort {
  guardar(referencia: ReferenciaAnclaje): Promise<void>;
  buscarPorEvento(eventoId: string): Promise<ReferenciaAnclaje | null>;
  listarPorEventos(eventoIds: string[]): Promise<ReferenciaAnclaje[]>;
}

export interface PrediccionCalidadRepositoryPort {
  guardar(prediccion: PrediccionCalidad): Promise<void>;
  listarPorLote(loteId: string): Promise<PrediccionCalidad[]>;
  listarPorLotes(loteIds: string[]): Promise<PrediccionCalidad[]>;
}

export interface EntradaPrediccionCalidad {
  loteId: string;
  variedad: string;
  altitudMsnm: number;
  metodoBeneficio: string;
  humedadPorcentaje: number;
}

export type ResultadoPredictorCalidad =
  | { estado: 'disponible'; calidad: string; modelo: string; referencia: string }
  | { estado: 'no_disponible'; motivo: string };

export interface PredictorCalidadPort {
  predecir(entrada: EntradaPrediccionCalidad): Promise<ResultadoPredictorCalidad>;
}

export interface EntradaPredictorTrazabilidad {
  tieneBeneficio: number;
  tieneTrilla: number;
  tieneAlmacenamiento: number;
  tieneTraslado: number;
  ordenCronologico: number;
  humedadAusente: number;
  humedadPorcentaje: number;
  diasEntreExtremos: number;
}

export interface ResultadoPredictorTrazabilidad {
  resultado: string;
  modelo: string;
  referencia: string;
}

export interface PredictorTrazabilidadPort {
  predecir(entrada: EntradaPredictorTrazabilidad): Promise<ResultadoPredictorTrazabilidad>;
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

export interface ResultadoConsultaDni {
  nombre: string | null;
  estado: 'encontrado' | 'no_encontrado' | 'no_configurado' | 'error';
}

export interface ConsultaDniPort {
  consultar(documento: string): Promise<ResultadoConsultaDni>;
}
