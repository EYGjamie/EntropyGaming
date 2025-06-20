import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Request,
  ParseIntPipe 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto, AssignPermissionDto, RemovePermissionDto } from './dto/update-user.dto';
import { JwtAuthGuard, RequirePermissions, PermissionsGuard, RequireRoles, RolesGuard } from '../auth/guards';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.view')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  async getMyProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  async updateMyProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    // Users can only update their own basic info
    const allowedFields = { username: updateUserDto.username, email: updateUserDto.email };
    return this.usersService.update(req.user.id, allowedFields);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.edit')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @RequireRoles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Post(':id/toggle-status')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.manage')
  toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.toggleUserStatus(id);
  }

  @Post(':id/permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('permissions.assign')
  async assignPermission(
    @Param('id', ParseIntPipe) userId: number,
    @Body() assignPermissionDto: AssignPermissionDto,
    @Request() req,
  ) {
    await this.usersService.assignPermission(
      userId,
      assignPermissionDto.permissionId,
      req.user.id,
    );
    return { message: 'Permission assigned successfully' };
  }

  @Delete(':id/permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('permissions.assign')
  async removePermission(
    @Param('id', ParseIntPipe) userId: number,
    @Body() removePermissionDto: RemovePermissionDto,
  ) {
    await this.usersService.removePermission(userId, removePermissionDto.permissionId);
    return { message: 'Permission removed successfully' };
  }

  @Get(':id/permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.view')
  getUserPermissions(@Param('id', ParseIntPipe) userId: number) {
    return this.usersService.getUserPermissions(userId);
  }
}