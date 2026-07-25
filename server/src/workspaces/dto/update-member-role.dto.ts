import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRoleDto } from './invite-member.dto';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: WorkspaceRoleDto, example: WorkspaceRoleDto.EDITOR })
  @IsEnum(WorkspaceRoleDto)
  role: WorkspaceRoleDto;
}
