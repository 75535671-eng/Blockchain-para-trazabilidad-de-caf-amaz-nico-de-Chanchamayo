import { Parcela } from '../../domain/entities/Parcela';
import { ConflictError, ForbiddenError, NotFoundError } from '../../domain/errors/DomainError';
import { Actor, ParcelaDto } from '../dto/dtos';
import {
  ActualizarParcelaUseCase,
  EliminarParcelaUseCase,
  ListarParcelasUseCase,
  RegistrarParcelaUseCase,
} from '../ports/input/UseCases';
import { ParcelaRepositoryPort, ProductorRepositoryPort } from '../ports/output/OutputPorts';
import { nuevoId } from '../support/apoyo';

export class RegistrarParcela implements RegistrarParcelaUseCase {
  constructor(
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
  ) {}

  async ejecutar(comando: {
    actor: Actor;
    productorId: string;
    nombre: string;
    distrito: string;
    localidad?: string | null;
    areaHectareas: number;
    altitudMsnm?: number | null;
    latitud?: number | null;
    longitud?: number | null;
  }): Promise<ParcelaDto> {
    const productorId = await productorAutorizado(this.productores, comando.actor, comando.productorId);
    const parcela = Parcela.crear({ ...comando, id: nuevoId(), productorId });
    await rechazarNombreDuplicado(this.parcelas, parcela.productorId, parcela.nombre);
    await this.parcelas.guardar(parcela);
    return aParcelaDto(parcela);
  }
}

export class ActualizarParcela implements ActualizarParcelaUseCase {
  constructor(
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
  ) {}

  async ejecutar(comando: {
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
  }): Promise<ParcelaDto> {
    const actual = await this.parcelas.buscarPorId(comando.parcelaId);
    if (!actual) {
      throw new NotFoundError('La parcela no existe.');
    }
    await productorAutorizado(this.productores, comando.actor, actual.productorId);
    const productorId = await productorAutorizado(this.productores, comando.actor, comando.productorId);
    const actualizada = actual.actualizar({ ...comando, productorId });
    await rechazarNombreDuplicado(this.parcelas, actualizada.productorId, actualizada.nombre, actualizada.id);
    await this.parcelas.actualizar(actualizada);
    return aParcelaDto(actualizada);
  }
}

export class EliminarParcela implements EliminarParcelaUseCase {
  constructor(
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
  ) {}

  async ejecutar(comando: { actor: Actor; parcelaId: string }): Promise<void> {
    const actual = await this.parcelas.buscarPorId(comando.parcelaId);
    if (!actual) {
      throw new NotFoundError('La parcela no existe.');
    }
    await productorAutorizado(this.productores, comando.actor, actual.productorId);
    await this.parcelas.eliminar(actual.id);
  }
}

export class ListarParcelas implements ListarParcelasUseCase {
  constructor(
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
  ) {}

  async ejecutar(actor: Actor): Promise<ParcelaDto[]> {
    if (actor.rol === 'ADMINISTRADOR') {
      return (await this.parcelas.listar()).map(aParcelaDto);
    }
    const productor = await this.productores.buscarPorUsuarioId(actor.usuarioId);
    if (!productor) {
      return [];
    }
    return (await this.parcelas.listarPorProductor(productor.id)).map(aParcelaDto);
  }
}

async function rechazarNombreDuplicado(
  parcelas: ParcelaRepositoryPort,
  productorId: string,
  nombre: string,
  exceptoId?: string,
): Promise<void> {
  const existente = await parcelas.buscarPorProductorYNombre(productorId, nombre);
  if (existente && existente.id !== exceptoId) {
    throw new ConflictError('Ya existe una parcela con este nombre.');
  }
}

export async function productorAutorizado(
  productores: ProductorRepositoryPort,
  actor: Actor,
  productorIdSolicitado: string,
): Promise<string> {
  if (actor.rol === 'ADMINISTRADOR') {
    const productor = await productores.buscarPorId(productorIdSolicitado);
    if (!productor) {
      throw new NotFoundError('El productor no existe.');
    }
    return productor.id;
  }
  const propio = await productores.buscarPorUsuarioId(actor.usuarioId);
  if (!propio || propio.id !== productorIdSolicitado) {
    throw new ForbiddenError('Solo puedes registrar información de tu propio productor.');
  }
  return propio.id;
}

export function aParcelaDto(parcela: Parcela): ParcelaDto {
  return {
    id: parcela.id,
    productorId: parcela.productorId,
    nombre: parcela.nombre,
    distrito: parcela.distrito,
    localidad: parcela.localidad,
    areaHectareas: parcela.area.valor,
    altitudMsnm: parcela.altitudMsnm,
    latitud: parcela.coordenadas?.latitud ?? null,
    longitud: parcela.coordenadas?.longitud ?? null,
  };
}
