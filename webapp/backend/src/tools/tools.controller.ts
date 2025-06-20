import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  UseGuards,
  Request,
  ParseIntPipe 
} from '@nestjs/common';
import { ToolsService } from './tools.service';
import { DiscordUsersService } from './discord-users.service';
import { TicketTranscriptsService } from './ticket-transcripts.service';
import { CommentsService } from '../comments/comments.service';
import { JwtAuthGuard, RequirePermissions, PermissionsGuard } from '../auth/guards';

@Controller('tools')
@UseGuards(JwtAuthGuard)
export class ToolsController {
  constructor(
    private readonly toolsService: ToolsService,
    private readonly discordUsersService: DiscordUsersService,
    private readonly ticketTranscriptsService: TicketTranscriptsService,
    private readonly commentsService: CommentsService,
  ) {}

  @Get()
  getAvailableTools(@Request() req) {
    // Filter tools based on user permissions
    return this.toolsService.getAvailableTools();
  }

  @Get('overview')
  getOverview() {
    return this.toolsService.getToolsOverview();
  }

  // Discord Users Tool
  @Get('discord-users')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.discord_users')
  async getAllDiscordUsers(@Query('search') search?: string) {
    if (search) {
      return this.discordUsersService.searchDiscordUsers(search);
    }
    return this.discordUsersService.getAllDiscordUsers();
  }

  @Get('discord-users/stats')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.discord_users')
  getDiscordUserStats() {
    return this.discordUsersService.getDiscordUserStats();
  }

  @Get('discord-users/active')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.discord_users')
  getActiveDiscordUsers(@Query('limit') limit?: number) {
    return this.discordUsersService.getActiveDiscordUsers(limit || 20);
  }

  @Get('discord-users/most-active')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.discord_users')
  getMostActiveDiscordUsers(@Query('limit') limit?: number) {
    return this.discordUsersService.getMostActiveDiscordUsers(limit || 20);
  }

  @Get('discord-users/:userID')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.discord_users')
  async getDiscordUser(@Param('userID') userID: string) {
    const user = await this.discordUsersService.getDiscordUser(userID);
    const comments = await this.commentsService.findForEntity('discord_user', userID);
    
    return {
      user,
      comments,
    };
  }

  @Get('discord-users/:userID/comments')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.discord_users')
  getDiscordUserComments(@Param('userID') userID: string, @Request() req) {
    const includePrivate = req.user.permissions.includes('comments.moderate');
    return this.commentsService.findForEntity('discord_user', userID, includePrivate);
  }

  // Ticket Transcripts Tool
  @Get('ticket-transcripts')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.ticket_transcripts')
  async getAllTranscripts(
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (search) {
      return this.ticketTranscriptsService.searchTranscripts(search);
    }
    
    if (startDate && endDate) {
      return this.ticketTranscriptsService.getTranscriptsByDateRange(startDate, endDate);
    }
    
    return this.ticketTranscriptsService.getAllTranscripts();
  }

  @Get('ticket-transcripts/stats')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.ticket_transcripts')
  getTranscriptStats() {
    return this.ticketTranscriptsService.getTranscriptStats();
  }

  @Get('ticket-transcripts/:filename')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.ticket_transcripts')
  async getTranscript(@Param('filename') filename: string) {
    const transcript = await this.ticketTranscriptsService.getTranscript(filename);
    const comments = await this.commentsService.findForEntity('ticket', transcript.ticketId);
    
    return {
      transcript,
      comments,
    };
  }

  @Get('ticket-transcripts/:ticketId/comments')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.ticket_transcripts')
  getTicketComments(@Param('ticketId') ticketId: string, @Request() req) {
    const includePrivate = req.user.permissions.includes('comments.moderate');
    return this.commentsService.findForEntity('ticket', ticketId, includePrivate);
  }
}