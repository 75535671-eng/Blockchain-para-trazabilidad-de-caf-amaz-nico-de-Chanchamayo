import { AreaHectareas } from '../valueobjects/AreaHectareas';
import { Coordenadas } from '../valueobjects/Coordenadas';
import { ValidationError } from '../errors/DomainError';

/**
 * Límite 1–6000 m s. n. m.: decisión de diseño del PMV1 para rechazar
 * altitudes físicamente imposibles. No restringe el rango de Chanchamayo.
 */
const ALTITUD_MAXIMA = 6000;

export class Parcela {
  private constructor(
    readonly id: string,
    readonly productorId: string,
    readonly nombre: string,
    readonly distrito: string,
    readonly localidad: string | null,
    readonly area: AreaHectareas,
    readonly altitudMsnm: number | null,
    readonly coordenadas: Coordenadas | null,
    readonly createdAt: Date,
  ) {}

  static crear(props: {
    id: string;
    productorId: string;
    nombre: string;
    distrito: string;
    localidad?: string | null;
    areaHectareas: number;
    altitudMsnm?: number | null;
    latitud?: number | null;
    longitud?: number | null;
    createdAt?: Date;
  }): Parcela {
    if (!props.productorId.trim()) {
      throw new ValidationError('La parcela debe pertenecer a un productor.');
    }
    return new Parcela(
      props.id,
      props.productorId,
      texto(props.nombre, 2, 150, 'El nombre de la parcela'),
      texto(props.distrito, 2, 80, 'El distrito'),
      props.localidad?.trim() ? texto(props.localidad, 2, 120, 'La localidad') : null,
      AreaHectareas.crear(props.areaHectareas),
      altitud(props.altitudMsnm),
      coordenadas(props.latitud, props.longitud),
      props.createdAt ?? new Date(),
    );
  }

  actualizar(props: {
    productorId: string;
    nombre: string;
    distrito: string;
    localidad?: string | null;
    areaHectareas: number;
    altitudMsnm?: number | null;
    latitud?: number | null;
    longitud?: number | null;
  }): Parcela {
    return Parcela.crear({ ...props, id: this.id, createdAt: this.createdAt });
  }
}

function texto(valor: string, min: number, max: number, etiqueta: string): string {
  const limpio = valor.trim();
  if (limpio.length < min || limpio.length > max) {
    throw new ValidationError(`${etiqueta} debe tener entre ${min} y ${max} caracteres.`);
  }
  return limpio;
}

function altitud(valor: number | null | undefined): number | null {
  if (valor == null) {
    return null;
  }
  if (!Number.isInteger(valor) || valor < 1 || valor > ALTITUD_MAXIMA) {
    throw new ValidationError(`La altitud debe ser un entero entre 1 y ${ALTITUD_MAXIMA} m s. n. m.`);
  }
  return valor;
}

function coordenadas(latitud?: number | null, longitud?: number | null): Coordenadas | null {
  const tieneLatitud = latitud != null;
  const tieneLongitud = longitud != null;
  if (tieneLatitud !== tieneLongitud) {
    throw new ValidationError('La latitud y la longitud deben registrarse juntas.');
  }
  if (!tieneLatitud || latitud == null || longitud == null) {
    return null;
  }
  return Coordenadas.crear(latitud, longitud);
}
