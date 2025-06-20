import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  profile: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  };
  role: {
    id: number;
    name: string;
    displayName: string;
    color?: string;
  };
  permissions: {
    id: number;
    name: string;
    displayName: string;
  }[];
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
  password: string;
}

export interface ProfileSettings {
  notifications: {
    email: boolean;
    discord: boolean;
    browser: boolean;
  };
  privacy: {
    showEmail: boolean;
    showLastLogin: boolean;
    allowDirectMessages: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly apiUrl = '/api/profile';
  private currentProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentProfile$ = this.currentProfileSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get current user's profile
   */
  getCurrentProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/me`)
      .pipe(
        tap(profile => this.currentProfileSubject.next(profile))
      );
  }

  /**
   * Get user profile by ID (public view)
   */
  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${userId}`);
  }

  /**
   * Update current user's profile
   */
  updateProfile(profileData: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/me`, profileData)
      .pipe(
        tap(updatedProfile => this.currentProfileSubject.next(updatedProfile))
      );
  }

  /**
   * Upload profile avatar
   */
  uploadAvatar(file: File): Observable<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post<{ avatarUrl: string }>(`${this.apiUrl}/me/avatar`, formData);
  }

  /**
   * Delete profile avatar
   */
  deleteAvatar(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/me/avatar`)
      .pipe(
        tap(() => {
          const currentProfile = this.currentProfileSubject.value;
          if (currentProfile) {
            currentProfile.profile.avatarUrl = undefined;
            this.currentProfileSubject.next(currentProfile);
          }
        })
      );
  }

  /**
   * Change password
   */
  changePassword(passwordData: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/me/change-password`, passwordData);
  }

  /**
   * Change email
   */
  changeEmail(emailData: ChangeEmailRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/me/change-email`, emailData)
      .pipe(
        tap(() => {
          const currentProfile = this.currentProfileSubject.value;
          if (currentProfile) {
            currentProfile.email = emailData.newEmail;
            this.currentProfileSubject.next(currentProfile);
          }
        })
      );
  }

  /**
   * Get profile settings
   */
  getSettings(): Observable<ProfileSettings> {
    return this.http.get<ProfileSettings>(`${this.apiUrl}/me/settings`);
  }

  /**
   * Update profile settings
   */
  updateSettings(settings: Partial<ProfileSettings>): Observable<ProfileSettings> {
    return this.http.put<ProfileSettings>(`${this.apiUrl}/me/settings`, settings);
  }

  /**
   * Get profile activity log
   */
  getProfileActivity(page: number = 1, limit: number = 50): Observable<{
    activities: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.http.get<{
      activities: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`${this.apiUrl}/me/activity?page=${page}&limit=${limit}`);
  }

  /**
   * Get user's login sessions
   */
  getSessions(): Observable<{
    id: string;
    device: string;
    browser: string;
    ip: string;
    location: string;
    current: boolean;
    lastActive: string;
    createdAt: string;
  }[]> {
    return this.http.get<{
      id: string;
      device: string;
      browser: string;
      ip: string;
      location: string;
      current: boolean;
      lastActive: string;
      createdAt: string;
    }[]>(`${this.apiUrl}/me/sessions`);
  }

  /**
   * Revoke a session
   */
  revokeSession(sessionId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/me/sessions/${sessionId}`);
  }

  /**
   * Revoke all sessions except current
   */
  revokeAllSessions(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/me/sessions`);
  }

  /**
   * Enable 2FA
   */
  enable2FA(): Observable<{ qrCode: string; secret: string; backupCodes: string[] }> {
    return this.http.post<{ qrCode: string; secret: string; backupCodes: string[] }>(`${this.apiUrl}/me/2fa/enable`, {});
  }

  /**
   * Verify 2FA setup
   */
  verify2FA(token: string): Observable<{ message: string; backupCodes: string[] }> {
    return this.http.post<{ message: string; backupCodes: string[] }>(`${this.apiUrl}/me/2fa/verify`, { token });
  }

  /**
   * Disable 2FA
   */
  disable2FA(password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/me/2fa/disable`, { password });
  }

  /**
   * Generate new backup codes for 2FA
   */
  regenerateBackupCodes(): Observable<{ backupCodes: string[] }> {
    return this.http.post<{ backupCodes: string[] }>(`${this.apiUrl}/me/2fa/backup-codes`, {});
  }

  /**
   * Export profile data
   */
  exportProfileData(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/me/export`, { responseType: 'blob' });
  }

  /**
   * Delete account (with confirmation)
   */
  deleteAccount(password: string, confirmation: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/me/delete`, { password, confirmation });
  }

  /**
   * Get public profiles (for user search/discovery)
   */
  getPublicProfiles(search?: string, limit: number = 20): Observable<UserProfile[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('limit', limit.toString());

    return this.http.get<UserProfile[]>(`${this.apiUrl}/public?${params.toString()}`);
  }

  /**
   * Clear current profile data
   */
  clearProfile(): void {
    this.currentProfileSubject.next(null);
  }

  /**
   * Check if profile is complete
   */
  isProfileComplete(profile: UserProfile): boolean {
    return !!(
      profile.profile.displayName &&
      profile.profile.bio &&
      profile.profile.avatarUrl
    );
  }

  /**
   * Get profile completion percentage
   */
  getProfileCompletionPercentage(profile: UserProfile): number {
    let completion = 0;
    const fields = [
      profile.profile.displayName,
      profile.profile.bio,
      profile.profile.avatarUrl
    ];
    
    fields.forEach(field => {
      if (field) completion += 33.33;
    });

    return Math.round(completion);
  }

  /**
   * Format user display name
   */
  formatDisplayName(profile: UserProfile): string {
    return profile.profile.displayName || profile.username;
  }

  /**
   * Get user avatar URL or generate initials
   */
  getAvatarUrl(profile: UserProfile): string | null {
    return profile.profile.avatarUrl || null;
  }

  /**
   * Get user initials for avatar placeholder
   */
  getUserInitials(profile: UserProfile): string {
    const name = this.formatDisplayName(profile);
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  /**
   * Check if current user can view profile
   */
  canViewProfile(profile: UserProfile, currentUserId: number): boolean {
    // Users can always view their own profile
    if (profile.id === currentUserId) {
      return true;
    }

    // Check privacy settings (would need to be implemented based on actual privacy settings)
    return true; // For now, all profiles are viewable
  }

  /**
   * Check if current user can edit profile
   */
  canEditProfile(profile: UserProfile, currentUserId: number): boolean {
    return profile.id === currentUserId;
  }
}