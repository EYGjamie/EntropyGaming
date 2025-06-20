import { PartialType } from '@nestjs/mapped-types';
import { CreateProfileDto } from './create-profile.dto';
import { IsOptional, IsString, IsBoolean, IsObject, Length, IsUrl } from 'class-validator';

export class UpdateProfileDto extends PartialType(CreateProfileDto) {}

export class UpdateSocialLinksDto {
  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  github?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  discord?: string;

  @IsOptional()
  @IsString()
  website?: string;
}

export class UpdateCustomFieldsDto {
  @IsObject()
  customFields: Record<string, any>;
}