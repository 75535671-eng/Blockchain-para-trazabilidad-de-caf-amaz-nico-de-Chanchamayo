import { EMPTY, Observable, Subscription, timer } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { ConsultaLote } from '../core/modelos';

export function sondearLote(
  consultar: () => Observable<ConsultaLote>,
  puedeConsultar: () => boolean,
  alRecibir: (consulta: ConsultaLote) => void,
): Subscription {
  return timer(5000, 5000)
    .pipe(
      filter(() => puedeConsultar()),
      switchMap(() => consultar().pipe(catchError(() => EMPTY))),
    )
    .subscribe(alRecibir);
}

export function textoDeActualizacion(marca: number | null, ahora: number): string {
  if (marca === null) {
    return '—';
  }
  const segundos = Math.max(0, Math.floor((ahora - marca) / 1000));
  const hora = new Date(marca).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  if (segundos < 5) {
    return `ahora · ${hora}`;
  }
  return `hace ${segundos} segundos · ${hora}`;
}
