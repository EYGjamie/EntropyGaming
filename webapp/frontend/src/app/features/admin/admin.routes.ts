import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/auth.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
  },
  {
    path: 'users',
    loadComponent: () => import('./users/admin-users.component').then(m => m.AdminUsersComponent)
  },
  {
    path: 'users/:userId',
    loadComponent: () => import('./users/admin-user-detail.component').then(m => m.AdminUserDetailComponent)
  },
  {
    path: 'roles',
    loadComponent: () => import('./roles/admin-roles.component').then(m => m.AdminRolesComponent)
  },
  {
    path: 'permissions',
    loadComponent: () => import('./permissions/admin-permissions.component').then(m => m.AdminPermissionsComponent)
  }
];