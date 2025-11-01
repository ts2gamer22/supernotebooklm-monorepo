import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignInButton } from './SignInButton';
import { authClient } from '@/src/lib/auth-client';

// Mock auth client
vi.mock('@/src/lib/auth-client', () => ({
  authClient: {
    signIn: {
      social: vi.fn(),
    },
  },
}));

// Mock window.open
const mockWindowOpen = vi.fn();
global.window.open = mockWindowOpen;

describe('SignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindowOpen.mockReturnValue({
      closed: false,
      close: vi.fn(),
    });
  });

  describe('rendering', () => {
    it('should render sign-in button', () => {
      render(<SignInButton />);

      const button = screen.getByRole('button', { name: /sign in with google/i });
      expect(button).toBeInTheDocument();
    });

    it('should display correct button text when not loading', () => {
      render(<SignInButton />);

      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });

    it('should not display error message initially', () => {
      render(<SignInButton />);

      const errorMessage = screen.queryByText(/failed to sign in/i);
      expect(errorMessage).not.toBeInTheDocument();
    });
  });

  describe('sign-in flow', () => {
    it('should call authClient.signIn.social when button is clicked', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        url: 'https://oauth.google.com/authorize?client_id=123',
      });
      (authClient.signIn.social as any) = mockSignIn;

      render(<SignInButton />);

      const button = screen.getByRole('button', { name: /sign in with google/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          provider: 'google',
          callbackURL: expect.stringContaining('convex.site'),
          disableRedirect: true,
        });
      });
    });

    it('should open popup window with OAuth URL', async () => {
      const oauthUrl = 'https://oauth.google.com/authorize?client_id=123';
      (authClient.signIn.social as any) = vi.fn().mockResolvedValue({ url: oauthUrl });

      render(<SignInButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          oauthUrl,
          'google-oauth',
          expect.stringContaining('width=600')
        );
      });
    });

    it('should display loading state while signing in', async () => {
      (authClient.signIn.social as any) = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<SignInButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
      });
    });

    it('should disable button while loading', async () => {
      (authClient.signIn.social as any) = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<SignInButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('should display error message when sign-in fails', async () => {
      const errorMessage = 'Network error';
      (authClient.signIn.social as any) = vi.fn().mockRejectedValue(new Error(errorMessage));

      render(<SignInButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display error when OAuth URL is missing', async () => {
      (authClient.signIn.social as any) = vi.fn().mockResolvedValue({});

      render(<SignInButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/failed to get oauth url/i)).toBeInTheDocument();
      });
    });

    it('should display error when popup is blocked', async () => {
      (authClient.signIn.social as any) = vi.fn().mockResolvedValue({
        url: 'https://oauth.google.com',
      });
      mockWindowOpen.mockReturnValue(null);

      render(<SignInButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/failed to open authentication popup/i)).toBeInTheDocument();
      });
    });

    it('should clear error on retry', async () => {
      // First attempt fails
      (authClient.signIn.social as any) = vi.fn().mockRejectedValueOnce(new Error('First error'));

      render(<SignInButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Second attempt succeeds
      (authClient.signIn.social as any) = vi.fn().mockResolvedValue({
        url: 'https://oauth.google.com',
      });

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });
  });

  describe('popup management', () => {
    it('should poll for popup closure', async () => {
      const mockPopup = {
        closed: false,
        close: vi.fn(),
      };

      mockWindowOpen.mockReturnValue(mockPopup);

      (authClient.signIn.social as any) = vi.fn().mockResolvedValue({
        url: 'https://oauth.google.com',
      });

      render(<SignInButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalled();
      });

      // Simulate popup closing
      mockPopup.closed = true;

      await waitFor(
        () => {
          // Button should re-enable after popup closes
          expect(button).not.toBeDisabled();
        },
        { timeout: 2000 }
      );
    });

    it('should handle timeout for long-running auth', async () => {
      vi.useFakeTimers();

      const mockPopup = {
        closed: false,
        close: vi.fn(),
      };

      mockWindowOpen.mockReturnValue(mockPopup);

      (authClient.signIn.social as any) = vi.fn().mockResolvedValue({
        url: 'https://oauth.google.com',
      });

      render(<SignInButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalled();
      });

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(300000); // 5 minutes

      await waitFor(() => {
        expect(screen.getByText(/authentication timed out/i)).toBeInTheDocument();
      });

      expect(mockPopup.close).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('environment configuration', () => {
    it('should use VITE_CONVEX_SITE_URL for callback', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        url: 'https://oauth.google.com',
      });
      (authClient.signIn.social as any) = mockSignIn;

      render(<SignInButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          provider: 'google',
          callbackURL: expect.any(String),
          disableRedirect: true,
        });

        const callArgs = mockSignIn.mock.calls[0][0];
        expect(callArgs.callbackURL).toContain('convex.site');
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper button role', () => {
      render(<SignInButton />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<SignInButton />);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });

    it('should indicate loading state to screen readers', async () => {
      (authClient.signIn.social as any) = vi.fn().mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<SignInButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute('disabled');
      });
    });
  });

  describe('styling', () => {
    it('should apply correct CSS classes', () => {
      render(<SignInButton />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-nb-blue');
    });

    it('should apply disabled styles when loading', async () => {
      (authClient.signIn.social as any) = vi.fn().mockImplementation(
        () => new Promise(() => {})
      );

      render(<SignInButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(button.className).toContain('disabled:opacity-50');
      });
    });
  });
});
