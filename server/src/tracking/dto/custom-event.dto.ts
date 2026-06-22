import { IsString, IsOptional, IsObject } from 'class-validator';

export class CustomEventDto {
  @IsString()
  siteKey: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}
