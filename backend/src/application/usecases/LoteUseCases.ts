import { esVariedadLote } from '../../domain/catalogos/registro';
import { AnalisisLote } from '../../domain/entities/AnalisisLote';
import { Lote } from '../../domain/entities/Lote';
import { ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/DomainError';
import { LoteFactory } from '../../domain/services/LoteFactory';
import { FechaCosecha } from '../../domain/valueobjects/FechaCosecha';
import { Actor, AnalisisLoteDto, ConsultaLoteDto, LoteDto } from '../dto/dtos';
import { ActualizarLoteUseCase, ConsultarLoteUseCase, EliminarLoteUseCase, ListarLotesUseCase, RegistrarLoteUseCase } from '../ports/input/UseCases';
import {
  AnalisisLoteRepositoryPort,
  LoteRepositoryPort,
  ParcelaRepositoryPort,
  ProductorRepositoryPort,
} from '../ports/output/OutputPorts';
import { hoyIso, nuevoId } from '../support/apoyo';
import { aProductorDto } from './RegistrarUsuario';
import { aParcelaDto } from './ParcelaUseCases';

export class RegistrarLote implements RegistrarLoteUseCase {
  constructor(
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
  ) {}

  async ejecutar(comando: {
    actor: Actor;
    parcelaId: string;
    fechaCosecha: string;
    cantidadKg: number;
    variedad: string;
    observaciones?: string | null;
  }): Promise<LoteDto> {
    exigirVariedad(comando.variedad);
    const parcela = await this.parcelas.buscarPorId(comando.parcelaId);
    if (!parcela) {
      throw new NotFoundError('La parcela no existe.');
    }
    await exigirAccesoAProductor(this.productores, comando.actor, parcela.productorId);
    const lote = LoteFactory.crear({
      id: nuevoId(),
      semillaCodigo: nuevoId(),
      parcelaId: parcela.id,
      fechaCosecha: comando.fechaCosecha,
      hoyIso: hoyIso(),
      cantidadKg: comando.cantidadKg,
      variedad: comando.variedad,
      observaciones: comando.observaciones,
    });
    await this.lotes.guardar(lote);
    return aLoteDto(lote);
  }
}

export class ActualizarLote implements ActualizarLoteUseCase {
  constructor(
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
  ) {}

  async ejecutar(comando: {
    actor: Actor;
    loteId: string;
    parcelaId: string;
    fechaCosecha: string;
    cantidadKg: number;
    variedad: string;
    observaciones?: string | null;
  }): Promise<LoteDto> {
    exigirVariedad(comando.variedad);
    const actual = await this.lotes.buscarPorId(comando.loteId);
    if (!actual) {
      throw new NotFoundError('El lote no existe.');
    }
    const parcelaActual = await this.parcelas.buscarPorId(actual.parcelaId);
    if (!parcelaActual) {
      throw new NotFoundError('La parcela del lote no existe.');
    }
    await exigirAccesoAProductor(this.productores, comando.actor, parcelaActual.productorId);
    const parcela = await this.parcelas.buscarPorId(comando.parcelaId);
    if (!parcela) {
      throw new NotFoundError('La parcela no existe.');
    }
    await exigirAccesoAProductor(this.productores, comando.actor, parcela.productorId);
    const actualizado = actual.actualizar({
      parcelaId: parcela.id,
      fechaCosecha: FechaCosecha.crear(comando.fechaCosecha, hoyIso()),
      cantidadKg: comando.cantidadKg,
      variedad: comando.variedad,
      observaciones: comando.observaciones,
    });
    await this.lotes.actualizar(actualizado);
    return aLoteDto(actualizado);
  }
}

export class EliminarLote implements EliminarLoteUseCase {
  constructor(
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly analisis: AnalisisLoteRepositoryPort,
  ) {}

  async ejecutar(comando: { actor: Actor; loteId: string }): Promise<void> {
    const actual = await this.lotes.buscarPorId(comando.loteId);
    if (!actual) {
      throw new NotFoundError('El lote no existe.');
    }
    const parcela = await this.parcelas.buscarPorId(actual.parcelaId);
    if (!parcela) {
      throw new NotFoundError('La parcela del lote no existe.');
    }
    await exigirAccesoAProductor(this.productores, comando.actor, parcela.productorId);
    await this.analisis.eliminarPorLote(actual.id);
    await this.lotes.eliminar(actual.id);
  }
}

export class ListarLotes implements ListarLotesUseCase {
  constructor(
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
  ) {}

  async ejecutar(actor: Actor): Promise<LoteDto[]> {
    if (actor.rol === 'ADMINISTRADOR') {
      return (await this.lotes.listar()).map(aLoteDto);
    }
    const productor = await this.productores.buscarPorUsuarioId(actor.usuarioId);
    if (!productor) {
      return [];
    }
    const parcelas = await this.parcelas.listarPorProductor(productor.id);
    const lotes = await this.lotes.listarPorParcelas(parcelas.map((parcela) => parcela.id));
    return lotes.map(aLoteDto);
  }
}

export class ConsultarLote implements ConsultarLoteUseCase {
  constructor(
    private readonly lotes: LoteRepositoryPort,
    private readonly parcelas: ParcelaRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly analisis: AnalisisLoteRepositoryPort,
  ) {}

  async ejecutar(comando: { actor: Actor; loteId: string }): Promise<ConsultaLoteDto> {
    return consultarLote(
      {
        lotes: this.lotes,
        parcelas: this.parcelas,
        productores: this.productores,
        analisis: this.analisis,
      },
      comando.actor,
      comando.loteId,
    );
  }
}

export async function consultarLote(
  deps: {
    lotes: LoteRepositoryPort;
    parcelas: ParcelaRepositoryPort;
    productores: ProductorRepositoryPort;
    analisis: AnalisisLoteRepositoryPort;
  },
  actor: Actor,
  loteId: string,
): Promise<ConsultaLoteDto> {
  const lote = await deps.lotes.buscarPorId(loteId);
  if (!lote) {
    throw new NotFoundError('El lote no existe.');
  }
  const parcela = await deps.parcelas.buscarPorId(lote.parcelaId);
  if (!parcela) {
    throw new NotFoundError('La parcela del lote no existe.');
  }
  await exigirAccesoAProductor(deps.productores, actor, parcela.productorId);
  const productor = await deps.productores.buscarPorId(parcela.productorId);
  if (!productor) {
    throw new NotFoundError('El productor del lote no existe.');
  }
  const ultimo = await deps.analisis.buscarUltimoPorLote(lote.id);
  return {
    lote: aLoteDto(lote),
    parcela: aParcelaDto(parcela),
    productor: aProductorDto(productor),
    ultimoAnalisis: ultimo ? aAnalisisDto(ultimo) : null,
  };
}

function exigirVariedad(variedad: string): void {
  if (!esVariedadLote(variedad)) {
    throw new ValidationError('Selecciona una variedad de la lista.');
  }
}

async function exigirAccesoAProductor(
  productores: ProductorRepositoryPort,
  actor: Actor,
  productorId: string,
): Promise<void> {
  if (actor.rol === 'ADMINISTRADOR') {
    return;
  }
  const propio = await productores.buscarPorUsuarioId(actor.usuarioId);
  if (!propio || propio.id !== productorId) {
    throw new ForbiddenError('No puedes acceder a información de otro productor.');
  }
}

export function aAnalisisDto(analisis: AnalisisLote): AnalisisLoteDto {
  return {
    id: analisis.id,
    loteId: analisis.loteId,
    estrategia: analisis.estrategia,
    clasificacion: analisis.clasificacion,
    resumen: analisis.resumen,
    observaciones: analisis.observaciones,
    confianza: analisis.confianza,
    proveedor: analisis.proveedor,
    createdAt: analisis.createdAt.toISOString(),
  };
}

export function aLoteDto(lote: Lote): LoteDto {
  return {
    id: lote.id,
    codigo: lote.codigo.valor,
    parcelaId: lote.parcelaId,
    fechaCosecha: lote.fechaCosecha.iso,
    cantidadKg: lote.cantidad.valor,
    variedad: lote.variedad,
    observaciones: lote.observaciones,
    estado: lote.estado,
  };
}
