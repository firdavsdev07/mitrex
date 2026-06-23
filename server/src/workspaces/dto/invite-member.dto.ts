import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WorkspaceRoleDto {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export class InviteMemberDto {
  @ApiProperty({ example: 'teammate@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: WorkspaceRoleDto, example: WorkspaceRoleDto.EDITOR })
  @IsOptional()
  @IsEnum(WorkspaceRoleDto)
  role?: WorkspaceRoleDto;
}
