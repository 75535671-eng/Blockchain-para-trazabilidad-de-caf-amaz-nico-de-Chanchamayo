import { ValidationError } from '../errors/DomainError';
import { DocumentoIdentidad } from '../valueobjects/DocumentoIdentidad';
import { Email } from '../valueobjects/Email';

export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada';

export class SolicitudRegistro {
  private constructor(
    readonly id: string,
    readonly nombre: string,
    readonly documento: DocumentoIdentidad,
    readonly telefono: string,
    readonly organizacion: string | null,
    readonly email: Email,
    readonly passwordHash: string,
    readonly estado: EstadoSolicitud,
    readonly motivoRechazo: string | null,
    readonly fechaSolicitud: Date,
    readonly fechaResolucion: Date | null,
    readonly administradorId: string | null,
    readonly usuarioId: string | null,
    readonly productorId: string | null,
  ) {}

  static crear(props: {
    id: string;
    nombre: string;
    documento: string;
    telefono: string;
    organizacion?: string | null;
    email: string;
    passwordHash: string;
    estado?: EstadoSolicitud;
    motivoRechazo?: string | null;
    fechaSolicitud?: Date;
    fechaResolucion?: Date | null;
    administradorId?: string | null;
    usuarioId?: string | null;
    productorId?: string | null;
  }): SolicitudRegistro {
    const nombre = props.nombre.trim();
    if (nombre.length < 2 || nombre.length > 150) {
      throw new ValidationError('El nombre del productor debe tener entre 2 y 150 caracteres.');
    }
    const telefono = props.telefono.trim();
    if (!telefono || telefono.length > 20) {
      throw new ValidationError('El teléfono es obligatorio y admite como máximo 20 caracteres.');
    }
    const organizacion = props.organizacion?.trim() ?? '';
    if (organizacion.length > 150) {
      throw new ValidationError('La organización admite como máximo 150 caracteres.');
    }
    if (!props.passwordHash.trim()) {
      throw new ValidationError('La solicitud requiere una contraseña protegida.');
    }
    const estado = props.estado ?? 'pendiente';
    if (estado !== 'pendiente' && estado !== 'aprobada' && estado !== 'rechazada') {
      throw new ValidationError('El estado de la solicitud no es válido.');
    }
    return new SolicitudRegistro(
      props.id,
      nombre,
      DocumentoIdentidad.crear(props.documento),
      telefono,
      organizacion || null,
      Email.crear(props.email),
      props.passwordHash,
      estado,
      props.motivoRechazo ?? null,
      props.fechaSolicitud ?? new Date(),
      props.fechaResolucion ?? null,
      props.administradorId ?? null,
      props.usuarioId ?? null,
      props.productorId ?? null,
    );
  }
}
