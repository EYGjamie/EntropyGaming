import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  role: {
    id: number;
    name: string;
    displayName: string;
    color?: string;
  };
  permissions: Permission[];
  profile?: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface Permission {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  category?: string;
}

export interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  color?: string;
  permissions: Permission[];
  userCount?: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  roleId: number;
  isActive: boolean;
  profile?: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  };
  permissionIds?: number[];
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  roleId?: number;
  isActive?: boolean;
  profile?: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  };
  permissionIds?: number[];
}

export interface UserFilters {
  search?: string;
  roleId?: number;
  status?: 'active' | 'inactive' | 'all';
  permission?: string;
  createdAfter?: string;
  createdBefore?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = '/api/users';
  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of users
   */
  getUsers(page: number = 1, limit: number = 50, filters?: UserFilters): Observable<PaginatedUsers> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedUsers>(this.apiUrl, { params })
      .pipe(
        tap(response => this.usersSubject.next(response.users))
      );
  }

  /**
   * Get a specific user by ID
   */
  getUser(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`);
  }

  /**
   * Create a new user
   */
  createUser(userData: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.apiUrl, userData)
      .pipe(
        tap(newUser => {
          const currentUsers = this.usersSubject.value;
          this.usersSubject.next([...currentUsers, newUser]);
        })
      );
  }

  /**
   * Update an existing user
   */
  updateUser(userId: string, userData: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${userId}`, userData)
      .pipe(
        tap(updatedUser => {
          const currentUsers = this.usersSubject.value;
          const index = currentUsers.findIndex(u => u.id.toString() === userId);
          if (index !== -1) {
            currentUsers[index] = updatedUser;
            this.usersSubject.next([...currentUsers]);
          }
        })
      );
  }

  /**
   * Delete a user
   */
  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`)
      .pipe(
        tap(() => {
          const currentUsers = this.usersSubject.value;
          const filteredUsers = currentUsers.filter(u => u.id.toString() !== userId);
          this.usersSubject.next(filteredUsers);
        })
      );
  }

  /**
   * Update user status (active/inactive)
   */
  updateUserStatus(userId: string, status: 'active' | 'inactive'): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}/status`, { 
      isActive: status === 'active' 
    })
      .pipe(
        tap(updatedUser => {
          const currentUsers = this.usersSubject.value;
          const index = currentUsers.findIndex(u => u.id.toString() === userId);
          if (index !== -1) {
            currentUsers[index] = updatedUser;
            this.usersSubject.next([...currentUsers]);
          }
        })
      );
  }

  /**
   * Update user role
   */
  updateUserRole(userId: string, roleId: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}/role`, { roleId })
      .pipe(
        tap(updatedUser => {
          const currentUsers = this.usersSubject.value;
          const index = currentUsers.findIndex(u => u.id.toString() === userId);
          if (index !== -1) {
            currentUsers[index] = updatedUser;
            this.usersSubject.next([...currentUsers]);
          }
        })
      );
  }

  /**
   * Update user permissions
   */
  updateUserPermissions(userId: string, permissionIds: number[]): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}/permissions`, { permissionIds })
      .pipe(
        tap(updatedUser => {
          const currentUsers = this.usersSubject.value;
          const index = currentUsers.findIndex(u => u.id.toString() === userId);
          if (index !== -1) {
            currentUsers[index] = updatedUser;
            this.usersSubject.next([...currentUsers]);
          }
        })
      );
  }

  /**
   * Search users
   */
  searchUsers(query: string, limit: number = 20): Observable<User[]> {
    const params = new HttpParams()
      .set('search', query)
      .set('limit', limit.toString());

    return this.http.get<User[]>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Get available roles
   */
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>('/api/roles');
  }

  /**
   * Get available permissions
   */
  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>('/api/permissions');
  }

  /**
   * Export users as CSV
   */
  exportUsers(filters?: UserFilters): Observable<Blob> {
    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get(`${this.apiUrl}/export`, { 
      params, 
      responseType: 'blob' 
    });
  }

  /**
   * Get user statistics
   */
  getUserStats(): Observable<{
    total: number;
    active: number;
    inactive: number;
    newThisWeek: number;
    newThisMonth: number;
    byRole: { role: string; count: number }[];
  }> {
    return this.http.get<{
      total: number;
      active: number;
      inactive: number;
      newThisWeek: number;
      newThisMonth: number;
      byRole: { role: string; count: number }[];
    }>(`${this.apiUrl}/stats`);
  }

  /**
   * Get user activity log
   */
  getUserActivity(userId: string, page: number = 1, limit: number = 50): Observable<{
    activities: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<{
      activities: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`${this.apiUrl}/${userId}/activity`, { params });
  }

  /**
   * Reset user password (admin only)
   */
  resetUserPassword(userId: string): Observable<{ temporaryPassword: string }> {
    return this.http.post<{ temporaryPassword: string }>(`${this.apiUrl}/${userId}/reset-password`, {});
  }

  /**
   * Impersonate user (admin only)
   */
  impersonateUser(userId: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/${userId}/impersonate`, {});
  }

  /**
   * Clear the local users cache
   */
  clearUsers(): void {
    this.usersSubject.next([]);
  }

  /**
   * Format user display name
   */
  formatUserDisplayName(user: User): string {
    return user.profile?.displayName || user.username;
  }

  /**
   * Get user status color
   */
  getUserStatusColor(user: User): string {
    return user.isActive ? 'text-green-600' : 'text-red-600';
  }

  /**
   * Get user status badge color
   */
  getUserStatusBadgeColor(user: User): string {
    return user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  /**
   * Check if user has specific permission
   */
  userHasPermission(user: User, permission: string): boolean {
    return user.permissions.some(p => p.name === permission) ||
           user.role.permissions?.some(p => p.name === permission);
  }

  /**
   * Get user role color
   */
  getUserRoleColor(user: User): string {
    return user.role.color || '#6366f1';
  }
}