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