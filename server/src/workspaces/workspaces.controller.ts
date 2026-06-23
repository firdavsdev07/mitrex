import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('workspaces')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  // ─── Workspace CRUD ────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List workspaces the user owns or is a member of' })
  @ApiResponse({ status: 200, description: 'Array of workspaces' })
  findAll(@CurrentUser('id') userId: string) {
    return this.workspacesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace details' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace with members and stats' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workspacesService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace name, slug or description' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Updated workspace' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkspaceDto>,
  ) {
    return this.workspacesService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace deleted' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workspacesService.remove(userId, id);
  }

  // ─── Members ───────────────────────────────────────────────────────────────

  @Get(':id/members')
  @ApiOperation({ summary: 'List workspace members' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Array of members with roles' })
  getMembers(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workspacesService.getMembers(userId, id);
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Change a member role' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiParam({ name: 'memberId', description: 'Member user ID' })
  @ApiBody({ schema: { properties: { role: { type: 'string', enum: ['ADMIN', 'EDITOR', 'VIEWER'] } } } })
  @ApiResponse({ status: 200, description: 'Role updated' })
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
  @ApiOperation({ summary: 'Remove a member from workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiParam({ name: 'memberId', description: 'Member user ID' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  removeMember(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.workspacesService.removeMember(userId, id, memberId);
  }

  // ─── Invites ───────────────────────────────────────────────────────────────

  @Post(':id/invites')
  @ApiOperation({ summary: 'Send an invite email to a new member' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Invite sent' })
  invite(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspacesService.invite(userId, id, dto);
  }

  @Get(':id/invites')
  @ApiOperation({ summary: 'List pending invites for a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Array of pending invites' })
  getInvites(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workspacesService.getInvites(userId, id);
  }

  @Delete(':id/invites/:inviteId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a pending invite' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiParam({ name: 'inviteId', description: 'Invite ID' })
  @ApiResponse({ status: 200, description: 'Invite revoked' })
  revokeInvite(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.workspacesService.revokeInvite(userId, id, inviteId);
  }

  @Post('join/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a workspace invite via token (from invite email)' })
  @ApiParam({ name: 'token', description: 'Invite token from email link' })
  @ApiResponse({ status: 200, description: 'Joined workspace' })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  acceptInvite(@CurrentUser('id') userId: string, @Param('token') token: string) {
    return this.workspacesService.acceptInvite(userId, token);
  }

  // ─── Workspace resources ───────────────────────────────────────────────────

  @Get(':id/websites')
  @ApiOperation({ summary: 'List websites belonging to a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Array of websites' })
  getWebsites(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workspacesService.getWebsites(userId, id);
  }

  @Get(':id/connections')
  @ApiOperation({ summary: 'List connections belonging to a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Array of connections' })
  getConnections(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workspacesService.getConnections(userId, id);
  }
}
