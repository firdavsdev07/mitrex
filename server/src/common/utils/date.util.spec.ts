import { todayUtcDate } from './date.util';

describe('todayUtcDate', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('encodes the local calendar date as UTC midnight, independent of the process timezone', () => {
    const fixed = new Date('2026-07-15T18:30:00.000Z');
    jest.useFakeTimers().setSystemTime(fixed);

    const result = todayUtcDate();

    const expected = new Date(
      Date.UTC(fixed.getFullYear(), fixed.getMonth(), fixed.getDate()),
    );
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('returns a Date with zero UTC time components (safe for a @db.Date column)', () => {
    const result = todayUtcDate();
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it('never shifts to the previous or next UTC calendar day relative to local "today"', () => {
    const now = new Date();
    const result = todayUtcDate();
    expect(result.getUTCFullYear()).toBe(now.getFullYear());
    expect(result.getUTCMonth()).toBe(now.getMonth());
    expect(result.getUTCDate()).toBe(now.getDate());
  });
});
