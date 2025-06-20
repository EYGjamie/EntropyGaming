import { IsString, IsOptional, IsBoolean, IsObject, Length, IsUrl } from 'class-validator';

export class CreateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  displayName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @Length(7, 7)
  profileColor?: string = '#007bff';

  @IsOptional()
  @IsString()
  @Length(1, 50)
  location?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsObject()
  socialLinks?: object;

  @IsOptional()
  @IsObject()
  customFields?: object;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  displayName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @Length(7, 7)
  profileColor?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  location?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

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