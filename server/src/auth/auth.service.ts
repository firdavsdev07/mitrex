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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthProvider } from '@metrix/prisma-client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Bu email allaqachon ro\'yxatdan o\'tgan');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, name: dto.name, provider: AuthProvider.LOCAL },
      select: { id: true, email: true, name: true, avatar: true, provider: true },
    });

    // Welcome email (fon da, kutmaymiz)
    this.email.sendWelcome(user.email, user.name || '');

    return { user, token: this.signToken(user.id, user.email) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password)
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Email yoki parol noto\'g\'ri');

    return {
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: user.role, provider: user.provider },
      token: this.signToken(user.id, user.email),
    };
  }

  // OAuth login — Google, GitHub, Discord, Facebook, Apple dan keyin chaqiriladi
  async oauthLogin(oauthUser: {
    providerId: string;
    provider: string;
    email: string;
    name?: string;
    avatar?: string;
  }) {
    const provider = oauthUser.provider as AuthProvider;

    // Avval providerId bilan qidirish
    let user = await this.prisma.user.findFirst({
      where: { provider, providerId: oauthUser.providerId },
    });

    // Topilmasa email bilan qidirish
    if (!user && oauthUser.email) {
      user = await this.prisma.user.findUnique({ where: { email: oauthUser.email } });
      if (user) {
        // Email mavjud — provider ma'lumotini yangilash
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { provider, providerId: oauthUser.providerId, avatar: oauthUser.avatar },
        });
      }
    }

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

    return {
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: user.role, provider: user.provider },
      token: this.signToken(user.id, user.email),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Xavfsizlik: user topilmasa ham muvaffaqiyat qaytaramiz
    if (!user || user.provider !== AuthProvider.LOCAL) {
      return { message: 'Agar email mavjud bo\'lsa, xabar yuborildi' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 soat

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await this.email.sendPasswordReset(user.email, resetUrl);

    return { message: 'Agar email mavjud bo\'lsa, xabar yuborildi' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!resetToken) throw new BadRequestException('Token noto\'g\'ri');
    if (resetToken.usedAt) throw new BadRequestException('Token has already been used');
    if (resetToken.expiresAt < new Date()) throw new BadRequestException('Token has expired');

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
    ]);

    return { message: 'Password updated successfully' };
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatar: true, role: true, provider: true, createdAt: true },
    });
  }

  private signToken(userId: string, email: string) {
    return this.jwt.sign({ sub: userId, email });
  }
}
