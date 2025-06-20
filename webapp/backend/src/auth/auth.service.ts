import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    const payload = { 
      email: user.email, 
      sub: user.id,
      username: user.username,
      role: user.role?.name,
      permissions: user.permissions
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        profile: user.profile
      },
    };
  }

  async register(createUserDto: CreateUserDto, createdBy: number): Promise<User> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const existingUsername = await this.usersService.findByUsername(createUserDto.username);
    if (existingUsername) {
      throw new BadRequestException('Username already taken');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(createUserDto.password, saltRounds);

    // Create user
    const userData = {
      ...createUserDto,
      passwordHash,
    };

    return this.usersService.create(userData);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    await this.usersService.updatePassword(userId, newPasswordHash);
  }

  async refreshToken(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.id,
      username: user.username,
      role: user.role?.name,
      permissions: user.permissions
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}