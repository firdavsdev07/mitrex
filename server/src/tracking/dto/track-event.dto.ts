import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackEventDto {
  @ApiProperty({ example: 'mk_abc123def456' })
  @IsString()
  siteKey: string;

  @ApiProperty({ example: '/blog/my-post' })
  @IsString()
  path: string;

  @ApiProperty({ example: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890', description: 'Browser fingerprint stored in localStorage' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ example: 'https://google.com' })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({ example: 'desktop', enum: ['desktop', 'mobile'] })
  @IsOptional()
  @IsString()
  device?: string;

  @ApiPropertyOptional({ example: 'Chrome' })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({ example: 42, description: 'Seconds spent on page (sent on exit event)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ example: 75, description: 'Max scroll depth in percent (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  scrollDepth?: number;

  @ApiPropertyOptional({ example: false, description: 'True when sent on page unload' })
  @IsOptional()
  @IsBoolean()
  isExit?: boolean;

  @ApiPropertyOptional({ example: 'google' })
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiPropertyOptional({ example: 'cpc' })
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiPropertyOptional({ example: 'summer-sale' })
  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @ApiPropertyOptional({ example: 'analytics+tool' })
  @IsOptional()
  @IsString()
  utmTerm?: string;

  @ApiPropertyOptional({ example: 'banner-top' })
  @IsOptional()
  @IsString()
  utmContent?: string;
}
