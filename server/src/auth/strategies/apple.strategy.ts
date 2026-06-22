import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';

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
    _idToken: any,
    profile: any,
    done: Function,
  ) {
    done(null, {
      providerId: profile?.id || profile?.sub,
      provider: 'APPLE',
      email: profile?.email,
      name: profile?.name
        ? `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim()
        : null,
      avatar: null,
    });
  }
}
