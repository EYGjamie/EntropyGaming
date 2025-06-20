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
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
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

  // Helper methods for template
  getUserDisplayName(): string {
    return this.currentUser?.profile?.displayName || this.currentUser?.username || 'Benutzer';
  }

  getUserRole(): string {
    return this.currentUser?.role?.name || 'Keine Rolle';
  }

  getUserInitial(): string {
    return this.currentUser?.username?.charAt(0)?.toUpperCase() || '?';
  }

  hasAvatar(): boolean {
    return !!(this.currentUser?.profile?.avatarUrl);
  }

  getAvatarUrl(): string {
    return this.currentUser?.profile?.avatarUrl || '';
  }

  getUserEmail(): string {
    return this.currentUser?.email || '';
  }
}