import { IsString, IsNotEmpty, IsOptional, IsBoolean, Length } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}