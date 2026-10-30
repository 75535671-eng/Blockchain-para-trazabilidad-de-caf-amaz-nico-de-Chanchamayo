import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Parcela, Productor, ReporteTrazabilidad } from '../../core/modelos';
import { etiquetaEtapa } from '../../core/catalogos';
import { LoteVista, vistasDeLotes } from '../../shared/lote-vista';
import { descargarReporte } from './descarga-reporte';

@Component({
  selector: 'app-reportes',
  imports: [FormsModule, RouterLink],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss',
})
export class ReportesComponent implements OnInit {
  productores: Productor[] = [];
  parcelas: Parcela[] = [];
  lotes: LoteVista[] = [];
  productorId = '';
  parcelaId = '';
  loteId = '';
  desde = '';
  hasta = '';
  reporte: ReporteTrazabilidad | null = null;
  error = '';
  consultando = false;
  readonly etiquetaEtapa = etiquetaEtapa;
  readonly descargar = descargarReporte;

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
    readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    const pedido = this.route.snapshot.queryParamMap.get('lote');
    forkJoin({
      productores: this.api.listarProductores(),
      parcelas: this.api.listarParcelas(),
      lotes: this.api.listarLotes(),
    }).subscribe({
      next: (datos) => {
        this.productores = datos.productores;
        this.parcelas = datos.parcelas;
        this.lotes = vistasDeLotes(datos.lotes, datos.parcelas, datos.productores);
        if (pedido && this.lotes.some((lote) => lote.id === pedido)) {
          this.loteId = pedido;
        }
        this.consultar();
      },
      error: () => (this.error = 'No se pudieron cargar los filtros.'),
    });
  }

  get parcelasVisibles(): Parcela[] {
    return this.productorId ? this.parcelas.filter((parcela) => parcela.productorId === this.productorId) : this.parcelas;
  }

  get eventosDelReporte(): number {
    return this.reporte?.lotes.reduce((total, lote) => total + lote.eventos.length, 0) ?? 0;
  }

  get lotesVisibles(): LoteVista[] {
    return this.lotes.filter((lote) => {
      if (this.parcelaId && lote.parcelaId !== this.parcelaId) {
        return false;
      }
      if (this.productorId) {
        const parcela = this.parcelas.find((item) => item.id === lote.parcelaId);
        return parcela?.productorId === this.productorId;
      }
      return true;
    });
  }

  consultar(): void {
    this.error = '';
    this.consultando = true;
    const filtros: Record<string, string> = {};
    if (this.loteId) {
      filtros['loteId'] = this.loteId;
    }
    if (this.productorId) {
      filtros['productorId'] = this.productorId;
    }
    if (this.parcelaId) {
      filtros['parcelaId'] = this.parcelaId;
    }
    if (this.desde) {
      filtros['desde'] = this.desde;
    }
    if (this.hasta) {
      filtros['hasta'] = this.hasta;
    }
    this.api.consultarReporte(filtros).subscribe({
      next: (reporte) => {
        this.reporte = reporte;
        this.consultando = false;
      },
      error: (error: { error?: { error?: string } }) => {
        this.consultando = false;
        this.reporte = null;
        this.error = error.error?.error ?? 'No se pudo generar el reporte.';
      },
    });
  }
}
