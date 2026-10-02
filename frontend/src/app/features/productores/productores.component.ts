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
  confirmacion: { productor: Productor; paso: 1 | 2; accion: 'otorgar' | 'quitar' } | null = null;
  correoCuenta = '';
  claveCuenta = '';
  errorCuenta = '';
  otorgando = false;
  error = '';
  errorFormulario = '';
  aviso = '';
  credenciales: { nombre: string; email: string; password: string } | null = null;
  eliminacion: { productor: Productor; paso: 1 | 2 } | null = null;
  nombreConfirmacion = '';
  eliminando = false;
  copiado = false;
  avisoDni = '';
  duplicado = false;
  consultandoDni = false;
  guardando = false;
  private dniConsultado = '';
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    readonly auth: AuthService,
  ) {
    this.form = fb.nonNullable.group({
      documento: ['', [Validators.required, Validators.pattern(/^(\d{8}|\d{11})$/)]],
      nombre: ['', Validators.required],
      telefono: ['', Validators.required],
      organizacion: [''],
      email: [''],
      password: [''],
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

  get mensajeValidacion(): string {
    if (!this.form.touched || this.form.valid) {
      return '';
    }
    const controles = this.form.controls;
    if (controles.documento.hasError('required')) {
      return 'El DNI o RUC es obligatorio.';
    }
    if (controles.documento.hasError('pattern')) {
      return 'Ingresa un DNI de 8 dígitos o un RUC de 11 dígitos.';
    }
    if (controles.nombre.hasError('required')) {
      return 'Los apellidos y nombres son obligatorios.';
    }
    if (controles.telefono.hasError('required')) {
      return 'El teléfono es obligatorio.';
    }
    return 'Revisa los datos del productor.';
  }

  abrirRegistro(): void {
    this.editandoId = null;
    this.form.reset();
    this.errorFormulario = '';
    this.avisoDni = '';
    this.duplicado = false;
    this.dniConsultado = '';
    this.modal = true;
  }

  editar(productor: Productor): void {
    this.editandoId = productor.id;
    this.errorFormulario = '';
    this.avisoDni = '';
    this.duplicado = false;
    this.dniConsultado = '';
    this.form.setValue({
      documento: productor.documento,
      nombre: productor.nombre,
      telefono: productor.telefono ?? '',
      organizacion: productor.organizacion ?? '',
      email: '',
      password: '',
    });
    this.modal = true;
  }

  alCambiarDocumento(): void {
    if (this.editandoId) {
      return;
    }
    const documento = this.form.controls.documento.value.trim();
    if (!/^(\d{8}|\d{11})$/.test(documento)) {
      this.dniConsultado = '';
      this.avisoDni = '';
      this.consultandoDni = false;
      return;
    }
    if (documento === this.dniConsultado) {
      return;
    }
    this.dniConsultado = documento;
    this.consultandoDni = true;
    this.avisoDni = '';
    this.api.consultarDni(documento).subscribe({
      next: (resultado) => {
        if (this.form.controls.documento.value.trim() !== documento) {
          return;
        }
        this.consultandoDni = false;
        if (resultado.estado === 'encontrado' && resultado.nombre) {
          this.form.controls.nombre.setValue(resultado.nombre);
          return;
        }
        if (resultado.estado === 'no_configurado') {
          return;
        }
        this.avisoDni = 'No se pudo obtener el nombre. Puedes ingresarlo manualmente.';
      },
      error: () => {
        if (this.form.controls.documento.value.trim() !== documento) {
          return;
        }
        this.consultandoDni = false;
        this.avisoDni = 'No se pudo consultar el DNI. Puedes ingresar los datos manualmente.';
      },
    });
  }

  registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const datos = this.form.getRawValue();
    if (!this.editandoId) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
        this.errorFormulario = 'Ingresa un correo válido para el acceso.';
        return;
      }
      if (datos.password.length < 8 || datos.password.length > 72 || !/[A-Za-z]/.test(datos.password) || !/\d/.test(datos.password)) {
        this.errorFormulario = 'La contraseña debe tener entre 8 y 72 caracteres e incluir letras y números.';
        return;
      }
    }
    this.guardando = true;
    this.errorFormulario = '';
    if (this.editandoId) {
      this.api.actualizarProductor(this.editandoId, datos).subscribe({
        next: () => {
          this.aviso = 'Productor actualizado.';
          this.modal = false;
          this.guardando = false;
          this.cargar();
        },
        error: (error: { status?: number; error?: { error?: string } }) => this.falloGuardado(error),
      });
      return;
    }
    this.api.crearCuentaProductor({ ...datos, email: datos.email.trim() }).subscribe({
      next: (respuesta) => {
        this.modal = false;
        this.guardando = false;
        this.copiado = false;
        this.credenciales = {
          nombre: respuesta.productor.nombre,
          email: respuesta.usuario.email,
          password: respuesta.passwordTemporal,
        };
        this.cargar();
      },
      error: (error: { status?: number; error?: { error?: string } }) => this.falloGuardado(error),
    });
  }

  puedeRecibirAdministrador(productor: Productor): boolean {
    return productor.rolCuenta !== 'ADMINISTRADOR' && productor.usuarioId !== this.auth.sesion()?.id;
  }

  puedeQuitarAdministrador(productor: Productor): boolean {
    return productor.rolCuenta === 'ADMINISTRADOR' && !!productor.usuarioId && productor.usuarioId !== this.auth.sesion()?.id;
  }

  pedirPermisos(productor: Productor): void {
    this.error = '';
    this.errorCuenta = '';
    this.correoCuenta = '';
    this.claveCuenta = '';
    this.confirmacion = { productor, paso: 1, accion: 'otorgar' };
  }

  pedirRetiro(productor: Productor): void {
    this.error = '';
    this.confirmacion = { productor, paso: 1, accion: 'quitar' };
  }

  continuarPermisos(): void {
    if (!this.confirmacion || this.otorgando) {
      return;
    }
    if (this.confirmacion.paso === 1) {
      this.confirmacion = { ...this.confirmacion, paso: 2 };
      return;
    }
    const { productor, accion } = this.confirmacion;
    let acceso: { email: string; password: string } | undefined;
    if (accion === 'otorgar' && !productor.usuarioId) {
      const email = this.correoCuenta.trim();
      const password = this.claveCuenta;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this.errorCuenta = 'Ingresa un correo válido para el acceso.';
        return;
      }
      if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        this.errorCuenta = 'La contraseña debe tener entre 8 y 72 caracteres e incluir letras y números.';
        return;
      }
      acceso = { email, password };
    }
    this.errorCuenta = '';
    this.otorgando = true;
    const alResponder = {
      next: (respuesta: { id: string }) => {
        this.otorgando = false;
        this.confirmacion = null;
        this.aviso = accion === 'otorgar'
          ? `${productor.nombre} ahora tiene permisos de administrador.`
          : `${productor.nombre} ya no tiene permisos de administrador.`;
        this.productores = this.productores.map((actual) =>
          actual.id === productor.id
            ? {
                ...actual,
                usuarioId: accion === 'otorgar' ? respuesta.id : actual.usuarioId,
                rolCuenta: accion === 'otorgar' ? 'ADMINISTRADOR' as const : 'PRODUCTOR' as const,
              }
            : actual,
        );
      },
      error: (error: { error?: { error?: string } }) => {
        this.otorgando = false;
        this.confirmacion = null;
        this.error = error.error?.error ?? 'No se pudieron actualizar los permisos.';
      },
    };
    if (accion === 'otorgar') {
      this.api.otorgarAdministrador(productor.id, acceso).subscribe(alResponder);
      return;
    }
    this.api.quitarAdministrador(productor.id).subscribe(alResponder);
  }

  cancelarPermisos(): void {
    if (this.otorgando) {
      return;
    }
    this.confirmacion = null;
  }

  generarClave(): void {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    const numeros = '23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    let clave = '';
    for (let indice = 0; indice < 8; indice += 1) {
      clave += letras[bytes[indice] % letras.length];
    }
    clave += numeros[bytes[8] % numeros.length];
    clave += numeros[bytes[9] % numeros.length];
    this.form.controls.password.setValue(clave);
  }

  async copiarCredenciales(): Promise<void> {
    if (!this.credenciales) {
      return;
    }
    const texto = `Productor: ${this.credenciales.nombre}\nCorreo: ${this.credenciales.email}\nContraseña temporal: ${this.credenciales.password}`;
    await navigator.clipboard.writeText(texto);
    this.copiado = true;
  }

  finalizarCredenciales(): void {
    this.credenciales = null;
    this.copiado = false;
    this.form.controls.password.setValue('');
  }

  private falloGuardado(error: { status?: number; error?: { error?: string } }): void {
    this.guardando = false;
    if (!this.editandoId && error.status === 409 && error.error?.error === 'Este productor ya se encuentra registrado') {
      this.duplicado = true;
      return;
    }
    this.errorFormulario = error.error?.error ?? 'No se pudo guardar.';
  }

  pedirEliminacion(productor: Productor): void {
    this.error = '';
    this.nombreConfirmacion = '';
    this.eliminacion = { productor, paso: 1 };
  }

  continuarEliminacion(): void {
    if (!this.eliminacion || this.eliminando) {
      return;
    }
    this.nombreConfirmacion = '';
    this.eliminacion = { ...this.eliminacion, paso: 2 };
  }

  get puedeEliminar(): boolean {
    return this.nombreConfirmacion === this.eliminacion?.productor.nombre;
  }

  cancelarEliminacion(): void {
    if (this.eliminando) {
      return;
    }
    this.eliminacion = null;
    this.nombreConfirmacion = '';
  }

  confirmarEliminacion(): void {
    if (!this.eliminacion || !this.puedeEliminar || this.eliminando) {
      return;
    }
    const productor = this.eliminacion.productor;
    this.eliminando = true;
    this.error = '';
    this.api.eliminarProductor(productor.id).subscribe({
      next: () => {
        this.eliminando = false;
        this.eliminacion = null;
        this.nombreConfirmacion = '';
        this.aviso = 'El productor y sus datos asociados se eliminaron correctamente';
        this.cargar();
      },
      error: (error: { error?: { error?: string } }) => {
        this.eliminando = false;
        this.eliminacion = null;
        this.nombreConfirmacion = '';
        this.error = error.error?.error ?? 'No se pudo eliminar el productor. Sus datos se conservaron.';
      },
    });
  }
}
