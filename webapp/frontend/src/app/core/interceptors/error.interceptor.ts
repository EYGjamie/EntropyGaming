import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const ErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthorized - redirect to login
        authService.logout();
        router.navigate(['/login']);
      } else if (error.status === 403) {
        // Forbidden - show error message
        console.error('Access forbidden:', error.error?.message || 'Insufficient permissions');
      } else if (error.status === 0) {
        // Network error
        console.error('Network error: Please check your connection');
      }

      return throwError(() => error);
    })
  );
};