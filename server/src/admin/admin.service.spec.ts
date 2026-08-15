import { syncStatusOf } from './admin.service';

// Admin paneldagi sync indikatorining butun ma'nosi shu funksiyada: u
// noto'g'ri ishlasa cron to'xtaganda ham panel yashil turaveradi va muammo
// sezilmay qoladi.
describe('syncStatusOf', () => {
  const now = new Date();

  it('reports ok when nothing is stale', () => {
    expect(syncStatusOf(now, 0, 10)).toBe('ok');
  });

  it('reports idle when there are no connections at all', () => {
    expect(syncStatusOf(null, 0, 0)).toBe('idle');
  });

  it('reports down when no connection has ever synced', () => {
    expect(syncStatusOf(null, 5, 5)).toBe('down');
  });

  it('reports degraded when a minority is stale', () => {
    expect(syncStatusOf(now, 2, 10)).toBe('degraded');
  });

  it('reports down when half or more are stale', () => {
    // Yarmi eskirgan bo'lsa muammo alohida ulanishda emas, tizimda
    // (cron yoki Redis) — shuning uchun "degraded" emas, "down".
    expect(syncStatusOf(now, 5, 10)).toBe('down');
    expect(syncStatusOf(now, 9, 10)).toBe('down');
  });
});
