import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface DiscordUser {
  userID: string;
  username: string;
  nickname?: string;
  joinedAt: string;
  lastActive: string;
  messageCount: number;
  voiceMinutes: number;
  isActive: boolean;
}

interface DiscordUsersStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalVoiceMinutes: number;
}

@Injectable({
  providedIn: 'root'
})
export class DiscordUsersService {
  private apiUrl = '/api/tools/discord-users';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<DiscordUser[]> {
    return this.http.get<DiscordUser[]>(this.apiUrl);
  }

  getUserById(userId: string): Observable<DiscordUser> {
    return this.http.get<DiscordUser>(`${this.apiUrl}/${userId}`);
  }

  getActiveUsers(): Observable<DiscordUser[]> {
    return this.http.get<DiscordUser[]>(`${this.apiUrl}/active`);
  }

  getMostActiveUsers(): Observable<DiscordUser[]> {
    return this.http.get<DiscordUser[]>(`${this.apiUrl}/most-active`);
  }

  searchUsers(searchTerm: string): Observable<DiscordUser[]> {
    return this.http.get<DiscordUser[]>(`${this.apiUrl}/search`, {
      params: { q: searchTerm }
    });
  }

  getStats(): Observable<DiscordUsersStats> {
    return this.http.get<DiscordUsersStats>(`${this.apiUrl}/stats`);
  }
}
