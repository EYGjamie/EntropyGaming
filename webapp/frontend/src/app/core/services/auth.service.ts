import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface User {
  id: number;
  username: string;
  email: string;
  role: {
    id: number;
    name: string;
    color: string;
  };
  permissions: string[];
  profile?: {
    id: number;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_BASE = '/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Load user from localStorage on service initialization
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('current_user');
    
    if (token && user) {
      this.tokenSubject.next(token);
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_BASE}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.setAuthData(response.access_token, response.user);
        })
      );
  }

  logout(): void {
    this.http.post(`${this.API_BASE}/auth/logout`, {}).subscribe();
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/auth/refresh`, {})
      .pipe(
        tap(response => {
          if (response.access_token) {
            localStorage.setItem('access_token', response.access_token);
            this.tokenSubject.next(response.access_token);
          }
        })
      );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API_BASE}/auth/change-password`, {
      currentPassword,
      newPassword
    });
  }

  private setAuthData(token: string, user: User): void {
    localStorage.setItem('access_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
    this.tokenSubject.next(token);
    this.currentUserSubject.next(user);
  }

  private clearAuthData(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return this.tokenSubject.value || localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions.includes(permission) || user?.role.name === 'admin' || false;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role.name === role || false;
  }

  updateCurrentUser(user: User): void {
    localStorage.setItem('current_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }
}