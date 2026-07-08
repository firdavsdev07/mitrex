import { apiClient } from "./client";

export type Period = "today" | "week" | "month";

export interface PlatformWidget {
  platform: string;
  username: string | null;
  followers: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  engagement: number | null;
  growth: number | null;
  lastSync: string | null;
}

export interface TopPageEntry {
  path: string;
  views: number;
}

export interface WebWidget {
  id: string;
  name: string;
  domain: string | null;
  views: number;
  topPages: TopPageEntry[];
}

export interface DashboardOverview {
  period: Period;
  platforms: PlatformWidget[];
  websites: WebWidget[];
  summary: {
    totalPlatforms: number;
    totalWebsites: number;
    totalWebViews: number;
  };
}

export interface TrendPoint {
  date: string;
  views: number;
}

export interface PlatformHistoryPoint {
  date: string;
  followers: number | null;
  views: number | null;
}

export const dashboardApi = {
  overview: (period: Period = "week") =>
    apiClient.get<DashboardOverview>("/dashboard", { params: { period } }).then((r) => r.data),

  webTrend: (days = 14) =>
    apiClient.get<TrendPoint[]>("/dashboard/web-trend", { params: { days } }).then((r) => r.data),

  platformHistory: (platform: string, days = 30) =>
    apiClient
      .get<{ platform: string; username: string | null; history: PlatformHistoryPoint[] }>(
        `/dashboard/history/${platform}`,
        { params: { days } }
      )
      .then((r) => r.data),

  syncNow: () => apiClient.get("/dashboard/sync").then((r) => r.data),
};
