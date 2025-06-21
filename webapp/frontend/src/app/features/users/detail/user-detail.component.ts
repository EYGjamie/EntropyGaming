import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProfileService, UserProfile } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommentsComponent } from '../../../shared/components/comments/comments.component';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, CommentsComponent],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.css'
})
export class UserDetailComponent implements OnInit {
  userProfile: UserProfile | null = null;
  isLoading = true;
  error: string | null = null;
  isOwnProfile = false;
  userId: string | null = null;
  currentUser: any = null;

  constructor(
    private route: ActivatedRoute,
    private profileService: ProfileService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.userId = this.route.snapshot.paramMap.get('userId');
    
    if (this.userId) {
      this.loadUserProfile(this.userId);
    } else {
      this.error = 'Benutzer-ID nicht gefunden';
      this.isLoading = false;
    }
  }

  private loadUserProfile(userId: string): void {
    this.isLoading = true;
    this.error = null;

    this.profileService.getUserProfile(userId).subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.isOwnProfile = this.currentUser && 
          (this.currentUser.id.toString() === profile.id.toString());
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        this.error = 'Fehler beim Laden des Benutzerprofils';
        this.isLoading = false;
      }
    });
  }

  getUserDisplayName(): string {
    if (!this.userProfile) return '';
    return this.userProfile.profile?.displayName || this.userProfile.username;
  }

  getUserInitials(): string {
    const name = this.getUserDisplayName();
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  hasAvatar(): boolean {
    return !!this.userProfile?.profile?.avatarUrl;
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Nie';
    return new Date(dateString).toLocaleDateString('de-DE');
  }

  formatDateTime(dateString?: string): string {
    if (!dateString) return 'Nie';
    return new Date(dateString).toLocaleString('de-DE');
  }

  canViewContactInfo(): boolean {
    // User can always see their own contact info
    if (this.isOwnProfile) return true;
    
    // Check privacy settings or permissions
    // For now, only show if it's the user's own profile
    return false;
  }

  canEditProfile(): boolean {
    if (!this.userProfile || !this.currentUser) return false;
    return this.profileService.canEditProfile(this.userProfile, this.currentUser.id);
  }

  getRoleBadgeClass(): string {
    if (!this.userProfile?.role.color) return 'bg-gray-100 text-gray-800';
    return `bg-${this.userProfile.role.color}-100 text-${this.userProfile.role.color}-800`;
  }

  hasPermissions(): boolean {
    return !!(this.userProfile?.permissions && this.userProfile.permissions.length > 0);
  }

  getPermissionBadgeClass(permission: any): string {
    const category = permission.category || 'general';
    switch (category.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      case 'tools': return 'bg-green-100 text-green-800';
      case 'comments': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getAccountAge(): string {
    if (!this.userProfile?.createdAt) return '';
    
    const created = new Date(this.userProfile.createdAt);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 30) {
      return `${diffInDays} Tag${diffInDays !== 1 ? 'e' : ''}`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} Monat${months !== 1 ? 'e' : ''}`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} Jahr${years !== 1 ? 'e' : ''}`;
    }
  }

  getLastSeenText(): string {
    if (!this.userProfile?.lastLogin) return 'Nie online gewesen';
    
    const lastLogin = new Date(this.userProfile.lastLogin);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 5) {
      return 'Gerade online';
    } else if (diffInMinutes < 60) {
      return `vor ${diffInMinutes} Minute${diffInMinutes !== 1 ? 'n' : ''}`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `vor ${hours} Stunde${hours !== 1 ? 'n' : ''}`;
    } else {
      return this.formatDate(this.userProfile.lastLogin);
    }
  }

  isProfileComplete(): boolean {
    if (!this.userProfile) return false;
    return this.profileService.isProfileComplete(this.userProfile);
  }

  getProfileCompletionPercentage(): number {
    if (!this.userProfile) return 0;
    return this.profileService.getProfileCompletionPercentage(this.userProfile);
  }
}