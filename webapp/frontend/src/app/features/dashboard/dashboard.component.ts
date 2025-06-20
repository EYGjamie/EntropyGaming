import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { DashboardService } from './dashboard.service';

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

interface ToolCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  permission: string;
  stats?: any;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  providers: [DashboardService],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  dashboardStats: DashboardStats | null = null;
  availableTools: ToolCard[] = [];
  isLoading = true;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();
    this.loadAvailableTools();
  }

  private loadDashboardData(): void {
    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        this.dashboardStats = stats;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.isLoading = false;
      }
    });
  }

  private loadAvailableTools(): void {
    this.dashboardService.getAvailableTools().subscribe({
      next: (tools) => {
        // Filter tools based on user permissions
        this.availableTools = tools.filter(tool => 
          this.authService.hasPermission(tool.permissions[0])
        ).map(tool => ({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          icon: this.getToolIcon(tool.id),
          route: tool.route,
          permission: tool.permissions[0],
          stats: this.getToolStats(tool.id)
        }));
      },
      error: (error) => {
        console.error('Error loading available tools:', error);
      }
    });
  }

  private getToolIcon(toolId: string): string {
    const iconMap: { [key: string]: string } = {
      'discord-users': '👥',
      'ticket-transcripts': '📝',
      'server-stats': '📊',
      'moderation': '🛡️',
      'admin': '⚙️'
    };
    return iconMap[toolId] || '🔧';
  }

  private getToolStats(toolId: string): any {
    if (!this.dashboardStats) return null;
    
    switch (toolId) {
      case 'discord-users':
        return this.dashboardStats.discordUsers;
      case 'ticket-transcripts':
        return this.dashboardStats.ticketTranscripts;
      default:
        return null;
    }
  }

  getUserInitial(): string {
    return this.currentUser?.username?.charAt(0)?.toUpperCase() || '?';
  }

  getUserDisplayName(): string {
    return this.currentUser?.profile?.displayName || this.currentUser?.username || 'Unbekannt';
  }

  getUserRole(): string {
    return this.currentUser?.role?.name || 'Keine Rolle';
  }

  getLastLogin(): string {
    const lastLogin = this.currentUser?.lastLogin;
    if (!lastLogin) return 'Unbekannt';
    return new Date(lastLogin).toLocaleDateString('de-DE');
  }

  hasAvatar(): boolean {
    return !!(this.currentUser?.profile?.avatarUrl);
  }

  getAvatarUrl(): string {
    return this.currentUser?.profile?.avatarUrl || '';
  }
}