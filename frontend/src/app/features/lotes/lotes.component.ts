import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { VARIEDADES_LOTE } from '../../core/catalogos';
import { Parcela, Productor } from '../../core/modelos';
import { LoteVista, vistasDeLotes } from '../../shared/lote-vista';

@Component({
  selector: 'app-lotes',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './lotes.component.html',
})
export class LotesComponent implements OnInit {
  vistas: LoteVista[] = [];
  parcelas: Parcela[] = [];
  productores: Productor[] = [];
  filtro = '';
  busquedaParcela = '';
  listaParcelasAbierta = false;
  modal = false;
  editandoId: string | null = null;
  codigoEdicion = '';
  estadoEdicion = '';
  error = '';
  aviso = '';
  guardando = false;
  readonly variedades = VARIEDADES_LOTE;
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
  ) {
    this.form = fb.nonNullable.group({
      parcelaId: ['', Validators.required],
      fechaCosecha: ['', Validators.required],
      cantidadKg: [1, Validators.required],
      variedad: ['', Validators.required],
      observaciones: [''],
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  get visibles(): LoteVista[] {
    const texto = this.filtro.trim().toLowerCase();
    return this.vistas.filter((lote) =>
      `${lote.codigo} ${lote.productor} ${lote.parcela} ${lote.variedad}`.toLowerCase().includes(texto),
    );
  }

  cargar(): void {
    forkJoin({
      lotes: this.api.listarLotes(),
      parcelas: this.api.listarParcelas(),
      productores: this.api.listarProductores(),
    }).subscribe({
      next: (datos) => {
        this.parcelas = datos.parcelas;
        this.productores = datos.productores;
        this.vistas = vistasDeLotes(datos.lotes, datos.parcelas, datos.productores);
      },
      error: () => (this.error = 'No se pudieron consultar los lotes.'),
    });
  }

  abrirRegistro(): void {
    this.editandoId = null;
    this.codigoEdicion = '';
    this.estadoEdicion = '';
    this.error = '';
    this.busquedaParcela = '';
    this.listaParcelasAbierta = false;
    this.form.reset({
      parcelaId: '',
      fechaCosecha: '',
      cantidadKg: 1,
      variedad: '',
      observaciones: '',
    });
    this.modal = true;
    this.cargar();
  }

  editar(lote: LoteVista): void {
    this.editandoId = lote.id;
    this.codigoEdicion = lote.codigo;
    this.estadoEdicion = lote.estado;
    this.error = '';
    this.form.setValue({
      parcelaId: lote.parcelaId,
      fechaCosecha: lote.fechaCosecha,
      cantidadKg: lote.cantidadKg,
      variedad: (this.variedades as readonly string[]).includes(lote.variedad) ? lote.variedad : '',
      observaciones: lote.observaciones ?? '',
    });
    this.busquedaParcela = this.etiquetaParcela(lote.parcelaId);
    this.listaParcelasAbierta = false;
    this.modal = true;
  }

  get parcelasFiltradas(): Parcela[] {
    const texto = this.busquedaParcela.trim().toLowerCase();
    const etiqueta = this.etiquetaParcela(this.form.controls.parcelaId.value).toLowerCase();
    if (!texto || (etiqueta !== '—' && texto === etiqueta)) {
      return this.parcelas;
    }
    return this.parcelas.filter((parcela) => this.etiquetaParcela(parcela.id).toLowerCase().includes(texto));
  }

  nombreProductor(id: string): string {
    return this.productores.find((productor) => productor.id === id)?.nombre ?? 'Sin productor';
  }

  etiquetaParcela(id: string): string {
    const parcela = this.parcelas.find((item) => item.id === id);
    if (!parcela) {
      return '—';
    }
    return `${parcela.nombre} — ${this.nombreProductor(parcela.productorId)}`;
  }

  buscarParcela(evento: Event): void {
    this.busquedaParcela = (evento.target as HTMLInputElement).value;
    this.listaParcelasAbierta = true;
    const etiqueta = this.etiquetaParcela(this.form.controls.parcelaId.value);
    if (etiqueta === '—' || etiqueta.toLowerCase() !== this.busquedaParcela.trim().toLowerCase()) {
      this.form.controls.parcelaId.setValue('');
    }
  }

  elegirParcela(parcela: Parcela): void {
    this.form.controls.parcelaId.setValue(parcela.id);
    this.busquedaParcela = this.etiquetaParcela(parcela.id);
    this.listaParcelasAbierta = false;
  }

  cerrarListaParcelas(): void {
    this.listaParcelasAbierta = false;
    this.form.controls.parcelaId.markAsTouched();
  }

  registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = !this.form.controls.parcelaId.value
        ? 'Selecciona una parcela registrada.'
        : this.form.controls.variedad.value
          ? 'Revisa los datos del lote.'
          : 'Selecciona una variedad.';
      return;
    }
    this.guardando = true;
    this.error = '';
    const valor = this.form.getRawValue();
    const datos = { ...valor, cantidadKg: Number(valor.cantidadKg), observaciones: valor.observaciones || undefined };
    const peticion = this.editandoId
      ? this.api.actualizarLote(this.editandoId, datos)
      : this.api.registrarLote(datos);
    peticion.subscribe({
      next: () => {
        this.aviso = this.editandoId ? 'Lote actualizado correctamente.' : '';
        this.modal = false;
        this.guardando = false;
        this.cargar();
      },
      error: (error: { error?: { error?: string } }) => {
        this.error = error.error?.error ?? (this.editandoId ? 'Error al actualizar.' : 'No se pudo registrar el lote.');
        this.guardando = false;
      },
    });
  }

  eliminar(lote: LoteVista): void {
    if (!window.confirm('¿Está seguro de eliminar este lote?')) {
      return;
    }
    this.error = '';
    this.aviso = '';
    this.api.eliminarLote(lote.id).subscribe({
      next: () => {
        this.aviso = 'Lote eliminado correctamente.';
        this.cargar();
      },
      error: () => {
        this.error = 'No se pudo eliminar el lote.';
      },
    });
  }
}
