import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  permissions: {
    total: number;
    assigned: number;
    unassigned: number;
  };
  roles: {
    total: number;
    inUse: number;
    unused: number;
  };
  system: {
    uptime: string;
    lastSync: string;
    errors: number;
    warnings: number;
    version: string;
    dbSize: string;
  };
}

export interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    connections: number;
  };
  discord: {
    status: 'connected' | 'disconnected' | 'error';
    botOnline: boolean;
    lastHeartbeat: string;
  };
  storage: {
    status: 'healthy' | 'warning' | 'error';
    usedSpace: number;
    totalSpace: number;
  };
}

export interface AuditLog {
  id: number;
  userId: number;
  username: string;
  action: string;
  entity: string;
  entityId: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  type: 'manual' | 'automatic';
  status: 'completed' | 'failed' | 'in_progress';
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = '/api/admin';

  constructor(private http: HttpClient) {}

  /**
   * Get admin dashboard statistics
   */
  getAdminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Get system health status
   */
  getSystemHealth(): Observable<SystemHealth> {
    return this.http.get<SystemHealth>(`${this.apiUrl}/health`);
  }

  /**
   * Get audit logs
   */
  getAuditLogs(page: number = 1, limit: number = 50, filters?: {
    userId?: number;
    action?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<{
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });
    }

    return this.http.get<{
      logs: AuditLog[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`${this.apiUrl}/audit-logs?${params.toString()}`);
  }

  /**
   * Create manual backup
   */
  createBackup(): Observable<BackupInfo> {
    return this.http.post<BackupInfo>(`${this.apiUrl}/backup`, {});
  }

  /**
   * Get backup list
   */
  getBackups(): Observable<BackupInfo[]> {
    return this.http.get<BackupInfo[]>(`${this.apiUrl}/backups`);
  }

  /**
   * Download backup
   */
  downloadBackup(backupId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/backups/${backupId}/download`, { 
      responseType: 'blob' 
    });
  }

  /**
   * Delete backup
   */
  deleteBackup(backupId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/backups/${backupId}`);
  }

  /**
   * Sync Discord data
   */
  syncDiscordData(): Observable<{ message: string; syncedUsers: number; syncedRoles: number }> {
    return this.http.post<{ message: string; syncedUsers: number; syncedRoles: number }>(
      `${this.apiUrl}/sync/discord`, 
      {}
    );
  }

  /**
   * Clear cache
   */
  clearCache(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/cache/clear`, {});
  }

  /**
   * Get system configuration
   */
  getSystemConfig(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/config`);
  }

  /**
   * Update system configuration
   */
  updateSystemConfig(config: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/config`, config);
  }

  /**
   * Get error logs
   */
  getErrorLogs(page: number = 1, limit: number = 50): Observable<{
    logs: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    return this.http.get<{
      logs: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`${this.apiUrl}/logs/errors?${params.toString()}`);
  }

  /**
   * Clear error logs
   */
  clearErrorLogs(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/logs/errors`);
  }

  /**
   * Get system info
   */
  getSystemInfo(): Observable<{
    version: string;
    nodeVersion: string;
    platform: string;
    architecture: string;
    memory: {
      used: number;
      total: number;
    };
    uptime: number;
  }> {
    return this.http.get<{
      version: string;
      nodeVersion: string;
      platform: string;
      architecture: string;
      memory: {
        used: number;
        total: number;
      };
      uptime: number;
    }>(`${this.apiUrl}/system-info`);
  }

  /**
   * Send test notification
   */
  sendTestNotification(type: 'email' | 'discord', recipient?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/test-notification`, {
      type,
      recipient
    });
  }

  /**
   * Validate system configuration
   */
  validateConfig(): Observable<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return this.http.get<{
      valid: boolean;
      errors: string[];
      warnings: string[];
    }>(`${this.apiUrl}/validate-config`);
  }
}