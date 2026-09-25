import { ValidationError } from '../errors/DomainError';

export type ClasificacionAnalisis = 'COHERENTE' | 'REVISAR' | 'INSUFICIENTE';
export type ConfianzaAnalisis = 'BAJA' | 'MEDIA' | 'ALTA';
export type NombreEstrategiaAnalisis = 'CON_ALTITUD' | 'SIN_ALTITUD';

export class AnalisisLote {
  private constructor(
    readonly id: string,
    readonly loteId: string,
    readonly estrategia: NombreEstrategiaAnalisis,
    readonly clasificacion: ClasificacionAnalisis,
    readonly resumen: string,
    readonly observaciones: string[],
    readonly confianza: ConfianzaAnalisis,
    readonly proveedor: string,
    readonly createdAt: Date,
  ) {}

  static crear(props: {
    id: string;
    loteId: string;
    estrategia: NombreEstrategiaAnalisis;
    clasificacion: ClasificacionAnalisis;
    resumen: string;
    observaciones: string[];
    confianza: ConfianzaAnalisis;
    proveedor: string;
    createdAt?: Date;
  }): AnalisisLote {
    const resumen = props.resumen.trim();
    if (!props.loteId.trim() || resumen.length < 5 || resumen.length > 1000) {
      throw new ValidationError('El análisis debe referir un lote y un resumen válido.');
    }
    if (props.observaciones.length > 6 || props.observaciones.some((item) => item.trim().length === 0 || item.length > 300)) {
      throw new ValidationError('Las observaciones del análisis no tienen un formato válido.');
    }
    if (!props.proveedor.trim()) {
      throw new ValidationError('El análisis debe identificar el proveedor de IA.');
    }
    return new AnalisisLote(
      props.id,
      props.loteId,
      props.estrategia,
      props.clasificacion,
      resumen,
      props.observaciones.map((item) => item.trim()),
      props.confianza,
      props.proveedor.trim(),
      props.createdAt ?? new Date(),
    );
  }
}
