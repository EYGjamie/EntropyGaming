import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  profile: {
    displayName: string;
    bio: string;
    avatarUrl: string;
  };
  role: {
    name: string;
    displayName: string;
  };
  permissions: string[];
  createdAt: string;
  lastLogin: string;
}

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">
      <!-- Profile Header -->
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="bg-gradient-to-r from-indigo-500 to-purple-600 h-32"></div>
        <div class="px-6 py-4">
          <div class="flex items-center -mt-16">
            <div class="relative">
              <img 
                *ngIf="userProfile?.profile?.avatarUrl" 
                [src]="userProfile.profile.avatarUrl" 
                [alt]="userProfile.username"
                class="h-24 w-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
              <div 
                *ngIf="!userProfile?.profile?.avatarUrl"
                class="h-24 w-24 rounded-full border-4 border-white shadow-lg bg-indigo-600 flex items-center justify-center"
              >
                <span class="text-white text-2xl font-bold">
                  {{ userProfile?.username?.charAt(0)?.toUpperCase() }}
                </span>
              </div>
            </div>
            <div class="ml-6 flex-1">
              <h1 class="text-3xl font-bold text-gray-900">
                {{ userProfile?.profile?.displayName || userProfile?.username }}
              </h1>
              <p class="text-lg text-gray-600">{{ userProfile?.role?.displayName }}</p>
              <div class="flex items-center space-x-4 mt-2">
                <span class="text-sm text-gray-500">
                  Beigetreten: {{ formatDate(userProfile?.createdAt) }}
                </span>
                <span class="text-sm text-gray-500">
                  Letzter Login: {{ formatDate(userProfile?.lastLogin) }}
                </span>
              </div>
            </div>
            <div *ngIf="isOwnProfile" class="flex space-x-2">
              <a 
                [routerLink]="['/profile/edit']"
                class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Profil bearbeiten
              </a>
              <a 
                [routerLink]="['/profile/settings']"
                class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 transition-colors"
              >
                Einstellungen
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Profile Content -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Bio and Info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Bio -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">Über mich</h2>
            </div>
            <div class="px-6 py-4">
              <p class="text-gray-700" *ngIf="userProfile?.profile?.bio">
                {{ userProfile.profile.bio }}
              </p>
              <p class="text-gray-500 italic" *ngIf="!userProfile?.profile?.bio">
                Keine Beschreibung vorhanden.
              </p>
            </div>
          </div>

          <!-- Recent Activity (Placeholder) -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">Letzte Aktivitäten</h2>
            </div>
            <div class="px-6 py-4">
              <p class="text-gray-500">Aktivitätsfeed wird in einer zukünftigen Version implementiert.</p>
            </div>
          </div>
        </div>

        <!-- Sidebar Info -->
        <div class="space-y-6">
          <!-- Role and Permissions -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">Rolle & Berechtigungen</h2>
            </div>
            <div class="px-6 py-4 space-y-4">
              <div>
                <h3 class="text-sm font-medium text-gray-700">Rolle</h3>
                <span class="inline-flex px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-800 rounded-full mt-1">
                  {{ userProfile?.role?.displayName }}
                </span>
              </div>
              <div *ngIf="userProfile?.permissions && userProfile.permissions.length > 0">
                <h3 class="text-sm font-medium text-gray-700 mb-2">Berechtigungen</h3>
                <div class="space-y-1">
                  <span 
                    *ngFor="let permission of userProfile.permissions" 
                    class="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded mr-1 mb-1"
                  >
                    {{ permission }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact Info -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">Kontakt</h2>
            </div>
            <div class="px-6 py-4 space-y-3">
              <div class="flex items-center">
                <span class="text-gray-400 mr-3">📧</span>
                <span class="text-sm text-gray-600">{{ userProfile?.email }}</span>
              </div>
              <div class="flex items-center">
                <span class="text-gray-400 mr-3">👤</span>
                <span class="text-sm text-gray-600">@{{ userProfile?.username }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfileViewComponent implements OnInit {
  userProfile: UserProfile | null = null;
  isOwnProfile = false;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private profileService: ProfileService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    const currentUser = this.authService.getCurrentUser();
    
    if (userId) {
      // Viewing another user's profile
      this.loadUserProfile(userId);
      this.isOwnProfile = false;
    } else {
      // Viewing own profile
      if (currentUser) {
        this.loadUserProfile(currentUser.id);
        this.isOwnProfile = true;
      }
    }
  }

  private loadUserProfile(userId: string): void {
    this.profileService.getUserProfile(userId).subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        this.isLoading = false;
      }
    });
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Unbekannt';
    return new Date(dateString).toLocaleDateString('de-DE');
  }
}