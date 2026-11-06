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
  busquedaLote = '';
  listaLotesAbierta = false;
  periodo: PeriodoReporte = 'todo';
  desde = '';
  hasta = '';
  reporte: ReporteTrazabilidad | null = null;
  error = '';
  consultando = false;
  descargando = false;
  readonly etiquetaEtapa = etiquetaEtapa;

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
          this.elegirLote(this.lotes.find((lote) => lote.id === pedido)!);
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

  get sugerencias(): LoteVista[] {
    return this.coincidencias().slice(0, 8);
  }

  get lotesSinMostrar(): number {
    return Math.max(0, this.coincidencias().length - this.sugerencias.length);
  }

  alCambiarProductor(id: string): void {
    this.productorId = id;
    if (this.parcelaId && !this.parcelasVisibles.some((parcela) => parcela.id === this.parcelaId)) {
      this.parcelaId = '';
    }
    this.limpiarLoteSiNoVisible();
  }

  alCambiarParcela(id: string): void {
    this.parcelaId = id;
    this.limpiarLoteSiNoVisible();
  }

  alCambiarPeriodo(periodo: PeriodoReporte): void {
    this.periodo = periodo;
    if (periodo !== 'elegir') {
      this.desde = '';
      this.hasta = '';
      return;
    }
    const cosecha = this.loteSeleccionado?.fechaCosecha.slice(0, 10);
    if (cosecha && !this.desde) {
      this.desde = cosecha;
    }
  }

  buscarLote(evento: Event): void {
    this.busquedaLote = (evento.target as HTMLInputElement).value;
    this.listaLotesAbierta = true;
    if (this.etiquetaLote(this.loteId).toLowerCase() !== this.busquedaLote.trim().toLowerCase()) {
      this.loteId = '';
      if (this.periodo === 'cosecha') {
        this.periodo = 'todo';
      }
    }
  }

  elegirLote(lote: LoteVista): void {
    this.loteId = lote.id;
    this.busquedaLote = this.etiquetaLote(lote.id);
    this.listaLotesAbierta = false;
  }

  elegirTodosLosLotes(): void {
    this.loteId = '';
    this.busquedaLote = '';
    this.listaLotesAbierta = false;
    if (this.periodo === 'cosecha') {
      this.periodo = 'todo';
    }
  }

  cerrarListaLotes(): void {
    this.listaLotesAbierta = false;
  }

  etiquetaLote(id: string): string {
    const lote = this.lotes.find((item) => item.id === id);
    if (!lote) {
      return '';
    }
    return `${lote.codigo} · ${lote.productor} · ${lote.parcela}`;
  }

  async descargar(reporte: ReporteTrazabilidad): Promise<void> {
    if (this.descargando) {
      return;
    }
    this.descargando = true;
    try {
      await descargarReporte(reporte);
    } finally {
      this.descargando = false;
    }
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
    const rango = this.rango();
    if (rango.desde) {
      filtros['desde'] = rango.desde;
    }
    if (rango.hasta) {
      filtros['hasta'] = rango.hasta;
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

  private get loteSeleccionado(): LoteVista | undefined {
    return this.lotes.find((lote) => lote.id === this.loteId);
  }

  private coincidencias(): LoteVista[] {
    const texto = this.busquedaLote.trim().toLowerCase();
    const etiqueta = this.etiquetaLote(this.loteId).toLowerCase();
    if (!texto || texto === etiqueta) {
      return this.lotesVisibles;
    }
    return this.lotesVisibles.filter((lote) => this.etiquetaLote(lote.id).toLowerCase().includes(texto));
  }

  private limpiarLoteSiNoVisible(): void {
    if (this.loteId && !this.lotesVisibles.some((lote) => lote.id === this.loteId)) {
      this.elegirTodosLosLotes();
    }
  }

  private rango(): { desde?: string; hasta?: string } {
    const hoy = new Date();
    if (this.periodo === 'anio') {
      return { desde: `${hoy.getFullYear()}-01-01`, hasta: isoLocal(hoy) };
    }
    if (this.periodo === 'dias') {
      const inicio = new Date(hoy);
      inicio.setDate(inicio.getDate() - 30);
      return { desde: isoLocal(inicio), hasta: isoLocal(hoy) };
    }
    if (this.periodo === 'cosecha') {
      const cosecha = this.loteSeleccionado?.fechaCosecha.slice(0, 10);
      return cosecha ? { desde: cosecha, hasta: isoLocal(hoy) } : {};
    }
    if (this.periodo === 'elegir') {
      return {
        desde: this.desde || undefined,
        hasta: this.hasta || undefined,
      };
    }
    return {};
  }
}

type PeriodoReporte = 'todo' | 'anio' | 'dias' | 'cosecha' | 'elegir';

function isoLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
