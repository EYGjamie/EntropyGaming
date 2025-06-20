import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface DiscordUser {
  id: string;
  discordId: string;
  username: string;
  discriminator: string;
  nickname?: string;
  avatarUrl?: string;
  joinedAt: string;
  lastSeen?: string;
  isOnline: boolean;
  messageCount: number;
  voiceMinutes: number;
  roles: DiscordRole[];
  comments?: number;
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  updatedAt: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface DiscordUserStats {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  totalMessages: number;
  totalVoiceMinutes: number;
  avgMessagesPerUser: number;
  avgVoiceMinutesPerUser: number;
}

export interface DiscordUserFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'banned' | 'all';
  isOnline?: boolean;
  roleId?: string;
  minMessages?: number;
  maxMessages?: number;
  minVoiceMinutes?: number;
  maxVoiceMinutes?: number;
  joinedAfter?: string;
  joinedBefore?: string;
}

export interface PaginatedDiscordUsers {
  users: DiscordUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class DiscordUsersService {
  private readonly apiUrl = '/api/tools/discord-users';
  private usersSubject = new BehaviorSubject<DiscordUser[]>([]);
  public users$ = this.usersSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of Discord users
   */
  getUsers(page: number = 1, limit: number = 50, filters?: DiscordUserFilters): Observable<PaginatedDiscordUsers> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedDiscordUsers>(this.apiUrl, { params })
      .pipe(
        tap(response => this.usersSubject.next(response.users))
      );
  }

  /**
   * Get a specific Discord user by ID
   */
  getUser(userId: string): Observable<DiscordUser> {
    return this.http.get<DiscordUser>(`${this.apiUrl}/${userId}`);
  }

  /**
   * Search Discord users
   */
  searchUsers(query: string, limit: number = 20): Observable<DiscordUser[]> {
    const params = new HttpParams()
      .set('search', query)
      .set('limit', limit.toString());

    return this.http.get<DiscordUser[]>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Get Discord user statistics
   */
  getStats(): Observable<DiscordUserStats> {
    return this.http.get<DiscordUserStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Update user status (admin only)
   */
  updateUserStatus(userId: string, status: 'active' | 'inactive' | 'banned'): Observable<DiscordUser> {
    return this.http.patch<DiscordUser>(`${this.apiUrl}/${userId}/status`, { status });
  }

  /**
   * Sync user data from Discord (admin only)
   */
  syncUser(userId: string): Observable<DiscordUser> {
    return this.http.post<DiscordUser>(`${this.apiUrl}/${userId}/sync`, {});
  }

  /**
   * Sync all users from Discord (admin only)
   */
  syncAllUsers(): Observable<{ message: string; syncedCount: number }> {
    return this.http.post<{ message: string; syncedCount: number }>(`${this.apiUrl}/sync-all`, {});
  }

  /**
   * Get available Discord roles
   */
  getRoles(): Observable<DiscordRole[]> {
    return this.http.get<DiscordRole[]>(`${this.apiUrl}/roles`);
  }

  /**
   * Export users data as CSV
   */
  exportUsers(filters?: DiscordUserFilters): Observable<Blob> {
    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get(`${this.apiUrl}/export`, { 
      params, 
      responseType: 'blob' 
    });
  }

  /**
   * Get user activity timeline
   */
  getUserActivity(userId: string, days: number = 30): Observable<any[]> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<any[]>(`${this.apiUrl}/${userId}/activity`, { params });
  }

  /**
   * Clear the local users cache
   */
  clearUsers(): void {
    this.usersSubject.next([]);
  }

  /**
   * Format user display name
   */
  formatUserDisplayName(user: DiscordUser): string {
    if (user.nickname) {
      return user.nickname;
    }
    return user.discriminator && user.discriminator !== '0' 
      ? `${user.username}#${user.discriminator}`
      : user.username;
  }

  /**
   * Get user status color
   */
  getUserStatusColor(user: DiscordUser): string {
    switch (user.status) {
      case 'active':
        return 'text-green-600';
      case 'inactive':
        return 'text-yellow-600';
      case 'banned':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Get user status badge color
   */
  getUserStatusBadgeColor(user: DiscordUser): string {
    switch (user.status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'banned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}