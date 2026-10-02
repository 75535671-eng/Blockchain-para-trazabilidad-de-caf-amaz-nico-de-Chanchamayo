import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ConsultaLote } from '../../core/modelos';
import { LoteVista, vistasDeLotes } from '../../shared/lote-vista';
import { sondearLote, textoDeActualizacion } from '../../shared/sondeo-lote';

@Component({
  selector: 'app-analisis',
  imports: [FormsModule],
  templateUrl: './analisis.component.html',
})
export class AnalisisComponent implements OnInit, OnDestroy {
  lotes: LoteVista[] = [];
  loteId = '';
  consulta: ConsultaLote | null = null;
  error = '';
  analizando = false;
  completado = false;
  marca: number | null = null;
  ahora = Date.now();
  private sondeo?: Subscription;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    forkJoin({
      lotes: this.api.listarLotes(),
      parcelas: this.api.listarParcelas(),
      productores: this.api.listarProductores(),
    }).subscribe({
      next: (datos) => {
        this.lotes = vistasDeLotes(datos.lotes, datos.parcelas, datos.productores);
        this.loteId = this.lotes[0]?.id ?? '';
        if (this.loteId) {
          this.cargar();
        }
        this.iniciarSondeo();
      },
      error: () => (this.error = 'No se pudieron cargar los lotes.'),
    });
  }

  ngOnDestroy(): void {
    this.sondeo?.unsubscribe();
  }

  get estadoAnalisis(): string {
    if (this.analizando) {
      return 'PROCESANDO...';
    }
    return this.consulta?.ultimoAnalisis ? 'ACTUALIZADO' : 'SIN RESULTADO';
  }

  get textoActualizacion(): string {
    return textoDeActualizacion(this.marca, this.ahora);
  }

  cargar(): void {
    if (!this.loteId) {
      return;
    }
    this.completado = false;
    this.api.consultarLote(this.loteId).subscribe({
      next: (consulta) => this.recibir(consulta, true),
      error: () => (this.error = 'No se pudo consultar el lote.'),
    });
  }

  analizar(): void {
    if (!this.loteId || this.analizando) {
      return;
    }
    this.analizando = true;
    this.completado = false;
    this.error = '';
    this.api.analizarLote(this.loteId).subscribe({
      next: (consulta) => {
        this.recibir(consulta, true);
        this.analizando = false;
        this.completado = true;
      },
      error: (error: { error?: { error?: string } }) => {
        this.error = error.error?.error ?? 'No se pudo analizar el lote.';
        this.analizando = false;
      },
    });
  }

  private iniciarSondeo(): void {
    this.sondeo?.unsubscribe();
    this.sondeo = sondearLote(
      () => this.api.consultarLote(this.loteId),
      () => Boolean(this.loteId) && !this.analizando,
      (consulta) => this.recibir(consulta, false),
    );
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
