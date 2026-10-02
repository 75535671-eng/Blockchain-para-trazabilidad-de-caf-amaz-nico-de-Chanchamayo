import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ConsultaLote } from '../../core/modelos';
import { sondearLote, textoDeActualizacion } from '../../shared/sondeo-lote';

@Component({
  selector: 'app-lote-detalle',
  imports: [RouterLink],
  templateUrl: './lote-detalle.component.html',
})
export class LoteDetalleComponent implements OnInit, OnDestroy {
  consulta: ConsultaLote | null = null;
  error = '';
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

  get estadoAnalisis(): string {
    return this.consulta?.ultimoAnalisis ? 'ACTUALIZADO' : 'SIN RESULTADO';
  }

  get textoActualizacion(): string {
    return textoDeActualizacion(this.marca, this.ahora);
  }

  cargar(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.api.consultarLote(id).subscribe({
      next: (consulta) => this.recibir(consulta, true),
      error: () => (this.error = 'No se pudo consultar el lote.'),
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
