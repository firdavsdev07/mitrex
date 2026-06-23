import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectBlueskyDto {
  @ApiProperty({ example: 'yourhandle.bsky.social' })
  @IsString()
  handle: string;

  @ApiProperty({ example: 'xxxx-xxxx-xxxx-xxxx', description: 'App Password from Bluesky settings (not your login password)' })
  @IsString()
  appPassword: string;
}
