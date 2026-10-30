import { Actor } from '../dto/dtos';
import { LoteRepositoryPort, ParcelaRepositoryPort, ProductorRepositoryPort } from '../ports/output/OutputPorts';
import { Lote } from '../../domain/entities/Lote';
import { ForbiddenError } from '../../domain/errors/DomainError';

export async function lotesVisibles(
  lotes: LoteRepositoryPort,
  parcelas: ParcelaRepositoryPort,
  productores: ProductorRepositoryPort,
  actor: Actor,
): Promise<Lote[]> {
  if (actor.rol === 'ADMINISTRADOR') {
    return lotes.listar();
  }
  const propio = await productores.buscarPorUsuarioId(actor.usuarioId);
  if (!propio) {
    return [];
  }
  const propias = await parcelas.listarPorProductor(propio.id);
  return lotes.listarPorParcelas(propias.map((parcela) => parcela.id));
}

export async function exigirProductorVisible(
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
