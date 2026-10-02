export type EstadoLote = 'COSECHADO' | 'PROCESADO' | 'EMPACADO' | 'EN_TRANSITO' | 'ENTREGADO';

export interface LoteProps {
  id?: string;
  codigoLote: string;
  idParcela: string;
  variedad: string;
  pesoKg: number;
  altitudMsnm: number;
  fechaCosecha: Date;
  estado: EstadoLote;
  hashVerificacion?: string;
}

export class Lote {
  public id?: string;
  public codigoLote: string;
  public idParcela: string;
  public variedad: string;
  public pesoKg: number;
  public altitudMsnm: number;
  public fechaCosecha: Date;
  public estado: EstadoLote;
  public hashVerificacion?: string;

  constructor(props: LoteProps) {
    this.id = props.id;
    this.codigoLote = props.codigoLote;
    this.idParcela = props.idParcela;
    this.variedad = props.variedad;
    this.pesoKg = props.pesoKg;
    this.altitudMsnm = props.altitudMsnm;
    this.fechaCosecha = props.fechaCosecha;
    this.estado = props.estado;
    this.hashVerificacion = props.hashVerificacion;
  }
}