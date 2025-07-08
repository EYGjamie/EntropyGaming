import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { AuthService, User } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  permission?: string;
  adminOnly?: boolean;
  moderatorOnly?: boolean;
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {
  currentUser$ = this.authService.currentUser$;
  currentUser: User | null = null;
  
  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v2zm0 0V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v2M7 13h10M7 17h4',
      route: '/dashboard'
    },
    {
      label: 'Mein Profil',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      route: '/profile'
    },
    {
      label: 'Benutzer',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-7.503v1.5a3 3 0 01-3 3h-.5',
      route: '/users',
      permission: 'view_users'
    },
    {
      label: 'Tools',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      route: '/tools',
      permission: 'access_tools'
    },
    {
      label: 'Administration',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      route: '/admin',
      adminOnly: true
    }
  ];

  filteredNavItems: NavItem[] = [];

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.updateFilteredNavItems();
    });
  }

  /**
   * Update navigation items based on user permissions
   */
  private updateFilteredNavItems(): void {
    if (!this.currentUser) {
      this.filteredNavItems = [];
      return;
    }

    this.filteredNavItems = this.navItems.filter(item => {
      // Check admin only items
      if (item.adminOnly && !this.authService.isAdmin()) {
        return false;
      }

      // Check moderator only items
      if (item.moderatorOnly && !this.authService.isModerator()) {
        return false;
      }

      // Check specific permissions
      if (item.permission && !this.authService.hasPermission(item.permission)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authService.logout();
    this.notificationService.success('Abgemeldet', 'Sie wurden erfolgreich abgemeldet.');
  }

  /**
   * Get user display name
   */
  getUserDisplayName(): string {
    if (!this.currentUser) return '';
    
    return this.currentUser.profile?.displayName || 
           this.currentUser.username || 
           'Unbekannter Benutzer';
  }

  /**
   * Get user avatar URL
   */
  getUserAvatarUrl(): string {
    return this.currentUser?.profile?.avatarUrl || '/assets/images/default-avatar.png';
  }

  /**
   * Get user role color
   */
  getUserRoleColor(): string {
    return this.currentUser?.role?.color || '#6B7280';
  }

  /**
   * Navigate to profile
   */
  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  /**
   * Navigate to settings
   */
  navigateToSettings(): void {
    this.router.navigate(['/profile/settings']);
  }
}