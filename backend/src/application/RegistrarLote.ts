import { Lote, EstadoLote } from '../domain/Lote';
import { ILoteRepository } from '../domain/ILoteRepository';
import { HashService } from '../domain/HashService';

export interface RegistrarLoteInput {
  codigoLote: string;
  idParcela: string;
  variedad: string;
  pesoKg: number;
  altitudMsnm: number;
  fechaCosecha: Date;
}

export class RegistrarLote {
  constructor(private readonly loteRepository: ILoteRepository) {}

  async ejecutar(input: RegistrarLoteInput): Promise<Lote> {
    // 1. Validar si el código de lote ya existe
    const loteExistente = await this.loteRepository.obtenerPorCodigo(input.codigoLote);
    if (loteExistente) {
      throw new Error(`El código de lote '${input.codigoLote}' ya se encuentra registrado.`);
    }

    // 2. Generar Hash Criptográfico inicial
    const hashVerificacion = HashService.generarHash({
      codigoLote: input.codigoLote,
      idParcela: input.idParcela,
      variedad: input.variedad,
      pesoKg: input.pesoKg,
      altitudMsnm: input.altitudMsnm,
      fechaCosecha: input.fechaCosecha
    });

    // 3. Crear instancia del Lote
    const nuevoLote = new Lote({
      codigoLote: input.codigoLote,
      idParcela: input.idParcela,
      variedad: input.variedad,
      pesoKg: input.pesoKg,
      altitudMsnm: input.altitudMsnm,
      fechaCosecha: input.fechaCosecha,
      estado: 'COSECHADO',
      hashVerificacion
    });

    // 4. Persistir en repositorio
    return await this.loteRepository.guardar(nuevoLote);
  }
}