import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomEventDto {
  @ApiProperty({ example: 'mk_abc123def456' })
  @IsString()
  siteKey: string;

  @ApiProperty({ example: 'Purchase', description: 'Custom event name, e.g. "Signup", "Purchase", "Video Play"' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ example: '/checkout/success' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ example: { price: 49, currency: 'USD', plan: 'starter' } })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}
