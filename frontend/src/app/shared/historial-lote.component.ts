import { Component, input } from '@angular/core';
import { etiquetaEtapa } from '../core/catalogos';
import { EventoTrazabilidad } from '../core/modelos';

@Component({
  selector: 'app-historial-lote',
  templateUrl: './historial-lote.component.html',
  styleUrl: './historial-lote.component.scss',
})
export class HistorialLoteComponent {
  readonly eventos = input<EventoTrazabilidad[]>([]);
  readonly etiquetaEtapa = etiquetaEtapa;
  seleccionado: EventoTrazabilidad | null = null;

  elegir(evento: EventoTrazabilidad): void {
    this.seleccionado = this.seleccionado?.id === evento.id ? null : evento;
  }
}
