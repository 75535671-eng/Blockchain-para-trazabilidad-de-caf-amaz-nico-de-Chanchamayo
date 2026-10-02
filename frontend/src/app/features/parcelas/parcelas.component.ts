import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { DISTRITOS_PARCELA } from '../../core/catalogos';
import { Parcela, Productor } from '../../core/modelos';

@Component({
  selector: 'app-parcelas',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './parcelas.component.html',
})
export class ParcelasComponent implements OnInit {
  parcelas: Parcela[] = [];
  productores: Productor[] = [];
  filtro = '';
  distrito = '';
  modal = false;
  editandoId: string | null = null;
  error = '';
  aviso = '';
  guardando = false;
  busquedaProductor = '';
  listaProductoresAbierta = false;
  readonly distritosRegistro = DISTRITOS_PARCELA;
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    readonly auth: AuthService,
  ) {
    this.form = fb.nonNullable.group({
      productorId: ['', Validators.required],
      nombre: ['', Validators.required],
      distrito: ['', Validators.required],
      localidad: [''],
      areaHectareas: [1, Validators.required],
      altitudMsnm: [null as number | null],
    });
  }

  ngOnInit(): void {
    const propio = this.auth.productorId();
    if (propio) {
      this.form.controls.productorId.setValue(propio);
    }
    this.api.listarProductores().subscribe((productores) => {
      this.productores = productores;
      if (!this.form.controls.productorId.value && productores[0]) {
        this.form.controls.productorId.setValue(productores[0].id);
      }
      this.sincronizarBusquedaProductor();
    });
    this.cargar();
  }

  get distritos(): string[] {
    return [...new Set(this.parcelas.map((parcela) => parcela.distrito))];
  }

  get visibles(): Parcela[] {
    const texto = this.filtro.trim().toLowerCase();
    return this.parcelas.filter((parcela) => {
      const productor = this.nombreProductor(parcela.productorId).toLowerCase();
      const coincide = `${parcela.nombre} ${parcela.distrito} ${productor}`.toLowerCase().includes(texto);
      return coincide && (!this.distrito || parcela.distrito === this.distrito);
    });
  }

  nombreProductor(id: string): string {
    return this.productores.find((productor) => productor.id === id)?.nombre ?? '—';
  }

  get productoresFiltrados(): Productor[] {
    const texto = this.busquedaProductor.trim().toLowerCase();
    if (!texto) {
      return this.productores;
    }
    return this.productores.filter((productor) => productor.nombre.toLowerCase().includes(texto));
  }

  cargar(): void {
    this.api.listarParcelas().subscribe({
      next: (parcelas) => (this.parcelas = parcelas),
      error: () => (this.error = 'No se pudieron consultar las parcelas.'),
    });
  }

  abrirRegistro(): void {
    this.editandoId = null;
    this.error = '';
    const propio = this.auth.productorId() || this.productores[0]?.id || '';
    this.form.reset({ productorId: propio, nombre: '', distrito: '', localidad: '', areaHectareas: 1, altitudMsnm: null });
    this.sincronizarBusquedaProductor();
    this.listaProductoresAbierta = false;
    this.modal = true;
  }

  editar(parcela: Parcela): void {
    this.editandoId = parcela.id;
    this.error = '';
    this.form.setValue({
      productorId: parcela.productorId,
      nombre: parcela.nombre,
      distrito: (this.distritosRegistro as readonly string[]).includes(parcela.distrito) ? parcela.distrito : '',
      localidad: parcela.localidad ?? '',
      areaHectareas: parcela.areaHectareas,
      altitudMsnm: parcela.altitudMsnm,
    });
    this.sincronizarBusquedaProductor();
    this.listaProductoresAbierta = false;
    this.modal = true;
  }

  buscarProductor(evento: Event): void {
    this.busquedaProductor = (evento.target as HTMLInputElement).value;
    this.listaProductoresAbierta = true;
    const seleccionado = this.productores.find((productor) => productor.id === this.form.controls.productorId.value);
    if (!seleccionado || seleccionado.nombre.toLowerCase() !== this.busquedaProductor.trim().toLowerCase()) {
      this.form.controls.productorId.setValue('');
    }
  }

  elegirProductor(productor: Productor): void {
    this.form.controls.productorId.setValue(productor.id);
    this.busquedaProductor = productor.nombre;
    this.listaProductoresAbierta = false;
  }

  cerrarListaProductores(): void {
    this.listaProductoresAbierta = false;
    this.form.controls.productorId.markAsTouched();
  }

  registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = this.mensajeFormulario();
      return;
    }
    if (
      this.auth.sesion()?.rol === 'ADMINISTRADOR' &&
      !this.productores.some((productor) => productor.id === this.form.controls.productorId.value)
    ) {
      this.error = 'Selecciona un productor registrado.';
      return;
    }
    this.error = '';
    this.aviso = '';
    const valor = this.form.getRawValue();
    const nombre = valor.nombre.trim().toLowerCase();
    const duplicada = this.parcelas.some(
      (parcela) =>
        parcela.id !== this.editandoId &&
        parcela.productorId === valor.productorId &&
        parcela.nombre.trim().toLowerCase() === nombre,
    );
    if (duplicada) {
      this.error = 'Ya existe una parcela con este nombre.';
      return;
    }
    this.guardando = true;
    const datos = {
      ...valor,
      areaHectareas: Number(valor.areaHectareas),
      altitudMsnm: valor.altitudMsnm ? Number(valor.altitudMsnm) : null,
      localidad: valor.localidad || undefined,
    };
    const actual = this.parcelas.find((parcela) => parcela.id === this.editandoId);
    const peticion = this.editandoId
      ? this.api.actualizarParcela(this.editandoId, {
          ...datos,
          latitud: actual?.latitud ?? null,
          longitud: actual?.longitud ?? null,
        })
      : this.api.registrarParcela(datos);
    peticion.subscribe({
      next: () => {
        this.aviso = this.editandoId ? 'Parcela actualizada correctamente.' : '';
        this.modal = false;
        this.guardando = false;
        this.cargar();
      },
      error: (error: { error?: { error?: string } }) => {
        this.error = error.error?.error ?? (this.editandoId ? 'Error al actualizar.' : 'No se pudo registrar la parcela.');
        this.guardando = false;
      },
    });
  }

  private sincronizarBusquedaProductor(): void {
    this.busquedaProductor = this.nombreProductor(this.form.controls.productorId.value);
    if (this.busquedaProductor === '—') {
      this.busquedaProductor = '';
    }
  }

  private mensajeFormulario(): string {
    if (!this.form.controls.productorId.value) {
      return 'Selecciona un productor registrado.';
    }
    if (!this.form.controls.nombre.value.trim()) {
      return 'Ingresa el nombre de la parcela.';
    }
    if (!this.form.controls.distrito.value) {
      return 'Selecciona un distrito.';
    }
    return 'Revisa los datos de la parcela.';
  }

  eliminar(parcela: Parcela): void {
    if (!window.confirm('¿Está seguro de eliminar esta parcela?')) {
      return;
    }
    this.error = '';
    this.aviso = '';
    this.api.eliminarParcela(parcela.id).subscribe({
      next: () => {
        this.aviso = 'Parcela eliminada correctamente.';
        this.cargar();
      },
      error: (error: { error?: { error?: string } }) => {
        const mensaje = error.error?.error;
        this.error =
          mensaje === 'No se puede eliminar esta parcela porque tiene registros asociados.'
            ? mensaje
            : 'No se pudo eliminar la parcela.';
      },
    });
  }
}
