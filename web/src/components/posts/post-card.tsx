import Image from 'next/image';
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Users,
  BarChart2,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Post } from '@/lib/api/posts';

function fmt(n: number | null) {
  if (n === null) return null;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  FEED: 'Post',
  CAROUSEL_ALBUM: 'Post',
  REELS: 'Reels',
  STORY: 'Story',
};

function StatChip({
  icon: Icon,
  value,
  color = 'text-ink-3',
}: {
  icon: React.FC<{ className?: string }>;
  value: string | null;
  color?: string;
}) {
  if (value === null) return null;
  return (
    <span className={`flex items-center gap-1 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{value}</span>
    </span>
  );
}

export function PostCard({
  post,
  icon: Icon,
}: {
  post: Post;
  icon?: React.FC<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="w-20 h-14 rounded-control bg-surface-sunken border border-line flex items-center justify-center shrink-0 overflow-hidden">
            {post.thumbnailUrl ? (
              <Image
                src={post.thumbnailUrl}
                alt=""
                width={80}
                height={56}
                unoptimized
                className="w-full h-full object-cover"
              />
            ) : (
              Icon && <Icon className="w-6 h-6 text-ink-3" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Title + date */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                {post.contentType && CONTENT_TYPE_LABELS[post.contentType] && (
                  <Badge variant="default" className="mb-1">
                    {CONTENT_TYPE_LABELS[post.contentType]}
                  </Badge>
                )}
                {post.url ? (
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-ink hover:text-ink truncate block transition-colors"
                  >
                    {post.title ?? post.caption?.slice(0, 80) ?? 'Nomsiz post'}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-ink truncate">
                    {post.title ?? post.caption?.slice(0, 80) ?? 'Nomsiz post'}
                  </p>
                )}
                {post.publishedAt && (
                  <p className="text-xs text-ink-3 mt-0.5">
                    {new Date(post.publishedAt).toLocaleDateString('uz-UZ')}
                  </p>
                )}
              </div>
              {post.engagementRate !== null && (
                <Badge variant="orange" className="shrink-0">
                  {post.engagementRate.toFixed(1)}% eng
                </Badge>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 flex-wrap text-xs">
              {post.follows !== null && post.follows > 0 && (
                <span className="flex items-center gap-1 text-positive-ink font-medium">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+{fmt(post.follows)} obunachi</span>
                </span>
              )}
              <StatChip
                icon={Eye}
                value={fmt(post.views)}
                color="text-ink-2"
              />
              <StatChip
                icon={Heart}
                value={fmt(post.likes)}
                color="text-negative-ink"
              />
              {post.dislikes !== null && post.dislikes > 0 && (
                <StatChip
                  icon={TrendingUp}
                  value={`-${fmt(post.dislikes)}`}
                  color="text-ink-3"
                />
              )}
              <StatChip
                icon={MessageCircle}
                value={fmt(post.comments)}
                color="text-info-ink"
              />
              <StatChip
                icon={Share2}
                value={fmt(post.shares)}
                color="text-positive-ink"
              />
              {post.reach !== null && (
                <span className="flex items-center gap-1 text-ink-3">
                  <Users className="w-3.5 h-3.5" />
                  <span>{fmt(post.reach)} reach</span>
                </span>
              )}
              {post.impressions !== null && (
                <span className="flex items-center gap-1 text-ink-3">
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>{fmt(post.impressions)} imp</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
