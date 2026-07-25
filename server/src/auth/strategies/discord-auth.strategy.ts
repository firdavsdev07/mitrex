import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, Scope } from 'passport-discord-auth';
import { OAuthDoneCallback } from '../types/oauth-user.type';

@Injectable()
export class DiscordAuthStrategy extends PassportStrategy(
  Strategy,
  'discord-auth',
) {
  constructor() {
    super({
      clientId: process.env.DISCORD_CLIENT_ID || 'placeholder',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || 'placeholder',
      callbackUrl:
        process.env.DISCORD_REDIRECT_URI ||
        'http://localhost:3000/auth/discord/callback',
      scope: [Scope.Identify, Scope.Email],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: OAuthDoneCallback,
  ) {
    const { id, username, email, avatar, verified } = profile;
    const avatarUrl = avatar
      ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
      : null;
    done(null, {
      providerId: String(id),
      provider: 'DISCORD',
      email: email ?? '',
      // Discord'da hisobga tasdiqlanmagan email biriktirilishi mumkin —
      // shu maydonni tekshirmasak, boshqa birovning tasdiqlanmagan
      // emailini o'ziga qo'shib, uning Mitrex hisobini bog'lab olishi mumkin edi.
      emailVerified: verified ?? false,
      name: username,
      avatar: avatarUrl,
    });
  }
}
