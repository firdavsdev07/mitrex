import { IsBoolean, IsOptional } from 'class-validator';

export class TogglePlatformDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  comingSoon?: boolean;
}
