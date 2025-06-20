import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';

interface AdminStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    newThisWeek: number;
  };
  permissions: {
    total: number;
    assigned: number;
  };
  roles: {
    total: number;
    inUse: number;
  };
  system: {
    uptime: string;
    lastSync: string;
    errors: number;
  };
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  permission?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  stats: AdminStats | null = null;
  isLoading = true;
  error: string | null = null;

  quickActions: QuickAction[] = [
    {
      id: 'users',
      title: 'Benutzer verwalten',
      description: 'Benutzerkonten erstellen, bearbeiten und verwalten',
      icon: '👥',
      route: '/admin/users'
    },
    {
      id: 'roles',
      title: 'Rollen verwalten',
      description: 'Rollen erstellen und Berechtigungen zuweisen',
      icon: '🎭',
      route: '/admin/roles'
    },
    {
      id: 'permissions',
      title: 'Berechtigungen',
      description: 'Systemberechtigungen verwalten',
      icon: '🔐',
      route: '/admin/permissions'
    },
    {
      id: 'system',
      title: 'System-Einstellungen',
      description: 'Allgemeine Systemkonfiguration',
      icon: '⚙️',
      route: '/admin/settings'
    }
  ];

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadAdminStats();
  }

  private loadAdminStats(): void {
    this.isLoading = true;
    this.error = null;

    this.adminService.getAdminStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading admin stats:', error);
        this.error = 'Fehler beim Laden der Statistiken';
        this.isLoading = false;
      }
    });
  }

  refreshStats(): void {
    this.loadAdminStats();
  }

  getStatTrend(current: number, previous: number): { value: number; positive: boolean } {
    const change = current - previous;
    const percentage = previous > 0 ? (change / previous) * 100 : 0;
    return {
      value: Math.abs(percentage),
      positive: change >= 0
    };
  }
}