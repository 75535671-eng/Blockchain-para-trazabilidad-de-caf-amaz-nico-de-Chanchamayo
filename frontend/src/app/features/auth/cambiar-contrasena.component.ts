import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-cambiar-contrasena',
  imports: [ReactiveFormsModule],
  template: `
    <article class="card" style="max-width: 460px">
      <h1>Crea tu nueva contraseña</h1>
      <p>Por seguridad, debes cambiar tu contraseña temporal antes de continuar.</p>
      <form [formGroup]="form" (ngSubmit)="guardar()">
        <div class="form-grid">
          <label class="campo">Nueva contraseña
            <input formControlName="password" type="password" autocomplete="new-password" />
          </label>
          <label class="campo">Confirmar nueva contraseña
            <input formControlName="confirmacion" type="password" autocomplete="new-password" />
          </label>
        </div>
        @if (error) { <p class="alerta error">{{ error }}</p> }
        <button class="btn" type="submit" [disabled]="guardando" style="margin-top: 1rem">
          {{ guardando ? 'Guardando…' : 'Guardar nueva contraseña' }}
        </button>
      </form>
    </article>
  `,
})
export class CambiarContrasenaComponent {
  error = '';
  guardando = false;
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {
    this.form = fb.nonNullable.group({
      password: ['', Validators.required],
      confirmacion: ['', Validators.required],
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Ambos campos son obligatorios.';
      return;
    }
    const { password, confirmacion } = this.form.getRawValue();
    if (password !== confirmacion) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.guardando = true;
    this.error = '';
    this.auth.cambiarContrasena(password, confirmacion).subscribe({
      next: () => void this.router.navigate(['/inicio']),
      error: (error: { error?: { error?: string } }) => {
        this.guardando = false;
        this.error = error.error?.error ?? 'No se pudo cambiar la contraseña.';
      },
    });
  }
}
