process.env.JWT_SECRET = 'test-jwt-secret';

import { createHmac } from 'crypto';
import { signOAuthState, verifyOAuthState } from './oauth-state.util';

describe('oauth-state.util', () => {
  it('round-trips a signed state back to the original userId', () => {
    const state = signOAuthState('user-123');
    expect(verifyOAuthState(state)).toBe('user-123');
  });

  it('rejects a missing state', () => {
    expect(() => verifyOAuthState(undefined)).toThrow('Missing OAuth state');
  });

  it('rejects a state with no signature separator', () => {
    expect(() => verifyOAuthState('garbage')).toThrow('Invalid OAuth state');
  });

  it('rejects a tampered userId (signature mismatch)', () => {
    const state = signOAuthState('user-123');
    const idx = state.lastIndexOf('.');
    const payload = state.slice(0, idx);
    const sig = state.slice(idx + 1);
    const tampered = `${payload.replace('user-123', 'user-999')}.${sig}`;
    expect(() => verifyOAuthState(tampered)).toThrow(
      'Invalid OAuth state signature',
    );
  });

  it('rejects a tampered signature', () => {
    const state = signOAuthState('user-123');
    const tampered = state.slice(0, -2) + 'ff';
    expect(() => verifyOAuthState(tampered)).toThrow();
  });

  it('rejects an expired state', () => {
    const issuedAt = Date.now() - 11 * 60 * 1000; // 11 daqiqa oldin (TTL 10 daqiqa)
    const payload = `user-123.${issuedAt}`;
    const sig = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(payload)
      .digest('hex');
    expect(() => verifyOAuthState(`${payload}.${sig}`)).toThrow(
      'OAuth state expired',
    );
  });

  it('throws if JWT_SECRET is not set', () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => signOAuthState('user-123')).toThrow('JWT_SECRET is not set');
    process.env.JWT_SECRET = original;
  });
});
