import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { UsuarioSesion } from './modelos';

const TOKEN = 'cafe_token';
const SESION = 'cafe_sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly sesion = signal<UsuarioSesion | null>(this.leerSesion());

  constructor(private readonly http: HttpClient) {}

  token(): string | null {
    return sessionStorage.getItem(TOKEN);
  }

  registrar(datos: {
    nombre: string;
    email: string;
    password: string;
    documento: string;
    telefono?: string;
    organizacion?: string;
  }) {
    return this.http.post(`${environment.apiUrl}/auth/register`, datos);
  }

  iniciarSesion(email: string, password: string) {
    return this.http
      .post<{ token: string; usuario: UsuarioSesion; productorId: string | null }>(`${environment.apiUrl}/auth/login`, {
        email,
        password,
      })
      .pipe(tap((respuesta) => this.guardar(respuesta.token, respuesta.usuario, respuesta.productorId)));
  }

  productorId(): string | null {
    return sessionStorage.getItem('cafe_productor');
  }

  cerrarSesion(): void {
    sessionStorage.removeItem(TOKEN);
    sessionStorage.removeItem(SESION);
    sessionStorage.removeItem('cafe_productor');
    this.sesion.set(null);
  }

  private guardar(token: string, usuario: UsuarioSesion, productorId: string | null): void {
    sessionStorage.setItem(TOKEN, token);
    sessionStorage.setItem(SESION, JSON.stringify(usuario));
    if (productorId) {
      sessionStorage.setItem('cafe_productor', productorId);
    }
    this.sesion.set(usuario);
  }

  private leerSesion(): UsuarioSesion | null {
    const crudo = sessionStorage.getItem(SESION);
    return crudo ? (JSON.parse(crudo) as UsuarioSesion) : null;
  }
}
