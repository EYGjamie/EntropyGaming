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
    const newStatus = user.isActive ? 'inactive' : 'active';
    
    this.userService.updateUserStatus(user.id.toString(), newStatus).subscribe({
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
          this.users = this.users.filter(u => u.id !== user.id);
          this.filteredUsers = [...this.users];
          this.totalUsers--;
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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