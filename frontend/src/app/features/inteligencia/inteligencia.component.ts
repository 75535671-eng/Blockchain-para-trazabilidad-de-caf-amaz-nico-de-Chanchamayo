import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { EvaluacionModelo, EvaluacionTrazabilidad, EventoTrazabilidad, IntentoPrediccion, IntentoTrazabilidad } from '../../core/modelos';
import { LoteVista, vistasDeLotes } from '../../shared/lote-vista';

@Component({
  selector: 'app-inteligencia',
  imports: [FormsModule],
  templateUrl: './inteligencia.component.html',
  styleUrl: './inteligencia.component.scss',
})
export class InteligenciaComponent implements OnInit {
  lotes: LoteVista[] = [];
  loteId = '';
  eventos: EventoTrazabilidad[] = [];
  intento: IntentoPrediccion | null = null;
  estimacion: IntentoTrazabilidad | null = null;
  evaluacion: EvaluacionModelo | null = null;
  evaluacionTrazabilidad: EvaluacionTrazabilidad | null = null;
  error = '';
  ejecutando = false;

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const pedido = this.route.snapshot.queryParamMap.get('lote');
    this.api.consultarEvaluacion().subscribe({
      next: (evaluacion) => (this.evaluacion = evaluacion),
      error: () => (this.error = 'No se pudo consultar la evaluación del modelo.'),
    });
    this.api.consultarEvaluacionTrazabilidad().subscribe({
      next: (evaluacion) => (this.evaluacionTrazabilidad = evaluacion),
      error: () => (this.error = 'No se pudo consultar la evaluación de trazabilidad.'),
    });
    forkJoin({
      lotes: this.api.listarLotes(),
      parcelas: this.api.listarParcelas(),
      productores: this.api.listarProductores(),
    }).subscribe({
      next: (datos) => {
        this.lotes = vistasDeLotes(datos.lotes, datos.parcelas, datos.productores);
        this.loteId = this.lotes.some((lote) => lote.id === pedido) ? (pedido ?? '') : (this.lotes[0]?.id ?? '');
        this.cargarEventos();
      },
      error: () => (this.error = 'No se pudieron consultar los lotes.'),
    });
  }

  get lote(): LoteVista | undefined {
    return this.lotes.find((item) => item.id === this.loteId);
  }

  get beneficio(): EventoTrazabilidad | undefined {
    return [...this.eventos].reverse().find((evento) => evento.etapa === 'BENEFICIO' && evento.variables);
  }

  alCambiarLote(): void {
    this.intento = null;
    this.estimacion = null;
    this.cargarEventos();
  }

  cargarEventos(): void {
    this.eventos = [];
    if (!this.loteId) {
      return;
    }
    this.api.listarEventos(this.loteId).subscribe({
      next: (eventos) => (this.eventos = eventos),
      error: (error: { error?: { error?: string } }) => (this.error = error.error?.error ?? 'No se pudieron consultar las variables.'),
    });
  }

  ejecutar(): void {
    if (!this.loteId) {
      return;
    }
    this.ejecutando = true;
    this.error = '';
    this.api.predecirCalidad(this.loteId).subscribe({
      next: (intento) => {
        this.intento = intento;
        this.ejecutando = false;
      },
      error: (error: { error?: { error?: string } }) => {
        this.ejecutando = false;
        this.error = error.error?.error ?? 'No se pudo ejecutar la predicción.';
      },
    });
  }

  estimarTrazabilidad(): void {
    if (!this.loteId) {
      return;
    }
    this.ejecutando = true;
    this.error = '';
    this.api.estimarTrazabilidad(this.loteId).subscribe({
      next: (estimacion) => {
        this.estimacion = estimacion;
        this.ejecutando = false;
      },
      error: (error: { error?: { error?: string } }) => {
        this.ejecutando = false;
        this.error = error.error?.error ?? 'No se pudo estimar la trazabilidad.';
      },
    });
  }
}
