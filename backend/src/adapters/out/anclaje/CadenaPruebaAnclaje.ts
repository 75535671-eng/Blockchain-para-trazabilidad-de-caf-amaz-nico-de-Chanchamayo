import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { AnclajeEmitido, AnclajeIntegridadPort } from '../../../application/ports/output/OutputPorts';
import { ValidationError } from '../../../domain/errors/DomainError';
import { filasDe, invocar, primeraDe } from '../../../infrastructure/persistence/invocar';

/**
 * Cadena de prueba, append-only. No es una red pública: no usa Polygon,
 * Hyperledger, Solidity ni una clave.
 *
 * Cada eslabón es el hash del eslabón anterior concatenado con el hash del evento.
 * El identificador de transacción es el SHA-256 de esa concatenación. El primer
 * eslabón usa un génesis público de 64 ceros.
 *
 * Sustituir esta cadena por una red real es cambiar este adaptador. El dominio
 * y los casos de uso siguen dependiendo solo de AnclajeIntegridadPort.
 *
 * `enMemoria` conserva el registro en el proceso. `conReferencias` lee los eslabones
 * ya guardados por el repositorio de anclaje. Verificar los recorre en orden de secuencia.
 */
export const RED_CADENA_PRUEBA = 'cadena-prueba';
export const GENESIS_CADENA_PRUEBA = '0'.repeat(64);

export function identificadorEslabon(hashAnterior: string, hashEvento: string): string {
  return createHash('sha256').update(`${hashAnterior}${hashEvento}`, 'utf8').digest('hex');
}

interface EslabonRegistrado {
  hash: string;
  identificador: string;
}

interface BitacoraCadenaPrueba {
  ultimoIdentificador(): Promise<string | null>;
  agregar(hash: string, identificador: string): Promise<void>;
  listar(): Promise<EslabonRegistrado[]>;
}

export class CadenaPruebaAnclaje implements AnclajeIntegridadPort {
  static enMemoria(): CadenaPruebaAnclaje {
    return new CadenaPruebaAnclaje(new BitacoraMemoria());
  }

  static conReferencias(pool: Pool): CadenaPruebaAnclaje {
    return new CadenaPruebaAnclaje(new BitacoraReferencias(pool));
  }

  private constructor(private readonly bitacora: BitacoraCadenaPrueba) {}

  async anclar(hash: string): Promise<AnclajeEmitido> {
    if (!/^[0-9a-f]{64}$/.test(hash)) {
      throw new ValidationError('El hash que se ancla debe ser SHA-256 en hexadecimal.');
    }
    const anterior = (await this.bitacora.ultimoIdentificador()) ?? GENESIS_CADENA_PRUEBA;
    const identificador = identificadorEslabon(anterior, hash);
    await this.bitacora.agregar(hash, identificador);
    return { red: RED_CADENA_PRUEBA, identificador, fecha: new Date() };
  }

  async verificar(hash: string, identificador: string): Promise<boolean> {
    return confirmaEslabon(await this.bitacora.listar(), hash, identificador);
  }
}

function confirmaEslabon(eslabones: EslabonRegistrado[], hash: string, identificador: string): boolean {
  let anterior = GENESIS_CADENA_PRUEBA;
  for (const eslabon of eslabones) {
    const esperado = identificadorEslabon(anterior, eslabon.hash);
    if (eslabon.identificador !== esperado) {
      return false;
    }
    if (eslabon.identificador === identificador) {
      return eslabon.hash === hash;
    }
    anterior = eslabon.identificador;
  }
  return false;
}

class BitacoraMemoria implements BitacoraCadenaPrueba {
  private readonly eslabones: EslabonRegistrado[] = [];

  async ultimoIdentificador(): Promise<string | null> {
    return this.eslabones.at(-1)?.identificador ?? null;
  }

  async agregar(hash: string, identificador: string): Promise<void> {
    this.eslabones.push({ hash, identificador });
  }

  async listar(): Promise<EslabonRegistrado[]> {
    return [...this.eslabones];
  }
}

class BitacoraReferencias implements BitacoraCadenaPrueba {
  constructor(private readonly pool: Pool) {}

  async ultimoIdentificador(): Promise<string | null> {
    const fila = primeraDe(await invocar(this.pool, 'ultimo_eslabon'));
    return fila ? String(fila.identificador_transaccion) : null;
  }

  async agregar(_hash: string, _identificador: string): Promise<void> {
    // El repositorio de anclaje guarda el eslabón enseguida.
  }

  async listar(): Promise<EslabonRegistrado[]> {
    return filasDe(await invocar(this.pool, 'listar_eslabones')).map((fila) => ({
      hash: String(fila.hash_evento),
      identificador: String(fila.identificador_transaccion),
    }));
  }
}
