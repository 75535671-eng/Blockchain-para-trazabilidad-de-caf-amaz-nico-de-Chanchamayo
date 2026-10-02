import { Actor, ConsultaLoteDto, LoteDto, ParcelaDto, ProductorDto, UsuarioDto } from '../../dto/dtos';
import { RolUsuario } from '../../domain/entities/Usuario';

export interface RegistrarUsuarioUseCase {
  ejecutar(comando: {
    nombre: string;
    email: string;
    password: string;
    documento: string;
    telefono?: string | null;
    organizacion?: string | null;
  }): Promise<UsuarioDto>;
}

export interface IniciarSesionUseCase {
  ejecutar(comando: { email: string; password: string }): Promise<{
    token: string;
    usuario: UsuarioDto;
    productorId: string | null;
  }>;
}

export interface ConsultarSesionUseCase {
  ejecutar(actor: Actor): Promise<UsuarioDto>;
}

export interface CambiarContrasenaUseCase {
  ejecutar(comando: { actor: Actor; password: string; confirmacion: string }): Promise<UsuarioDto>;
}

export interface SolicitarRegistroUseCase {
  ejecutar(comando: {
    nombre: string;
    email: string;
    password: string;
    confirmacion: string;
    documento: string;
    telefono: string;
    organizacion?: string | null;
  }): Promise<{ mensaje: string }>;
}

export interface CrearCuentaProductorUseCase {
  ejecutar(comando: {
    actor: Actor;
    nombre: string;
    email: string;
    password: string;
    documento: string;
    telefono?: string | null;
    organizacion?: string | null;
  }): Promise<{ productor: ProductorDto; usuario: UsuarioDto; passwordTemporal: string }>;
}

export interface ListarSolicitudesUseCase {
  ejecutar(actor: Actor): Promise<SolicitudRegistroDto[]>;
}

export interface AprobarSolicitudUseCase {
  ejecutar(comando: { actor: Actor; solicitudId: string }): Promise<SolicitudRegistroDto>;
}

export interface RechazarSolicitudUseCase {
  ejecutar(comando: { actor: Actor; solicitudId: string; motivo: string }): Promise<SolicitudRegistroDto>;
}

export interface SolicitudRegistroDto {
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

export interface OtorgarAdministradorUseCase {
  ejecutar(comando: { actor: Actor; productorId: string; email?: string | null; password?: string | null }): Promise<{
    id: string;
    nombre: string;
    rol: RolUsuario;
  }>;
}

export interface QuitarAdministradorUseCase {
  ejecutar(comando: { actor: Actor; productorId: string }): Promise<{
    id: string;
    nombre: string;
    rol: RolUsuario;
  }>;
}

export interface RegistrarProductorUseCase {
  ejecutar(comando: {
    actor: Actor;
    nombre: string;
    documento: string;
    telefono?: string | null;
    organizacion?: string | null;
  }): Promise<ProductorDto>;
}

export interface ListarProductoresUseCase {
  ejecutar(actor: Actor): Promise<ProductorDto[]>;
}

export interface EliminarProductorUseCase {
  ejecutar(comando: { actor: Actor; productorId: string }): Promise<void>;
}

export interface ConsultarDniProductorUseCase {
  ejecutar(comando: { actor: Actor; documento: string }): Promise<{
    nombre: string | null;
    estado: 'encontrado' | 'no_encontrado' | 'no_configurado' | 'error';
  }>;
}

export interface ActualizarProductorUseCase {
  ejecutar(comando: {
    actor: Actor;
    productorId: string;
    nombre: string;
    telefono?: string | null;
    organizacion?: string | null;
  }): Promise<ProductorDto>;
}

export interface RegistrarParcelaUseCase {
  ejecutar(comando: {
    actor: Actor;
    productorId: string;
    nombre: string;
    distrito: string;
    localidad?: string | null;
    areaHectareas: number;
    altitudMsnm?: number | null;
    latitud?: number | null;
    longitud?: number | null;
  }): Promise<ParcelaDto>;
}

export interface EliminarParcelaUseCase {
  ejecutar(comando: { actor: Actor; parcelaId: string }): Promise<void>;
}

export interface ListarParcelasUseCase {
  ejecutar(actor: Actor): Promise<ParcelaDto[]>;
}

export interface ActualizarParcelaUseCase {
  ejecutar(comando: {
    actor: Actor;
    parcelaId: string;
    productorId: string;
    nombre: string;
    distrito: string;
    localidad?: string | null;
    areaHectareas: number;
    altitudMsnm?: number | null;
    latitud?: number | null;
    longitud?: number | null;
  }): Promise<ParcelaDto>;
}

export interface RegistrarLoteUseCase {
  ejecutar(comando: {
    actor: Actor;
    parcelaId: string;
    fechaCosecha: string;
    cantidadKg: number;
    variedad: string;
    observaciones?: string | null;
  }): Promise<LoteDto>;
}

export interface ListarLotesUseCase {
  ejecutar(actor: Actor): Promise<LoteDto[]>;
}

export interface ActualizarLoteUseCase {
  ejecutar(comando: {
    actor: Actor;
    loteId: string;
    parcelaId: string;
    fechaCosecha: string;
    cantidadKg: number;
    variedad: string;
    observaciones?: string | null;
  }): Promise<LoteDto>;
}

export interface EliminarLoteUseCase {
  ejecutar(comando: { actor: Actor; loteId: string }): Promise<void>;
}

export interface ConsultarLoteUseCase {
  ejecutar(comando: { actor: Actor; loteId: string }): Promise<ConsultaLoteDto>;
}

export interface AnalizarLoteUseCase {
  ejecutar(comando: { actor: Actor; loteId: string }): Promise<ConsultaLoteDto>;
}
