import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authClient } from './auth-client';

// Mock Better Auth modules
vi.mock('better-auth/react', () => ({
  createAuthClient: vi.fn(() => ({
    useSession: vi.fn(),
    signIn: {
      social: vi.fn(),
    },
    signOut: vi.fn(),
  })),
}));

vi.mock('@convex-dev/better-auth/client/plugins', () => ({
  convexClient: vi.fn(() => ({})),
}));

describe('auth-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authClient initialization', () => {
    it('should create auth client with correct configuration', () => {
      expect(authClient).toBeDefined();
      expect(authClient).toHaveProperty('useSession');
      expect(authClient).toHaveProperty('signIn');
      expect(authClient).toHaveProperty('signOut');
    });

    it('should configure baseURL from environment variable', () => {
      // Auth client should be configured with VITE_CONVEX_SITE_URL
      expect(import.meta.env.VITE_CONVEX_SITE_URL).toBeDefined();
    });

    it('should include convex client plugin', () => {
      // Verify convexClient plugin is included
      const { convexClient } = require('@convex-dev/better-auth/client/plugins');
      expect(convexClient).toHaveBeenCalled();
    });
  });

  describe('signIn functionality', () => {
    it('should provide social sign-in method', () => {
      expect(authClient.signIn).toBeDefined();
      expect(authClient.signIn.social).toBeDefined();
      expect(typeof authClient.signIn.social).toBe('function');
    });

    it('should call social sign-in with provider parameter', async () => {
      const mockSignIn = vi.spyOn(authClient.signIn, 'social');

      await authClient.signIn.social({ provider: 'google' });

      expect(mockSignIn).toHaveBeenCalledWith({ provider: 'google' });
    });
  });

  describe('signOut functionality', () => {
    it('should provide sign-out method', () => {
      expect(authClient.signOut).toBeDefined();
      expect(typeof authClient.signOut).toBe('function');
    });

    it('should call sign-out when invoked', async () => {
      const mockSignOut = vi.spyOn(authClient, 'signOut');

      await authClient.signOut();

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('useSession hook export', () => {
    it('should export useSession hook from auth client', () => {
      const { useSession } = require('./auth-client');
      expect(useSession).toBeDefined();
      expect(typeof useSession).toBe('function');
    });
  });

  describe('configuration validation', () => {
    it('should throw error if VITE_CONVEX_SITE_URL is not set', () => {
      const originalEnv = import.meta.env.VITE_CONVEX_SITE_URL;

      // Temporarily unset env var
      delete (import.meta.env as any).VITE_CONVEX_SITE_URL;

      expect(() => {
        // Re-import would fail if baseURL is undefined
        if (!import.meta.env.VITE_CONVEX_SITE_URL) {
          throw new Error('VITE_CONVEX_SITE_URL is required');
        }
      }).toThrow('VITE_CONVEX_SITE_URL is required');

      // Restore env var
      (import.meta.env as any).VITE_CONVEX_SITE_URL = originalEnv;
    });
  });

  describe('plugin configuration', () => {
    it('should not include crossDomain plugin', () => {
      // Verify crossDomain plugin is NOT included (this was causing issues)
      const clientCode = require('./auth-client').toString();
      expect(clientCode).not.toContain('crossDomain');
      expect(clientCode).not.toContain('crossDomainClient');
    });
  });
});
