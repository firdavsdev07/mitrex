import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, loginAndStore } from '../auth';
import * as apiClient from '@/lib/api/client';

// Mock the client functions
vi.mock('@/lib/api/client', () => ({
  setToken: vi.fn(),
  removeToken: vi.fn(),
}));

describe('Auth Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, isLoading: false });
  });

  it('should initialize with null user and false loading', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('should set user correctly', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@metrix.uz',
      name: 'Test User',
      role: 'ADMIN' as const,
      isTwoFactorEnabled: false,
    };

    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('should set loading state correctly', () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);

    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('should logout and clear states', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@metrix.uz',
      name: 'Test User',
      role: 'ADMIN' as const,
      isTwoFactorEnabled: false,
    };
    useAuthStore.setState({ user: mockUser });

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(apiClient.removeToken).toHaveBeenCalledTimes(1);
  });

  it('should set token and user on loginAndStore', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@metrix.uz',
      name: 'Test User',
      role: 'ADMIN' as const,
      isTwoFactorEnabled: false,
    };
    const mockToken = 'mock-access-token';

    loginAndStore(mockToken, mockUser);

    expect(apiClient.setToken).toHaveBeenCalledWith(mockToken);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });
});
