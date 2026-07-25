import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: { sub: string; email?: string; twofa?: boolean }) {
    // 2FA oraliq tokeni (email'siz, twofa:true) faqat /auth/2fa/verify uchun —
    // umumiy API'ga kirish uchun ishlatilishi mumkin emas.
    if (payload.twofa) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        deletedAt: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    if (user.deletedAt) throw new UnauthorizedException("Hisob o'chirilgan");
    return user;
  }
}
