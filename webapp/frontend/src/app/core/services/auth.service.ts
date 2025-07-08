import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  discordUserId?: string;
  roleId: number;
  role: {
    id: number;
    name: string;
    description: string;
    color: string;
    priority: number;
  };
  profile?: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    profileColor?: string;
  };
  permissions: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresIn: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = '/api/auth';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * Initialize authentication state from stored data
   */
  initializeAuth(): void {
    const token = this.getStoredToken();
    const user = this.getStoredUser();

    if (token && user) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
      
      // Verify token is still valid
      this.verifyToken().subscribe({
        next: (isValid) => {
          if (!isValid) {
            this.logout();
          }
        },
        error: () => this.logout()
      });
    }
  }

  /**
   * Login user
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => {
          this.setAuthData(response.token, response.user);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
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
    return user?.permissions?.includes(permission) || false;
  }

  /**
   * Check if user has admin role
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role?.name === 'admin' || false;
  }

  /**
   * Check if user has moderator role or higher
   */
  isModerator(): boolean {
    const user = this.getCurrentUser();
    const role = user?.role?.name;
    return role === 'admin' || role === 'moderator' || false;
  }

  /**
   * Refresh user data
   */
  refreshUser(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/me`)
      .pipe(
        tap(user => {
          this.currentUserSubject.next(user);
          this.storeUser(user);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Verify token validity
   */
  private verifyToken(): Observable<boolean> {
    return this.http.get<{ valid: boolean }>(`${this.API_URL}/verify`)
      .pipe(
        map(response => response.valid),
        catchError(() => throwError(() => new Error('Token verification failed')))
      );
  }

  /**
   * Set authentication data
   */
  private setAuthData(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Get stored token
   */
  getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get stored user
   */
  private getStoredUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Store user data
   */
  private storeUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    console.error('Auth Service Error:', error);
    
    let errorMessage = 'Ein unbekannter Fehler ist aufgetreten';
    
    if (error.status === 401) {
      errorMessage = 'Ungültige Anmeldedaten';
    } else if (error.status === 403) {
      errorMessage = 'Zugriff verweigert';
    } else if (error.status === 404) {
      errorMessage = 'Benutzer nicht gefunden';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}