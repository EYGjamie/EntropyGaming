import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  permission: string;
  available: boolean;
}

@Component({
  selector: 'app-tools-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Tools Übersicht</h1>
          <p class="text-gray-600">Zugriff auf verschiedene Discord-Management-Tools basierend auf Ihren Berechtigungen.</p>
        </div>
      </div>

      <!-- Available Tools -->
      <div *ngIf="availableTools.length > 0">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Verfügbare Tools</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            *ngFor="let tool of availableTools"
            class="bg-white shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
            [routerLink]="tool.route"
          >
            <div class="p-6">
              <div class="flex items-center mb-4">
                <div class="text-3xl mr-4">{{ tool.icon }}</div>
                <div>
                  <h3 class="text-lg font-medium text-gray-900">{{ tool.name }}</h3>
                  <span class="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Verfügbar
                  </span>
                </div>
              </div>
              <p class="text-gray-600 text-sm">{{ tool.description }}</p>
              <div class="mt-4">
                <span class="text-xs text-gray-500">Berechtigung: {{ tool.permission }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Unavailable Tools -->
      <div *ngIf="unavailableTools.length > 0">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Nicht verfügbare Tools</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            *ngFor="let tool of unavailableTools"
            class="bg-white shadow rounded-lg opacity-60"
          >
            <div class="p-6">
              <div class="flex items-center mb-4">
                <div class="text-3xl mr-4 grayscale">{{ tool.icon }}</div>
                <div>
                  <h3 class="text-lg font-medium text-gray-900">{{ tool.name }}</h3>
                  <span class="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                    Nicht verfügbar
                  </span>
                </div>
              </div>
              <p class="text-gray-600 text-sm">{{ tool.description }}</p>
              <div class="mt-4">
                <span class="text-xs text-gray-500">Benötigte Berechtigung: {{ tool.permission }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Tools Available -->
      <div *ngIf="availableTools.length === 0 && unavailableTools.length === 0" class="bg-white shadow rounded-lg">
        <div class="px-6 py-8 text-center">
          <div class="text-6xl mb-4">🔧</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Tools verfügbar</h3>
          <p class="text-gray-600">Wenden Sie sich an einen Administrator, um Zugriff auf Tools zu erhalten.</p>
        </div>
      </div>

      <!-- Help Section -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg">
        <div class="p-6">
          <h3 class="text-lg font-medium text-blue-900 mb-2">Hilfe benötigt?</h3>
          <p class="text-blue-700 text-sm mb-4">
            Wenn Sie Zugriff auf zusätzliche Tools benötigen, wenden Sie sich an einen Administrator.
            Verfügbare Tools basieren auf Ihren aktuellen Berechtigungen.
          </p>
          <div class="text-sm text-blue-600">
            <strong>Ihre aktuelle Rolle:</strong> {{ currentUserRole }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class ToolsOverviewComponent implements OnInit {
  availableTools: Tool[] = [];
  unavailableTools: Tool[] = [];
  currentUserRole = '';

  private allTools: Tool[] = [
    {
      id: 'discord-users',
      name: 'Discord Benutzer',
      description: 'Verwalten Sie Discord-Server-Mitglieder, sehen Sie Statistiken und fügen Sie Kommentare hinzu.',
      icon: '👥',
      route: '/tools/discord-users',
      permission: 'tools.discord_users',
      available: false
    },
    {
      id: 'ticket-transcripts',
      name: 'Ticket Transkripte',
      description: 'Durchsuchen und analysieren Sie Discord-Ticket-Unterhaltungen.',
      icon: '📝',
      route: '/tools/ticket-transcripts',
      permission: 'tools.ticket_transcripts',
      available: false
    },
    {
      id: 'server-stats',
      name: 'Server Statistiken',
      description: 'Detaillierte Analysen und Statistiken über Discord-Server-Aktivitäten.',
      icon: '📊',
      route: '/tools/server-stats',
      permission: 'tools.server_stats',
      available: false
    },
    {
      id: 'moderation',
      name: 'Moderation',
      description: 'Tools für die Moderation des Discord-Servers und Benutzerverwaltung.',
      icon: '🛡️',
      route: '/tools/moderation',
      permission: 'tools.moderation',
      available: false
    },
    {
      id: 'announcements',
      name: 'Ankündigungen',
      description: 'Erstellen und verwalten Sie Ankündigungen für Discord-Kanäle.',
      icon: '📢',
      route: '/tools/announcements',
      permission: 'tools.announcements',
      available: false
    },
    {
      id: 'bot-config',
      name: 'Bot Konfiguration',
      description: 'Konfigurieren Sie Bot-Einstellungen und automatisierte Prozesse.',
      icon: '⚙️',
      route: '/tools/bot-config',
      permission: 'tools.bot_config',
      available: false
    }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserPermissions();
  }

  private loadUserPermissions(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentUserRole = currentUser.role.displayName || currentUser.role.name;
      
      // Check which tools are available based on user permissions
      this.allTools.forEach(tool => {
        tool.available = this.authService.hasPermission(tool.permission);
      });

      // Separate available and unavailable tools
      this.availableTools = this.allTools.filter(tool => tool.available);
      this.unavailableTools = this.allTools.filter(tool => !tool.available);
    }
  }
}