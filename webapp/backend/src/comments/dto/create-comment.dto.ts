import { IsString, IsNotEmpty, IsBoolean, IsOptional, Length } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  entityType: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  entityId: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean = false;
}

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}