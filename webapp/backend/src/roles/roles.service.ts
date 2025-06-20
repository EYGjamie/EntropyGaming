import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const role = this.rolesRepository.create(createRoleDto);
    return this.rolesRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find({
      order: { priority: 'DESC', name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.rolesRepository.findOne({ 
      where: { id },
      relations: ['users'] 
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async findByName(name: string): Promise<Role> {
    return this.rolesRepository.findOne({ where: { name } });
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    await this.rolesRepository.update(id, updateRoleDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const role = await this.findOne(id);
    await this.rolesRepository.remove(role);
  }

  async getActiveRoles(): Promise<Role[]> {
    return this.rolesRepository.find({
      where: { isActive: true },
      order: { priority: 'DESC', name: 'ASC' },
    });
  }
}