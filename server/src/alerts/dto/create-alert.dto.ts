import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export enum AlertMetricDto {
  TRAFFIC_SPIKE = 'TRAFFIC_SPIKE',
  TRAFFIC_DROP = 'TRAFFIC_DROP',
  FOLLOWER_SPIKE = 'FOLLOWER_SPIKE',
  FOLLOWER_DROP = 'FOLLOWER_DROP',
  SITE_DOWN = 'SITE_DOWN',
  NEW_REFERRER = 'NEW_REFERRER',
}

export class CreateAlertDto {
  @IsString()
  name: string;

  @IsEnum(AlertMetricDto)
  metric: AlertMetricDto;

  @IsNumber()
  threshold: number;

  @IsOptional()
  @IsString()
  websiteId?: string;

  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
