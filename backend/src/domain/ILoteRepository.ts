import { Lote } from './Lote';

export interface ILoteRepository {
  guardar(lote: Lote): Promise<Lote>;
  obtenerPorCodigo(codigoLote: string): Promise<Lote | null>;
  listarTodos(): Promise<Lote[]>;
}