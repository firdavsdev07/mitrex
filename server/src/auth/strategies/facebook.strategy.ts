import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { OAuthDoneCallback } from '../types/oauth-user.type';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    super({
      clientID: process.env.FACEBOOK_APP_ID || 'placeholder',
      clientSecret: process.env.FACEBOOK_APP_SECRET || 'placeholder',
      callbackURL:
        process.env.FACEBOOK_REDIRECT_URI ||
        'http://localhost:3000/auth/facebook/callback',
      scope: ['email'],
      profileFields: ['id', 'displayName', 'emails', 'photos'],
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
      providerId: String(id),
      provider: 'FACEBOOK',
      email: emails?.[0]?.value ?? '',
      // Facebook faqat hisobga tasdiqlangan kontakt email sifatida
      // qo'shilgan manzillarni Graph API orqali qaytaradi.
      emailVerified: true,
      name: displayName,
      avatar: photos?.[0]?.value,
    });
  }
}
