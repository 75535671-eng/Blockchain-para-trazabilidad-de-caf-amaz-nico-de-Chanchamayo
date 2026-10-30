import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ConsultaLote, EventoTrazabilidad, PrediccionCalidad } from '../../core/modelos';
import { HistorialLoteComponent } from '../../shared/historial-lote.component';
import { sondearLote, textoDeActualizacion } from '../../shared/sondeo-lote';

@Component({
  selector: 'app-lote-detalle',
  imports: [RouterLink, HistorialLoteComponent],
  templateUrl: './lote-detalle.component.html',
  styleUrl: './lote-detalle.component.scss',
})
export class LoteDetalleComponent implements OnInit, OnDestroy {
  consulta: ConsultaLote | null = null;
  eventos: EventoTrazabilidad[] = [];
  predicciones: PrediccionCalidad[] = [];
  error = '';
  errorHistorial = '';
  errorPredicciones = '';
  historialConsultado = false;
  marca: number | null = null;
  ahora = Date.now();
  private sondeo?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.sondeo = sondearLote(
      () => this.api.consultarLote(id),
      () => Boolean(id),
      (consulta) => this.recibir(consulta, false),
    );
  }

  ngOnDestroy(): void {
    this.sondeo?.unsubscribe();
  }

  get variables(): { id: string; fecha: string; metodo: string; humedad: number }[] {
    return this.eventos.flatMap((evento) =>
      evento.variables
        ? [{ id: evento.variables.id, fecha: evento.fecha, metodo: evento.variables.metodoBeneficio, humedad: evento.variables.humedadPorcentaje }]
        : [],
    );
  }

  get estadoAnalisis(): string {
    return this.consulta?.ultimoAnalisis ? 'ACTUALIZADO' : 'SIN RESULTADO';
  }

  get textoActualizacion(): string {
    return textoDeActualizacion(this.marca, this.ahora);
  }

  cargar(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) {
      this.error = 'No hay datos disponibles.';
      return;
    }
    this.api.consultarLote(id).subscribe({
      next: (consulta) => this.recibir(consulta, true),
      error: () => (this.error = 'No hay datos disponibles para este lote.'),
    });
    this.api.listarEventos(id).subscribe({
      next: (eventos) => {
        this.eventos = eventos;
        this.historialConsultado = true;
      },
      error: (error: { error?: { error?: string } }) => {
        this.historialConsultado = true;
        this.errorHistorial = error.error?.error ?? 'No se pudo consultar el historial.';
      },
    });
    this.api.listarPredicciones(id).subscribe({
      next: (predicciones) => {
        this.predicciones = predicciones;
        this.errorPredicciones = '';
      },
      error: () => (this.errorPredicciones = 'No se pudieron consultar las predicciones de este lote.'),
    });
  }

  private recibir(consulta: ConsultaLote, forzarMarca: boolean): void {
    const anterior = this.consulta?.ultimoAnalisis?.id ?? null;
    const nuevo = consulta.ultimoAnalisis?.id ?? null;
    this.consulta = consulta;
    this.ahora = Date.now();
    if (forzarMarca || anterior !== nuevo) {
      this.marca = this.ahora;
    }
  }
}
