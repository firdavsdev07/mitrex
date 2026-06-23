import { IsString, IsOptional, IsUrl, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebsiteDto {
  @ApiProperty({ example: 'My Blog' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'https://myblog.com' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  domain?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}
