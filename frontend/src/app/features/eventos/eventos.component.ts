import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ETAPAS_TRAZABILIDAD, METODOS_BENEFICIO, etiquetaEtapa } from '../../core/catalogos';
import { EventoTrazabilidad } from '../../core/modelos';
import { LoteVista, vistasDeLotes } from '../../shared/lote-vista';

@Component({
  selector: 'app-eventos',
  imports: [ReactiveFormsModule],
  templateUrl: './eventos.component.html',
  styleUrl: './eventos.component.scss',
})
export class EventosComponent implements OnInit {
  lotes: LoteVista[] = [];
  eventos: EventoTrazabilidad[] = [];
  error = '';
  aviso = '';
  guardando = false;
  consultando = false;
  readonly etapas = ETAPAS_TRAZABILIDAD;
  readonly metodos = METODOS_BENEFICIO;
  readonly etiquetaEtapa = etiquetaEtapa;
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
  ) {
    this.form = fb.group({
      loteId: fb.nonNullable.control('', Validators.required),
      etapa: fb.nonNullable.control('', Validators.required),
      fecha: fb.nonNullable.control('', Validators.required),
      descripcion: fb.nonNullable.control('', Validators.required),
      metodoBeneficio: fb.nonNullable.control(''),
      humedadPorcentaje: fb.control<number | null>(null),
    });
  }

  ngOnInit(): void {
    const lotePedido = this.route.snapshot.queryParamMap.get('lote');
    forkJoin({
      lotes: this.api.listarLotes(),
      parcelas: this.api.listarParcelas(),
      productores: this.api.listarProductores(),
    }).subscribe({
      next: (datos) => {
        this.lotes = vistasDeLotes(datos.lotes, datos.parcelas, datos.productores);
        const elegido = this.lotes.some((lote) => lote.id === lotePedido) ? lotePedido : this.lotes[0]?.id;
        this.form.controls.loteId.setValue(elegido ?? '');
        this.consultar();
      },
      error: () => (this.error = 'No se pudieron consultar los lotes.'),
    });
  }

  get esBeneficio(): boolean {
    return this.form.controls.etapa.value === 'BENEFICIO';
  }

  get loteSeleccionado(): LoteVista | undefined {
    return this.lotes.find((lote) => lote.id === this.form.controls.loteId.value);
  }

  alCambiarLote(): void {
    this.aviso = '';
    this.error = '';
    this.consultar();
  }

  alCambiarEtapa(): void {
    if (!this.esBeneficio) {
      this.form.patchValue({ metodoBeneficio: '', humedadPorcentaje: null });
    }
  }

  consultar(): void {
    const loteId = this.form.controls.loteId.value;
    this.eventos = [];
    if (!loteId) {
      return;
    }
    this.consultando = true;
    this.api.listarEventos(loteId).subscribe({
      next: (eventos) => {
        this.eventos = eventos;
        this.consultando = false;
      },
      error: (error: { error?: { error?: string } }) => {
        this.consultando = false;
        this.error = error.error?.error ?? 'No se pudieron consultar los eventos.';
      },
    });
  }

  registrar(): void {
    this.error = '';
    this.aviso = '';
    const valor = this.form.getRawValue();
    if (!valor.loteId || !valor.etapa || !valor.fecha || !valor.descripcion.trim()) {
      this.error = 'Completa el lote, la etapa, la fecha y la descripción.';
      return;
    }
    if (valor.etapa === 'BENEFICIO' && (!valor.metodoBeneficio || valor.humedadPorcentaje === null)) {
      this.error = 'El beneficio debe registrar el método y la humedad.';
      return;
    }
    this.guardando = true;
    this.api
      .registrarEvento(valor.loteId, {
        etapa: valor.etapa,
        fecha: valor.fecha,
        descripcion: valor.descripcion.trim(),
        ...(valor.etapa === 'BENEFICIO'
          ? { metodoBeneficio: valor.metodoBeneficio, humedadPorcentaje: valor.humedadPorcentaje }
          : {}),
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.aviso = 'El evento quedó registrado en el lote.';
          this.form.patchValue({ etapa: '', fecha: '', descripcion: '', metodoBeneficio: '', humedadPorcentaje: null });
          this.consultar();
        },
        error: (error: { error?: { error?: string } }) => {
          this.guardando = false;
          this.error = error.error?.error ?? 'No se pudo registrar el evento.';
        },
      });
  }
}
