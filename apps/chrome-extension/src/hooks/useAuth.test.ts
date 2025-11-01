import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { authClient } from '@/src/lib/auth-client';
import { useQuery } from 'convex/react';

// Mock dependencies
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/src/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
    signIn: {
      social: vi.fn(),
    },
    signOut: vi.fn(),
  },
}));

vi.mock('../../convex/_generated/api', () => ({
  api: {
    auth: {
      getCurrentUser: 'getCurrentUser',
    },
  },
}));

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('session state', () => {
    it('should return loading state when session is pending', () => {
      (authClient.useSession as any).mockReturnValue({
        data: null,
        isPending: true,
        error: null,
      });

      (useQuery as any).mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return session data when authenticated', () => {
      const mockSession = {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
        },
      };

      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
        error: null,
      });

      (useQuery as any).mockReturnValue({
        id: 'user-123',
        name: 'Test User',
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
    });

    it('should return not authenticated when no session', () => {
      (authClient.useSession as any).mockReturnValue({
        data: null,
        isPending: false,
        error: null,
      });

      (useQuery as any).mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return error state when session fetch fails', () => {
      const mockError = new Error('Session fetch failed');

      (authClient.useSession as any).mockReturnValue({
        data: null,
        isPending: false,
        error: mockError,
      });

      (useQuery as any).mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      expect(result.current.error).toEqual(mockError);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('signIn functionality', () => {
    it('should provide signIn function', () => {
      (authClient.useSession as any).mockReturnValue({
        data: null,
        isPending: false,
        error: null,
      });

      (useQuery as any).mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      expect(result.current.signIn).toBeDefined();
      expect(typeof result.current.signIn).toBe('function');
    });

    it('should call authClient.signIn.social with google provider', async () => {
      (authClient.useSession as any).mockReturnValue({
        data: null,
        isPending: false,
        error: null,
      });

      (useQuery as any).mockReturnValue(null);

      const mockSignIn = vi.fn().mockResolvedValue({ url: 'https://oauth.url' });
      (authClient.signIn.social as any) = mockSignIn;

      const { result } = renderHook(() => useAuth());

      await result.current.signIn();

      expect(mockSignIn).toHaveBeenCalledWith({ provider: 'google' });
    });
  });

  describe('signOut functionality', () => {
    it('should provide signOut function', () => {
      (authClient.useSession as any).mockReturnValue({
        data: { user: { id: '123' } },
        isPending: false,
        error: null,
      });

      (useQuery as any).mockReturnValue({ id: '123' });

      const { result } = renderHook(() => useAuth());

      expect(result.current.signOut).toBeDefined();
      expect(typeof result.current.signOut).toBe('function');
    });

    it('should call authClient.signOut when invoked', async () => {
      (authClient.useSession as any).mockReturnValue({
        data: { user: { id: '123' } },
        isPending: false,
        error: null,
      });

      (useQuery as any).mockReturnValue({ id: '123' });

      const mockSignOut = vi.fn().mockResolvedValue(undefined);
      (authClient.signOut as any) = mockSignOut;

      const { result } = renderHook(() => useAuth());

      await result.current.signOut();

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('user data integration', () => {
    it('should fetch user data from Convex when authenticated', () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
        error: null,
      });

      const mockUser = { id: 'user-123', name: 'Test User' };
      (useQuery as any).mockReturnValue(mockUser);

      const { result } = renderHook(() => useAuth());

      expect(useQuery).toHaveBeenCalledWith('getCurrentUser');
      expect(result.current.user).toEqual(mockUser);
    });

    it('should not fetch user data when not authenticated', () => {
      (authClient.useSession as any).mockReturnValue({
        data: null,
        isPending: false,
        error: null,
      });

      (useQuery as any).mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
    });
  });

  describe('authentication state derivation', () => {
    it('should derive isAuthenticated from session presence', () => {
      // Test authenticated state
      (authClient.useSession as any).mockReturnValue({
        data: { user: { id: '123' } },
        isPending: false,
        error: null,
      });

      (useQuery as any).mockReturnValue({ id: '123' });

      const { result: resultAuth } = renderHook(() => useAuth());
      expect(resultAuth.current.isAuthenticated).toBe(true);

      // Test unauthenticated state
      (authClient.useSession as any).mockReturnValue({
        data: null,
        isPending: false,
        error: null,
      });

      (useQuery as any).mockReturnValue(null);

      const { result: resultUnauth } = renderHook(() => useAuth());
      expect(resultUnauth.current.isAuthenticated).toBe(false);
    });
  });
});
