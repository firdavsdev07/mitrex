import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { TwoFactorService } from './two-factor.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthProvider } from '@metrix/prisma-client';
import { OAuthUser } from './types/oauth-user.type';
import {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL_MS,
  generateRefreshToken,
  hashRefreshToken,
} from '../common/utils/refresh-token.util';
import { sha256Hex } from '../common/utils/crypto.util';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  role: true,
  provider: true,
  twoFactorEnabled: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  async register(dto: RegisterDto, meta: RequestMeta = {}) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists)
      throw new ConflictException("Bu email allaqachon ro'yxatdan o'tgan");

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name,
        provider: AuthProvider.LOCAL,
      },
      select: SAFE_USER_SELECT,
    });

    // Welcome email (fon da, kutmaymiz)
    this.email.sendWelcome(user.email, user.name || '');
    await this.logLoginEvent(user.id, 'LOCAL', true, meta);

    const tokens = await this.issueTokens(user.id, user.email, meta);
    return { user, ...tokens };
  }

  async login(dto: LoginDto, meta: RequestMeta = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.password) {
      // User yo'q bo'lsa ham log yozib bo'lmaydi (userId kerak) — bu yerda
      // faqat "topilgan lekin parol noto'g'ri" holatlar log qilinadi.
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      await this.logLoginEvent(user.id, 'LOCAL', false, meta);
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }

    if (user.deletedAt) throw new UnauthorizedException("Hisob o'chirilgan");

    if (user.twoFactorEnabled) {
      // To'liq token bermasdan, faqat 2FA bosqichi uchun 5 daqiqalik vaqtinchalik token
      const tempToken = this.jwt.sign(
        { sub: user.id, twofa: true },
        { expiresIn: '5m' },
      );
      return { twoFactorRequired: true, tempToken };
    }

    await this.logLoginEvent(user.id, 'LOCAL', true, meta);
    const tokens = await this.issueTokens(user.id, user.email, meta);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async verifyTwoFactor(
    tempToken: string,
    code: string,
    meta: RequestMeta = {},
  ) {
    let payload: { sub: string; twofa?: boolean };
    try {
      payload = this.jwt.verify(tempToken);
    } catch {
      throw new UnauthorizedException(
        '2FA session expired — please log in again',
      );
    }
    if (!payload.twofa) throw new UnauthorizedException('Invalid 2FA session');

    const ok = await this.twoFactor.verifyCode(payload.sub, code);
    if (!ok) {
      await this.logLoginEvent(payload.sub, '2FA', false, meta);
      throw new UnauthorizedException("Noto'g'ri 2FA kod");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.deletedAt)
      throw new UnauthorizedException("Hisob o'chirilgan");

    await this.logLoginEvent(user.id, '2FA', true, meta);
    const tokens = await this.issueTokens(user.id, user.email, meta);
    return { user: this.toSafeUser(user), ...tokens };
  }

  // OAuth login — Google, GitHub, Discord, Facebook, Apple dan keyin chaqiriladi
  async oauthLogin(oauthUser: OAuthUser, meta: RequestMeta = {}) {
    const provider = oauthUser.provider as AuthProvider;

    // Avval providerId bilan qidirish
    let user = await this.prisma.user.findFirst({
      where: { provider, providerId: oauthUser.providerId },
    });

    // Topilmasa email bilan qidirish
    if (!user && oauthUser.email) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: oauthUser.email },
      });
      if (existingByEmail) {
        if (existingByEmail.deletedAt)
          throw new UnauthorizedException("Hisob o'chirilgan");

        // Xavfsizlik: provider profilida email tasdiqlanmagan bo'lsa,
        // mavjud hisobni avtomatik bog'lamaymiz — aks holda birov
        // boshqasining (tasdiqlanmagan) emailini o'z OAuth hisobiga qo'shib,
        // shu email'dagi mavjud Mitrex hisobini egallab olishi mumkin edi.
        if (!oauthUser.emailVerified) {
          throw new UnauthorizedException(
            'This email is registered with a different sign-in method. Please log in with your original method, or verify this email with the provider first.',
          );
        }

        // Email tasdiqlangan — provider ma'lumotini yangilab bog'laymiz
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            provider,
            providerId: oauthUser.providerId,
            avatar: oauthUser.avatar,
          },
        });
      }
    }

    if (user?.deletedAt) throw new UnauthorizedException("Hisob o'chirilgan");

    // Yangi user yaratish
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: oauthUser.email,
          name: oauthUser.name,
          avatar: oauthUser.avatar,
          provider,
          providerId: oauthUser.providerId,
        },
      });
      this.email.sendWelcome(user.email, user.name || '');
    }

    await this.logLoginEvent(user.id, provider, true, meta);
    const tokens = await this.issueTokens(user.id, user.email, meta);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Xavfsizlik: user topilmasa ham muvaffaqiyat qaytaramiz.
    // Parolga ega har qanday user reset qila oladi — provider keyinchalik
    // OAuth'ga o'zgargan bo'lsa ham (email orqali bog'langan hisoblar).
    if (!user || !user.password || user.deletedAt) {
      return { message: "Agar email mavjud bo'lsa, xabar yuborildi" };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 soat

    // Xom tokenni saqlamaymiz (refresh tokenlar kabi) — faqat hash. Shunda
    // DB o'qish huquqiga ega bo'lgan kimdir (backup, replica, boshqa
    // zaiflik) to'g'ridan-to'g'ri hisobni egallab ololmaydi.
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token: sha256Hex(token), expiresAt },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await this.email.sendPasswordReset(user.email, resetUrl);

    return { message: "Agar email mavjud bo'lsa, xabar yuborildi" };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: sha256Hex(dto.token) },
    });

    if (!resetToken) throw new BadRequestException("Token noto'g'ri");
    if (resetToken.usedAt)
      throw new BadRequestException('Token has already been used');
    if (resetToken.expiresAt < new Date())
      throw new BadRequestException('Token has expired');

    const hashed = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashed },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Parol almashtirilgandan keyin barcha eski sessiyalarni bekor qilish
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password updated successfully' };
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
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
  }

  async getLoginHistory(userId: string, limit = 20) {
    return this.prisma.loginEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ─── Refresh tokenlar ───────────────────────────────────────────────────

  private async issueTokens(userId: string, email: string, meta: RequestMeta) {
    const accessToken = this.jwt.sign(
      { sub: userId, email },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const rawRefreshToken = generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashRefreshToken(rawRefreshToken),
        userAgent: meta.userAgent?.slice(0, 300),
        ip: meta.ip,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  // Refresh token rotatsiyasi: eski token bekor qilinadi, yangisi beriladi.
  // Bir marta ishlatilgan (yoki o'g'irlangan/qayta ishlatilgan) tokenni
  // aniqlash uchun — agar hash topilib, lekin allaqachon revoked bo'lsa,
  // bu compromise belgisi: shu foydalanuvchining BARCHA sessiyalari yopiladi.
  async refreshSession(rawRefreshToken: string, meta: RequestMeta = {}) {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing) throw new UnauthorizedException('Invalid refresh token');

    if (existing.revokedAt) {
      // Reuse detection — barcha sessiyalarni yopib qo'yamiz
      await this.prisma.refreshToken.updateMany({
        where: { userId: existing.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Refresh token reuse detected — all sessions revoked',
      );
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
    });
    if (!user || user.deletedAt)
      throw new UnauthorizedException("Hisob o'chirilgan");

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.email, meta);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async revokeRefreshToken(rawRefreshToken: string) {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private toSafeUser(user: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
    role: string;
    provider: string;
    twoFactorEnabled: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      provider: user.provider,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }

  private async logLoginEvent(
    userId: string,
    provider: string,
    success: boolean,
    meta: RequestMeta,
  ) {
    await this.prisma.loginEvent
      .create({
        data: {
          userId,
          provider,
          success,
          ip: meta.ip,
          userAgent: meta.userAgent?.slice(0, 300),
        },
      })
      .catch(() => {});
  }
}
