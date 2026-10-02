import { ConfianzaAnalisis } from '../../entities/AnalisisLote';
import { ContextoAnalisis, SolicitudAnalisis } from './AnalisisLoteModelo';

export interface EstrategiaAnalisisLote {
  readonly nombre: SolicitudAnalisis['estrategia'];
  construirSolicitud(contexto: ContextoAnalisis): SolicitudAnalisis;
  confianza(contexto: ContextoAnalisis): ConfianzaAnalisis;
}

const INSTRUCCION_BASE = [
  'Eres un revisor del registro inicial de un lote de café.',
  'Clasifica solo la coherencia de los datos recibidos.',
  'No evalúes calidad de taza, precio, certificación ni trazabilidad de etapas posteriores.',
  'No inventes datos que no estén en la solicitud.',
  'Responde únicamente JSON con las claves clasificacion, resumen y observaciones.',
  'clasificacion debe ser COHERENTE, REVISAR o INSUFICIENTE.',
  'COHERENTE: los datos no se contradicen.',
  'REVISAR: hay una tensión concreta entre los datos disponibles.',
  'INSUFICIENTE: faltan datos para opinar.',
  'resumen: una frase. observaciones: máximo 4 frases cortas.',
].join(' ');

export class EstrategiaConAltitud implements EstrategiaAnalisisLote {
  readonly nombre = 'CON_ALTITUD' as const;

  construirSolicitud(contexto: ContextoAnalisis): SolicitudAnalisis {
    return {
      estrategia: this.nombre,
      instrucciones: `${INSTRUCCION_BASE} La altitud está registrada. Puedes usarla solo como contexto del origen, sin afirmar calidad.`,
      datos: datosComunes(contexto),
    };
  }

  confianza(contexto: ContextoAnalisis): ConfianzaAnalisis {
    if (contexto.localidad && contexto.organizacion) {
      return 'ALTA';
    }
    return 'MEDIA';
  }
}

export class EstrategiaSinAltitud implements EstrategiaAnalisisLote {
  readonly nombre = 'SIN_ALTITUD' as const;

  construirSolicitud(contexto: ContextoAnalisis): SolicitudAnalisis {
    return {
      estrategia: this.nombre,
      instrucciones: `${INSTRUCCION_BASE} La altitud no fue registrada. No la infieras ni la menciones como si existiera.`,
      datos: { ...datosComunes(contexto), altitudMsnm: null },
    };
  }

  confianza(): ConfianzaAnalisis {
    return 'MEDIA';
  }
}

export class SelectorEstrategiaAnalisis {
  constructor(
    private readonly conAltitud: EstrategiaAnalisisLote,
    private readonly sinAltitud: EstrategiaAnalisisLote,
  ) {}

  seleccionar(altitudMsnm: number | null): EstrategiaAnalisisLote {
    return altitudMsnm == null ? this.sinAltitud : this.conAltitud;
  }
}

function datosComunes(contexto: ContextoAnalisis): Record<string, string | number | null> {
  return {
    codigoLote: contexto.codigoLote,
    variedad: contexto.variedad,
    fechaCosecha: contexto.fechaCosecha,
    cantidadKg: contexto.cantidadKg,
    observaciones: contexto.observaciones,
    parcela: contexto.parcela,
    distrito: contexto.distrito,
    localidad: contexto.localidad,
    areaHectareas: contexto.areaHectareas,
    altitudMsnm: contexto.altitudMsnm,
    productor: contexto.productor,
    organizacion: contexto.organizacion,
  };
}
