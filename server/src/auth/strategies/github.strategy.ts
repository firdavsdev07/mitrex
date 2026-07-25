import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { OAuthDoneCallback } from '../types/oauth-user.type';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'placeholder',
      callbackURL:
        process.env.GITHUB_REDIRECT_URI ||
        'http://localhost:3000/auth/github/callback',
      scope: ['user:email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: OAuthDoneCallback,
  ) {
    const { id, displayName, username, emails, photos } = profile;
    done(null, {
      providerId: String(id),
      provider: 'GITHUB',
      email: emails?.[0]?.value ?? '',
      // passport-github2 'user:email' scope bilan /user/emails'dan faqat
      // `primary: true` belgilangan manzilni oladi — GitHub tasdiqlanmagan
      // emailni primary qilishga umuman yo'l qo'ymaydi, shu sababli bu
      // har doim tasdiqlangan hisoblanadi.
      emailVerified: true,
      name: displayName || username,
      avatar: photos?.[0]?.value,
    });
  }
}
