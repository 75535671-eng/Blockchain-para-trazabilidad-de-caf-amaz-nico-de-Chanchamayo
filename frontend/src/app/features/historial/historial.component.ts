import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { EventoTrazabilidad } from '../../core/modelos';
import { HistorialLoteComponent } from '../../shared/historial-lote.component';
import { LoteVista, vistasDeLotes } from '../../shared/lote-vista';

@Component({
  selector: 'app-historial',
  imports: [FormsModule, RouterLink, HistorialLoteComponent],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.scss',
})
export class HistorialComponent implements OnInit {
  lotes: LoteVista[] = [];
  eventos: EventoTrazabilidad[] = [];
  loteId = '';
  error = '';
  cargando = false;

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const pedido = this.route.snapshot.queryParamMap.get('lote');
    forkJoin({
      lotes: this.api.listarLotes(),
      parcelas: this.api.listarParcelas(),
      productores: this.api.listarProductores(),
    }).subscribe({
      next: (datos) => {
        this.lotes = vistasDeLotes(datos.lotes, datos.parcelas, datos.productores);
        this.loteId = this.lotes.some((lote) => lote.id === pedido) ? (pedido ?? '') : (this.lotes[0]?.id ?? '');
        this.consultar();
      },
      error: () => (this.error = 'No se pudieron consultar los lotes.'),
    });
  }

  get lote(): LoteVista | undefined {
    return this.lotes.find((lote) => lote.id === this.loteId);
  }

  consultar(): void {
    this.eventos = [];
    this.error = '';
    if (!this.loteId) {
      return;
    }
    this.cargando = true;
    this.api.listarEventos(this.loteId).subscribe({
      next: (eventos) => {
        this.eventos = eventos;
        this.cargando = false;
      },
      error: (error: { error?: { error?: string } }) => {
        this.cargando = false;
        this.error = error.error?.error ?? 'No se pudo consultar el historial.';
      },
    });
  }
}
