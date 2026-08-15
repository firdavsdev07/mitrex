import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import axios from 'axios';
import {
  apiClient,
  setToken,
  getToken,
  removeToken,
  bootstrapSession,
  logoutSession,
} from '../client';

// Mock axios module
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  const mockAxiosInstance = {
    create: vi.fn(() => mockAxiosInstance),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  };
  
  return {
    default: {
      ...actual,
      create: vi.fn(() => mockAxiosInstance),
      post: vi.fn(),
    },
  };
});

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    removeToken();
    
    // Reset window location if defined
    if (typeof window !== 'undefined') {
      // @ts-expect-error -- window.location majburiy (non-optional) maydon,
      // lekin testda redirect'ni kuzatish uchun uni almashtirish kerak.
      delete window.location;
      // @ts-expect-error -- to'liq Location obyekti emas, testga faqat shu
      // ikki maydon kerak.
      window.location = { href: '', pathname: '/dashboard' };
    }
  });

  it('should get, set and remove token properly', () => {
    expect(getToken()).toBeNull();
    setToken('test-token');
    expect(getToken()).toBe('test-token');
    removeToken();
    expect(getToken()).toBeNull();
  });

  it('should perform single-flight token refresh', async () => {
    const mockAccessToken = 'new-access-token';
    
    // Mock successful refresh response
    (axios.post as Mock).mockResolvedValue({
      data: { accessToken: mockAccessToken },
    });

    // Fire multiple concurrent bootstraps
    const [p1, p2, p3] = await Promise.all([
      bootstrapSession(),
      bootstrapSession(),
      bootstrapSession(),
    ]);

    // All should resolve to true
    expect(p1).toBe(true);
    expect(p2).toBe(true);
    expect(p3).toBe(true);
    expect(getToken()).toBe(mockAccessToken);

    // axios.post should have been called EXACTLY once
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it('should reset token to null if refresh fails', async () => {
    (axios.post as Mock).mockRejectedValue(new Error('Refresh failed'));

    const success = await bootstrapSession();
    expect(success).toBe(false);
    expect(getToken()).toBeNull();
  });

  it('should logout properly and clear token', async () => {
    setToken('old-token');
    apiClient.post = vi.fn().mockResolvedValue({ data: {} });

    await logoutSession();
    expect(getToken()).toBeNull();
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
  });
});
