import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { EvaluacionModelo, EventoTrazabilidad, PrediccionCalidad } from '../../core/modelos';
import { etiquetaEtapa } from '../../core/catalogos';
import { barrasDeCosecha, BarraCosecha, LoteVista, vistasDeLotes } from '../../shared/lote-vista';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  cargando = true;
  error = '';
  avisoEventos = '';
  productores = 0;
  parcelas = 0;
  lotes = 0;
  kilogramos = 0;
  eventosTotal = 0;
  lotesConRecorrido = 0;
  predicciones = 0;
  evaluacion: EvaluacionModelo | null = null;
  recientes: LoteVista[] = [];
  actividad: EventoTrazabilidad[] = [];
  barras: BarraCosecha[] = [];
  etapas: { etiqueta: string; cantidad: number; altura: number }[] = [];
  readonly etiquetaEtapa = etiquetaEtapa;

  constructor(
    readonly auth: AuthService,
    private readonly api: ApiService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      productores: this.api.listarProductores(),
      parcelas: this.api.listarParcelas(),
      lotes: this.api.listarLotes(),
      eventos: this.api.listarEventosVisibles().pipe(catchError(() => of(null))),
      predicciones: this.api.listarPrediccionesVisibles().pipe(catchError(() => of(null))),
      evaluacion: this.api.consultarEvaluacion().pipe(catchError(() => of(null))),
    }).subscribe({
      next: (datos) => {
        const vistas = vistasDeLotes(datos.lotes, datos.parcelas, datos.productores);
        this.productores = datos.productores.length;
        this.parcelas = datos.parcelas.length;
        this.lotes = datos.lotes.length;
        this.kilogramos = datos.lotes.reduce((total, lote) => total + lote.cantidadKg, 0);
        this.recientes = vistas.slice(0, 4);
        this.barras = barrasDeCosecha(datos.lotes);
        this.aplicarEventos(datos.eventos);
        this.predicciones = datos.predicciones?.length ?? 0;
        if (datos.predicciones === null) {
          this.avisoEventos = this.avisoEventos || 'No se pudieron consultar las predicciones registradas.';
        }
        this.evaluacion = datos.evaluacion;
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el tablero.';
        this.cargando = false;
      },
    });
  }

  private aplicarEventos(eventos: EventoTrazabilidad[] | null): void {
    if (!eventos) {
      this.avisoEventos = 'No se pudieron consultar los eventos. Revisa que las migraciones del PMV2 estén aplicadas.';
      return;
    }
    this.eventosTotal = eventos.length;
    this.lotesConRecorrido = new Set(eventos.map((evento) => evento.loteId)).size;
    this.actividad = [...eventos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
    const grupos = new Map<string, number>();
    for (const evento of eventos) {
      grupos.set(evento.etapa, (grupos.get(evento.etapa) ?? 0) + 1);
    }
    const maximo = Math.max(...grupos.values(), 1);
    this.etapas = [...grupos.entries()].map(([etapa, cantidad]) => ({
      etiqueta: etiquetaEtapa(etapa),
      cantidad,
      altura: Math.max(12, Math.round((cantidad / maximo) * 120)),
    }));
  }
}
