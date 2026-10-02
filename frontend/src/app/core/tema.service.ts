import { Injectable, signal } from '@angular/core';

const CLAVE = 'cafe_tema';

@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly oscuro = signal(false);

  constructor() {
    const guardado = localStorage.getItem(CLAVE);
    const oscuro = guardado === 'oscuro' || (guardado == null && matchMedia('(prefers-color-scheme: dark)').matches);
    this.oscuro.set(oscuro);
    this.aplicar(oscuro);
  }

  alternar(): void {
    const oscuro = !this.oscuro();
    this.oscuro.set(oscuro);
    localStorage.setItem(CLAVE, oscuro ? 'oscuro' : 'claro');
    this.aplicar(oscuro);
  }

  private aplicar(oscuro: boolean): void {
    document.documentElement.setAttribute('data-tema', oscuro ? 'oscuro' : 'claro');
  }
}
