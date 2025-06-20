import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
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

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = '/api/profile';

  constructor(private http: HttpClient) {}

  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${userId}`);
  }

  updateProfile(formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}`, formData);
  }

  updateEmail(data: { newEmail: string; password: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/email`, data);
  }

  updatePassword(data: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/password`, data);
  }

  deactivateAccount(): Observable<any> {
    return this.http.post(`${this.apiUrl}/deactivate`, {});
  }

  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.apiUrl}`);
  }
}