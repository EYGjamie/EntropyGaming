import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly API_BASE = '/api';

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.API_BASE}/tools/overview`);
  }

  getAvailableTools(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/tools`);
  }

  getDiscordDashboard(): Observable<any> {
    return this.http.get(`${this.API_BASE}/discord/dashboard`);
  }
}