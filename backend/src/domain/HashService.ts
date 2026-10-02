import * as crypto from 'crypto';

export class HashService {
  /**
   * Genera un Hash SHA-256 basado en los datos clave del lote o evento
   */
  public static generarHash(datos: Record<string, any>): string {
    const cadenaData = JSON.stringify(datos);
    return crypto.createHash('sha256').update(cadenaData).digest('hex');
  }
}