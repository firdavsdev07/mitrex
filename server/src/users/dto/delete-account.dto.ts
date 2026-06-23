import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiPropertyOptional({ example: 'Switching to a different service' })
  @IsOptional()
  @IsString()
  reason?: string;
}
