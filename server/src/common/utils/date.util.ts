// `@db.Date` ustunlariga (PlatformStat.date) yozishdan oldin "bugun"ni olish
// uchun ishlatiladi. `new Date(); d.setHours(0,0,0,0)` MAHALLIY vaqt zonasidagi
// yarim tunni beradi — server UTC+5da ishlaganda bu UTC bo'yicha oldingi
// kunning 19:00'iga to'g'ri keladi va Postgres DATE ustuniga yozilganda bir
// kun oldinga siljib ketadi (masalan bugungi sinxronizatsiya "kecha" sifatida
// saqlanib qoladi, "Bugun" filtri esa uni topa olmaydi). Mahalliy yil/oy/kunni
// UTC yarim tuni sifatida qurish bu siljishni oldini oladi.
export function todayUtcDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}
