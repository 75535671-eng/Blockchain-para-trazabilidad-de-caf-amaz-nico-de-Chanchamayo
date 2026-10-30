import { describe, expect, it } from 'vitest';
import { EventoTrazabilidad } from '../../src/domain/entities/EventoTrazabilidad';

const base = {
  id: 'evento-1',
  loteId: 'lote-1',
  fechaCosecha: '2026-06-10',
  hoyIso: '2026-10-30',
  descripcion: 'Pergamino secado en camas elevadas.',
};

describe('evento de trazabilidad', () => {
  it('registra beneficio con método y humedad', () => {
    const evento = EventoTrazabilidad.crear({
      ...base,
      etapa: 'BENEFICIO',
      fecha: '2026-06-10',
      variables: { id: 'var-1', metodoBeneficio: 'Honey', humedadPorcentaje: 11.2 },
    });
    expect(evento.etapa).toBe('BENEFICIO');
    expect(evento.variables?.metodoBeneficio).toBe('Honey');
    expect(evento.variables?.humedadPorcentaje).toBe(11.2);
  });

  it('acepta traslado sin variables y rechaza variables fuera de beneficio', () => {
    const traslado = EventoTrazabilidad.crear({
      ...base,
      etapa: 'TRASLADO',
      fecha: '2026-07-01',
    });
    expect(traslado.variables).toBeNull();
    expect(() =>
      EventoTrazabilidad.crear({
        ...base,
        etapa: 'EXPORTACION',
        fecha: '2026-08-01',
        variables: { id: 'var-2', metodoBeneficio: 'Lavado', humedadPorcentaje: 12 },
      }),
    ).toThrow(/no registra variables/);
  });

  it('rechaza beneficio incompleto, humedad inválida y fechas incoherentes', () => {
    expect(() =>
      EventoTrazabilidad.crear({
        ...base,
        etapa: 'BENEFICIO',
        fecha: '2026-07-01',
      }),
    ).toThrow(/método y la humedad/);
    expect(() =>
      EventoTrazabilidad.crear({
        ...base,
        etapa: 'BENEFICIO',
        fecha: '2026-07-01',
        variables: { id: 'var-3', metodoBeneficio: 'Lavado', humedadPorcentaje: 11.256 },
      }),
    ).toThrow(/dos decimales/);
    expect(() =>
      EventoTrazabilidad.crear({
        ...base,
        etapa: 'BENEFICIO',
        fecha: '2026-07-01',
        variables: { id: 'var-4', metodoBeneficio: 'Catación', humedadPorcentaje: 11 },
      }),
    ).toThrow(/método de beneficio/);
    expect(() =>
      EventoTrazabilidad.crear({
        ...base,
        etapa: 'TRILLA',
        fecha: '2026-06-01',
      }),
    ).toThrow(/anterior a la cosecha/);
    expect(() =>
      EventoTrazabilidad.crear({
        ...base,
        etapa: 'ALMACENAMIENTO',
        fecha: '2026-12-01',
      }),
    ).toThrow(/futura/);
    expect(() =>
      EventoTrazabilidad.crear({
        ...base,
        etapa: 'COSECHA',
        fecha: '2026-07-01',
      }),
    ).toThrow(/etapa del proceso/);
    expect(() =>
      EventoTrazabilidad.crear({
        ...base,
        etapa: 'TRASLADO',
        fecha: '2026-07-01',
        descripcion: '   ',
      }),
    ).toThrow(/descripción del evento es obligatoria/);
  });
});
