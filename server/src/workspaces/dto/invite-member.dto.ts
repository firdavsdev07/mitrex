import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export enum WorkspaceRoleDto {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(WorkspaceRoleDto)
  role?: WorkspaceRoleDto;
}
