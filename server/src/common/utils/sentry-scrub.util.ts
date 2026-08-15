// Sentry xato hisobotiga so'rov URL'ini biriktiradi. Bizda esa URL'ning
// o'zida maxfiy qiymatlar uchraydi — eng muhimi OAuth callback'lari
// (/instagram/callback?code=...&state=...): agar shu handler'da 500 chiqsa,
// almashtirilmagan OAuth kodi Sentry'ga tushib qolardi. Public tracking
// endpointidagi kalitlar ham shunga o'xshash.
//
// Shuning uchun hisobot yuborilishidan oldin nozik query parametrlarning
// QIYMATI o'chiriladi (nomi qoladi — debug uchun qaysi parametr borligini
// bilish foydali).
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
  // URLSearchParams qayta yig'ilganda kodlashni o'zgartirib yuborishi
  // mumkin — hech narsa tozalanmagan bo'lsa asl matnni qaytaramiz.
  return touched ? params.toString() : queryString;
}

export function scrubUrl(url: string): string {
  const idx = url.indexOf('?');
  if (idx === -1) return url;
  const scrubbed = scrubQueryString(url.slice(idx + 1));
  return `${url.slice(0, idx)}?${scrubbed}`;
}
