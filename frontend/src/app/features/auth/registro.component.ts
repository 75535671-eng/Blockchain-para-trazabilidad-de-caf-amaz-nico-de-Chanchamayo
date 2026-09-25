import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrl: './auth.component.scss',
})
export class RegistroComponent {
  error = '';
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {
    this.form = fb.nonNullable.group({
      nombre: ['', Validators.required],
      email: ['', Validators.required],
      password: ['', Validators.required],
      documento: ['', Validators.required],
      telefono: [''],
      organizacion: [''],
    });
  }

  enviar(): void {
    this.auth.registrar(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigate(['/login']),
      error: (error: { error?: { error?: string } }) => (this.error = error.error?.error ?? 'No se pudo registrar.'),
    });
  }
}
