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
        this.isOwnProfile = this.currentUser?.id === profile.id;
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
    return !!(this.userProfile?.profile?.avatarUrl);
  }

  getAvatarUrl(): string {
    return this.userProfile?.profile?.avatarUrl || '';
  }

  getRoleColor(): string {
    return this.userProfile?.role?.color || '#6366f1';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateShort(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getProfileCompletionPercentage(): number {
    if (!this.userProfile) return 0;
    return this.profileService.getProfileCompletionPercentage(this.userProfile);
  }

  isProfileComplete(): boolean {
    if (!this.userProfile) return false;
    return this.profileService.isProfileComplete(this.userProfile);
  }

  canViewProfile(): boolean {
    if (!this.userProfile || !this.currentUser) return false;
    return this.profileService.canViewProfile(this.userProfile, this.currentUser.id);
  }

  canEditProfile(): boolean {
    if (!this.userProfile || !this.currentUser) return false;
    return this.profileService.canEditProfile(this.userProfile, this.currentUser.id);
  }

  hasPermission(permission: string): boolean {
    return this.userProfile?.permissions?.some(p => p.name === permission) || false;
  }

  getPermissionsByCategory(): { [category: string]: any[] } {
    if (!this.userProfile?.permissions) return {};
    
    const categorized: { [category: string]: any[] } = {};
    
    this.userProfile.permissions.forEach(permission => {
      const category = permission.category || 'Allgemein';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(permission);
    });

    return categorized;
  }

  getUserStats(): any {
    // This would typically come from an API
    // For now, return mock data
    return {
      postsCount: 0,
      commentsCount: 0,
      likesReceived: 0,
      joinedDaysAgo: this.userProfile ? 
        Math.floor((new Date().getTime() - new Date(this.userProfile.createdAt).getTime()) / (1000 * 3600 * 24)) : 0
    };
  }

  shareProfile(): void {
    if (navigator.share && this.userProfile) {
      navigator.share({
        title: `Profil von ${this.getUserDisplayName()}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        // Show success message
        console.log('Link kopiert!');
      });
    }
  }

  reportUser(): void {
    // Implement user reporting functionality
    console.log('User reported');
  }

  blockUser(): void {
    // Implement user blocking functionality
    console.log('User blocked');
  }
}