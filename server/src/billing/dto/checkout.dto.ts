import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutDto {
  @ApiProperty({ example: 'starter', enum: ['free', 'starter', 'pro'] })
  @IsString()
  @IsIn(['free', 'starter', 'pro'])
  plan: string;
}
