import { RolUsuario } from '../../domain/entities/Usuario';

export interface Actor {
  usuarioId: string;
  rol: RolUsuario;
}

export interface UsuarioDto {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

export interface ProductorDto {
  id: string;
  usuarioId: string | null;
  nombre: string;
  documento: string;
  telefono: string | null;
  organizacion: string | null;
}

export interface ParcelaDto {
  id: string;
  productorId: string;
  nombre: string;
  distrito: string;
  localidad: string | null;
  areaHectareas: number;
  altitudMsnm: number | null;
  latitud: number | null;
  longitud: number | null;
}

export interface LoteDto {
  id: string;
  codigo: string;
  parcelaId: string;
  fechaCosecha: string;
  cantidadKg: number;
  variedad: string;
  observaciones: string | null;
  estado: 'REGISTRADO';
}

export interface AnalisisLoteDto {
  id: string;
  loteId: string;
  estrategia: 'CON_ALTITUD' | 'SIN_ALTITUD';
  clasificacion: 'COHERENTE' | 'REVISAR' | 'INSUFICIENTE';
  resumen: string;
  observaciones: string[];
  confianza: 'BAJA' | 'MEDIA' | 'ALTA';
  proveedor: string;
  createdAt: string;
}

export interface ConsultaLoteDto {
  lote: LoteDto;
  parcela: ParcelaDto;
  productor: ProductorDto;
  ultimoAnalisis: AnalisisLoteDto | null;
}
