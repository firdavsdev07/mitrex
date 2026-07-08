import { apiClient } from "./client";

export interface Website {
  id: string;
  name: string;
  domain: string | null;
  trackingKey: string;
  createdAt: string;
}

export interface AnalyticsOverview {
  visitors: number;
  pageViews: number;
  bounceRate: number;
  avgDuration: number;
  visitorChange: number;
  pageViewChange: number;
}

export interface TrendPoint {
  date: string;
  visitors: number;
  views: number;
}

export interface TopPage {
  path: string;
  views: number;
  uniqueVisitors: number;
  avgScrollDepth: number | null;
}

export interface EntryPage {
  path: string;
  entries: number;
}

export interface ExitPage {
  path: string;
  exits: number;
  exitRate: number;
}

export interface PagesResponse {
  pages: TopPage[];
  entryPages: EntryPage[];
  exitPages: ExitPage[];
}

export interface TrafficSource {
  source: string;
  visitors: number;
  percentage: number;
}

export interface UtmCampaign {
  source: string;
  medium: string;
  campaign: string;
  visitors: number;
  percentage: number;
}

export interface SourcesResponse {
  referrers: TrafficSource[];
  campaigns: UtmCampaign[];
}

export interface AudienceItem {
  name: string;
  count: number;
  percentage: number;
}

export interface AudienceStats {
  total: number;
  bounceRate: number;
  avgDuration: number;
  devices: AudienceItem[];
  browsers: AudienceItem[];
  countries: AudienceItem[];
}

export const websitesApi = {
  list: () => apiClient.get<Website[]>("/websites").then((r) => r.data),

  create: (data: { name: string; domain?: string }) =>
    apiClient.post<Website>("/websites", data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/websites/${id}`).then((r) => r.data),

  getScript: (id: string) =>
    apiClient.get<{ script: string; trackingKey: string }>(`/websites/${id}/script`).then((r) => r.data),

  getTrend: (id: string, period = "week") =>
    apiClient.get<TrendPoint[]>(`/websites/${id}/analytics/trend`, { params: { period } }).then((r) => r.data),

  getAnalytics: (id: string, period = "week") =>
    apiClient.get<AnalyticsOverview>(`/websites/${id}/analytics`, { params: { period } }).then((r) => r.data),

  getPages: (id: string, period = "week") =>
    apiClient.get<PagesResponse>(`/websites/${id}/analytics/pages`, { params: { period } }).then((r) => r.data),

  getSources: (id: string, period = "week") =>
    apiClient.get<SourcesResponse>(`/websites/${id}/analytics/sources`, { params: { period } }).then((r) => r.data),

  getSessions: (id: string, period = "week") =>
    apiClient.get<AudienceStats>(`/websites/${id}/analytics/sessions`, { params: { period } }).then((r) => r.data),

  getEvents: (id: string, period = "week") =>
    apiClient
      .get<{ period: string; events: { name: string; count: number; lastSeen: string | null }[] }>(
        `/websites/${id}/events`,
        { params: { period } }
      )
      .then((r) => r.data),

  getEventDetail: (id: string, name: string, period = "week") =>
    apiClient
      .get<{ id: string; path: string | null; properties: Record<string, unknown> | null; country: string | null; device: string | null; createdAt: string }[]>(
        `/websites/${id}/events/${encodeURIComponent(name)}`,
        { params: { period } }
      )
      .then((r) => r.data),

  getRealtime: (id: string) =>
    apiClient.get<{ activeVisitors: number; pages: { path: string; count: number }[] }>(`/websites/${id}/realtime`).then((r) => r.data),
};
