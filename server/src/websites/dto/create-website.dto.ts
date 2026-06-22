import { IsString, IsOptional, IsUrl, IsUUID } from 'class-validator';

export class CreateWebsiteDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  domain?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}
