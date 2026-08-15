import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        provider: true,
        twoFactorEnabled: true,
        weeklyDigest: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, email: true, name: true, avatar: true },
    });
  }

  async setWeeklyDigest(userId: string, enabled: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { weeklyDigest: enabled },
    });
    return { weeklyDigest: enabled };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      throw new BadRequestException("OAuth orqali kirgansiz — parol yo'q");
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException("Joriy parol noto'g'ri");

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { password: hashed },
      }),
      // resetPassword() bilan bir xil: parol almashtirilgandan keyin
      // barcha eski sessiyalarni (refresh tokenlarni) bekor qilish —
      // aks holda o'g'irlangan refresh token parol o'zgargandan keyin ham ishlayverardi.
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { message: 'Password updated' };
  }

  // Bu oy nechta view, nechta connection, nechta website
  async getUsage(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [websites, connections, monthlyViews, subscription] =
      await Promise.all([
        this.prisma.website.count({ where: { userId } }),
        this.prisma.connection.count({ where: { userId, isActive: true } }),
        this.prisma.pageView.count({
          where: { website: { userId }, createdAt: { gte: monthStart } },
        }),
        this.prisma.userSubscription.findUnique({
          where: { userId },
          include: { plan: true },
        }),
      ]);

    const plan = subscription?.plan;

    return {
      websites: { used: websites, limit: plan?.maxWebsites ?? null },
      platforms: { used: connections, limit: plan?.maxPlatforms ?? null },
      views: { used: monthlyViews, limit: plan?.maxMonthlyViews ?? null },
      plan: plan?.name ?? 'Free',
    };
  }

  // ─── Soft Delete ──────────────────────────────────────────────────────────

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.deletedAt)
      throw new BadRequestException("Hisob allaqachon o'chirilgan");

    const restoreToken = crypto.randomBytes(32).toString('hex');
    const restoreTokenExpiresAt = new Date(
      Date.now() + 180 * 24 * 60 * 60 * 1000,
    ); // 6 months

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        deleteReason: dto.reason,
        restoreToken,
        restoreTokenExpiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const restoreUrl = `${frontendUrl}/restore-account?token=${restoreToken}`;
    await this.email.sendAccountDeleted(
      user.email,
      user.name || '',
      restoreUrl,
    );

    return {
      message: "Hisob o'chirildi. 6 months ichida tiklashingiz mumkin.",
    };
  }

  async restoreAccount(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        restoreToken: token,
        deletedAt: { not: null },
      },
    });

    if (!user)
      throw new BadRequestException("Token noto'g'ri yoki muddati tugagan");
    if (
      !user.restoreTokenExpiresAt ||
      user.restoreTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException("Token has expired. Hisob o'chirildi.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: null,
        deleteReason: null,
        restoreToken: null,
        restoreTokenExpiresAt: null,
      },
    });

    return { message: 'Account restored successfully', userId: user.id };
  }

  // Cron: 6 monthsdan oshgan soft-deleted userlarni hard delete
  async purgeExpiredDeletedUsers() {
    const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.user.deleteMany({
      where: { deletedAt: { lte: cutoff } },
    });
    return result.count;
  }
}
