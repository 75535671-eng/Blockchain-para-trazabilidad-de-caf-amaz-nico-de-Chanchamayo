import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const adaptadores = join(__dirname, '../../src/adapters');
const sql = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|BEGIN|COMMIT|ROLLBACK)\b/;

describe('adaptadores sin SQL', () => {
  it('dejan las consultas en las funciones de PostgreSQL', () => {
    const violaciones = listarTs(adaptadores).flatMap((archivo) => {
      const lineas = readFileSync(archivo, 'utf8').split(/\r?\n/);
      return lineas.flatMap((linea, indice) => (sql.test(linea) ? [`${archivo}:${indice + 1}`] : []));
    });
    expect(violaciones).toEqual([]);
  });
});

function listarTs(directorio: string): string[] {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) {
      return listarTs(ruta);
    }
    return nombre.endsWith('.ts') ? [ruta] : [];
  });
}
