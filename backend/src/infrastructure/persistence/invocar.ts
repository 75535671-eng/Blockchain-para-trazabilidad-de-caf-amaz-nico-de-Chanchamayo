import { Pool, PoolClient, QueryResult } from 'pg';

type Cliente = Pool | PoolClient;
type Fila = Record<string, unknown>;

const NOMBRE = /^[a-z_][a-z0-9_]*$/;

/**
 * Única frase SQL del backend: invoca una función ya definida en PostgreSQL.
 * Los adaptadores pasan el nombre y los argumentos. La consulta vive en la migración.
 */
export async function invocar(cliente: Cliente, funcion: string, parametros: unknown[] = []): Promise<QueryResult> {
  if (!NOMBRE.test(funcion)) {
    throw new Error('La función de base de datos no es válida.');
  }
  const lugares = parametros.map((_, indice) => `$${indice + 1}`).join(', ');
  return cliente.query(`SELECT * FROM ${funcion}(${lugares})`, parametros);
}

export async function transaccion<T>(pool: Pool, trabajo: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

export function filasDe(resultado: QueryResult): Fila[] {
  return resultado.rows as Fila[];
}

export function primeraDe(resultado: QueryResult): Fila | null {
  return filasDe(resultado)[0] ?? null;
}

export function conteo(resultado: QueryResult): number {
  const valor = primeraDe(resultado)?.filas;
  return valor == null ? 0 : Number(valor);
}
