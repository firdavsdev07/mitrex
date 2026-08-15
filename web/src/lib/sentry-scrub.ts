// Server tomonidagi sentry-scrub.util.ts bilan bir xil maqsad: Sentry xato
// hisobotiga biriktiradigan URL query'sidan maxfiy qiymatlarni olib tashlash.
// Frontendda bu ayniqsa muhim — parol tiklash (/reset-password?token=...) va
// workspace taklifi (/workspaces/join?token=...) havolalari aynan query
// parametrida maxfiy token olib yuradi.
const SENSITIVE_QUERY_PARAMS = new Set([
  'code',
  'state',
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'api_key',
  'apikey',
  'key',
  'secret',
  'password',
  'signature',
  'sig',
]);

const FILTERED = '[Filtered]';

export function scrubQueryString(queryString: string): string {
  if (!queryString) return queryString;
  const params = new URLSearchParams(queryString);
  let touched = false;
  for (const name of [...params.keys()]) {
    if (SENSITIVE_QUERY_PARAMS.has(name.toLowerCase())) {
      params.set(name, FILTERED);
      touched = true;
    }
  }
  return touched ? params.toString() : queryString;
}

export function scrubUrl(url: string): string {
  const idx = url.indexOf('?');
  if (idx === -1) return url;
  return `${url.slice(0, idx)}?${scrubQueryString(url.slice(idx + 1))}`;
}
