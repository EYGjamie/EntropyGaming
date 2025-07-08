import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user && this.authService.isAdmin()) {
          return true;
        } else {
          // Show access denied notification
          this.notificationService.error(
            'Zugriff verweigert',
            'Sie haben keine Berechtigung für diesen Bereich.'
          );
          
          // Redirect to dashboard
          return this.router.createUrlTree(['/dashboard']);
        }
      })
    );
  }
}