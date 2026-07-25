export interface DailyDelta {
  date: string; // YYYY-MM-DD — kun DAVOMIDA yuz bergan o'zgarish shu kunga tegishli
  delta: number; // masalan subscribersGained - subscribersLost
}

function shiftDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// YouTube Analytics API kunlik O'ZGARISHNI beradi (masalan
// subscribersGained - subscribersLost), YAKUNIY sonni emas. `delta` qatori
// D sanasi uchun total(D) - total(D-1) ni bildiradi (D kuni DAVOMIDA yuz
// bergan o'zgarish). Demak total(D-1)ni topish uchun D kunining o'z
// delta'sidan foydalanamiz: total(D-1) = total(D) - delta(D).
//
// Shu sabab `currentTotal` bugungi (currentDate) yakuniy qiymat bo'lsa,
// KECHAGI (currentDate-1) qiymatni tiklash uchun `deltas` massivida
// BUGUNGI kunning o'z delta'si (date === currentDate) bo'lishi SHART —
// aks holda faqat currentDate-2 va undan oldingi kunlarga o'tib ketiladi,
// eng so'nggi kun (kecha) hech qachon tiklanmaydi. Chaqiruvchi Analytics
// so'rovini `endDate = bugun` bilan yuborishi kerak.
export function reconstructHistoricalTotals(
  currentTotal: number,
  currentDate: string,
  deltas: DailyDelta[],
): { date: string; total: number }[] {
  const sorted = deltas
    .filter((d) => d.date <= currentDate)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const result: { date: string; total: number }[] = [];
  let running = currentTotal;
  for (const { date, delta } of sorted) {
    running = Math.max(0, running - delta);
    result.push({ date: shiftDateString(date, -1), total: running });
  }
  return result;
}
