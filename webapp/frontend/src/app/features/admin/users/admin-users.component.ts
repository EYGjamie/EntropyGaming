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
  permission: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  availableRoles: any[] = [];
  availablePermissions: any[] = [];
  isLoading = true;
  error: string | null = null;
  
  filters: UserFilters = {
    search: '',
    role: '',
    status: '',
    permission: ''
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
    this.loadPermissions();
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.error = null;

    this.userService.getUsers(this.currentPage, this.pageSize, this.getApiFilters()).subscribe({
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

  private loadPermissions(): void {
    this.userService.getPermissions().subscribe({
      next: (permissions) => {
        this.availablePermissions = permissions;
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
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
    if (this.filters.permission) {
      apiFilters.permission = this.filters.permission;
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
      status: '',
      permission: ''
    };
    this.onFilterChange();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }

  toggleUserStatus(user: User): void {
    const newStatus = !user.isActive;
    this.userService.toggleUserStatus(user.id.toString(), newStatus).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
          this.filteredUsers = [...this.users];
        }
      },
      error: (error) => {
        console.error('Error updating user status:', error);
        this.error = 'Fehler beim Aktualisieren des Benutzerstatus';
      }
    });
  }

  deleteUser(user: User): void {
    if (confirm(`Sind Sie sicher, dass Sie den Benutzer "${user.username}" löschen möchten?`)) {
      this.userService.deleteUser(user.id.toString()).subscribe({
        next: () => {
          this.loadUsers(); // Reload the list
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          this.error = 'Fehler beim Löschen des Benutzers';
        }
      });
    }
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

  hasPermission(user: User, permission: string): boolean {
    return this.userService.hasPermission(user, permission);
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
}