import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService, User } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';

interface UserFilters {
  search: string;
  role: string;
  status: string;
}

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.css'
})
export class UsersListComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  availableRoles: any[] = [];
  isLoading = true;
  error: string | null = null;
  
  filters: UserFilters = {
    search: '',
    role: '',
    status: ''
  };

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalUsers = 0;
  totalPages = 0;

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.error = null;

    const apiFilters = this.getApiFilters();
    this.userService.getUsers(this.currentPage, this.pageSize, apiFilters).subscribe({
      next: (response) => {
        this.users = response.users;
        this.filteredUsers = response.users;
        this.totalUsers = response.total;
        this.totalPages = response.totalPages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.error = 'Fehler beim Laden der Benutzer';
        this.isLoading = false;
      }
    });
  }

  private loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (roles) => {
        this.availableRoles = roles;
      },
      error: (error) => {
        console.error('Error loading roles:', error);
      }
    });
  }

  private getApiFilters(): any {
    const apiFilters: any = {};
    
    if (this.filters.search) {
      apiFilters.search = this.filters.search;
    }
    if (this.filters.role) {
      apiFilters.roleId = this.filters.role;
    }
    if (this.filters.status) {
      apiFilters.status = this.filters.status;
    }

    return apiFilters;
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      role: '',
      status: ''
    };
    this.onFilterChange();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }

  getUserStatusBadgeClass(user: User): string {
    return user.isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  }

  getUserStatusText(user: User): string {
    return user.isActive ? 'Aktiv' : 'Inaktiv';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getUserDisplayName(user: User): string {
    return user.profile?.displayName || user.username;
  }

  getUserInitials(user: User): string {
    const name = this.getUserDisplayName(user);
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  canViewUserProfile(user: User): boolean {
    // All users can view public profiles
    return true;
  }

  getRoleColor(user: User): string {
    return user.role.color || '#6366f1';
  }

  exportUsers(): void {
    this.userService.exportUsers(this.getApiFilters()).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting users:', error);
        this.error = 'Fehler beim Exportieren der Benutzerdaten';
      }
    });
  }
}