import * as crypto from 'crypto';

export const REFRESH_COOKIE_NAME = 'mx_refresh';
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 kun
export const ACCESS_TOKEN_TTL = '15m';

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
