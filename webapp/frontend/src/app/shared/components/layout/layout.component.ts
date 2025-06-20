import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../../core/services/auth.service';

interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  permission?: string;
  role?: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Navigation -->
      <nav class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <!-- Left side -->
            <div class="flex">
              <!-- Logo -->
              <div class="flex-shrink-0 flex items-center">
                <h1 class="text-xl font-semibold text-gray-900">Discord Bot Portal</h1>
              </div>
              
              <!-- Main navigation -->
              <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a
                  *ngFor="let item of navigationItems"
                  [routerLink]="item.route"
                  routerLinkActive="border-indigo-500 text-gray-900"
                  class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  <span class="mr-2">{{ item.icon }}</span>
                  {{ item.label }}
                </a>
              </div>
            </div>

            <!-- Right side -->
            <div class="flex items-center space-x-4">
              <!-- User menu -->
              <div class="relative" (click)="toggleUserMenu()" *ngIf="currentUser">
                <button class="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 p-2 hover:bg-gray-50">
                  <!-- Avatar -->
                  <div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                    <img 
                      *ngIf="currentUser.profile?.avatarUrl" 
                      [src]="currentUser.profile.avatarUrl" 
                      [alt]="currentUser.username"
                      class="h-8 w-8 rounded-full object-cover"
                    />
                    <span 
                      *ngIf="!currentUser.profile?.avatarUrl" 
                      class="text-white text-sm font-medium"
                    >
                      {{ currentUser.username.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  
                  <!-- User info -->
                  <div class="hidden md:block text-left">
                    <p class="text-sm font-medium text-gray-700">
                      {{ currentUser.profile?.displayName || currentUser.username }}
                    </p>
                    <p class="text-xs text-gray-500">{{ currentUser.role.name }}</p>
                  </div>
                  
                  <!-- Dropdown arrow -->
                  <svg class="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                  </svg>
                </button>

                <!-- Dropdown menu -->
                <div 
                  *ngIf="showUserMenu" 
                  class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                >
                  <a routerLink="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    👤 Mein Profil
                  </a>
                  <a routerLink="/profile/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    ⚙️ Einstellungen
                  </a>
                  <hr class="my-1">
                  <button 
                    (click)="logout()" 
                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    🚪 Abmelden
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile menu -->
        <div class="sm:hidden" [class.hidden]="!showMobileMenu">
          <div class="pt-2 pb-3 space-y-1">
            <a
              *ngFor="let item of navigationItems"
              [routerLink]="item.route"
              routerLinkActive="bg-indigo-50 border-indigo-500 text-indigo-700"
              class="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
            >
              {{ item.icon }} {{ item.label }}
            </a>
          </div>
        </div>
      </nav>

      <!-- Main content -->
      <main class="flex-1">
        <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <ng-content></ng-content>
        </div>
      </main>
    </div>

    <!-- Click outside to close user menu -->
    <div 
      *ngIf="showUserMenu" 
      class="fixed inset-0 z-40" 
      (click)="closeUserMenu()"
    ></div>
  `
})
export class LayoutComponent implements OnInit {
  currentUser: User | null = null;
  showUserMenu = false;
  showMobileMenu = false;
  navigationItems: NavigationItem[] = [];

  private allNavigationItems: NavigationItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: '📊' },
    { label: 'Discord Users', route: '/tools/discord-users', icon: '👥', permission: 'tools.discord_users' },
    { label: 'Ticket Transcripts', route: '/tools/ticket-transcripts', icon: '📝', permission: 'tools.ticket_transcripts' },
    { label: 'Benutzer', route: '/users', icon: '👤', permission: 'users.view' },
    { label: 'Admin', route: '/admin', icon: '⚙️', role: 'admin' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.updateNavigationItems();
    });
  }

  private updateNavigationItems(): void {
    this.navigationItems = this.allNavigationItems.filter(item => {
      if (item.permission && !this.authService.hasPermission(item.permission)) {
        return false;
      }
      if (item.role && !this.authService.hasRole(item.role)) {
        return false;
      }
      return true;
    });
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  logout(): void {
    this.authService.logout();
  }
}