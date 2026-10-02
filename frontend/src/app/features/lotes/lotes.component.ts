import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { VARIEDADES_LOTE } from '../../core/catalogos';
import { LoteVista, vistasDeLotes } from '../../shared/lote-vista';

@Component({
  selector: 'app-lotes',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './lotes.component.html',
})
export class LotesComponent implements OnInit {
  vistas: LoteVista[] = [];
  parcelas: { id: string; nombre: string; distrito: string }[] = [];
  filtro = '';
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
        this.vistas = vistasDeLotes(datos.lotes, datos.parcelas, datos.productores);
        if (!this.form.controls.parcelaId.value && datos.parcelas[0]) {
          this.form.controls.parcelaId.setValue(datos.parcelas[0].id);
        }
      },
      error: () => (this.error = 'No se pudieron consultar los lotes.'),
    });
  }

  abrirRegistro(): void {
    this.editandoId = null;
    this.codigoEdicion = '';
    this.estadoEdicion = '';
    this.error = '';
    this.form.reset({
      parcelaId: this.parcelas[0]?.id ?? '',
      fechaCosecha: '',
      cantidadKg: 1,
      variedad: '',
      observaciones: '',
    });
    this.modal = true;
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
    this.modal = true;
  }

  registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = this.form.controls.variedad.value ? 'Revisa los datos del lote.' : 'Selecciona una variedad.';
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
