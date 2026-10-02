import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { barrasDeCosecha, BarraCosecha, LoteVista, vistasDeLotes } from '../../shared/lote-vista';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  cargando = true;
  error = '';
  productores = 0;
  parcelas = 0;
  lotes = 0;
  kilogramos = 0;
  recientes: LoteVista[] = [];
  barras: BarraCosecha[] = [];

  constructor(
    readonly auth: AuthService,
    private readonly api: ApiService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      productores: this.api.listarProductores(),
      parcelas: this.api.listarParcelas(),
      lotes: this.api.listarLotes(),
    }).subscribe({
      next: (datos) => {
        const vistas = vistasDeLotes(datos.lotes, datos.parcelas, datos.productores);
        this.productores = datos.productores.length;
        this.parcelas = datos.parcelas.length;
        this.lotes = datos.lotes.length;
        this.kilogramos = datos.lotes.reduce((total, lote) => total + lote.cantidadKg, 0);
        this.recientes = vistas.slice(0, 4);
        this.barras = barrasDeCosecha(datos.lotes);
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el tablero.';
        this.cargando = false;
      },
    });
  }
}
