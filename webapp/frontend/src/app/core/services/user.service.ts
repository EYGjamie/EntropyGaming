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
    permissions?: Permission[]; // permissions hinzugefügt
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
   * Get available roles
   */
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/roles`);
  }

  /**
   * Get available permissions
   */
  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/permissions`);
  }

  /**
   * Activate/Deactivate user
   */
  toggleUserStatus(userId: string, isActive: boolean): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}/status`, { isActive })
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
   * Check if user has specific permission
   */
  hasPermission(user: User, permission: string): boolean {
    // Check direct permissions
    if (user.permissions?.some(p => p.name === permission)) {
      return true;
    }
    
    // Check role permissions
    return user.role?.permissions?.some(p => p.name === permission) || false;
  }

  /**
   * Check if current user has permission
   */
  checkPermission(permission: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-permission/${permission}`);
  }

  /**
   * Clear users cache
   */
  clearUsers(): void {
    this.usersSubject.next([]);
  }

  /**
   * Format user display name
   */
  formatDisplayName(user: User): string {
    return user.profile?.displayName || user.username;
  }

  /**
   * Get user avatar URL or generate initials
   */
  getAvatarUrl(user: User): string | null {
    return user.profile?.avatarUrl || null;
  }

  /**
   * Get user initials for avatar placeholder
   */
  getUserInitials(user: User): string {
    const name = this.formatDisplayName(user);
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }
}