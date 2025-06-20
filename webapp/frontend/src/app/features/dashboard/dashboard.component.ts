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
  template: `
    <div class="space-y-6">
      <!-- Welcome Section -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center">
                <img 
                  *ngIf="currentUser?.profile?.avatarUrl" 
                  [src]="currentUser.profile.avatarUrl" 
                  [alt]="currentUser.username"
                  class="h-12 w-12 rounded-full object-cover"
                />
                <span 
                  *ngIf="!currentUser?.profile?.avatarUrl" 
                  class="text-white text-lg font-medium"
                >
                  {{ currentUser?.username.charAt(0).toUpperCase() }}
                </span>
              </div>
            </div>
            <div class="ml-4">
              <h1 class="text-2xl font-bold text-gray-900">
                Willkommen, {{ currentUser?.profile?.displayName || currentUser?.username }}!
              </h1>
              <p class="text-gray-600">
                Rolle: {{ currentUser?.role.name }} • 
                Letzter Login: {{ currentUser ? 'heute' : 'unbekannt' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" *ngIf="dashboardStats">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="text-2xl">👥</div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Discord Benutzer</dt>
                  <dd class="text-lg font-medium text-gray-900">
                    {{ dashboardStats.discordUsers.activeUsers }} / {{ dashboardStats.discordUsers.totalUsers }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="text-2xl">💬</div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Nachrichten</dt>
                  <dd class="text-lg font-medium text-gray-900">
                    {{ formatNumber(dashboardStats.discordUsers.totalMessages) }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="text-2xl">📝</div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Tickets</dt>
                  <dd class="text-lg font-medium text-gray-900">
                    {{ dashboardStats.ticketTranscripts.totalTranscripts }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="text-2xl">🎤</div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Voice Stunden</dt>
                  <dd class="text-lg font-medium text-gray-900">
                    {{ Math.round(dashboardStats.discordUsers.totalVoiceMinutes / 60) }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Available Tools -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Verfügbare Tools</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div 
              *ngFor="let tool of availableTools" 
              class="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
              [routerLink]="tool.route"
            >
              <div class="flex items-center mb-2">
                <div class="text-2xl mr-3">{{ tool.icon }}</div>
                <h3 class="text-lg font-medium text-gray-900">{{ tool.name }}</h3>
              </div>
              <p class="text-gray-600 text-sm mb-3">{{ tool.description }}</p>
              
              <!-- Tool-specific stats -->
              <div *ngIf="tool.stats" class="text-xs text-gray-500">
                <span *ngIf="tool.id === 'discord-users'">
                  {{ tool.stats.totalUsers }} Benutzer
                </span>
                <span *ngIf="tool.id === 'ticket-transcripts'">
                  {{ tool.stats.totalTranscripts }} Transkripte
                </span>
              </div>
            </div>
          </div>

          <div *ngIf="availableTools.length === 0" class="text-center py-6">
            <p class="text-gray-500">Keine Tools verfügbar. Wenden Sie sich an einen Administrator.</p>
          </div>
        </div>
      </div>

      <!-- Recent Activity (placeholder for future implementation) -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Letzte Aktivitäten</h2>
          <div class="text-center py-6">
            <p class="text-gray-500">Aktivitätsfeed wird in einer zukünftigen Version implementiert.</p>
          </div>
        </div>
      </div>
    </div>
  `
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
    const icons: Record<string, string> = {
      'discord-users': '👥',
      'ticket-transcripts': '📝',
      'user-management': '👤',
      'admin-panel': '⚙️'
    };
    return icons[toolId] || '🔧';
  }

  private getToolStats(toolId: string): any {
    if (!this.dashboardStats) return null;

    switch (toolId) {
      case 'discord-users':
        return {
          totalUsers: this.dashboardStats.discordUsers.totalUsers,
          activeUsers: this.dashboardStats.discordUsers.activeUsers
        };
      case 'ticket-transcripts':
        return {
          totalTranscripts: this.dashboardStats.ticketTranscripts.totalTranscripts,
          avgMessages: this.dashboardStats.ticketTranscripts.avgMessages
        };
      default:
        return null;
    }
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // Make Math available in template
  Math = Math;
}