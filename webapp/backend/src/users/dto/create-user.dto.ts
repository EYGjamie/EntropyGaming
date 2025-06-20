import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsNumber()
  roleId?: number;

  @IsOptional()
  @IsString()
  discordUserId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  // For internal use only
  passwordHash?: string;
}