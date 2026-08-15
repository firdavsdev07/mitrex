'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FileText,
  Heart,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Flame,
} from 'lucide-react';
import {
  YouTubeIcon,
  TelegramIcon,
  InstagramIcon,
  BlueskyIcon,
} from '@/components/icons/platform-icons';
import { connectionsApi, type Connection } from '@/lib/api/connections';
import { postsApi, type Post } from '@/lib/api/posts';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCards } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────
// Ilgari bu sahifa har bir kanal uchun alohida tab ko'rsatardi — ya'ni
// «barcha ijtimoiy tarmoqlar bir joyda» deb nomlanib, aynan shuni qila
// olmasdi: bir vaqtda faqat bitta kanal ko'rinardi.
//
// Muammo shundaki, xom sonlarni solishtirib bo'lmaydi. YouTube'dagi 12,000
// ko'rish va Telegram'dagi 400 ko'rish — qaysi biri yaxshiroq? Javob
// kanalning O'Z odatiy natijasiga bog'liq.
//
// Shuning uchun har bir post o'z kanalining medianasiga bo'linadi:
//
//     nisbat = post natijasi / shu kanalning odatdagi natijasi
//
// «2.4× odatdagidan» — bu platformadan qat'i nazar tushunarli va
// solishtirsa bo'ladigan raqam. Ro'yxat aynan shu bo'yicha saralanadi,
// xom son bo'yicha emas — aks holda ro'yxatni doim eng katta kanal
// egallab olardi.
// ─────────────────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  YOUTUBE: YouTubeIcon,
  TELEGRAM: TelegramIcon,
  INSTAGRAM: InstagramIcon,
  BLUESKY: BlueskyIcon,
};

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: 'YouTube',
  TELEGRAM: 'Telegram',
  INSTAGRAM: 'Instagram',
  BLUESKY: 'Bluesky',
};

function fmt(n: number | null) {
  if (n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Har bir kanal o'z asosiy ko'rsatkichiga ega: Bluesky ko'rishlarni
// umuman bermaydi (views doim null), shuning uchun u yerda like asosiy.
function primaryMetric(posts: Post[]): 'views' | 'likes' {
  const withViews = posts.filter((p) => p.views != null).length;
  return withViews >= posts.length / 2 ? 'views' : 'likes';
}

const METRIC_LABEL = { views: "ko'rish", likes: 'like' } as const;

interface Ranked {
  post: Post;
  platform: string;
  username: string | null;
  metric: 'views' | 'likes';
  value: number;
  /** Kanalning odatdagi natijasiga nisbati. 1 = odatdagidek. */
  ratio: number | null;
}

export default function PostsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [ranked, setRanked] = useState<Ranked[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const conns = await connectionsApi.list().catch(() => []);
      const supported = conns.filter(
        (c) => c.isActive && PLATFORM_LABELS[c.platform],
      );
      if (cancelled) return;
      setConnections(supported);

      if (!supported.length) {
        setLoading(false);
        return;
      }

      // Barcha kanallar bir vaqtda — ilgari faqat tanlangani olinardi.
      const results = await Promise.all(
        supported.map((c) =>
          postsApi
            .list(c.id, 50)
            .then((r) => ({ conn: c, posts: r.posts, username: r.username }))
            .catch(() => ({
              conn: c,
              posts: [] as Post[],
              username: null as string | null,
            })),
        ),
      );
      if (cancelled) return;

      const rows: Ranked[] = [];
      for (const { conn, posts, username } of results) {
        if (!posts.length) continue;
        const metric = primaryMetric(posts);
        const values = posts
          .map((p) => p[metric])
          .filter((v): v is number => v != null && v > 0);
        const base = median(values);

        for (const post of posts) {
          const value = post[metric];
          if (value == null) continue;
          rows.push({
            post,
            platform: conn.platform,
            username: username ?? conn.platformUsername,
            metric,
            value,
            ratio: base > 0 ? value / base : null,
          });
        }
      }

      rows.sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
      setRanked(rows);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const platformsPresent = useMemo(
    () => Array.from(new Set(ranked.map((r) => r.platform))),
    [ranked],
  );

  const visible = platformFilter
    ? ranked.filter((r) => r.platform === platformFilter)
    : ranked;

  const [hero, ...rest] = visible;

  return (
    <div className="mx-auto max-w-wide">
      <div className="min-w-0">
        <h1 className="text-title text-ink">Qaysi post ishladi?</h1>
        <p className="mt-1.5 max-w-reading text-body text-ink-3">
          Barcha kanallar bitta ro&apos;yxatda. Har bir post o&apos;z
          kanalining odatdagi natijasiga solishtiriladi — shuning uchun
          YouTube va Telegram yonma-yon tura oladi.
        </p>
      </div>

      {/* Platforma filtri — tab emas, chip. «Hammasi» asosiy holat. */}
      {platformsPresent.length > 1 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <FilterChip
            active={platformFilter === null}
            onClick={() => setPlatformFilter(null)}
            count={ranked.length}
          >
            Hammasi
          </FilterChip>
          {platformsPresent.map((p) => {
            const Icon = PLATFORM_ICONS[p];
            return (
              <FilterChip
                key={p}
                active={platformFilter === p}
                onClick={() => setPlatformFilter(p)}
                count={ranked.filter((r) => r.platform === p).length}
                icon={Icon ? <Icon className="h-3.5 w-3.5" /> : undefined}
              >
                {PLATFORM_LABELS[p] ?? p}
              </FilterChip>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <SkeletonCards count={4} height="h-24" />
        ) : !connections.length ? (
          <EmptyState
            icon={<FileText />}
            title="Hali kanal ulanmagan"
            description="YouTube, Telegram, Instagram yoki Bluesky ulang — postlaringiz shu yerda paydo bo'ladi."
            action={
              <Link href="/connections">
                <Button size="sm">Kanal ulash</Button>
              </Link>
            }
          />
        ) : !visible.length ? (
          <EmptyState
            icon={<FileText />}
            title="Post topilmadi"
            description="Kanallaringizni sinxronlab ko'ring — ma'lumot bir necha daqiqada keladi."
            action={
              <Link href="/connections">
                <Button size="sm" variant="secondary">
                  Kanallarga o&apos;tish
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {hero && <HeroPost row={hero} />}
            {rest.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {rest.map((row, i) => (
                  <PostRow key={row.post.id} row={row} rank={i + 2} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  count,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-9 items-center gap-2 rounded-full border px-3.5 text-small font-medium transition-all active:translate-y-px',
        active
          ? 'border-transparent bg-accent text-on-accent shadow-tile'
          : 'border-line bg-surface text-ink-2 hover:bg-surface-hover hover:text-ink',
      )}
    >
      {icon}
      {children}
      <span
        className={cn(
          'text-eyebrow tabular-nums',
          active ? 'text-on-accent/70' : 'text-ink-3',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function RatioBadge({ ratio }: { ratio: number | null }) {
  if (ratio == null) return null;
  const good = ratio >= 1;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-caption font-semibold tabular-nums',
        good
          ? 'bg-positive-quiet text-positive-ink'
          : 'bg-surface-sunken text-ink-3',
      )}
      title="Shu kanalning odatdagi postiga nisbatan"
    >
      {good ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {ratio.toFixed(1)}× odatdagidan
    </span>
  );
}

function Thumb({
  post,
  Icon,
  className,
}: {
  post: Post;
  Icon?: React.FC<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-control border border-line-subtle bg-surface-sunken',
        className,
      )}
    >
      {post.thumbnailUrl ? (
        <Image
          src={post.thumbnailUrl}
          alt=""
          width={240}
          height={135}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        Icon && <Icon className="h-6 w-6 opacity-40" />
      )}
    </div>
  );
}

function postTitle(post: Post) {
  return post.title ?? post.caption?.slice(0, 90) ?? 'Nomsiz post';
}

// Eng yaxshi post ro'yxatdagi qatordan kattaroq. Ilgari barcha postlar bir
// xil og'irlikda edi — eng yaxshisi eng yomonidan farq qilmasdi.
function HeroPost({ row }: { row: Ranked }) {
  const { post, platform, username, metric, value, ratio } = row;
  const Icon = PLATFORM_ICONS[platform];

  return (
    <div className="rounded-panel border border-accent-line bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent-ink" />
        <p className="text-eyebrow uppercase tracking-wider text-accent-ink">
          Eng yaxshi post
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <Thumb
          post={post}
          Icon={Icon}
          className="h-32 w-full sm:h-24 sm:w-40"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span className="text-caption text-ink-3">
              {PLATFORM_LABELS[platform] ?? platform}
              {username ? ` · @${username}` : ''}
            </span>
            {post.publishedAt && (
              <span className="text-caption text-ink-faint">
                {new Date(post.publishedAt).toLocaleDateString('uz-UZ')}
              </span>
            )}
          </div>

          <p className="mt-1.5 text-heading leading-snug text-ink">
            {postTitle(post)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-metric text-ink tabular-nums">
              {fmt(value)}
            </span>
            <span className="text-body text-ink-3">{METRIC_LABEL[metric]}</span>
            <RatioBadge ratio={ratio} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-caption text-ink-3">
            {post.likes != null && (
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {fmt(post.likes)}
              </span>
            )}
            {post.comments != null && (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {fmt(post.comments)}
              </span>
            )}
            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 font-medium text-accent-ink hover:underline"
              >
                Ochish
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PostRow({ row, rank }: { row: Ranked; rank: number }) {
  const { post, platform, metric, value, ratio } = row;
  const Icon = PLATFORM_ICONS[platform];
  // Chiziq nisbatni ko'rsatadi: 2× va undan yuqorisi to'liq to'ladi.
  const width = ratio == null ? 0 : Math.min((ratio / 2) * 100, 100);

  return (
    <div className="flex items-center gap-4 rounded-panel border border-line-subtle bg-surface p-3.5 shadow-tile transition-colors hover:border-line">
      <span className="w-5 shrink-0 text-right font-mono text-caption tabular-nums text-ink-faint">
        {rank}
      </span>

      <Thumb post={post} Icon={Icon} className="h-12 w-20" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
          {post.url ? (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-small font-medium text-ink hover:text-accent-ink"
            >
              {postTitle(post)}
            </a>
          ) : (
            <span className="truncate text-small font-medium text-ink">
              {postTitle(post)}
            </span>
          )}
        </div>

        {/* Nisbat chizig'i — sonni o'qimasdan ham taqqoslash mumkin */}
        <div className="mt-2 h-1 w-full max-w-56 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={cn(
              'h-full rounded-full',
              (ratio ?? 0) >= 1 ? 'bg-positive' : 'bg-line-strong',
            )}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-small font-semibold tabular-nums text-ink">
          {fmt(value)}
        </p>
        <p className="text-eyebrow text-ink-3">{METRIC_LABEL[metric]}</p>
      </div>

      <div className="hidden shrink-0 md:block">
        <RatioBadge ratio={ratio} />
      </div>
    </div>
  );
}
