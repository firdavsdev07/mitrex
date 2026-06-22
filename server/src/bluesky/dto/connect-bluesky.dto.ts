import { IsString } from 'class-validator';

export class ConnectBlueskyDto {
  @IsString()
  handle: string;

  @IsString()
  appPassword: string;
}
