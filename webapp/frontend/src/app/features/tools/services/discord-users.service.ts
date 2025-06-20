import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DiscordUsersService {
  private readonly API_BASE = '/api/tools';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/discord-users`);
  }

  getActiveUsers(limit: number = 20): Observable<any[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<any[]>(`${this.API_BASE}/discord-users/active`, { params });
  }

  getMostActiveUsers(limit: number = 20): Observable<any[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<any[]>(`${this.API_BASE}/discord-users/most-active`, { params });
  }

  getUser(userId: string): Observable<any> {
    return this.http.get(`${this.API_BASE}/discord-users/${userId}`);
  }

  searchUsers(searchTerm: string): Observable<any[]> {
    const params = new HttpParams().set('search', searchTerm);
    return this.http.get<any[]>(`${this.API_BASE}/discord-users`, { params });
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.API_BASE}/discord-users/stats`);
  }

  getUserComments(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/discord-users/${userId}/comments`);
  }
}