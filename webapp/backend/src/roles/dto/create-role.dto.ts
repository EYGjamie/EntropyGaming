import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Length } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(7, 7) // Hex color code
  color?: string = '#007bff';

  @IsOptional()
  @IsNumber()
  priority?: number = 0;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}