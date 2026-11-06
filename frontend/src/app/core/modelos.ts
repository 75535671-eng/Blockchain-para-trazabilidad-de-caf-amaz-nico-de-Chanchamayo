export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: 'ADMINISTRADOR' | 'PRODUCTOR';
  debeCambiarPassword?: boolean;
}

export interface SolicitudRegistro {
  id: string;
  nombre: string;
  documento: string;
  telefono: string;
  organizacion: string | null;
  email: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivoRechazo: string | null;
  fechaSolicitud: string;
  fechaResolucion: string | null;
}

export interface Productor {
  id: string;
  usuarioId: string | null;
  nombre: string;
  documento: string;
  telefono: string | null;
  organizacion: string | null;
  rolCuenta?: 'ADMINISTRADOR' | 'PRODUCTOR' | null;
}

export interface Parcela {
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

export interface Lote {
  id: string;
  codigo: string;
  parcelaId: string;
  fechaCosecha: string;
  cantidadKg: number;
  variedad: string;
  observaciones: string | null;
  estado: 'REGISTRADO';
}

export interface AnalisisLote {
  id: string;
  loteId: string;
  estrategia: 'CON_ALTITUD' | 'SIN_ALTITUD';
  clasificacion: 'COHERENTE' | 'REVISAR' | 'INSUFICIENTE';
  resumen: string;
  observaciones: string[];
  confianza: 'BAJA' | 'MEDIA' | 'ALTA';
  proveedor: string;
}

export interface ConsultaLote {
  lote: Lote;
  parcela: Parcela;
  productor: Productor;
  ultimoAnalisis: AnalisisLote | null;
}

export interface VariableBeneficio {
  id: string;
  metodoBeneficio: 'Lavado' | 'Honey' | 'Natural';
  humedadPorcentaje: number;
}

export interface AnclajeIntegridad {
  hash: string;
  red: string;
  identificador: string;
  fecha: string;
}

export interface EventoTrazabilidad {
  id: string;
  loteId: string;
  etapa: 'BENEFICIO' | 'TRILLA' | 'ALMACENAMIENTO' | 'TRASLADO' | 'EXPORTACION';
  fecha: string;
  descripcion: string;
  variables: VariableBeneficio | null;
  createdAt: string;
  anclaje?: AnclajeIntegridad | null;
}

export interface VerificacionIntegridad {
  eventoId: string;
  estado: 'verificada' | 'fallida' | 'sin_anclaje';
  mensaje: string;
  hash: string | null;
  red: string | null;
  identificador: string | null;
}

export interface PrediccionCalidad {
  id: string;
  loteId: string;
  calidad: string;
  modelo: string;
  referencia: string;
  createdAt: string;
}

export interface IntentoPrediccion {
  estado: 'datos_insuficientes' | 'no_disponible' | 'disponible';
  mensaje: string | null;
  variables: {
    variedad: string | null;
    altitudMsnm: number | null;
    metodoBeneficio: string | null;
    humedadPorcentaje: number | null;
  };
  prediccion: PrediccionCalidad | null;
}

export interface MetricaHistorica {
  nombre: string;
  resultado: number;
  meta: number;
}

export interface EvaluacionModelo {
  estado: 'NO_CONCLUYENTE';
  algoritmo: string;
  identificador: string;
  dataset: string;
  datasetDisponible: boolean;
  modeloExportado: boolean;
  registrosEntrenamiento: number;
  registrosPrueba: number;
  randomState: number;
  metricasHistoricas: MetricaHistorica[];
  decisionHistorica: string;
  limitaciones: string[];
}

export interface EvaluacionTrazabilidad extends EvaluacionModelo {
  decisionIntegracion: string;
}

export interface EntradaTrazabilidad {
  tieneBeneficio: number;
  tieneTrilla: number;
  tieneAlmacenamiento: number;
  tieneTraslado: number;
  ordenCronologico: number;
  humedadAusente: number;
  humedadPorcentaje: number;
  diasEntreExtremos: number;
}

export interface IntentoTrazabilidad {
  estado: 'datos_insuficientes' | 'disponible';
  mensaje: string | null;
  entrada: EntradaTrazabilidad | null;
  estimacion: {
    resultado: string;
    modelo: string;
    referencia: string;
  } | null;
}

export interface ReporteLote {
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
  eventos: EventoTrazabilidad[];
}

export interface ReporteTrazabilidad {
  disponible: boolean;
  mensaje: string | null;
  lotes: ReporteLote[];
}
