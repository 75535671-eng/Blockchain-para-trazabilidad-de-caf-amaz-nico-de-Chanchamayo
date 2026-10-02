import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription, catchError, interval, of, startWith, switchMap } from 'rxjs';
import { AuthService } from './core/auth.service';
import { TemaService } from './core/tema.service';
import { BotanicaFondoComponent } from './shared/botanica-fondo.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BotanicaFondoComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  private vigilancia?: Subscription;
  readonly enlaces = [
    { ruta: '/inicio', texto: 'Dashboard', icono: '⌂' },
    { ruta: '/productores', texto: 'Productores', icono: '☺' },
    { ruta: '/solicitudes', texto: 'Solicitudes de registro', icono: '✉' },
    { ruta: '/parcelas', texto: 'Parcelas', icono: '▣' },
    { ruta: '/lotes', texto: 'Lotes', icono: '▤' },
    { ruta: '/analisis', texto: 'Análisis IA', icono: '✧' },
  ];

  constructor(
    readonly auth: AuthService,
    readonly tema: TemaService,
    private readonly router: Router,
  ) {}

  get enlacesVisibles() {
    const rol = this.auth.sesion()?.rol;
    const sigueAdministrador = rol === 'ADMINISTRADOR' && !this.auth.accesoRetirado();
    if (this.auth.sesion()?.debeCambiarPassword) {
      return [];
    }
    return this.enlaces.filter(
      (enlace) => (enlace.ruta !== '/productores' && enlace.ruta !== '/solicitudes') || sigueAdministrador,
    );
  }

  ngOnInit(): void {
    this.vigilancia = interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => {
          const sesion = this.auth.sesion();
          if (!this.auth.token() || !sesion) {
            return of(null);
          }
          return this.auth.consultarSesion().pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((usuario) => {
        const actual = this.auth.sesion();
        if (!usuario || !actual) {
          return;
        }
        if (usuario.debeCambiarPassword && !actual.debeCambiarPassword) {
          this.auth.reemplazarSesion(usuario);
          void this.router.navigate(['/cambiar-contrasena']);
          return;
        }
        if (usuario.rol === actual.rol) {
          return;
        }
        if (actual.rol === 'PRODUCTOR' && usuario.rol === 'ADMINISTRADOR') {
          this.auth.marcarAvisoRol('otorgado');
        }
        if (actual.rol === 'ADMINISTRADOR' && usuario.rol === 'PRODUCTOR') {
          this.auth.marcarAvisoRol('retirado');
        }
      });
  }

  ngOnDestroy(): void {
    this.vigilancia?.unsubscribe();
  }

  salir(): void {
    this.auth.cerrarSesion();
    void this.router.navigate(['/login']);
  }
}
