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
