import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { OAuthDoneCallback } from '../types/oauth-user.type';

// `passport-apple` o'z TypeScript turlarini bermaydi — Apple ID token'dan
// keladigan foydalanuvchi ma'lumoti uchun faqat ishlatiladigan maydonlar bilan
// minimal interfeys.
interface AppleProfile {
  id?: string;
  sub?: string;
  email?: string;
  name?: { firstName?: string; lastName?: string };
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor() {
    super({
      clientID: process.env.APPLE_CLIENT_ID || 'placeholder',
      teamID: process.env.APPLE_TEAM_ID || 'placeholder',
      keyID: process.env.APPLE_KEY_ID || 'placeholder',
      privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH || '/dev/null',
      callbackURL: `${process.env.APP_URL}/auth/apple/callback`,
      passReqToCallback: false,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    _idToken: unknown,
    profile: AppleProfile,
    done: OAuthDoneCallback,
  ) {
    done(null, {
      providerId: profile?.id || profile?.sub || '',
      provider: 'APPLE',
      email: profile?.email ?? '',
      // Apple ID token'i faqat tasdiqlangan (Apple tomonidan boshqariladigan
      // yoki "Hide My Email" relay) manzillarni beradi.
      emailVerified: true,
      name: profile?.name
        ? `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim()
        : undefined,
      avatar: null,
    });
  }
}
