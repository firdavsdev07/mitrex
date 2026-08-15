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
  hasAiInsights: boolean;
  hasWeeklyReport: boolean;
  hasCustomAlerts: boolean;
  isActive: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'TRIALING' | 'CANCELED' | 'EXPIRED';
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  plan: Plan;
}

export interface BillingDetailsResponse {
  subscription: UserSubscription | null;
  plan: Plan;
  isDefault: boolean;
  paymentMethod: unknown;
  nextBillingDate: string | null;
}

export interface CheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  plan?: string;
  message?: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  plan: string;
  downloadUrl: string | null;
}

export interface InvoicesResponse {
  invoices: Invoice[];
}

export const billingApi = {
  getSubscription: () =>
    apiClient.get<BillingDetailsResponse>('/billing').then((r) => r.data),

  checkout: (plan: string) =>
    apiClient.post<CheckoutResponse>('/billing/checkout', { plan }).then((r) => r.data),

  cancel: () =>
    apiClient.delete<{
      success: boolean;
      message: string;
      accessUntil: string | null;
    }>('/billing/cancel').then((r) => r.data),

  getInvoices: () =>
    apiClient.get<InvoicesResponse>('/billing/invoices').then((r) => r.data),
};
