import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/auth.guard';

export const usersRoutes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    canActivate: [permissionGuard('users.view')],
    loadComponent: () => import('./list/users-list.component').then(m => m.UsersListComponent)
  },
  {
    path: ':userId',
    canActivate: [permissionGuard('users.view')],
    loadComponent: () => import('./detail/user-detail.component').then(m => m.UserDetailComponent)
  }
];