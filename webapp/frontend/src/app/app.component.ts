import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { AuthService } from './core/services/auth.service';
import { LoadingService } from './core/services/loading.service';
import { NotificationService } from './core/services/notification.service';

import { NavigationComponent } from './shared/components/navigation/navigation.component';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { NotificationComponent } from './shared/components/notification/notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavigationComponent,
    LoadingSpinnerComponent,
    NotificationComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Discord Bot Dashboard';
  isAuthenticated$ = this.authService.isAuthenticated$;
  isLoading$ = this.loadingService.loading$;
  
  constructor(
    private authService: AuthService,
    private loadingService: LoadingService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialize authentication state
    this.authService.initializeAuth();

    // Listen to route changes and hide loading
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.loadingService.hide();
      });
  }
}