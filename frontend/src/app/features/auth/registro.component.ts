import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrl: './auth.component.scss',
})
export class RegistroComponent {
  error = '';
  mensaje = '';
  enviando = false;
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly auth: AuthService,
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
        this.form.reset();
      },
      error: (error: { error?: { error?: string } }) => {
        this.enviando = false;
        this.error = error.error?.error ?? 'No se pudo enviar la solicitud.';
      },
    });
  }
}
