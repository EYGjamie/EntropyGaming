import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.routes)
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.routes)
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/profile/profile.routes').then(m => m.routes)
  },
  {
    path: 'users',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/users/users.routes').then(m => m.routes)
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, AdminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.routes)
  },
  {
    path: 'tools',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/tools/tools.routes').then(m => m.routes)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];