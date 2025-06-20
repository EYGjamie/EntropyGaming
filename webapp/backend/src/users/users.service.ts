import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Profile } from '../profile/entities/profile.entity';
import { UserPermission } from '../permissions/entities/user-permission.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(UserPermission)
    private userPermissionRepository: Repository<UserPermission>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Create user
    const user = this.usersRepository.create(createUserDto);
    const savedUser = await this.usersRepository.save(user);

    // Create default profile
    const profile = this.profileRepository.create({
      userId: savedUser.id,
      displayName: savedUser.username,
      isPublic: true,
    });
    await this.profileRepository.save(profile);

    return this.findOne(savedUser.id);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['role', 'userPermissions', 'profile'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role', 'userPermissions', 'profile'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role', 'userPermissions', 'profile'],
    });
  }

  async findByUsername(username: string): Promise<User> {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['role', 'userPermissions', 'profile'],
    });
  }

  async findByDiscordId(discordUserId: string): Promise<User> {
    return this.usersRepository.findOne({
      where: { discordUserId },
      relations: ['role', 'userPermissions', 'profile'],
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check if email is being changed and is unique
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Check if username is being changed and is unique
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.findByUsername(updateUserDto.username);
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Username already in use');
      }
    }

    await this.usersRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await this.usersRepository.update(id, { passwordHash });
  }

  async toggleUserStatus(id: number): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = !user.isActive;
    await this.usersRepository.save(user);
    return user;
  }

  async assignPermission(userId: number, permissionId: number, grantedBy: number): Promise<void> {
    // Check if permission already exists
    const existing = await this.userPermissionRepository.findOne({
      where: { userId, permissionId },
    });

    if (existing) {
      throw new BadRequestException('User already has this permission');
    }

    const userPermission = this.userPermissionRepository.create({
      userId,
      permissionId,
      grantedBy,
    });

    await this.userPermissionRepository.save(userPermission);
  }

  async removePermission(userId: number, permissionId: number): Promise<void> {
    await this.userPermissionRepository.delete({ userId, permissionId });
  }

  async getUserPermissions(userId: number): Promise<UserPermission[]> {
    return this.userPermissionRepository.find({
      where: { userId },
      relations: ['permission'],
    });
  }
}