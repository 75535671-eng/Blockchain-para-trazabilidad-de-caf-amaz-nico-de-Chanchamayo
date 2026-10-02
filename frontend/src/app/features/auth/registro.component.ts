import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { ConsultaDocumento } from '../../shared/consulta-documento';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrl: './auth.component.scss',
})
export class RegistroComponent implements OnDestroy {
  error = '';
  mensaje = '';
  enviando = false;
  readonly consultaDoc = new ConsultaDocumento();
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly api: ApiService,
  ) {
    this.form = fb.nonNullable.group({
      nombre: ['', Validators.required],
      documento: ['', [Validators.required, Validators.pattern(/^(\d{8}|\d{11})$/)]],
      telefono: ['', Validators.required],
      organizacion: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmacion: ['', Validators.required],
    });
  }

  ngOnDestroy(): void {
    this.consultaDoc.destruir();
  }

  alCambiarDocumento(): void {
    const documento = this.form.controls.documento.value.replace(/\D/g, '').slice(0, 11);
    if (documento !== this.form.controls.documento.value) {
      this.form.controls.documento.setValue(documento);
    }
    this.consultaDoc.alCambiar(
      documento,
      (valor) => this.api.consultarDocumentoRegistro(valor),
      (nombre) => this.form.controls.nombre.setValue(nombre),
    );
  }

  alEditarNombre(): void {
    this.consultaDoc.anotarNombre(this.form.controls.nombre.value);
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Completa los campos obligatorios con un formato válido.';
      return;
    }
    const datos = this.form.getRawValue();
    if (datos.password !== datos.confirmacion) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.enviando = true;
    this.error = '';
    this.auth.registrar(datos).subscribe({
      next: (respuesta) => {
        this.enviando = false;
        this.mensaje = respuesta.mensaje;
        this.consultaDoc.reiniciar();
        this.form.reset();
      },
      error: (error: { error?: { error?: string } }) => {
        this.enviando = false;
        this.error = error.error?.error ?? 'No se pudo enviar la solicitud.';
      },
    });
  }
}
