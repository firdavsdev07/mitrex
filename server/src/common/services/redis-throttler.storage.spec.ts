import { RedisThrottlerStorage } from './redis-throttler.storage';

// ioredis'ni mock qilamiz — testlar haqiqiy Redis'ga bog'lanmasligi kerak.
const evalMock = jest.fn();
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    eval: evalMock,
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  })),
}));

describe('RedisThrottlerStorage', () => {
  const ORIGINAL_REDIS_URL = process.env.REDIS_URL;

  afterEach(() => {
    jest.clearAllMocks();
    if (ORIGINAL_REDIS_URL === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = ORIGINAL_REDIS_URL;
  });

  describe('REDIS_URL sozlanmaganda', () => {
    it('falls back to in-memory counting instead of disabling throttling', async () => {
      delete process.env.REDIS_URL;
      const storage = new RedisThrottlerStorage();

      const first = await storage.increment('user-1', 1000, 5, 2000, 'short');
      const second = await storage.increment('user-1', 1000, 5, 2000, 'short');

      // Redis yo'q bo'lsa ham hisob yuritilishi shart — aks holda rate-limit
      // jimgina butunlay o'chib qolardi.
      expect(first.totalHits).toBe(1);
      expect(second.totalHits).toBe(2);
      expect(evalMock).not.toHaveBeenCalled();
    });
  });

  describe('REDIS_URL sozlanganda', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
    });

    it('converts the script result from milliseconds to seconds', async () => {
      // [totalHits, timeToExpireMs, isBlocked, timeToBlockExpireMs]
      evalMock.mockResolvedValueOnce([3, 1500, 0, 0]);
      const storage = new RedisThrottlerStorage();

      const record = await storage.increment('ip-1', 60000, 200, 5000, 'long');

      expect(record.totalHits).toBe(3);
      // Guard sekund kutadi; 1500ms → 2s (yuqoriga yaxlitlanadi, aks holda
      // 1s dan kichik qoldiq 0 = "muddati tugagan" bo'lib ko'rinardi).
      expect(record.timeToExpire).toBe(2);
      expect(record.isBlocked).toBe(false);
    });

    it('reports a blocked window', async () => {
      evalMock.mockResolvedValueOnce([201, 4000, 1, 4000]);
      const storage = new RedisThrottlerStorage();

      const record = await storage.increment('ip-1', 60000, 200, 5000, 'long');

      expect(record.isBlocked).toBe(true);
      expect(record.timeToBlockExpire).toBe(4);
    });

    it('falls back to in-memory when the Redis call fails', async () => {
      evalMock.mockRejectedValueOnce(new Error('connection refused'));
      const storage = new RedisThrottlerStorage();

      const record = await storage.increment('ip-2', 1000, 5, 2000, 'short');

      // Fail-open: Redis yiqilganda so'rovni rad etmaymiz, faqat hisobni
      // xotirada yuritamiz.
      expect(record.totalHits).toBe(1);
      expect(record.isBlocked).toBe(false);
    });
  });
});
