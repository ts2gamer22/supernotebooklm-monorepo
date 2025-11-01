import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProfile } from './UserProfile';
import { authClient } from '@/src/lib/auth-client';

// Mock dependencies
vi.mock('@/src/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('./SignInButton', () => ({
  SignInButton: () => <button>Mocked Sign In Button</button>,
}));

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should display loading message when session is pending', () => {
      (authClient.useSession as any).mockReturnValue({
        data: null,
        isPending: true,
      });

      render(<UserProfile />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('unauthenticated state', () => {
    it('should display SignInButton when no session', () => {
      (authClient.useSession as any).mockReturnValue({
        data: null,
        isPending: false,
      });

      render(<UserProfile />);

      expect(screen.getByText('Mocked Sign In Button')).toBeInTheDocument();
    });

    it('should not display user profile when not authenticated', () => {
      (authClient.useSession as any).mockReturnValue({
        data: null,
        isPending: false,
      });

      render(<UserProfile />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
    });
  });

  describe('authenticated state', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/avatar.jpg',
      },
    };

    it('should display user name when authenticated', () => {
      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display user email when authenticated', () => {
      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display user avatar when available', () => {
      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      const avatar = screen.getByRole('img');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(avatar).toHaveAttribute('alt', 'John Doe');
    });

    it('should display sign out button when authenticated', () => {
      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should display "User" as fallback name when name is missing', () => {
      const sessionWithoutName = {
        user: {
          ...mockSession.user,
          name: null,
        },
      };

      (authClient.useSession as any).mockReturnValue({
        data: sessionWithoutName,
        isPending: false,
      });

      render(<UserProfile />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('alt', 'User');
    });
  });

  describe('sign-out functionality', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/avatar.jpg',
      },
    };

    it('should call authClient.signOut when sign out button is clicked', async () => {
      const mockSignOut = vi.fn().mockResolvedValue(undefined);
      (authClient.signOut as any) = mockSignOut;

      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('should handle sign out errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockSignOut = vi.fn().mockRejectedValue(new Error('Sign out failed'));
      (authClient.signOut as any) = mockSignOut;

      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('avatar handling', () => {
    it('should not render avatar when image is missing', () => {
      const sessionWithoutImage = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          image: null,
        },
      };

      (authClient.useSession as any).mockReturnValue({
        data: sessionWithoutImage,
        isPending: false,
      });

      render(<UserProfile />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render avatar with correct styling classes', () => {
      const mockSession = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          image: 'https://example.com/avatar.jpg',
        },
      };

      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      const avatar = screen.getByRole('img');
      expect(avatar.className).toContain('rounded-full');
    });
  });

  describe('text truncation', () => {
    it('should apply truncate class to long names', () => {
      const mockSession = {
        user: {
          id: 'user-123',
          name: 'Very Long User Name That Should Be Truncated',
          email: 'verylongemailaddress@example.com',
          image: 'https://example.com/avatar.jpg',
        },
      };

      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      const nameElement = screen.getByText(/Very Long User Name/);
      expect(nameElement.className).toContain('truncate');
    });

    it('should apply truncate class to long emails', () => {
      const mockSession = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'verylongemailaddress@example.com',
          image: 'https://example.com/avatar.jpg',
        },
      };

      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      const emailElement = screen.getByText('verylongemailaddress@example.com');
      expect(emailElement.className).toContain('truncate');
    });
  });

  describe('styling', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/avatar.jpg',
      },
    };

    it('should apply correct container styles', () => {
      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      const { container } = render(<UserProfile />);

      const profileContainer = container.firstChild;
      expect(profileContainer).toHaveClass('flex', 'items-center');
    });

    it('should apply hover styles to sign out button', () => {
      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      const signOutButton = screen.getByText('Sign Out');
      expect(signOutButton.className).toContain('hover:bg-nb-dark-400');
    });
  });

  describe('accessibility', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/avatar.jpg',
      },
    };

    it('should have accessible button', () => {
      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      const button = screen.getByRole('button', { name: /sign out/i });
      expect(button).toBeInTheDocument();
    });

    it('should have descriptive alt text for avatar', () => {
      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      (authClient.useSession as any).mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      render(<UserProfile />);

      const button = screen.getByRole('button', { name: /sign out/i });
      button.focus();

      expect(button).toHaveFocus();
    });
  });
});
