import { Injectable } from '@nestjs/common';
import { DiscordUsersService } from './discord-users.service';
import { TicketTranscriptsService } from './ticket-transcripts.service';

@Injectable()
export class ToolsService {
  constructor(
    private discordUsersService: DiscordUsersService,
    private ticketTranscriptsService: TicketTranscriptsService,
  ) {}

  async getToolsOverview() {
    // Sammle Statistiken von allen Tools
    const [discordStats, transcriptStats] = await Promise.all([
      this.discordUsersService.getDiscordUserStats(),
      this.ticketTranscriptsService.getTranscriptStats(),
    ]);

    return {
      discordUsers: {
        totalUsers: discordStats.totalUsers,
        activeUsers: discordStats.activeUsers,
        totalMessages: discordStats.totalMessages,
        totalVoiceMinutes: discordStats.totalVoiceMinutes,
      },
      ticketTranscripts: {
        totalTranscripts: transcriptStats.totalTranscripts,
        totalMessages: transcriptStats.totalMessages,
        avgMessages: transcriptStats.avgMessages,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  async getAvailableTools() {
    return [
      {
        id: 'discord-users',
        name: 'Discord Users',
        description: 'View and manage Discord server members with comments',
        icon: 'users',
        category: 'discord',
        permissions: ['tools.discord_users'],
        route: '/tools/discord-users',
      },
      {
        id: 'ticket-transcripts',
        name: 'Ticket Transcripts',
        description: 'Browse and search through ticket conversation transcripts',
        icon: 'message-square',
        category: 'support',
        permissions: ['tools.ticket_transcripts'],
        route: '/tools/ticket-transcripts',
      },
      // Weitere Tools können hier hinzugefügt werden
    ];
  }

  async getToolPermissions() {
    return {
      'tools.discord_users': 'Access Discord Users tool',
      'tools.ticket_transcripts': 'Access Ticket Transcripts tool',
      'tools.comments': 'Manage comments in tools',
    };
  }
}