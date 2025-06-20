import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AdminService {
  constructor(
    private usersService: UsersService,
    private rolesService: RolesService,
    private permissionsService: PermissionsService,
    private authService: AuthService,
  ) {}

  async createUser(createUserDto: CreateUserDto, createdBy: number) {
    return this.authService.register(createUserDto, createdBy);
  }

  async getAllUsers() {
    return this.usersService.findAll();
  }

  async getAllRoles() {
    return this.rolesService.findAll();
  }

  async getAllPermissions() {
    return this.permissionsService.findAll();
  }

  async getUserWithDetails(userId: number) {
    const user = await this.usersService.findOne(userId);
    const permissions = await this.usersService.getUserPermissions(userId);
    
    return {
      ...user,
      permissions: permissions.map(up => up.permission),
    };
  }

  async getSystemStats() {
    const users = await this.usersService.findAll();
    const roles = await this.rolesService.findAll();
    const permissions = await this.permissionsService.findAll();

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      inactiveUsers: users.filter(u => !u.isActive).length,
      totalRoles: roles.length,
      totalPermissions: permissions.length,
      usersByRole: roles.map(role => ({
        role: role.name,
        count: users.filter(u => u.role?.id === role.id).length,
      })),
    };
  }
}