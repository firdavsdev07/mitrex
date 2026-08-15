import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
} from './dto/create-workspace.dto';
import { InviteMemberDto, WorkspaceRoleDto } from './dto/invite-member.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ─── Slug generator ───────────────────────────────────────────────────────

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let attempt = 0;
    while (true) {
      const exists = await this.prisma.workspace.findUnique({
        where: { slug },
      });
      if (!exists) return slug;
      slug = `${base}-${++attempt}`;
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateWorkspaceDto) {
    const slug = await this.uniqueSlug(dto.slug || this.toSlug(dto.name));

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        ownerId: userId,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    return workspace;
  }

  async findAll(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: { members: true, websites: true, connections: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      myRole: m.role,
    }));
  }

  async findOne(userId: string, workspaceId: string) {
    const member = await this.getMemberOrThrow(userId, workspaceId);
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { websites: true, connections: true } },
      },
    });
    return { ...workspace, myRole: member.role };
  }

  async update(userId: string, workspaceId: string, data: UpdateWorkspaceDto) {
    await this.requireRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: data.name, description: data.description },
    });
  }

  async remove(userId: string, workspaceId: string) {
    await this.requireRole(userId, workspaceId, ['OWNER']);
    await this.prisma.workspace.delete({ where: { id: workspaceId } });
    return { deleted: true };
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  async getMembers(userId: string, workspaceId: string) {
    await this.getMemberOrThrow(userId, workspaceId);
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateMemberRole(
    userId: string,
    workspaceId: string,
    targetUserId: string,
    role: WorkspaceRoleDto,
  ) {
    await this.requireRole(userId, workspaceId, ['OWNER', 'ADMIN']);

    const target = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'OWNER')
      throw new ForbiddenException('Cannot change owner role');

    return this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      data: { role },
    });
  }

  async removeMember(
    userId: string,
    workspaceId: string,
    targetUserId: string,
  ) {
    const member = await this.getMemberOrThrow(userId, workspaceId);

    // Can remove yourself (leave) or owner/admin can remove others
    if (userId !== targetUserId) {
      if (!['OWNER', 'ADMIN'].includes(member.role))
        throw new ForbiddenException('Insufficient permissions');
    }

    const target = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'OWNER')
      throw new ForbiddenException('Owner cannot be removed');

    await this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
    return { removed: true };
  }

  // ─── Invites ──────────────────────────────────────────────────────────────

  async invite(userId: string, workspaceId: string, dto: InviteMemberDto) {
    await this.requireRole(userId, workspaceId, ['OWNER', 'ADMIN']);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    // Check if already member
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      const isMember = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
      });
      if (isMember) throw new ConflictException('User is already a member');
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await this.prisma.workspaceInvite.upsert({
      where: { workspaceId_email: { workspaceId, email: dto.email } },
      create: {
        workspaceId,
        email: dto.email,
        role: dto.role || 'EDITOR',
        invitedById: userId,
        expiresAt,
      },
      update: {
        role: dto.role || 'EDITOR',
        invitedById: userId,
        expiresAt,
        acceptedAt: null,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/workspaces/join/${invite.token}`;
    await this.email.sendWorkspaceInvite(dto.email, workspace.name, inviteUrl);

    return { invited: true, email: dto.email, expiresAt };
  }

  async acceptInvite(userId: string, token: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
    });
    if (!invite) throw new BadRequestException('Invalid invite token');
    if (invite.acceptedAt) throw new BadRequestException('Invite already used');
    if (invite.expiresAt < new Date())
      throw new BadRequestException('Invite has expired');

    // Taklif aynan shu email'ga yuborilgan — havolani boshqa birov
    // (forward qilingan link, umumiy chat, brauzer tarixi orqali) qo'lga
    // kiritib, o'z hisobi bilan qo'shilib olmasligi uchun tekshiramiz.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ForbiddenException(
        'This invite was sent to a different email address',
      );
    }

    // Allaqachon a'zo bo'lsa unique constraint 500 bermasligi uchun tekshiramiz
    const existing = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: invite.workspaceId, userId },
      },
    });
    if (existing) {
      throw new ConflictException('You are already a member of this workspace');
    }

    // Add as member
    await this.prisma.workspaceMember.create({
      data: { workspaceId: invite.workspaceId, userId, role: invite.role },
    });

    // Mark invite as accepted
    await this.prisma.workspaceInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });

    return {
      joined: true,
      workspaceId: invite.workspaceId,
      role: invite.role,
    };
  }

  async getInvites(userId: string, workspaceId: string) {
    await this.requireRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    return this.prisma.workspaceInvite.findMany({
      where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvite(userId: string, workspaceId: string, inviteId: string) {
    await this.requireRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.workspaceId !== workspaceId)
      throw new NotFoundException('Invite not found');
    await this.prisma.workspaceInvite.delete({ where: { id: inviteId } });
    return { revoked: true };
  }

  // ─── Workspace resources ──────────────────────────────────────────────────

  async getWebsites(userId: string, workspaceId: string) {
    await this.getMemberOrThrow(userId, workspaceId);
    return this.prisma.website.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        domain: true,
        trackingKey: true,
        createdAt: true,
        _count: { select: { pageViews: true, sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConnections(userId: string, workspaceId: string) {
    await this.getMemberOrThrow(userId, workspaceId);
    return this.prisma.connection.findMany({
      where: { workspaceId, isActive: true },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        isActive: true,
        stats: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { followers: true, views: true },
        },
      },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async getMemberOrThrow(userId: string, workspaceId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member)
      throw new ForbiddenException('You are not a member of this workspace');
    return member;
  }

  private async requireRole(
    userId: string,
    workspaceId: string,
    roles: string[],
  ) {
    const member = await this.getMemberOrThrow(userId, workspaceId);
    if (!roles.includes(member.role)) {
      throw new ForbiddenException(`Required role: ${roles.join(' or ')}`);
    }
    return member;
  }
}
