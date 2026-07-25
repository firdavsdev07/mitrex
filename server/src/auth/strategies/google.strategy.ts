import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { OAuthDoneCallback } from '../types/oauth-user.type';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
      callbackURL:
        process.env.GOOGLE_AUTH_REDIRECT_URI ||
        'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: OAuthDoneCallback,
  ) {
    const { id, displayName, emails, photos } = profile;
    done(null, {
      providerId: id,
      provider: 'GOOGLE',
      email: emails?.[0]?.value ?? '',
      // Google faqat tasdiqlangan (yoki Google hisobi bilan chambarchas
      // bog'liq, masalan Workspace) emaillarni OAuth profilida qaytaradi.
      emailVerified: true,
      name: displayName,
      avatar: photos?.[0]?.value,
    });
  }
}
