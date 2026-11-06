import { Component, input } from '@angular/core';
import { ApiService } from '../core/api.service';
import { etiquetaEtapa } from '../core/catalogos';
import { EventoTrazabilidad, VerificacionIntegridad } from '../core/modelos';

@Component({
  selector: 'app-historial-lote',
  templateUrl: './historial-lote.component.html',
  styleUrl: './historial-lote.component.scss',
})
export class HistorialLoteComponent {
  readonly eventos = input<EventoTrazabilidad[]>([]);
  readonly etiquetaEtapa = etiquetaEtapa;
  seleccionado: EventoTrazabilidad | null = null;
  verificandoId = '';
  private resultados: Record<string, VerificacionIntegridad> = {};

  constructor(private readonly api: ApiService) {}

  elegir(evento: EventoTrazabilidad): void {
    this.seleccionado = this.seleccionado?.id === evento.id ? null : evento;
  }

  resultadoDe(eventoId: string): VerificacionIntegridad | null {
    return this.resultados[eventoId] ?? null;
  }

  verificar(evento: EventoTrazabilidad): void {
    this.verificandoId = evento.id;
    this.api.verificarEvento(evento.id).subscribe({
      next: (verificacion) => {
        this.resultados = { ...this.resultados, [evento.id]: verificacion };
        this.verificandoId = '';
      },
      error: (error: { error?: { error?: string } }) => {
        this.resultados = {
          ...this.resultados,
          [evento.id]: {
            eventoId: evento.id,
            estado: 'fallida',
            mensaje: error.error?.error ?? 'No se pudo verificar el evento.',
            hash: null,
            red: null,
            identificador: null,
          },
        };
        this.verificandoId = '';
      },
    });
  }
}
