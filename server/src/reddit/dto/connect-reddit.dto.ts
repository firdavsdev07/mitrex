import { IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectRedditDto {
  @ApiProperty({
    example: 'programming',
    description: 'Subreddit name without "r/" prefix',
  })
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Subreddit name can only contain letters, numbers and underscores',
  })
  subreddit: string;
}
