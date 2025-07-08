import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const loadingService = inject(LoadingService);
  const notificationService = inject(NotificationService);

  // Get token from auth service
  const token = authService.getStoredToken();

  // Show loading for API requests
  if (req.url.startsWith('/api/')) {
    loadingService.show();
  }

  // Clone request and add authorization header if token exists
  let authReq = req;
  if (token && req.url.startsWith('/api/')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Handle the request
  return next(authReq).pipe(
    catchError(error => {
      // Hide loading on error
      if (req.url.startsWith('/api/')) {
        loadingService.hide();
      }

      // Handle authentication errors
      if (error.status === 401) {
        // Token expired or invalid
        authService.logout();
        notificationService.error(
          'Sitzung abgelaufen',
          'Bitte melden Sie sich erneut an.'
        );
      } else if (error.status === 403) {
        notificationService.error(
          'Zugriff verweigert',
          'Sie haben keine Berechtigung für diese Aktion.'
        );
      } else if (error.status === 0) {
        // Network error
        notificationService.error(
          'Verbindungsfehler',
          'Keine Verbindung zum Server möglich.'
        );
      } else if (error.status >= 500) {
        // Server error
        notificationService.error(
          'Serverfehler',
          'Ein interner Serverfehler ist aufgetreten.'
        );
      }

      return throwError(() => error);
    }),
    // Hide loading on success
    tap(() => {
      if (req.url.startsWith('/api/')) {
        loadingService.hide();
      }
    })
  );
};

// Import tap operator
import { tap } from 'rxjs/operators';