import { scrubUrl, scrubQueryString } from './sentry-scrub.util';

describe('sentry-scrub.util', () => {
  describe('scrubUrl', () => {
    it('removes an OAuth code and state from a callback URL', () => {
      const url = scrubUrl(
        'https://api.metrix.uz/instagram/callback?code=AQBx7Secret&state=user-1.123.abc',
      );

      expect(url).not.toContain('AQBx7Secret');
      expect(url).not.toContain('user-1.123.abc');
      // Parametr NOMI qolishi kerak — debug qilishda qaysi parametr
      // kelganini bilish foydali.
      expect(url).toContain('code=');
      expect(url).toContain('state=');
    });

    it('leaves harmless query params untouched', () => {
      const url = scrubUrl('https://api.metrix.uz/posts?limit=20&offset=40');

      expect(url).toBe('https://api.metrix.uz/posts?limit=20&offset=40');
    });

    it('scrubs only the sensitive param in a mixed query', () => {
      const url = scrubUrl(
        'https://api.metrix.uz/x?page=2&access_token=abc123',
      );

      expect(url).toContain('page=2');
      expect(url).not.toContain('abc123');
    });

    it('is case-insensitive about param names', () => {
      const url = scrubUrl('https://api.metrix.uz/x?API_KEY=mk_live_secret');

      expect(url).not.toContain('mk_live_secret');
    });

    it('returns URLs without a query string unchanged', () => {
      expect(scrubUrl('https://api.metrix.uz/health')).toBe(
        'https://api.metrix.uz/health',
      );
    });
  });

  describe('scrubQueryString', () => {
    it('handles a bare query string', () => {
      const qs = scrubQueryString('code=secret&foo=bar');

      expect(qs).not.toContain('secret');
      expect(qs).toContain('foo=bar');
    });

    it('returns an empty string unchanged', () => {
      expect(scrubQueryString('')).toBe('');
    });
  });
});
