import { Routes } from '@angular/router';
import { authGuard, permissionGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadChildren: () => import('./features/profile/profile.routes').then(m => m.profileRoutes)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('admin')],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  {
    path: 'tools',
    canActivate: [authGuard],
    loadChildren: () => import('./features/tools/tools.routes').then(m => m.toolsRoutes)
  },
  {
    path: 'users',
    canActivate: [authGuard, permissionGuard('users.view')],
    loadChildren: () => import('./features/users/users.routes').then(m => m.usersRoutes)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];