import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { LayoutComponent } from './shared/components/layout/layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LayoutComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  showLayout = false;
  title = 'Discord Bot Portal';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Listen to route changes to determine if layout should be shown
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateLayoutVisibility(event.url);
      });

    // Check initial route
    this.updateLayoutVisibility(this.router.url);

    // Listen to auth changes
    this.authService.currentUser$.subscribe(user => {
      this.updateLayoutVisibility(this.router.url);
    });
  }

  private updateLayoutVisibility(url: string): void {
    const isLoginPage = url.includes('/login');
    const isAuthenticated = this.authService.isAuthenticated();
    
    this.showLayout = isAuthenticated && !isLoginPage;
  }
}