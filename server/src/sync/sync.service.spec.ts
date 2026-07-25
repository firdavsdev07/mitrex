import { SyncService } from './sync.service';
import { Platform } from '@metrix/prisma-client';
import type { PrismaService } from '../prisma/prisma.service';
import type { YoutubeService } from '../youtube/youtube.service';
import type { TelegramService } from '../telegram/telegram.service';
import type { DiscordService } from '../discord/discord.service';
import type { BlueskyService } from '../bluesky/bluesky.service';
import type { InstagramService } from '../instagram/instagram.service';
import type { RedditService } from '../reddit/reddit.service';
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
  const postsNoop = {
    syncYoutubePosts: jest.fn(() => Promise.resolve()),
    syncTelegramPosts: jest.fn(() => Promise.resolve()),
    syncBlueskyPosts: jest.fn(() => Promise.resolve()),
    syncInstagramPosts: jest.fn(() => Promise.resolve()),
    syncInstagramStories: jest.fn(() => Promise.resolve()),
  } as unknown as PostsService;

  const service = new SyncService(
    prisma,
    noop as unknown as YoutubeService,
    noop as unknown as TelegramService,
    discordService,
    noop as unknown as BlueskyService,
    noop as unknown as InstagramService,
    noop as unknown as RedditService,
    postsNoop,
    // @Optional() queue — Redis mavjud bo'lmaganda production'da ham
    // undefined keladi (sync.service.ts'dagi fallback shu holatni kutadi).
    undefined as never,
  );

  return { service, prisma, updateCalls };
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
