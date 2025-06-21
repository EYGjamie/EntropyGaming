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

  // Math object für Templates verfügbar machen
  Math = Math;

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

  getRoleBadgeClass(role: any): string {
    return role.color ? `bg-${role.color}-100 text-${role.color}-800` : 'bg-gray-100 text-gray-800';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE');
  }

  formatDisplayName(user: User): string {
    return user.profile?.displayName || user.username;
  }

  getAvatarUrl(user: User): string | null {
    return user.profile?.avatarUrl || null;
  }

  getUserInitials(user: User): string {
    const name = this.formatDisplayName(user);
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  getPageNumbers(): number[] {
    const maxPages = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    const endPage = Math.min(this.totalPages, startPage + maxPages - 1);
    
    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getStartEntry(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndEntry(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalUsers);
  }

  canViewUser(user: User): boolean {
    // Basic permission check - can be enhanced based on requirements
    return true;
  }
}