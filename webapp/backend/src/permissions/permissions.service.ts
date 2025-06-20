import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService implements OnModuleInit {
  constructor(
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async onModuleInit() {
    // Initialize default permissions
    await this.createDefaultPermissions();
  }

  private async createDefaultPermissions() {
    const defaultPermissions = [
      // User management
      { name: 'users.view', description: 'View users', category: 'user_management' },
      { name: 'users.edit', description: 'Edit users', category: 'user_management' },
      { name: 'users.manage', description: 'Manage user status', category: 'user_management' },
      
      // Permission management
      { name: 'permissions.assign', description: 'Assign/remove permissions', category: 'permission_management' },
      { name: 'permissions.view', description: 'View permissions', category: 'permission_management' },
      
      // Tools
      { name: 'tools.discord_users', description: 'Access Discord users tool', category: 'tools' },
      { name: 'tools.ticket_transcripts', description: 'Access ticket transcripts tool', category: 'tools' },
      { name: 'tools.comments', description: 'Manage comments', category: 'tools' },
      
      // Comments
      { name: 'comments.create', description: 'Create comments', category: 'comments' },
      { name: 'comments.edit', description: 'Edit own comments', category: 'comments' },
      { name: 'comments.delete', description: 'Delete own comments', category: 'comments' },
      { name: 'comments.moderate', description: 'Moderate all comments', category: 'comments' },
      
      // Admin
      { name: 'admin.full_access', description: 'Full admin access', category: 'admin' },
    ];

    for (const permission of defaultPermissions) {
      const existing = await this.permissionsRepository.findOne({
        where: { name: permission.name },
      });

      if (!existing) {
        await this.permissionsRepository.save(permission);
      }
    }
  }

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    const permission = this.permissionsRepository.create(createPermissionDto);
    return this.permissionsRepository.save(permission);
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionsRepository.find({
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({ where: { id } });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return permission;
  }

  async findByName(name: string): Promise<Permission> {
    return this.permissionsRepository.findOne({ where: { name } });
  }

  async findByCategory(category: string): Promise<Permission[]> {
    return this.permissionsRepository.find({ 
      where: { category, isActive: true },
      order: { name: 'ASC' }
    });
  }

  async update(id: number, updatePermissionDto: UpdatePermissionDto): Promise<Permission> {
    await this.permissionsRepository.update(id, updatePermissionDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const permission = await this.findOne(id);
    await this.permissionsRepository.remove(permission);
  }

  async getActivePermissions(): Promise<Permission[]> {
    return this.permissionsRepository.find({
      where: { isActive: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async getPermissionsByCategory(): Promise<Record<string, Permission[]>> {
    const permissions = await this.getActivePermissions();
    const grouped = permissions.reduce((acc, permission) => {
      const category = permission.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {});

    return grouped;
  }
}