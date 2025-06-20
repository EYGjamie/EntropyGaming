import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async create(userId: number, createProfileDto: CreateProfileDto): Promise<Profile> {
    const profile = this.profileRepository.create({
      ...createProfileDto,
      userId,
    });
    return this.profileRepository.save(profile);
  }

  async findAll(includePrivate: boolean = false): Promise<Profile[]> {
    const queryBuilder = this.profileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.isActive = :isActive', { isActive: true });

    if (!includePrivate) {
      queryBuilder.andWhere('profile.isPublic = :isPublic', { isPublic: true });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: number): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user', 'user.role'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return profile;
  }

  async findByUserId(userId: number): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['user', 'user.role'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    return profile;
  }

  async update(userId: number, updateProfileDto: UpdateProfileDto, requesterId: number): Promise<Profile> {
    const profile = await this.findByUserId(userId);

    // Only allow users to edit their own profile
    if (profile.userId !== requesterId) {
      throw new ForbiddenException('You can only edit your own profile');
    }

    await this.profileRepository.update({ userId }, updateProfileDto);
    return this.findByUserId(userId);
  }

  async updateAvatar(userId: number, filename: string, requesterId: number): Promise<Profile> {
    const profile = await this.findByUserId(userId);

    if (profile.userId !== requesterId) {
      throw new ForbiddenException('You can only update your own avatar');
    }

    // Delete old avatar if exists
    if (profile.avatarUrl) {
      const oldAvatarPath = path.join('./uploads/avatars', path.basename(profile.avatarUrl));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    const avatarUrl = `/uploads/avatars/${filename}`;
    await this.profileRepository.update({ userId }, { avatarUrl });
    
    return this.findByUserId(userId);
  }

  async remove(userId: number): Promise<void> {
    const profile = await this.findByUserId(userId);
    
    // Delete avatar file if exists
    if (profile.avatarUrl) {
      const avatarPath = path.join('./uploads/avatars', path.basename(profile.avatarUrl));
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    await this.profileRepository.remove(profile);
  }

  async toggleVisibility(userId: number, requesterId: number): Promise<Profile> {
    const profile = await this.findByUserId(userId);

    if (profile.userId !== requesterId) {
      throw new ForbiddenException('You can only change your own profile visibility');
    }

    profile.isPublic = !profile.isPublic;
    await this.profileRepository.save(profile);
    
    return profile;
  }

  async updateCustomFields(userId: number, customFields: object, requesterId: number): Promise<Profile> {
    const profile = await this.findByUserId(userId);

    if (profile.userId !== requesterId) {
      throw new ForbiddenException('You can only update your own custom fields');
    }

    await this.profileRepository.update({ userId }, { customFields });
    return this.findByUserId(userId);
  }

  async updateSocialLinks(userId: number, socialLinks: object, requesterId: number): Promise<Profile> {
    const profile = await this.findByUserId(userId);

    if (profile.userId !== requesterId) {
      throw new ForbiddenException('You can only update your own social links');
    }

    await this.profileRepository.update({ userId }, { socialLinks });
    return this.findByUserId(userId);
  }

  async getPublicProfiles(): Promise<Profile[]> {
    return this.profileRepository.find({
      where: { isPublic: true },
      relations: ['user', 'user.role'],
      order: { updatedAt: 'DESC' },
    });
  }
}