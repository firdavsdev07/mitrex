import { apiClient } from "./client";

export interface AdminStats {
  totalUsers: number;
  newUsersThisMonth: number;
  activeConnections: number;
  totalWebsites: number;
  totalViews: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: "USER" | "ADMIN";
  provider: string;
  deletedAt: string | null;
  createdAt: string;
  subscription: { plan: { name: string; slug: string } } | null;
  _count: { connections: number; websites: number };
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price: string;
  currency: string;
  maxWebsites: number;
  maxPlatforms: number;
  maxMonthlyViews: number;
  hasAiInsights: boolean;
  hasWeeklyReport: boolean;
  hasCustomAlerts: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface PlatformConfig {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  enabled: boolean;
  comingSoon: boolean;
  sortOrder: number;
}

export const adminApi = {
  getStats: () =>
    apiClient.get<AdminStats>("/admin/stats").then((r) => r.data),

  getUsers: (params?: { page?: number; search?: string; deleted?: boolean }) =>
    apiClient.get<AdminUsersResponse>("/admin/users", { params }).then((r) => r.data),

  getUserDetail: (id: string) =>
    apiClient.get(`/admin/users/${id}`).then((r) => r.data),

  banUser: (id: string, banned: boolean) =>
    apiClient.patch(`/admin/users/${id}/ban`, { banned }).then((r) => r.data),

  changeUserPlan: (id: string, plan: string) =>
    apiClient.patch(`/admin/users/${id}/plan`, { plan }).then((r) => r.data),

  getPlans: () =>
    apiClient.get<Plan[]>("/admin/plans").then((r) => r.data),

  createPlan: (data: Partial<Plan>) =>
    apiClient.post<Plan>("/admin/plans", data).then((r) => r.data),

  updatePlan: (id: string, data: Partial<Plan>) =>
    apiClient.patch<Plan>(`/admin/plans/${id}`, data).then((r) => r.data),

  deletePlan: (id: string) =>
    apiClient.delete(`/admin/plans/${id}`).then((r) => r.data),

  getPlatforms: () =>
    apiClient.get<PlatformConfig[]>("/admin/platforms").then((r) => r.data),

  togglePlatform: (slug: string, data: { enabled?: boolean; comingSoon?: boolean }) =>
    apiClient.patch(`/admin/platforms/${slug}`, data).then((r) => r.data),

  getQueueStats: () =>
    apiClient.get("/admin/queue").then((r) => r.data),
};
