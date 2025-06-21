import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  displayName?: string;
  nickname?: string;
  avatar?: string;
  joinedAt: string;
  roles: DiscordRole[];
  isBot: boolean;
  status: 'online' | 'offline' | 'idle' | 'dnd';
  activities: DiscordActivity[];
  messageCount: number;
  voiceTime: number;
  lastMessage?: string;
  lastSeen?: string;
  notes?: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: string;
}

export interface DiscordActivity {
  name: string;
  type: number;
  state?: string;
  details?: string;
}

export interface DiscordUserStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalVoiceMinutes: number;
  averageMessagesPerUser: number;
  mostActiveUser: {
    id: string;
    username: string;
    messageCount: number;
  };
}

export interface DiscordUserFilters {
  search?: string;
  status?: string;
  role?: string;
  hasMessages?: boolean;
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
   * Get a specific Discord user by ID (alternative method name)
   */
  getUserById(userId: string): Observable<DiscordUser> {
    return this.getUser(userId);
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
   * Update user notes
   */
  updateUserNotes(userId: string, notes: string): Observable<DiscordUser> {
    return this.http.patch<DiscordUser>(`${this.apiUrl}/${userId}/notes`, { notes });
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
   * Get user avatar URL
   */
  getAvatarUrl(user: DiscordUser, size: number = 64): string {
    if (user.avatar) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
    }
    // Default avatar based on discriminator
    const defaultAvatarNum = parseInt(user.discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNum}.png`;
  }

  /**
   * Format user display name
   */
  getDisplayName(user: DiscordUser): string {
    return user.displayName || user.nickname || user.username;
  }

  /**
   * Get user tag (username#discriminator)
   */
  getUserTag(user: DiscordUser): string {
    return `${user.username}#${user.discriminator}`;
  }

  /**
   * Format user status
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'online': return 'Online';
      case 'idle': return 'Abwesend';
      case 'dnd': return 'Nicht stören';
      case 'offline': return 'Offline';
      default: return 'Unbekannt';
    }
  }

  /**
   * Get status color class
   */
  getStatusColorClass(status: string): string {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  }

  /**
   * Format join date
   */
  formatJoinDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE');
  }

  /**
   * Format voice time
   */
  formatVoiceTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} Min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Clear users cache
   */
  clearUsers(): void {
    this.usersSubject.next([]);
  }
}