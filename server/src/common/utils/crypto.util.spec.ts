process.env.ENCRYPTION_KEY = 'a'.repeat(64);

import { sha256Hex, encrypt, decrypt, looksEncrypted } from './crypto.util';

describe('crypto.util', () => {
  describe('sha256Hex', () => {
    it('produces a stable 64-char hex digest', () => {
      const hash = sha256Hex('mk_live_abc123');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(sha256Hex('mk_live_abc123')).toBe(hash);
    });

    it('produces different hashes for different inputs', () => {
      expect(sha256Hex('a')).not.toBe(sha256Hex('b'));
    });
  });

  describe('encrypt / decrypt', () => {
    it('round-trips a plaintext value', () => {
      const plain = 'ya29.a0AfH6SMC-example-oauth-token';
      const cipher = encrypt(plain);
      expect(cipher).not.toBe(plain);
      expect(decrypt(cipher)).toBe(plain);
    });

    it('produces a different ciphertext each time (random IV)', () => {
      const a = encrypt('same-value');
      const b = encrypt('same-value');
      expect(a).not.toBe(b);
      expect(decrypt(a)).toBe('same-value');
      expect(decrypt(b)).toBe('same-value');
    });

    it('throws when the payload is tampered with', () => {
      const cipher = encrypt('secret-token');
      const [iv, tag, ct] = cipher.split(':');
      const tampered = `${iv}:${tag}:${ct.slice(0, -2)}ff`;
      expect(() => decrypt(tampered)).toThrow();
    });

    it('throws on a malformed payload', () => {
      expect(() => decrypt('not-a-valid-payload')).toThrow(
        'Invalid encrypted payload format',
      );
    });
  });

  describe('looksEncrypted', () => {
    it('recognizes the iv:tag:ciphertext hex format', () => {
      expect(looksEncrypted(encrypt('x'))).toBe(true);
    });

    it('rejects plain OAuth-style tokens', () => {
      expect(looksEncrypted('ya29.a0AfH6SMC-plain-token')).toBe(false);
      expect(looksEncrypted(null)).toBe(false);
      expect(looksEncrypted(undefined)).toBe(false);
      expect(looksEncrypted('')).toBe(false);
    });
  });
});
