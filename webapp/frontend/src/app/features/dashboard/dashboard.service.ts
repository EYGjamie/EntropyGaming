import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface DashboardStats {
  discordUsers: {
    totalUsers: number;
    activeUsers: number;
    totalMessages: number;
    totalVoiceMinutes: number;
  };
  ticketTranscripts: {
    totalTranscripts: number;
    totalMessages: number;
    avgMessages: number;
  };
  lastUpdated: string;
}

interface AvailableTool {
  id: string;
  name: string;
  description: string;
  route: string;
  permissions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = '/api/dashboard';

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  getAvailableTools(): Observable<AvailableTool[]> {
    return this.http.get<AvailableTool[]>(`${this.apiUrl}/tools`);
  }
}