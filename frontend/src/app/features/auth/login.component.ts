import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './auth.component.scss',
})
export class LoginComponent {
  error = '';
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {
    this.form = fb.nonNullable.group({
      email: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  enviar(): void {
    const { email, password } = this.form.getRawValue();
    this.auth.iniciarSesion(email, password).subscribe({
      next: () => void this.router.navigate(['/inicio']),
      error: () => (this.error = 'No se pudo iniciar sesión.'),
    });
  }
}
