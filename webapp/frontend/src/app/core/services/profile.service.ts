import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Profile {
  id: number;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  profileColor: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    discord?: string;
    website?: string;
  };
  customFields?: Record<string, any>;
  isPublic: boolean;
  user: {
    id: number;
    username: string;
    email: string;
    role: {
      name: string;
      color: string;
    };
  };
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  profileColor?: string;
  location?: string;
  website?: string;
  isPublic?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly API_BASE = '/api/profiles';

  constructor(private http: HttpClient) {}

  getMyProfile(): Observable<Profile> {
    return this.http.get<Profile>(`${this.API_BASE}/me`);
  }

  getProfileByUserId(userId: number): Observable<Profile> {
    return this.http.get<Profile>(`${this.API_BASE}/user/${userId}`);
  }

  getProfile(profileId: number): Observable<Profile> {
    return this.http.get<Profile>(`${this.API_BASE}/${profileId}`);
  }

  getPublicProfiles(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${this.API_BASE}/public`);
  }

  updateMyProfile(updates: UpdateProfileRequest): Observable<Profile> {
    return this.http.patch<Profile>(`${this.API_BASE}/me`, updates);
  }

  updateProfile(userId: number, updates: UpdateProfileRequest): Observable<Profile> {
    return this.http.patch<Profile>(`${this.API_BASE}/${userId}`, updates);
  }

  uploadAvatar(file: File): Observable<Profile> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<Profile>(`${this.API_BASE}/me/avatar`, formData);
  }

  updateSocialLinks(socialLinks: any): Observable<Profile> {
    return this.http.patch<Profile>(`${this.API_BASE}/me/social-links`, socialLinks);
  }

  updateCustomFields(customFields: Record<string, any>): Observable<Profile> {
    return this.http.patch<Profile>(`${this.API_BASE}/me/custom-fields`, { customFields });
  }

  toggleVisibility(): Observable<Profile> {
    return this.http.post<Profile>(`${this.API_BASE}/me/toggle-visibility`, {});
  }
}