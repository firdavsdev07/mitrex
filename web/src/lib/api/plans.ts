import { apiClient } from './client';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price: string;
  currency: string;
  maxWebsites: number;
  maxPlatforms: number;
  maxMonthlyViews: number;
  dataRetentionDays: number;
  hasAiInsights: boolean;
  hasWeeklyReport: boolean;
  hasCustomAlerts: boolean;
}

export const plansApi = {
  list: () => apiClient.get<Plan[]>('/plans').then((r) => r.data),
};
