import { 
  Controller, 
  Get, 
  Query, 
  UseGuards,
  ParseIntPipe 
} from '@nestjs/common';
import { DiscordService } from './discord.service';
import { JwtAuthGuard, RequirePermissions, PermissionsGuard } from '../auth/guards';

@Controller('discord')
@UseGuards(JwtAuthGuard)
export class DiscordController {
  constructor(private readonly discordService: DiscordService) {}

  @Get('dashboard')
  getDashboardData() {
    return this.discordService.getDashboardData();
  }

  @Get('guild')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.discord_users')
  getGuildInfo() {
    return this.discordService.getGuildInfo();
  }

  @Get('statistics')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.discord_users')
  getServerStatistics() {
    return this.discordService.getServerStatistics();
  }

  @Get('activity/recent')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.discord_users')
  getRecentActivity() {
    return this.discordService.getRecentActivity();
  }

  @Get('activity/top-users')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.discord_users')
  getTopActiveUsers(@Query('limit') limit?: number) {
    return this.discordService.getTopActiveUsers(limit || 10);
  }

  @Get('growth')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.discord_users')
  getMemberGrowth() {
    return this.discordService.getMemberGrowth();
  }

  @Get('search')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tools.discord_users')
  searchMembers(@Query('q') searchTerm: string) {
    return this.discordService.searchMembers(searchTerm);
  }
}