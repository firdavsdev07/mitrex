import { createHmac, timingSafeEqual } from 'crypto';

// Signs the userId + issue time into an OAuth "state" param so platform-connect
// callbacks (Discord, Instagram, …) can't be forged by guessing/enumerating
// user IDs, and can't be replayed indefinitely — the callback only trusts the
// userId if the signature matches AND the state was issued within STATE_TTL_MS.
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes — plenty for a redirect round-trip

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

export function signOAuthState(userId: string): string {
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyOAuthState(state: string | undefined): string {
  if (!state) throw new Error('Missing OAuth state');
  const idx = state.lastIndexOf('.');
  if (idx === -1) throw new Error('Invalid OAuth state');

  const payload = state.slice(0, idx);
  const sig = state.slice(idx + 1);

  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(sign(payload), 'hex');
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    throw new Error('Invalid OAuth state signature');
  }

  const sepIdx = payload.lastIndexOf('.');
  if (sepIdx === -1) throw new Error('Invalid OAuth state');
  const userId = payload.slice(0, sepIdx);
  const issuedAt = Number(payload.slice(sepIdx + 1));
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > STATE_TTL_MS) {
    throw new Error('OAuth state expired');
  }

  return userId;
}
