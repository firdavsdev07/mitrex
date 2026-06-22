import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-discord';

@Injectable()
export class DiscordAuthStrategy extends PassportStrategy(Strategy, 'discord-auth') {
  constructor() {
    super({
      clientID: process.env.DISCORD_CLIENT_ID || 'placeholder',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || 'placeholder',
      callbackURL: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback',
      scope: ['identify', 'email'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: any, done: Function) {
    const { id, username, email, avatar } = profile;
    const avatarUrl = avatar
      ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
      : null;
    done(null, {
      providerId: String(id),
      provider: 'DISCORD',
      email,
      name: username,
      avatar: avatarUrl,
    });
  }
}
