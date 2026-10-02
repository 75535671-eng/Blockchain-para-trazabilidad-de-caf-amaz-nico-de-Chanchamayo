import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ConsultaLote, Lote, Parcela, Productor, SolicitudRegistro } from './modelos';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  listarProductores() {
    return this.http.get<Productor[]>(`${environment.apiUrl}/productores`);
  }

  registrarProductor(datos: { nombre: string; documento: string; telefono?: string; organizacion?: string }) {
    return this.http.post<Productor>(`${environment.apiUrl}/productores`, datos);
  }

  crearCuentaProductor(datos: {
    nombre: string;
    documento: string;
    telefono: string;
    organizacion?: string;
    email: string;
    password: string;
  }) {
    return this.http.post<{
      productor: Productor;
      usuario: { id: string; nombre: string; email: string };
      passwordTemporal: string;
    }>(`${environment.apiUrl}/productores/cuentas`, datos);
  }

  listarSolicitudes() {
    return this.http.get<SolicitudRegistro[]>(`${environment.apiUrl}/solicitudes`);
  }

  aprobarSolicitud(id: string) {
    return this.http.post<SolicitudRegistro>(`${environment.apiUrl}/solicitudes/${id}/aprobar`, {});
  }

  rechazarSolicitud(id: string, motivo: string) {
    return this.http.post<SolicitudRegistro>(`${environment.apiUrl}/solicitudes/${id}/rechazar`, { motivo });
  }

  actualizarProductor(id: string, datos: { nombre: string; telefono?: string; organizacion?: string }) {
    return this.http.put<Productor>(`${environment.apiUrl}/productores/${id}`, datos);
  }

  eliminarProductor(id: string) {
    return this.http.delete(`${environment.apiUrl}/productores/${id}`);
  }

  otorgarAdministrador(id: string, datos: { email?: string; password?: string } = {}) {
    return this.http.post<{ id: string; nombre: string; rol: 'ADMINISTRADOR' }>(
      `${environment.apiUrl}/productores/${id}/rol-administrador`,
      datos,
    );
  }

  quitarAdministrador(id: string) {
    return this.http.post<{ id: string; nombre: string; rol: 'PRODUCTOR' }>(
      `${environment.apiUrl}/productores/${id}/rol-productor`,
      {},
    );
  }

  consultarDni(documento: string) {
    return this.http.get<{
      nombre: string | null;
      estado: 'encontrado' | 'no_encontrado' | 'no_configurado' | 'error';
    }>(`${environment.apiUrl}/productores/dni/${encodeURIComponent(documento)}`);
  }

  listarParcelas() {
    return this.http.get<Parcela[]>(`${environment.apiUrl}/parcelas`);
  }

  registrarParcela(datos: {
    productorId: string;
    nombre: string;
    distrito: string;
    localidad?: string;
    areaHectareas: number;
    altitudMsnm?: number | null;
  }) {
    return this.http.post<Parcela>(`${environment.apiUrl}/parcelas`, datos);
  }

  actualizarParcela(
    id: string,
    datos: {
      productorId: string;
      nombre: string;
      distrito: string;
      localidad?: string;
      areaHectareas: number;
      altitudMsnm?: number | null;
      latitud?: number | null;
      longitud?: number | null;
    },
  ) {
    return this.http.put<Parcela>(`${environment.apiUrl}/parcelas/${id}`, datos);
  }

  eliminarParcela(id: string) {
    return this.http.delete(`${environment.apiUrl}/parcelas/${id}`);
  }

  listarLotes() {
    return this.http.get<Lote[]>(`${environment.apiUrl}/lotes`);
  }

  registrarLote(datos: {
    parcelaId: string;
    fechaCosecha: string;
    cantidadKg: number;
    variedad: string;
    observaciones?: string;
  }) {
    return this.http.post<Lote>(`${environment.apiUrl}/lotes`, datos);
  }

  actualizarLote(
    id: string,
    datos: {
      parcelaId: string;
      fechaCosecha: string;
      cantidadKg: number;
      variedad: string;
      observaciones?: string;
    },
  ) {
    return this.http.put<Lote>(`${environment.apiUrl}/lotes/${id}`, datos);
  }

  eliminarLote(id: string) {
    return this.http.delete(`${environment.apiUrl}/lotes/${id}`);
  }

  consultarLote(id: string) {
    return this.http.get<ConsultaLote>(`${environment.apiUrl}/lotes/${id}`);
  }

  analizarLote(id: string) {
    return this.http.post<ConsultaLote>(`${environment.apiUrl}/lotes/${id}/analisis`, {});
  }
}
