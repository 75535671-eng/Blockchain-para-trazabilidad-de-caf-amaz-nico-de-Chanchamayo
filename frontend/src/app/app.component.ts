import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { TemaService } from './core/tema.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly enlaces = [
    { ruta: '/inicio', texto: 'Dashboard', icono: '⌂' },
    { ruta: '/productores', texto: 'Productores', icono: '☺' },
    { ruta: '/parcelas', texto: 'Parcelas', icono: '▣' },
    { ruta: '/lotes', texto: 'Lotes', icono: '▤' },
    { ruta: '/analisis', texto: 'Análisis IA', icono: '✧' },
  ];

  constructor(
    readonly auth: AuthService,
    readonly tema: TemaService,
    private readonly router: Router,
  ) {}

  salir(): void {
    this.auth.cerrarSesion();
    void this.router.navigate(['/login']);
  }
}
