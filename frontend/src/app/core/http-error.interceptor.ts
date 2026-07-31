import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Stale or missing token — clear the session and send the user back to login.
        authService.logout();
      } else if (error.status === 0) {
        toastService.show('Cannot reach the server. Is the backend running?');
      } else if (error.status >= 500) {
        toastService.show('Something went wrong on the server. Please try again.');
      }
      return throwError(() => error);
    }),
  );
};
