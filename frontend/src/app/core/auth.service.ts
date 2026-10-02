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
  readonly avisoRol = signal<'otorgado' | 'retirado' | null>(null);
  readonly accesoRetirado = signal(false);

  constructor(private readonly http: HttpClient) {}

  token(): string | null {
    return sessionStorage.getItem(TOKEN);
  }

  registrar(datos: {
    nombre: string;
    email: string;
    password: string;
    confirmacion: string;
    documento: string;
    telefono: string;
    organizacion?: string;
  }) {
    return this.http.post<{ mensaje: string }>(`${environment.apiUrl}/auth/register`, datos);
  }

  cambiarContrasena(password: string, confirmacion: string) {
    return this.http
      .post<UsuarioSesion>(`${environment.apiUrl}/auth/cambiar-contrasena`, { password, confirmacion })
      .pipe(tap((usuario) => this.reemplazarSesion(usuario)));
  }

  reemplazarSesion(usuario: UsuarioSesion): void {
    const actual = this.sesion();
    const siguiente = { ...actual, ...usuario };
    sessionStorage.setItem(SESION, JSON.stringify(siguiente));
    this.sesion.set(siguiente);
  }

  consultarSesion() {
    return this.http.get<UsuarioSesion>(`${environment.apiUrl}/auth/sesion`);
  }

  marcarAvisoRol(tipo: 'otorgado' | 'retirado'): void {
    const id = this.sesion()?.id;
    if (tipo === 'retirado') {
      this.accesoRetirado.set(true);
    }
    if (!id || sessionStorage.getItem(this.claveAviso(id, tipo)) === 'cerrado') {
      return;
    }
    this.avisoRol.set(tipo);
  }

  cerrarAvisoRol(): void {
    const id = this.sesion()?.id;
    const tipo = this.avisoRol();
    if (id && tipo) {
      sessionStorage.setItem(this.claveAviso(id, tipo), 'cerrado');
    }
    this.avisoRol.set(null);
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
    this.avisoRol.set(null);
    this.accesoRetirado.set(false);
  }

  private guardar(token: string, usuario: UsuarioSesion, productorId: string | null): void {
    sessionStorage.setItem(TOKEN, token);
    sessionStorage.setItem(SESION, JSON.stringify(usuario));
    if (productorId) {
      sessionStorage.setItem('cafe_productor', productorId);
    }
    this.sesion.set(usuario);
  }

  private claveAviso(id: string, tipo: 'otorgado' | 'retirado'): string {
    return `cafe_aviso_${tipo}_${id}`;
  }

  private leerSesion(): UsuarioSesion | null {
    const crudo = sessionStorage.getItem(SESION);
    return crudo ? (JSON.parse(crudo) as UsuarioSesion) : null;
  }
}
