import { ClasificacionAnalisis, ConfianzaAnalisis, NombreEstrategiaAnalisis } from '../../entities/AnalisisLote';
import { ValidationError } from '../../errors/DomainError';

export interface ContextoAnalisis {
  codigoLote: string;
  variedad: string;
  fechaCosecha: string;
  cantidadKg: number;
  observaciones: string | null;
  parcela: string;
  distrito: string;
  localidad: string | null;
  areaHectareas: number;
  altitudMsnm: number | null;
  productor: string;
  organizacion: string | null;
}

export interface SolicitudAnalisis {
  estrategia: NombreEstrategiaAnalisis;
  instrucciones: string;
  datos: Record<string, string | number | null>;
}

export interface RespuestaAnalisisIa {
  clasificacion: string;
  resumen: string;
  observaciones: string[];
  proveedor: string;
}

export interface RespuestaAnalisisValidada {
  clasificacion: ClasificacionAnalisis;
  resumen: string;
  observaciones: string[];
  proveedor: string;
}

const CLASIFICACIONES: ClasificacionAnalisis[] = ['COHERENTE', 'REVISAR', 'INSUFICIENTE'];

export function validarRespuestaAnalisis(respuesta: RespuestaAnalisisIa): RespuestaAnalisisValidada {
  if (!CLASIFICACIONES.includes(respuesta.clasificacion as ClasificacionAnalisis)) {
    throw new ValidationError('La respuesta de análisis no trae una clasificación válida.');
  }
  const resumen = respuesta.resumen?.trim() ?? '';
  if (resumen.length < 5 || resumen.length > 1000) {
    throw new ValidationError('La respuesta de análisis no trae un resumen válido.');
  }
  if (!Array.isArray(respuesta.observaciones)) {
    throw new ValidationError('La respuesta de análisis no trae observaciones.');
  }
  return {
    clasificacion: respuesta.clasificacion as ClasificacionAnalisis,
    resumen,
    observaciones: respuesta.observaciones,
    proveedor: respuesta.proveedor,
  };
}

export function limitarConfianza(base: ConfianzaAnalisis, estrategia: NombreEstrategiaAnalisis): ConfianzaAnalisis {
  if (estrategia === 'SIN_ALTITUD' && base === 'ALTA') {
    return 'MEDIA';
  }
  return base;
}
