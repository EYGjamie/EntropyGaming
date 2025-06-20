import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  UseGuards,
  Request,
  ParseIntPipe 
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard, RequirePermissions, PermissionsGuard } from '../auth/guards';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('comments.create')
  create(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    return this.commentsService.create(createCommentDto, req.user.id);
  }

  @Get()
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('includePrivate') includePrivate?: boolean,
    @Request() req?,
  ) {
    // Only allow including private comments if user has moderation permissions
    const canViewPrivate = req.user.permissions.includes('comments.moderate');
    const shouldIncludePrivate = includePrivate && canViewPrivate;
    
    return this.commentsService.findAll(entityType, entityId, shouldIncludePrivate);
  }

  @Get('entity/:entityType/:entityId')
  findForEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('includePrivate') includePrivate?: boolean,
    @Request() req?,
  ) {
    const canViewPrivate = req.user.permissions.includes('comments.moderate');
    const shouldIncludePrivate = includePrivate && canViewPrivate;
    
    return this.commentsService.findForEntity(entityType, entityId, shouldIncludePrivate);
  }

  @Get('stats')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('comments.moderate')
  getStats() {
    return this.commentsService.getCommentStats();
  }

  @Get('by-entity-type')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('comments.moderate')
  getByEntityType() {
    return this.commentsService.getCommentsByEntityType();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('comments.edit')
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req,
  ) {
    return this.commentsService.update(id, updateCommentDto, req.user.id, req.user.permissions);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('comments.delete')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    await this.commentsService.remove(id, req.user.id, req.user.permissions);
    return { message: 'Comment deleted successfully' };
  }
}