import { IsString, IsOptional } from 'class-validator';

export class DeleteAccountDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
