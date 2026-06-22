import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'placeholder',
      callbackURL: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/auth/github/callback',
      scope: ['user:email'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: any, done: Function) {
    const { id, displayName, username, emails, photos } = profile;
    done(null, {
      providerId: String(id),
      provider: 'GITHUB',
      email: emails?.[0]?.value,
      name: displayName || username,
      avatar: photos?.[0]?.value,
    });
  }
}
