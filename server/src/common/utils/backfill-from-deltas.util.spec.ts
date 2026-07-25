import { reconstructHistoricalTotals } from './backfill-from-deltas.util';

describe('reconstructHistoricalTotals', () => {
  it("uses TODAY's own delta to reconstruct YESTERDAY's total (fencepost: delta(D) bridges to D-1)", () => {
    // today=1000, and +50 happened ON 07-15 itself -> yesterday (07-14) was 950
    const result = reconstructHistoricalTotals(1000, '2026-07-15', [
      { date: '2026-07-15', delta: 50 },
    ]);
    expect(result).toEqual([{ date: '2026-07-14', total: 950 }]);
  });

  it("chains backward day by day using each day's own delta", () => {
    const result = reconstructHistoricalTotals(1000, '2026-07-15', [
      { date: '2026-07-15', delta: 50 }, // -> 07-14 = 950
      { date: '2026-07-14', delta: 20 }, // -> 07-13 = 930
    ]);
    expect(result).toEqual([
      { date: '2026-07-14', total: 950 },
      { date: '2026-07-13', total: 930 },
    ]);
  });

  it('handles negative deltas (net loss on a day)', () => {
    const result = reconstructHistoricalTotals(1000, '2026-07-15', [
      { date: '2026-07-15', delta: -30 },
    ]);
    expect(result).toEqual([{ date: '2026-07-14', total: 1030 }]);
  });

  it('ignores deltas after currentDate (future rows)', () => {
    const result = reconstructHistoricalTotals(1000, '2026-07-15', [
      { date: '2026-07-16', delta: 5 },
      { date: '2026-07-15', delta: 10 },
    ]);
    expect(result).toEqual([{ date: '2026-07-14', total: 990 }]);
  });

  it('sorts unordered input into newest-to-oldest before walking backward', () => {
    const result = reconstructHistoricalTotals(100, '2026-07-15', [
      { date: '2026-07-13', delta: 5 },
      { date: '2026-07-15', delta: 10 },
      { date: '2026-07-14', delta: 5 },
    ]);
    expect(result.map((r) => r.date)).toEqual([
      '2026-07-14',
      '2026-07-13',
      '2026-07-12',
    ]);
    expect(result).toEqual([
      { date: '2026-07-14', total: 90 },
      { date: '2026-07-13', total: 85 },
      { date: '2026-07-12', total: 80 },
    ]);
  });

  it('clamps to 0 instead of going negative', () => {
    const result = reconstructHistoricalTotals(10, '2026-07-15', [
      { date: '2026-07-15', delta: 50 },
    ]);
    expect(result).toEqual([{ date: '2026-07-14', total: 0 }]);
  });

  it('correctly rolls back across a month boundary', () => {
    const result = reconstructHistoricalTotals(100, '2026-08-01', [
      { date: '2026-08-01', delta: 10 },
    ]);
    expect(result).toEqual([{ date: '2026-07-31', total: 90 }]);
  });

  it('returns an empty array when there are no usable deltas', () => {
    expect(reconstructHistoricalTotals(1000, '2026-07-15', [])).toEqual([]);
  });
});
