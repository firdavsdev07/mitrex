import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AlertMetricDto {
  TRAFFIC_SPIKE = 'TRAFFIC_SPIKE',
  TRAFFIC_DROP = 'TRAFFIC_DROP',
  FOLLOWER_SPIKE = 'FOLLOWER_SPIKE',
  FOLLOWER_DROP = 'FOLLOWER_DROP',
  SITE_DOWN = 'SITE_DOWN',
  NEW_REFERRER = 'NEW_REFERRER',
}

export class CreateAlertDto {
  @ApiProperty({ example: 'Traffic spike alert' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: AlertMetricDto, example: AlertMetricDto.TRAFFIC_SPIKE })
  @IsEnum(AlertMetricDto)
  metric!: AlertMetricDto;

  @ApiProperty({ example: 2.0, description: '2.0 = 2x spike, 0.5 = 50% drop' })
  @IsNumber()
  threshold!: number;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsString()
  websiteId?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsString()
  connectionId?: string;

  @ApiPropertyOptional({ example: 'EMAIL', enum: ['EMAIL', 'IN_APP'] })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
