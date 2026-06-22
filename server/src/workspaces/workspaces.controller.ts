import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  // ─── Workspace CRUD ────────────────────────────────────────────────────────
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.workspacesService.findAll(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workspacesService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkspaceDto>,
  ) {
    return this.workspacesService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workspacesService.remove(userId, id);
  }

  // ─── Members ───────────────────────────────────────────────────────────────
  @Get(':id/members')
  getMembers(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workspacesService.getMembers(userId, id);
  }

  @Patch(':id/members/:memberId')
  updateMemberRole(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body('role') role: string,
  ) {
    return this.workspacesService.updateMemberRole(userId, id, memberId, role);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  removeMember(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.workspacesService.removeMember(userId, id, memberId);
  }

  // ─── Invites ───────────────────────────────────────────────────────────────
  @Post(':id/invites')
  invite(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspacesService.invite(userId, id, dto);
  }

  @Get(':id/invites')
  getInvites(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workspacesService.getInvites(userId, id);
  }

  @Delete(':id/invites/:inviteId')
  @HttpCode(HttpStatus.OK)
  revokeInvite(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.workspacesService.revokeInvite(userId, id, inviteId);
  }

  // ─── Accept invite (public — join link) ────────────────────────────────────
  @Post('join/:token')
  @HttpCode(HttpStatus.OK)
  acceptInvite(@CurrentUser('id') userId: string, @Param('token') token: string) {
    return this.workspacesService.acceptInvite(userId, token);
  }

  // ─── Workspace resources ───────────────────────────────────────────────────
  @Get(':id/websites')
  getWebsites(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workspacesService.getWebsites(userId, id);
  }

  @Get(':id/connections')
  getConnections(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workspacesService.getConnections(userId, id);
  }
}
