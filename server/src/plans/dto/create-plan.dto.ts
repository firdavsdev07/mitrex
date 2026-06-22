import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsNumber()
  maxWebsites: number;

  @IsNumber()
  maxPlatforms: number;

  @IsNumber()
  maxMonthlyViews: number;

  @IsOptional()
  @IsBoolean()
  hasAiInsights?: boolean;

  @IsOptional()
  @IsBoolean()
  hasWeeklyReport?: boolean;

  @IsOptional()
  @IsBoolean()
  hasCustomAlerts?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
