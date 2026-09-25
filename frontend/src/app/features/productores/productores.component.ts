import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Productor } from '../../core/modelos';

@Component({
  selector: 'app-productores',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './productores.component.html',
})
export class ProductoresComponent implements OnInit {
  productores: Productor[] = [];
  filtro = '';
  modal = false;
  editandoId: string | null = null;
  consultado: Productor | null = null;
  error = '';
  aviso = '';
  guardando = false;
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    readonly auth: AuthService,
  ) {
    this.form = fb.nonNullable.group({
      nombre: ['', Validators.required],
      documento: ['', Validators.required],
      telefono: [''],
      organizacion: [''],
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  get visibles(): Productor[] {
    const texto = this.filtro.trim().toLowerCase();
    return this.productores.filter((productor) =>
      `${productor.nombre} ${productor.documento} ${productor.organizacion ?? ''}`.toLowerCase().includes(texto),
    );
  }

  cargar(): void {
    this.api.listarProductores().subscribe({
      next: (productores) => (this.productores = productores),
      error: () => (this.error = 'No se pudieron consultar los productores.'),
    });
  }

  abrirRegistro(): void {
    this.editandoId = null;
    this.form.reset();
    this.modal = true;
  }

  editar(productor: Productor): void {
    this.editandoId = productor.id;
    this.form.setValue({
      nombre: productor.nombre,
      documento: productor.documento,
      telefono: productor.telefono ?? '',
      organizacion: productor.organizacion ?? '',
    });
    this.modal = true;
  }

  registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando = true;
    const datos = this.form.getRawValue();
    const peticion = this.editandoId
      ? this.api.actualizarProductor(this.editandoId, datos)
      : this.api.registrarProductor(datos);
    peticion.subscribe({
      next: () => {
        this.aviso = this.editandoId ? 'Productor actualizado.' : 'Productor registrado.';
        this.modal = false;
        this.guardando = false;
        this.cargar();
      },
      error: (error: { error?: { error?: string } }) => {
        this.error = error.error?.error ?? 'No se pudo guardar.';
        this.guardando = false;
      },
    });
  }

  eliminar(productor: Productor): void {
    if (!window.confirm('¿Está seguro de eliminar este productor?')) {
      return;
    }
    this.error = '';
    this.aviso = '';
    this.api.eliminarProductor(productor.id).subscribe({
      next: () => {
        this.aviso = 'Productor eliminado correctamente.';
        this.cargar();
      },
      error: (error: { error?: { error?: string } }) => {
        const mensaje = error.error?.error;
        this.error =
          mensaje === 'No se puede eliminar este productor porque tiene parcelas asociadas.'
            ? mensaje
            : 'No se pudo eliminar el productor.';
      },
    });
  }
}
