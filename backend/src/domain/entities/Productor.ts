import { DocumentoIdentidad } from '../valueobjects/DocumentoIdentidad';
import { ValidationError } from '../errors/DomainError';

export class Productor {
  private constructor(
    readonly id: string,
    readonly usuarioId: string | null,
    readonly nombre: string,
    readonly documento: DocumentoIdentidad,
    readonly telefono: string | null,
    readonly organizacion: string | null,
    readonly createdAt: Date,
  ) {}

  static crear(props: {
    id: string;
    usuarioId?: string | null;
    nombre: string;
    documento: string;
    telefono?: string | null;
    organizacion?: string | null;
    createdAt?: Date;
  }): Productor {
    return new Productor(
      props.id,
      props.usuarioId ?? null,
      nombreObligatorio(props.nombre, 'productor'),
      DocumentoIdentidad.crear(props.documento),
      textoOpcional(props.telefono, 20, 'teléfono'),
      textoOpcional(props.organizacion, 150, 'organización'),
      props.createdAt ?? new Date(),
    );
  }

  actualizar(props: { nombre: string; telefono?: string | null; organizacion?: string | null }): Productor {
    return new Productor(
      this.id,
      this.usuarioId,
      nombreObligatorio(props.nombre, 'productor'),
      this.documento,
      textoOpcional(props.telefono, 20, 'teléfono'),
      textoOpcional(props.organizacion, 150, 'organización'),
      this.createdAt,
    );
  }
}

function nombreObligatorio(valor: string, sujeto: string): string {
  const texto = valor.trim();
  if (texto.length < 2 || texto.length > 150) {
    throw new ValidationError(`El nombre del ${sujeto} debe tener entre 2 y 150 caracteres.`);
  }
  return texto;
}

function textoOpcional(valor: string | null | undefined, maximo: number, etiqueta: string): string | null {
  if (valor == null || valor.trim() === '') {
    return null;
  }
  const texto = valor.trim();
  if (texto.length > maximo) {
    throw new ValidationError(`El ${etiqueta} admite como máximo ${maximo} caracteres.`);
  }
  return texto;
}
