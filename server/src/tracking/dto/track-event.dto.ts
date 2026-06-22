import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class TrackEventDto {
  @IsString()
  siteKey: string;

  @IsString()
  path: string;

  @IsString()
  sessionId: string;          // localStorage da saqlanadigan UUID

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  @IsString()
  browser?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;          // sahifada qancha soniya (exit eventda yuboriladi)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  scrollDepth?: number;       // 0-100%

  @IsOptional()
  @IsBoolean()
  isExit?: boolean;           // exit event (beforeunload)

  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsString()
  utmMedium?: string;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  utmTerm?: string;

  @IsOptional()
  @IsString()
  utmContent?: string;
}
