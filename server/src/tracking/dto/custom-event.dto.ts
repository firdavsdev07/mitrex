import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomEventDto {
  @ApiProperty({ example: 'mk_abc123def456' })
  @IsString()
  @MaxLength(100)
  siteKey: string;

  @ApiProperty({
    example: 'Purchase',
    description: 'Custom event name, e.g. "Signup", "Purchase", "Video Play"',
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sessionId?: string;

  @ApiPropertyOptional({ example: '/checkout/success' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  path?: string;

  @ApiPropertyOptional({
    example: { price: 49, currency: 'USD', plan: 'starter' },
  })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}
