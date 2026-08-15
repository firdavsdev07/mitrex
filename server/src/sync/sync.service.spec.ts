import { SyncService } from './sync.service';
import { Platform } from '@metrix/prisma-client';
import type { PrismaService } from '../prisma/prisma.service';
import type { YoutubeService } from '../youtube/youtube.service';
import type { TelegramService } from '../telegram/telegram.service';
import type { DiscordService } from '../discord/discord.service';
import type { BlueskyService } from '../bluesky/bluesky.service';
import type { InstagramService } from '../instagram/instagram.service';
import type { ThreadsService } from '../threads/threads.service';
import type { RedditService } from '../reddit/reddit.service';
import type { PinterestService } from '../pinterest/pinterest.service';
import type { PostsService } from '../posts/posts.service';

function makeService(overrides?: { discordThrows?: Error }) {
  const updateCalls: Array<{
    where: { id: string };
    data: { lastSyncAt: Date; lastSyncError: string | null };
  }> = [];

  const prisma = {
    connection: {
      update: jest.fn(
        (args: {
          where: { id: string };
          data: { lastSyncAt: Date; lastSyncError: string | null };
        }) => {
          updateCalls.push(args);
          return Promise.resolve(args.data);
        },
      ),
      findMany: jest.fn(() =>
        Promise.resolve([{ id: 'conn-1', platform: Platform.DISCORD }]),
      ),
    },
  } as unknown as PrismaService;

  const discordError = overrides?.discordThrows;
  const discordService = {
    fetchAndSaveStats: discordError
      ? jest.fn(() => Promise.reject(discordError))
      : jest.fn(() => Promise.resolve()),
  } as unknown as DiscordService;

  const noop = { fetchAndSaveStats: jest.fn(() => Promise.resolve()) };
  // Meta platformalari (INSTAGRAM/FACEBOOK/THREADS) uchun marshrutlashni
  // tekshirish kerak — shuning uchun umumiy `noop` emas, alohida mock.
  const instagram = { fetchAndSaveStats: jest.fn(() => Promise.resolve()) };
  const threads = { fetchAndSaveStats: jest.fn(() => Promise.resolve()) };
  const posts = {
    syncYoutubePosts: jest.fn(() => Promise.resolve()),
    syncTelegramPosts: jest.fn(() => Promise.resolve()),
    syncBlueskyPosts: jest.fn(() => Promise.resolve()),
    syncInstagramPosts: jest.fn(() => Promise.resolve()),
    syncInstagramStories: jest.fn(() => Promise.resolve()),
    syncFacebookPosts: jest.fn(() => Promise.resolve()),
    syncThreadsPosts: jest.fn(() => Promise.resolve()),
  };
  const postsNoop = posts as unknown as PostsService;

  const service = new SyncService(
    prisma,
    noop as unknown as YoutubeService,
    noop as unknown as TelegramService,
    discordService,
    noop as unknown as BlueskyService,
    instagram as unknown as InstagramService,
    threads as unknown as ThreadsService,
    noop as unknown as RedditService,
    noop as unknown as PinterestService,
    postsNoop,
    // @Optional() queue — Redis mavjud bo'lmaganda production'da ham
    // undefined keladi (sync.service.ts'dagi fallback shu holatni kutadi).
    undefined as never,
  );

  return { service, prisma, updateCalls, instagram, threads, posts };
}

describe('SyncService#syncOne', () => {
  it('clears lastSyncError and stamps lastSyncAt on success', async () => {
    const { service, updateCalls } = makeService();

    await service.syncOne('conn-1', Platform.DISCORD);

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].where).toEqual({ id: 'conn-1' });
    expect(updateCalls[0].data.lastSyncError).toBeNull();
    expect(updateCalls[0].data.lastSyncAt).toBeInstanceOf(Date);
  });

  it('records the error message on lastSyncError and rethrows on failure', async () => {
    const { service, updateCalls } = makeService({
      discordThrows: new Error('Discord API xatosi: 429 rate limited'),
    });

    await expect(service.syncOne('conn-1', Platform.DISCORD)).rejects.toThrow(
      'Discord API xatosi: 429 rate limited',
    );

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].data.lastSyncError).toBe(
      'Discord API xatosi: 429 rate limited',
    );
  });

  it('truncates an overly long error message to 500 chars', async () => {
    const longMessage = 'x'.repeat(600);
    const { service, updateCalls } = makeService({
      discordThrows: new Error(longMessage),
    });

    await expect(service.syncOne('conn-1', Platform.DISCORD)).rejects.toThrow();

    expect(updateCalls[0].data.lastSyncError).toHaveLength(500);
  });
});

// FACEBOOK Meta (Instagram) servisi orqali, THREADS esa o'zining alohida
// servisi orqali sinxronlanadi (API'lari boshqa host va boshqa token) — bu
// marshrutlash oson chalkashib ketadigan joy, shuning uchun tekshiriladi.
describe('SyncService#syncOne — Meta platformalari', () => {
  it('syncs Facebook page stats and page posts together', async () => {
    const { service, instagram, posts } = makeService();

    await service.syncOne('conn-fb', Platform.FACEBOOK);

    expect(instagram.fetchAndSaveStats).toHaveBeenCalledWith('conn-fb');
    expect(posts.syncFacebookPosts).toHaveBeenCalledWith('conn-fb');
    // Instagram postlari Facebook ulanishi uchun tortilmasligi kerak
    expect(posts.syncInstagramPosts).not.toHaveBeenCalled();
  });

  it('routes Threads to its own service, not the Meta one', async () => {
    const { service, instagram, threads, posts } = makeService();

    await service.syncOne('conn-th', Platform.THREADS);

    expect(threads.fetchAndSaveStats).toHaveBeenCalledWith('conn-th');
    expect(posts.syncThreadsPosts).toHaveBeenCalledWith('conn-th');
    // Threads tokeni Meta Graph'da ishlamaydi — u yerga yuborilmasligi shart
    expect(instagram.fetchAndSaveStats).not.toHaveBeenCalled();
  });
});

describe('SyncService#syncUser', () => {
  it('reports per-connection success/failure without throwing', async () => {
    const { service } = makeService({
      discordThrows: new Error('boom'),
    });

    const result = await service.syncUser('user-1');

    expect(result.synced).toEqual(['DISCORD: ❌']);
  });

  it('reports success when every connection syncs cleanly', async () => {
    const { service } = makeService();

    const result = await service.syncUser('user-1');

    expect(result.synced).toEqual(['DISCORD: ✅']);
  });
});
