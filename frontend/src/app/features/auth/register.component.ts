import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    const { username, password, confirmPassword } = this.form.getRawValue();
    if (password !== confirmPassword) {
      // Cross-field rule the built-in validators can't express; reject before calling the API.
      this.error.set('Passwords do not match');
      return;
    }
    this.error.set(null);
    this.authService.register({ username, password }).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.error.set('Registration failed — username may already be taken'),
    });
  }
}
