import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateWebsiteDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  domain?: string;
}
