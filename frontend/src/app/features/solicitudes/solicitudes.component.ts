import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { SolicitudRegistro } from '../../core/modelos';

@Component({
  selector: 'app-solicitudes',
  imports: [FormsModule],
  templateUrl: './solicitudes.component.html',
})
export class SolicitudesComponent implements OnInit {
  solicitudes: SolicitudRegistro[] = [];
  filtro = '';
  consultada: SolicitudRegistro | null = null;
  rechazo: SolicitudRegistro | null = null;
  motivo = '';
  error = '';
  aviso = '';
  guardando = false;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.cargar();
  }

  get visibles(): SolicitudRegistro[] {
    const texto = this.filtro.trim().toLowerCase();
    return this.solicitudes.filter((solicitud) =>
      `${solicitud.nombre} ${solicitud.documento} ${solicitud.email} ${solicitud.organizacion ?? ''}`.toLowerCase().includes(texto),
    );
  }

  fecha(valor: string | null): string {
    if (!valor) {
      return '—';
    }
    return new Date(valor).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  }

  cargar(): void {
    this.api.listarSolicitudes().subscribe({
      next: (solicitudes) => (this.solicitudes = solicitudes),
      error: () => (this.error = 'No se pudieron consultar las solicitudes.'),
    });
  }

  aprobar(solicitud: SolicitudRegistro): void {
    if (this.guardando || solicitud.estado !== 'pendiente') {
      return;
    }
    this.guardando = true;
    this.error = '';
    this.api.aprobarSolicitud(solicitud.id).subscribe({
      next: () => {
        this.guardando = false;
        this.aviso = `${solicitud.nombre} ya puede ingresar con la contraseña de su solicitud.`;
        this.cargar();
      },
      error: (error: { error?: { error?: string } }) => {
        this.guardando = false;
        this.error = error.error?.error ?? 'No se pudo aprobar la solicitud.';
      },
    });
  }

  confirmarRechazo(): void {
    if (!this.rechazo || this.guardando) {
      return;
    }
    const motivo = this.motivo.trim();
    if (motivo.length < 3) {
      this.error = 'Escribe el motivo del rechazo.';
      return;
    }
    this.guardando = true;
    this.error = '';
    this.api.rechazarSolicitud(this.rechazo.id, motivo).subscribe({
      next: () => {
        this.guardando = false;
        this.aviso = `La solicitud de ${this.rechazo?.nombre} fue rechazada.`;
        this.rechazo = null;
        this.motivo = '';
        this.cargar();
      },
      error: (error: { error?: { error?: string } }) => {
        this.guardando = false;
        this.error = error.error?.error ?? 'No se pudo rechazar la solicitud.';
      },
    });
  }
}
