import { EtapaTrazabilidad, MetodoBeneficio } from '../../domain/catalogos/registro';
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
  debeCambiarPassword: boolean;
}

export interface ProductorDto {
  id: string;
  usuarioId: string | null;
  nombre: string;
  documento: string;
  telefono: string | null;
  organizacion: string | null;
  rolCuenta?: RolUsuario | null;
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

export interface VariableBeneficioDto {
  id: string;
  metodoBeneficio: MetodoBeneficio;
  humedadPorcentaje: number;
}

export interface AnclajeIntegridadDto {
  hash: string;
  red: string;
  identificador: string;
  fecha: string;
}

export interface EventoTrazabilidadDto {
  id: string;
  loteId: string;
  etapa: EtapaTrazabilidad;
  fecha: string;
  descripcion: string;
  variables: VariableBeneficioDto | null;
  createdAt: string;
  anclaje?: AnclajeIntegridadDto | null;
}

export interface VerificacionIntegridadDto {
  eventoId: string;
  estado: 'verificada' | 'fallida' | 'sin_anclaje';
  mensaje: string;
  hash: string | null;
  red: string | null;
  identificador: string | null;
}

export interface PrediccionCalidadDto {
  id: string;
  loteId: string;
  calidad: string;
  modelo: string;
  referencia: string;
  createdAt: string;
}

export interface VariablesCalidadDto {
  variedad: string | null;
  altitudMsnm: number | null;
  metodoBeneficio: string | null;
  humedadPorcentaje: number | null;
}

export interface IntentoPrediccionDto {
  estado: 'datos_insuficientes' | 'no_disponible' | 'disponible';
  mensaje: string | null;
  variables: VariablesCalidadDto;
  prediccion: PrediccionCalidadDto | null;
}

export interface EntradaTrazabilidadDto {
  tieneBeneficio: number;
  tieneTrilla: number;
  tieneAlmacenamiento: number;
  tieneTraslado: number;
  ordenCronologico: number;
  humedadAusente: number;
  humedadPorcentaje: number;
  diasEntreExtremos: number;
}

export interface EstimacionTrazabilidadDto {
  resultado: string;
  modelo: string;
  referencia: string;
}

export interface IntentoTrazabilidadDto {
  estado: 'datos_insuficientes' | 'disponible';
  mensaje: string | null;
  entrada: EntradaTrazabilidadDto | null;
  estimacion: EstimacionTrazabilidadDto | null;
}

export interface ReporteLoteDto {
  loteId: string;
  codigo: string;
  estado: string;
  variedad: string;
  fechaCosecha: string;
  cantidadKg: number;
  productor: string;
  organizacion: string | null;
  parcela: string;
  distrito: string;
  localidad: string | null;
  altitudMsnm: number | null;
  eventos: EventoTrazabilidadDto[];
}

export interface ReporteTrazabilidadDto {
  disponible: boolean;
  mensaje: string | null;
  lotes: ReporteLoteDto[];
}
