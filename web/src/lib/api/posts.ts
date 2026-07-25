import { apiClient } from './client';

export interface Post {
  id: string;
  title: string | null;
  caption: string | null;
  // Instagram uchun: FEED / REELS / STORY / CAROUSEL_ALBUM. Boshqa
  // platformalarda null.
  contentType: string | null;
  thumbnailUrl: string | null;
  url: string | null;
  publishedAt: string | null;
  views: number | null;
  likes: number | null;
  dislikes: number | null;
  comments: number | null;
  shares: number | null;
  reach: number | null;
  impressions: number | null;
  engagementRate: number | null;
  // Shu post orqali qo'shilgan yangi obunachilar — hozircha faqat Instagram
  // FEED postlarida mavjud (Reels uchun Meta bu ma'lumotni bermaydi).
  follows: number | null;
}

export type SortMetric =
  'views' | 'likes' | 'comments' | 'engagementRate' | 'follows';

export interface PostsListResponse {
  posts: Post[];
  total: number;
  platform: string;
  username: string | null;
}

export const postsApi = {
  list: (connectionId: string, limit = 20, offset = 0) =>
    apiClient
      .get<PostsListResponse>(`/connections/${connectionId}/posts`, {
        params: { limit, offset },
      })
      .then((r) => r.data),

  top: (connectionId: string, metric: SortMetric = 'views') =>
    apiClient
      .get<Post[]>(`/connections/${connectionId}/posts/top`, {
        params: { metric },
      })
      .then((r) => r.data),
};
