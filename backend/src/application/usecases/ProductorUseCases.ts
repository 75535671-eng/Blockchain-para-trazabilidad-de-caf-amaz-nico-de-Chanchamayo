import { Productor } from '../../domain/entities/Productor';
import { ConflictError, ForbiddenError, NotFoundError } from '../../domain/errors/DomainError';
import { Actor } from '../dto/dtos';
import { ActualizarProductorUseCase, EliminarProductorUseCase, ListarProductoresUseCase, RegistrarProductorUseCase } from '../ports/input/UseCases';
import { ProductorRepositoryPort } from '../ports/output/OutputPorts';
import { nuevoId } from '../support/apoyo';
import { aProductorDto } from './RegistrarUsuario';

export class RegistrarProductor implements RegistrarProductorUseCase {
  constructor(private readonly productores: ProductorRepositoryPort) {}

  async ejecutar(comando: {
    actor: Actor;
    nombre: string;
    documento: string;
    telefono?: string | null;
    organizacion?: string | null;
  }) {
    exigirAdministrador(comando.actor);
    const productor = Productor.crear({
      id: nuevoId(),
      nombre: comando.nombre,
      documento: comando.documento,
      telefono: comando.telefono,
      organizacion: comando.organizacion,
    });
    if (await this.productores.buscarPorDocumento(productor.documento.valor)) {
      throw new ConflictError('Ya existe un productor con ese documento.');
    }
    await this.productores.guardar(productor);
    return aProductorDto(productor);
  }
}

export class ListarProductores implements ListarProductoresUseCase {
  constructor(private readonly productores: ProductorRepositoryPort) {}

  async ejecutar(actor: Actor) {
    if (actor.rol === 'ADMINISTRADOR') {
      return (await this.productores.listar()).map(aProductorDto);
    }
    const propio = await this.productores.buscarPorUsuarioId(actor.usuarioId);
    return propio ? [aProductorDto(propio)] : [];
  }
}

export class ActualizarProductor implements ActualizarProductorUseCase {
  constructor(private readonly productores: ProductorRepositoryPort) {}

  async ejecutar(comando: {
    actor: Actor;
    productorId: string;
    nombre: string;
    telefono?: string | null;
    organizacion?: string | null;
  }) {
    exigirAdministrador(comando.actor);
    const actual = await this.productores.buscarPorId(comando.productorId);
    if (!actual) {
      throw new NotFoundError('El productor no existe.');
    }
    const actualizado = actual.actualizar(comando);
    await this.productores.actualizar(actualizado);
    return aProductorDto(actualizado);
  }
}

export class EliminarProductor implements EliminarProductorUseCase {
  constructor(private readonly productores: ProductorRepositoryPort) {}

  async ejecutar(comando: { actor: Actor; productorId: string }): Promise<void> {
    exigirAdministrador(comando.actor);
    const actual = await this.productores.buscarPorId(comando.productorId);
    if (!actual) {
      throw new NotFoundError('El productor no existe.');
    }
    await this.productores.eliminar(actual.id);
  }
}

function exigirAdministrador(actor: Actor): void {
  if (actor.rol !== 'ADMINISTRADOR') {
    throw new ForbiddenError('Solo un administrador puede gestionar productores.');
  }
}
