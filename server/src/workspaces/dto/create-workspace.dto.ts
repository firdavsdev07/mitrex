import { IsString, IsOptional, MinLength, Matches } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers and hyphens' })
  slug?: string;
}
