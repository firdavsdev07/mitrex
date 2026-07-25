import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { DiscordAuthStrategy } from './strategies/discord-auth.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { ACCESS_TOKEN_TTL } from '../common/utils/refresh-token.util';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      // Har bir sign() chaqiruvi o'z expiresIn'ini beradi (access: 15m,
      // 2FA temp token: 5m) — bu faqat hech qanday option berilmagan holat
      // uchun xavfsiz fallback.
      signOptions: { expiresIn: ACCESS_TOKEN_TTL },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    JwtStrategy,
    GoogleStrategy,
    GithubStrategy,
    DiscordAuthStrategy,
    FacebookStrategy,
    AppleStrategy,
  ],
  exports: [JwtModule, TwoFactorService],
})
export class AuthModule {}
