import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsTab } from './SettingsTab';

// Mock the API functions
vi.mock('../../../../src/lib/translatorApi', () => ({
  checkTranslatorAvailability: vi.fn().mockResolvedValue({ status: 'available' }),
  SUPPORTED_LANGUAGES: [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
  ],
}));

vi.mock('../../../../src/lib/promptApi', () => ({
  checkAvailability: vi.fn().mockResolvedValue({ status: 'available' }),
}));

vi.mock('../../../../src/lib/summarizerApi', () => ({
  checkSummarizerAvailability: vi.fn().mockResolvedValue({ status: 'ready' }),
}));

vi.mock('../../../../src/lib/rewriterApi', () => ({
  checkRewriterAvailability: vi.fn().mockResolvedValue({ status: 'available' }),
}));

vi.mock('../../../../src/lib/auth-client', () => ({
  useSession: vi.fn().mockReturnValue({
    data: null,
    isPending: false,
  }),
  authClient: {
    signIn: {
      social: vi.fn().mockResolvedValue({}),
    },
    signOut: vi.fn().mockResolvedValue({}),
  },
}));

// Mock chrome.storage.local
const mockChromeStorage = {
  get: vi.fn().mockResolvedValue({}),
  set: vi.fn().mockResolvedValue(undefined),
};

// @ts-ignore - Mock chrome API
global.chrome = {
  storage: {
    local: mockChromeStorage,
  },
  runtime: {
    getURL: vi.fn((path) => `chrome-extension://test/${path}`),
  },
};

// Mock navigator.storage.estimate
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: vi.fn().mockResolvedValue({
      usage: 100_000_000, // 100MB
      quota: 500_000_000, // 500MB
    }),
  },
  writable: true,
});

describe('SettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all section headers', async () => {
    render(<SettingsTab />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Translation Language')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('Chrome AI Status')).toBeInTheDocument();
      expect(screen.getByText('Authentication')).toBeInTheDocument();
    });
  });

  describe('Storage Section', () => {
    it('should display storage quota correctly', async () => {
      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText(/100\.00 MB \/ 500\.00 MB used/i)).toBeInTheDocument();
        expect(screen.getByText('20%')).toBeInTheDocument();
      });
    });

    it('should show progress bar with correct width', async () => {
      render(<SettingsTab />);

      await waitFor(() => {
        const progressBar = document.querySelector('.bg-nb-blue.h-2\\.5');
        expect(progressBar).toHaveStyle({ width: '20%' });
      });
    });

    it('should show manage storage button as disabled', async () => {
      render(<SettingsTab />);

      await waitFor(() => {
        const button = screen.getByText(/Manage Storage \(Coming Soon\)/i);
        expect(button).toBeDisabled();
      });
    });

    it('should show loading state when quota not yet loaded', () => {
      // Mock storage.estimate to return null initially
      vi.spyOn(navigator.storage, 'estimate').mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      render(<SettingsTab />);

      expect(screen.getByText('Loading storage information...')).toBeInTheDocument();
    });
  });

  describe('AI Status Section', () => {
    it('should display all AI API statuses', async () => {
      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText('Prompt API')).toBeInTheDocument();
        expect(screen.getByText('Rewriter API')).toBeInTheDocument();
        expect(screen.getByText('Summarizer API')).toBeInTheDocument();
        expect(screen.getByText('Translator API')).toBeInTheDocument();
      });
    });

    it('should show available status with checkmark icon', async () => {
      render(<SettingsTab />);

      await waitFor(() => {
        const promptStatus = screen.getByText('Prompt API').parentElement;
        expect(promptStatus?.textContent).toContain('✅');
        expect(promptStatus?.textContent).toContain('Available');
      });
    });

    it('should handle downloading status', async () => {
      const { checkAvailability } = await import('../../../../src/lib/promptApi');
      vi.mocked(checkAvailability).mockResolvedValueOnce({ status: 'downloading' });

      render(<SettingsTab />);

      await waitFor(() => {
        const promptStatus = screen.getByText('Prompt API').parentElement;
        expect(promptStatus?.textContent).toContain('⏳');
        expect(promptStatus?.textContent).toContain('Downloading');
      });
    });

    it('should handle unavailable status', async () => {
      const { checkRewriterAvailability } = await import('../../../../src/lib/rewriterApi');
      vi.mocked(checkRewriterAvailability).mockResolvedValueOnce({ 
        status: 'unavailable',
        error: 'Not supported',
      });

      render(<SettingsTab />);

      await waitFor(() => {
        const rewriterStatus = screen.getByText('Rewriter API').parentElement;
        expect(rewriterStatus?.textContent).toContain('❌');
        expect(rewriterStatus?.textContent).toContain('Unavailable');
      });
    });
  });

  describe('Authentication Section', () => {
    it('should show sign in button when not authenticated', async () => {
      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
      });
    });

    it('should call signIn when sign in button clicked', async () => {
      const user = userEvent.setup();
      const { authClient } = await import('../../../../src/lib/auth-client');
      
      render(<SettingsTab />);

      await waitFor(() => {
        const signInButton = screen.getByRole('button', { name: /sign in with google/i });
        return user.click(signInButton);
      });

      expect(authClient.signIn.social).toHaveBeenCalledWith({
        provider: 'google',
        callbackURL: 'chrome-extension://test/auth-callback.html',
      });
    });

    it('should show user info when authenticated', async () => {
      const { useSession } = await import('../../../../src/lib/auth-client');
      vi.mocked(useSession).mockReturnValue({
        data: {
          session: { id: 'session-1' },
          user: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            image: 'https://example.com/avatar.jpg',
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        isPending: false,
        error: null,
      } as any);

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
      });
    });

    it('should show user avatar when authenticated', async () => {
      const { useSession } = await import('../../../../src/lib/auth-client');
      vi.mocked(useSession).mockReturnValue({
        data: {
          session: { id: 'session-1' },
          user: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            image: 'https://example.com/avatar.jpg',
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        isPending: false,
        error: null,
      } as any);

      render(<SettingsTab />);

      await waitFor(() => {
        const avatar = screen.getByRole('img', { name: 'Test User' });
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      });
    });

    it('should call signOut when sign out button clicked', async () => {
      const user = userEvent.setup();
      const { useSession, authClient } = await import('../../../../src/lib/auth-client');
      
      vi.mocked(useSession).mockReturnValue({
        data: {
          session: { id: 'session-1' },
          user: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            image: null,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        isPending: false,
        error: null,
      } as any);

      render(<SettingsTab />);

      await waitFor(async () => {
        const signOutButton = screen.getByRole('button', { name: /sign out/i });
        await user.click(signOutButton);
      });

      expect(authClient.signOut).toHaveBeenCalled();
    });

    it('should show loading state when auth is pending', async () => {
      const { useSession } = await import('../../../../src/lib/auth-client');
      vi.mocked(useSession).mockReturnValue({
        data: null,
        isPending: true,
        error: null,
      } as any);

      render(<SettingsTab />);

      await waitFor(() => {
        // Find the loading text in the authentication section
        const authSection = screen.getByText('Authentication').parentElement?.parentElement;
        expect(authSection?.textContent).toMatch(/Loading\.\.\./i);
      });
    });
  });

  describe('Version Section', () => {
    it('should display version number', async () => {
      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText('Version 0.1.0')).toBeInTheDocument();
      });
    });
  });

  describe('Integration', () => {
    it('should load all sections in parallel on mount', async () => {
      const { checkAvailability } = await import('../../../../src/lib/promptApi');
      const { checkSummarizerAvailability } = await import('../../../../src/lib/summarizerApi');
      const { checkRewriterAvailability } = await import('../../../../src/lib/rewriterApi');
      const { checkTranslatorAvailability } = await import('../../../../src/lib/translatorApi');

      render(<SettingsTab />);

      await waitFor(() => {
        expect(checkAvailability).toHaveBeenCalled();
        expect(checkSummarizerAvailability).toHaveBeenCalled();
        expect(checkRewriterAvailability).toHaveBeenCalled();
        expect(checkTranslatorAvailability).toHaveBeenCalled();
        expect(navigator.storage.estimate).toHaveBeenCalled();
      });
    });

    it('should handle storage quota failure gracefully', async () => {
      vi.spyOn(navigator.storage, 'estimate').mockRejectedValueOnce(new Error('Storage API failed'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<SettingsTab />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[Settings] Failed to get storage quota:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
