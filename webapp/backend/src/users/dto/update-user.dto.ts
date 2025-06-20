import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsBoolean, IsNumber, IsString, IsEmail, Length } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  @Length(3, 30)
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  roleId?: number;
}

export class AssignPermissionDto {
  @IsNumber()
  permissionId: number;
}

export class RemovePermissionDto {
  @IsNumber()
  permissionId: number;
}