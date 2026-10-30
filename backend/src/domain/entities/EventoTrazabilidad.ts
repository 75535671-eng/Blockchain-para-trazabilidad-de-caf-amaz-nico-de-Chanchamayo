import {
  esEtapaTrazabilidad,
  esMetodoBeneficio,
  EtapaTrazabilidad,
  MetodoBeneficio,
} from '../catalogos/registro';
import { ValidationError } from '../errors/DomainError';

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class VariableBeneficio {
  private constructor(
    readonly id: string,
    readonly metodoBeneficio: MetodoBeneficio,
    readonly humedadPorcentaje: number,
  ) {}

  static crear(props: { id: string; metodoBeneficio: string; humedadPorcentaje: number }): VariableBeneficio {
    const metodo = props.metodoBeneficio.trim();
    if (!esMetodoBeneficio(metodo)) {
      throw new ValidationError('Selecciona un método de beneficio de la lista.');
    }
    if (!humedadValida(props.humedadPorcentaje)) {
      throw new ValidationError('La humedad debe estar entre 0 y 100, con hasta dos decimales.');
    }
    return new VariableBeneficio(props.id, metodo, Math.round(props.humedadPorcentaje * 100) / 100);
  }
}

export class EventoTrazabilidad {
  private constructor(
    readonly id: string,
    readonly loteId: string,
    readonly etapa: EtapaTrazabilidad,
    readonly fecha: string,
    readonly descripcion: string,
    readonly variables: VariableBeneficio | null,
    readonly createdAt: Date,
  ) {}

  static crear(props: {
    id: string;
    loteId: string;
    etapa: string;
    fecha: string;
    fechaCosecha: string;
    hoyIso: string;
    descripcion: string;
    variables?: { id: string; metodoBeneficio: string; humedadPorcentaje: number } | null;
    createdAt?: Date;
  }): EventoTrazabilidad {
    if (!props.loteId.trim()) {
      throw new ValidationError('El evento debe estar asociado a un lote.');
    }
    const etapa = props.etapa.trim();
    if (!esEtapaTrazabilidad(etapa)) {
      throw new ValidationError('Selecciona una etapa del proceso.');
    }
    const fecha = props.fecha.trim();
    if (!esFechaIso(fecha) || !esFechaIso(props.hoyIso) || !esFechaIso(props.fechaCosecha)) {
      throw new ValidationError('La fecha del evento debe tener formato YYYY-MM-DD.');
    }
    if (fecha > props.hoyIso) {
      throw new ValidationError('La fecha del evento no puede ser futura.');
    }
    if (fecha < props.fechaCosecha) {
      throw new ValidationError('La fecha del evento no puede ser anterior a la cosecha del lote.');
    }
    const descripcion = props.descripcion.trim();
    if (descripcion.length < 1) {
      throw new ValidationError('La descripción del evento es obligatoria.');
    }
    if (descripcion.length > 500) {
      throw new ValidationError('La descripción admite como máximo 500 caracteres.');
    }
    const variables = resolverVariables(etapa, props.variables ?? null);
    return new EventoTrazabilidad(props.id, props.loteId, etapa, fecha, descripcion, variables, props.createdAt ?? new Date());
  }

  static reconstituir(props: {
    id: string;
    loteId: string;
    etapa: string;
    fecha: string;
    descripcion: string;
    variables: VariableBeneficio | null;
    createdAt: Date;
  }): EventoTrazabilidad {
    if (!esEtapaTrazabilidad(props.etapa)) {
      throw new ValidationError('El evento guardado tiene una etapa desconocida.');
    }
    if (props.etapa === 'BENEFICIO' && !props.variables) {
      throw new ValidationError('El evento de beneficio guardado no tiene variables.');
    }
    if (props.etapa !== 'BENEFICIO' && props.variables) {
      throw new ValidationError('El evento guardado tiene variables que no corresponden a su etapa.');
    }
    return new EventoTrazabilidad(
      props.id,
      props.loteId,
      props.etapa,
      props.fecha,
      props.descripcion,
      props.variables,
      props.createdAt,
    );
  }
}

function resolverVariables(
  etapa: EtapaTrazabilidad,
  variables: { id: string; metodoBeneficio: string; humedadPorcentaje: number } | null,
): VariableBeneficio | null {
  if (etapa !== 'BENEFICIO') {
    if (variables) {
      throw new ValidationError('Esta etapa no registra variables productivas.');
    }
    return null;
  }
  if (!variables) {
    throw new ValidationError('El beneficio debe registrar el método y la humedad.');
  }
  return VariableBeneficio.crear(variables);
}

function humedadValida(valor: number): boolean {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > 100) {
    return false;
  }
  const centesimas = Math.round(valor * 100);
  return Math.abs(valor * 100 - centesimas) < 1e-6;
}

function esFechaIso(valor: string): boolean {
  if (!FORMATO_FECHA.test(valor)) {
    return false;
  }
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}
