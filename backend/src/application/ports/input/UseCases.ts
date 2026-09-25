import { Actor, ConsultaLoteDto, LoteDto, ParcelaDto, ProductorDto, UsuarioDto } from '../../dto/dtos';

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
