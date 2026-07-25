import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt } from '../common/utils/crypto.util';

const ISSUER = 'Metrix';

@Injectable()
export class TwoFactorService {
  constructor(private readonly prisma: PrismaService) {}

  // 1-qadam: yangi sir generatsiya qilib, QR kod qaytaradi. Sir shifrlangan
  // holda saqlanadi, lekin twoFactorEnabled hali false — confirm() chaqirilmaguncha.
  async generateSetup(userId: string, email: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encrypt(secret) },
    });

    const otpauth = authenticator.keyuri(email, ISSUER, secret);
    const qrDataUrl = await qrcode.toDataURL(otpauth);
    return { secret, qrDataUrl };
  }

  // 2-qadam: foydalanuvchi autentifikator ilovasidan olgan kodni tasdiqlaydi
  async confirm(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException('2FA setup not started — call setup first');
    }

    const secret = decrypt(user.twoFactorSecret);
    if (!authenticator.check(code, secret)) {
      throw new UnauthorizedException("Noto'g'ri kod");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    return { enabled: true };
  }

  async disable(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("Parol noto'g'ri");
    // OAuth orqali kirgan foydalanuvchida parol umuman yo'q — parol talab
    // qilsak, ular 2FA'ni hech qachon o'chira olmay qolib ketardi (doimiy
    // lockout). Ular allaqachon JwtGuard orqali autentifikatsiya qilingan,
    // shu yetarli.
    if (user.password && !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException("Parol noto'g'ri");
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return { disabled: true };
  }

  // Login oqimida chaqiriladi — foydalanuvchining shifrlangan sirini deshifrlab tekshiradi
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) return false;
    return authenticator.check(code, decrypt(user.twoFactorSecret));
  }
}
