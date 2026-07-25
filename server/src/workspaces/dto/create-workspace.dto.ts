import { IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'My Team', minLength: 2 })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    example: 'Analytics workspace for the marketing team',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'my-team',
    description:
      'Lowercase letters, numbers and hyphens only. Auto-generated if omitted.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers and hyphens',
  })
  slug?: string;
}

// `Partial<CreateWorkspaceDto>` emas — TS'ning Partial<T> ValidationPipe
// tarafidan reflect qilinmaydi (runtime'da oddiy Object), shu sababli
// `name`ning MinLength(2) va `slug`ning regex tekshiruvi butunlay
// o'tkazib yuborilardi. PartialType haqiqiy klass — validatsiya ishlaydi.
export class UpdateWorkspaceDto extends PartialType(CreateWorkspaceDto) {}
