import { Lote } from '../domain/Lote';
import { ILoteRepository } from '../domain/ILoteRepository';

export class ConsultarTrazabilidad {
  constructor(private readonly loteRepository: ILoteRepository) {}

  async ejecutar(codigoLote: string): Promise<Lote> {
    const lote = await this.loteRepository.obtenerPorCodigo(codigoLote);
    if (!lote) {
      throw new Error(`No se encontró información de trazabilidad para el lote '${codigoLote}'.`);
    }
    return lote;
  }
}