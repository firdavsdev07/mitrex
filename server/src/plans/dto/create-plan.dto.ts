import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'Starter' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'starter' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 9.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  maxWebsites: number;

  @ApiProperty({ example: 8 })
  @IsNumber()
  maxPlatforms: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  maxMonthlyViews: number;

  @ApiProperty({ example: 365, description: 'Number of days. -1 = infinite' })
  @IsNumber()
  dataRetentionDays: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasAiInsights?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasWeeklyReport?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hasCustomAlerts?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
