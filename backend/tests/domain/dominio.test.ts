import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { CantidadKg } from '../../src/domain/valueobjects/CantidadKg';
import { Coordenadas } from '../../src/domain/valueobjects/Coordenadas';
import { DocumentoIdentidad } from '../../src/domain/valueobjects/DocumentoIdentidad';
import { Email } from '../../src/domain/valueobjects/Email';
import { FechaCosecha } from '../../src/domain/valueobjects/FechaCosecha';
import { IdentificadorLote } from '../../src/domain/valueobjects/IdentificadorLote';
import { LoteFactory } from '../../src/domain/services/LoteFactory';
import { validarRespuestaAnalisis } from '../../src/domain/services/analisis/AnalisisLoteModelo';
import { EstrategiaConAltitud, EstrategiaSinAltitud, SelectorEstrategiaAnalisis } from '../../src/domain/services/analisis/EstrategiasAnalisis';
import { Parcela } from '../../src/domain/entities/Parcela';

const dominio = join(__dirname, '../../src/domain');
const prohibido = ['express', 'mysql2', 'pg', '@supabase/supabase-js', 'axios', 'jsonwebtoken', 'bcrypt', 'openai', '@angular'];

describe('dominio independiente', () => {
  it('no importa frameworks ni infraestructura', () => {
    const fuentes = listarTs(dominio);
    const violaciones = fuentes.flatMap((archivo) => {
      const texto = readFileSync(archivo, 'utf8');
      return prohibido.filter((nombre) => texto.includes(`from '${nombre}`) || texto.includes(`require('${nombre}`)).map((nombre) => `${archivo} -> ${nombre}`);
    });
    expect(violaciones).toEqual([]);
  });
});

describe('value objects y lote', () => {
  it('rechaza cantidad no positiva y coordenadas incompletas', () => {
    expect(() => CantidadKg.crear(0)).toThrow(/mayor que cero/);
    expect(() => Coordenadas.crear(120, 10)).toThrow(/latitud/);
    expect(() =>
      Parcela.crear({
        id: 'p1',
        productorId: 'pr1',
        nombre: 'Parcela Norte',
        distrito: 'San Ramón',
        areaHectareas: 1.5,
        latitud: -11.12,
      }),
    ).toThrow(/juntas/);
  });

  it('genera un identificador de lote asociado a la parcela', () => {
    const lote = LoteFactory.crear({
      id: '11111111-1111-1111-1111-111111111111',
      semillaCodigo: 'aabbccdd11223344',
      parcelaId: 'parcela-1',
      fechaCosecha: '2026-06-15',
      hoyIso: '2026-09-24',
      cantidadKg: 120.5,
      variedad: 'Caturra',
    });
    expect(lote.codigo.valor).toBe('CHNY-2026-AABBCCDD');
    expect(lote.parcelaId).toBe('parcela-1');
    expect(lote.estado).toBe('REGISTRADO');
    expect(() => FechaCosecha.crear('2026-12-01', '2026-09-24')).toThrow(/futura/);
    expect(() => Email.crear('no-es-correo')).toThrow(/correo/);
    expect(() => DocumentoIdentidad.crear('123')).toThrow(/DNI/);
    expect(IdentificadorLote.desdeTexto('CHNY-2026-AABBCCDD').valor).toContain('CHNY');
  });
});

describe('strategy de análisis', () => {
  const base = {
    codigoLote: 'CHNY-2026-AABBCCDD',
    variedad: 'Caturra',
    fechaCosecha: '2026-06-15',
    cantidadKg: 800,
    observaciones: null,
    parcela: 'Norte',
    distrito: 'San Ramón',
    localidad: 'La Esperanza',
    areaHectareas: 1.2,
    altitudMsnm: 1400,
    productor: 'Ana',
    organizacion: 'Cooperativa',
  };

  it('cambia la solicitud cuando no hay altitud y limita la confianza', () => {
    const selector = new SelectorEstrategiaAnalisis(new EstrategiaConAltitud(), new EstrategiaSinAltitud());
    const conAltitud = selector.seleccionar(1400);
    const sinAltitud = selector.seleccionar(null);
    expect(conAltitud.construirSolicitud(base).datos.altitudMsnm).toBe(1400);
    expect(sinAltitud.construirSolicitud({ ...base, altitudMsnm: null }).instrucciones).toContain('No la infieras');
    expect(sinAltitud.confianza(base)).toBe('MEDIA');
    expect(() => validarRespuestaAnalisis({ clasificacion: 'OTRA', resumen: 'texto válido', observaciones: [], proveedor: 'test' })).toThrow(/clasificación/);
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
