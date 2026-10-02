import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.token()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.sesion()?.debeCambiarPassword) {
    return router.createUrlTree(['/cambiar-contrasena']);
  }
  return true;
};

export const cambioGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.token()) {
    return router.createUrlTree(['/login']);
  }
  if (!auth.sesion()?.debeCambiarPassword) {
    return router.createUrlTree(['/inicio']);
  }
  return true;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.token()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.sesion()?.rol !== 'ADMINISTRADOR') {
    return router.createUrlTree(['/inicio']);
  }
  return auth.consultarSesion().pipe(
    map((usuario) => (usuario.rol === 'ADMINISTRADOR' ? true : router.createUrlTree(['/inicio']))),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
