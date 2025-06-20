import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseGuards,
  Request,
  ParseIntPipe 
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard, RequireRoles, RolesGuard } from '../auth/guards';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('users')
  async createUser(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.adminService.createUser(createUserDto, req.user.id);
  }

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users/:id')
  async getUserWithDetails(@Param('id', ParseIntPipe) userId: number) {
    return this.adminService.getUserWithDetails(userId);
  }

  @Get('roles')
  async getAllRoles() {
    return this.adminService.getAllRoles();
  }

  @Get('permissions')
  async getAllPermissions() {
    return this.adminService.getAllPermissions();
  }

  @Get('stats')
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }
}