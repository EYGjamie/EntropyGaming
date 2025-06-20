import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { ToolsController } from './tools.controller';
import { DiscordUsersService } from './discord-users.service';
import { TicketTranscriptsService } from './ticket-transcripts.service';
import { CommentsModule } from '../comments/comments.module';

@Module({
  imports: [CommentsModule],
  controllers: [ToolsController],
  providers: [ToolsService, DiscordUsersService, TicketTranscriptsService],
  exports: [ToolsService, DiscordUsersService, TicketTranscriptsService],
})
export class ToolsModule {}