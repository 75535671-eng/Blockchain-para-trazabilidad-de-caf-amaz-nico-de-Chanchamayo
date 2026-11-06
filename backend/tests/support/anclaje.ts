import { CadenaPruebaAnclaje } from '../../src/adapters/out/anclaje/CadenaPruebaAnclaje';
import { AnclarIntegridadEvento } from '../../src/application/usecases/IntegridadEvento';
import { Memoria, MemoriaReferenciasAnclaje } from './memoria';

export function integridadDePrueba(memoria: Memoria) {
  const cadena = CadenaPruebaAnclaje.enMemoria();
  const referencias = new MemoriaReferenciasAnclaje(memoria);
  return {
    cadena,
    referencias,
    anclar: new AnclarIntegridadEvento(cadena, referencias),
  };
}
