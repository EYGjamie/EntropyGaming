import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';

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
  permissions: {
    id: number;
    name: string;
    displayName: string;
  }[];
  profile?: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api/auth';
  private readonly tokenKey = 'auth_token';
  private readonly refreshTokenKey = 'refresh_token';
  private readonly userKey = 'current_user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from stored data
   */
  private initializeAuth(): void {
    const token = this.getToken();
    const userData = localStorage.getItem(this.userKey);
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        
        // Verify token is still valid
        this.verifyToken().subscribe({
          next: (isValid) => {
            if (!isValid) {
              this.logout();
            }
          },
          error: () => {
            this.logout();
          }
        });
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.logout();
      }
    }
  }

  /**
   * Login user
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          this.setToken(response.token);
          this.setRefreshToken(response.refreshToken);
          this.setUser(response.user);
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  /**
   * Register new user
   */
  register(userData: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, userData);
  }

  /**
   * Logout user
   */
  logout(): void {
    const refreshToken = this.getRefreshToken();
    
    // Call logout endpoint to invalidate tokens on server
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }).subscribe({
        error: (error) => console.error('Logout error:', error)
      });
    }

    // Clear local storage
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    
    // Update state
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    // Redirect to login
    this.router.navigate(['/login']);
  }

  /**
   * Refresh authentication token
   */
  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      this.logout();
      return of();
    }

    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(
        tap(response => {
          this.setToken(response.token);
          this.setRefreshToken(response.refreshToken);
          this.setUser(response.user);
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }),
        catchError(error => {
          console.error('Token refresh failed:', error);
          this.logout();
          throw error;
        })
      );
  }

  /**
   * Verify if current token is valid
   */
  verifyToken(): Observable<boolean> {
    return this.http.get<{ valid: boolean }>(`${this.apiUrl}/verify`)
      .pipe(
        tap(response => {
          if (!response.valid) {
            this.logout();
          }
        }),
        catchError(() => {
          this.logout();
          return of({ valid: false });
        }),
        map(response => response.valid)
      );
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Refresh current user data
   */
  refreshUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`)
      .pipe(
        tap(user => {
          this.setUser(user);
          this.currentUserSubject.next(user);
        })
      );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Check user permissions
    if (user.permissions?.some(p => p.name === permission)) {
      return true;
    }

    // Check role permissions (if role has permissions)
    // This would need to be implemented based on your role structure
    return false;
  }

  /**
   * Check if user has specific role
   */
  hasRole(roleName: string): boolean {
    const user = this.getCurrentUser();
    return user?.role?.name === roleName;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roleNames: string[]): boolean {
    const user = this.getCurrentUser();
    return roleNames.includes(user?.role?.name || '');
  }

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  /**
   * Set authentication token
   */
  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Set refresh token
   */
  private setRefreshToken(refreshToken: string): void {
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  /**
   * Set current user data
   */
  private setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, {
      token,
      newPassword
    });
  }

  /**
   * Change current user's password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/change-password`, {
      currentPassword,
      newPassword
    });
  }

  /**
   * Update current user's email
   */
  updateEmail(newEmail: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/update-email`, {
      newEmail,
      password
    }).pipe(
      tap(() => {
        // Refresh user data to get updated email
        this.refreshUser().subscribe();
      })
    );
  }

  /**
   * Get user sessions
   */
  getSessions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sessions`);
  }

  /**
   * Revoke a specific session
   */
  revokeSession(sessionId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/sessions/${sessionId}`);
  }

  /**
   * Revoke all sessions except current
   */
  revokeAllOtherSessions(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/sessions`);
  }

  /**
   * Enable two-factor authentication
   */
  enable2FA(): Observable<{ qrCode: string; secret: string; backupCodes: string[] }> {
    return this.http.post<{ qrCode: string; secret: string; backupCodes: string[] }>(
      `${this.apiUrl}/2fa/enable`, 
      {}
    );
  }

  /**
   * Verify and complete 2FA setup
   */
  verify2FA(token: string): Observable<{ message: string; backupCodes: string[] }> {
    return this.http.post<{ message: string; backupCodes: string[] }>(
      `${this.apiUrl}/2fa/verify`, 
      { token }
    );
  }

  /**
   * Disable two-factor authentication
   */
  disable2FA(password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/2fa/disable`, { password });
  }

  /**
   * Check if user can perform admin actions
   */
  canAdministrate(): boolean {
    return this.hasRole('admin') || this.hasPermission('admin.access');
  }

  /**
   * Check if user can manage users
   */
  canManageUsers(): boolean {
    return this.hasRole('admin') || this.hasPermission('users.manage');
  }

  /**
   * Check if user can view users
   */
  canViewUsers(): boolean {
    return this.hasRole('admin') || this.hasPermission('users.view');
  }

  /**
   * Get user display name
   */
  getUserDisplayName(): string {
    const user = this.getCurrentUser();
    return user?.profile?.displayName || user?.username || 'Unknown User';
  }

  /**
   * Get user avatar URL
   */
  getUserAvatarUrl(): string | null {
    const user = this.getCurrentUser();
    return user?.profile?.avatarUrl || null;
  }

  /**
   * Get user initials for avatar placeholder
   */
  getUserInitials(): string {
    const displayName = this.getUserDisplayName();
    return displayName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  /**
   * Check if user has completed profile
   */
  hasCompleteProfile(): boolean {
    const user = this.getCurrentUser();
    return !!(
      user?.profile?.displayName &&
      user?.profile?.bio &&
      user?.profile?.avatarUrl
    );
  }

  /**
   * Clear all authentication data
   */
  clearAuthData(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }
}