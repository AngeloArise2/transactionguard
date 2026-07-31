import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { AuthResponse, LoginRequest, RegisterRequest } from './interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSignal = signal<string | null>(null);
  readonly token = this.tokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  register(request: RegisterRequest): Observable<void> {
    return this.http.post<void>('/api/auth/register', request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', request).pipe(
      tap((response) => this.tokenSignal.set(response.token)),
    );
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.router.navigate(['/login']);
  }
}
