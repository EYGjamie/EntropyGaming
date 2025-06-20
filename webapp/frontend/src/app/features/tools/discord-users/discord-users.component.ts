import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DiscordUsersService } from '../services/discord-users.service';

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

@Component({
  selector: 'app-discord-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  providers: [DiscordUsersService],
  templateUrl: './discord-users.component.html',
  styleUrl: './discord-users.component.css'
})
export class DiscordUsersComponent implements OnInit {
  users: DiscordUser[] = [];
  stats: DiscordUsersStats | null = null;
  searchTerm = '';
  filterBy = '';
  isLoading = true;
  searchTimeout: any;

  constructor(private discordUsersService: DiscordUsersService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadStats();
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.discordUsersService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.isLoading = false;
      }
    });
  }

  private loadActiveUsers(): void {
    this.isLoading = true;
    this.discordUsersService.getActiveUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading active users:', error);
        this.isLoading = false;
      }
    });
  }

  private loadMostActiveUsers(): void {
    this.isLoading = true;
    this.discordUsersService.getMostActiveUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading most active users:', error);
        this.isLoading = false;
      }
    });
  }

  private loadStats(): void {
    this.discordUsersService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      if (this.searchTerm.trim()) {
        this.isLoading = true;
        this.discordUsersService.searchUsers(this.searchTerm).subscribe({
          next: (users) => {
            this.users = users;
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error searching users:', error);
            this.isLoading = false;
          }
        });
      } else {
        this.loadUsers();
      }
    }, 300);
  }

  onFilterChange(filter: string): void {
    this.filterBy = filter;
    switch (filter) {
      case 'active':
        this.loadActiveUsers();
        break;
      case 'most-active':
        this.loadMostActiveUsers();
        break;
      default:
        this.loadUsers();
        break;
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE');
  }

  // Make Math available in template
  Math = Math;
}