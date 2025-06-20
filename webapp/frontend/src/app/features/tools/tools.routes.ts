import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/auth.guard';

export const toolsRoutes: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full'
  },
  {
    path: 'overview',
    loadComponent: () => import('./overview/tools-overview.component').then(m => m.ToolsOverviewComponent)
  },
  {
    path: 'discord-users',
    canActivate: [permissionGuard('tools.discord_users')],
    loadComponent: () => import('./discord-users/discord-users.component').then(m => m.DiscordUsersComponent)
  },
  {
    path: 'discord-users/:userId',
    canActivate: [permissionGuard('tools.discord_users')],
    loadComponent: () => import('./discord-users/discord-user-detail/discord-user-detail.component').then(m => m.DiscordUserDetailComponent)
  },
  {
    path: 'ticket-transcripts',
    canActivate: [permissionGuard('tools.ticket_transcripts')],
    loadComponent: () => import('./ticket-transcripts/ticket-transcripts.component').then(m => m.TicketTranscriptsComponent)
  },
  {
    path: 'ticket-transcripts/:filename',
    canActivate: [permissionGuard('tools.ticket_transcripts')],
    loadComponent: () => import('./ticket-transcripts/transcript-detail/transcript-detail.component').then(m => m.TranscriptDetailComponent)
  }
];