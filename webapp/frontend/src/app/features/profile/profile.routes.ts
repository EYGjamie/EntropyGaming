import { Routes } from '@angular/router';

export const profileRoutes: Routes = [
  {
    path: '',
    redirectTo: 'view',
    pathMatch: 'full'
  },
  {
    path: 'view',
    loadComponent: () => import('./view/profile-view.component').then(m => m.ProfileViewComponent)
  },
  {
    path: 'edit',
    loadComponent: () => import('./edit/profile-edit.component').then(m => m.ProfileEditComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/profile-settings.component').then(m => m.ProfileSettingsComponent)
  },
  {
    path: ':userId',
    loadComponent: () => import('./view/profile-view.component').then(m => m.ProfileViewComponent)
  }
];