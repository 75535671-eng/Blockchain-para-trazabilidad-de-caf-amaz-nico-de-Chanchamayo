import { createHash } from 'node:crypto';
import { contenidoCanonico } from '../../domain/services/integridad/ContenidoCanonico';

export function hashEvento(evento: {
  loteId: string;
  etapa: string;
  fecha: string;
  descripcion: string;
  variables: { metodoBeneficio: string; humedadPorcentaje: number } | null;
}): string {
  return createHash('sha256').update(contenidoCanonico(evento), 'utf8').digest('hex');
}
