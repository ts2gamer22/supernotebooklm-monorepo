import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthErrorBoundary } from './AuthErrorBoundary';

// Component that throws an error for testing
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

describe('AuthErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error in tests to avoid noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('normal rendering', () => {
    it('should render children when no error', () => {
      render(
        <AuthErrorBoundary>
          <div>Test Content</div>
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should not display error UI when no error occurs', () => {
      render(
        <AuthErrorBoundary>
          <div>Test Content</div>
        </AuthErrorBoundary>
      );

      expect(screen.queryByText('Authentication Error')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should catch and display error when child component throws', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    });

    it('should display error message when error occurs', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should display default error message when error has no message', () => {
      function ThrowEmptyError() {
        throw new Error();
      }

      render(
        <AuthErrorBoundary>
          <ThrowEmptyError />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('An authentication error occurred')).toBeInTheDocument();
    });

    it('should log error to console', () => {
      const consoleSpy = vi.spyOn(console, 'error');

      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Authentication error caught:',
        expect.any(Error),
        expect.anything()
      );
    });
  });

  describe('error details', () => {
    it('should display error details section', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      const details = screen.getByText('Error details');
      expect(details).toBeInTheDocument();
    });

    it('should display error stack when available', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      // Click to expand details
      const detailsButton = screen.getByText('Error details');
      fireEvent.click(detailsButton);

      // Error stack should be visible
      const errorStack = screen.getByText(/Test error/, { selector: 'pre' });
      expect(errorStack).toBeInTheDocument();
    });
  });

  describe('recovery actions', () => {
    it('should provide "Try Again" button', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should provide "Reload Extension" button', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Reload Extension')).toBeInTheDocument();
    });

    it('should reset error state when "Try Again" is clicked', () => {
      const { rerender } = render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      // Error is displayed
      expect(screen.getByText('Authentication Error')).toBeInTheDocument();

      // Click Try Again
      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      // Re-render with no error
      rerender(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={false} />
        </AuthErrorBoundary>
      );

      // Error should be cleared
      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Error')).not.toBeInTheDocument();
    });

    it('should reload window when "Reload Extension" is clicked', () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
      });

      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      const reloadButton = screen.getByText('Reload Extension');
      fireEvent.click(reloadButton);

      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('component lifecycle', () => {
    it('should initialize with hasError = false', () => {
      render(
        <AuthErrorBoundary>
          <div>Test Content</div>
        </AuthErrorBoundary>
      );

      // No error UI should be visible
      expect(screen.queryByText('Authentication Error')).not.toBeInTheDocument();
    });

    it('should update state when error is caught', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      // Error UI should be visible
      expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    });

    it('should maintain error state across re-renders', () => {
      const { rerender } = render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Authentication Error')).toBeInTheDocument();

      // Re-render
      rerender(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      // Error should still be displayed
      expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply dark theme styles to error container', () => {
      const { container } = render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      const errorContainer = container.querySelector('.bg-nb-dark-100');
      expect(errorContainer).toBeInTheDocument();
    });

    it('should apply error color to title', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      const title = screen.getByText('Authentication Error');
      expect(title.className).toContain('text-red-400');
    });

    it('should apply proper button styling', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      const tryAgainButton = screen.getByText('Try Again');
      expect(tryAgainButton.className).toContain('bg-nb-blue');
    });
  });

  describe('accessibility', () => {
    it('should have accessible buttons', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      const reloadButton = screen.getByRole('button', { name: /reload extension/i });

      expect(tryAgainButton).toBeInTheDocument();
      expect(reloadButton).toBeInTheDocument();
    });

    it('should have accessible details disclosure', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      const details = screen.getByText('Error details');
      expect(details).toBeInTheDocument();
      expect(details.closest('summary')).toHaveClass('cursor-pointer');
    });

    it('should be keyboard navigable', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      tryAgainButton.focus();

      expect(tryAgainButton).toHaveFocus();
    });
  });

  describe('error information display', () => {
    it('should display error message prominently', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      const errorMessage = screen.getByText('Test error');
      expect(errorMessage).toBeInTheDocument();
    });

    it('should handle complex error objects', () => {
      function ThrowComplexError() {
        const error = new Error('Complex error');
        error.stack = 'Error: Complex error\n  at ThrowComplexError';
        throw error;
      }

      render(
        <AuthErrorBoundary>
          <ThrowComplexError />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Complex error')).toBeInTheDocument();
    });
  });

  describe('static getDerivedStateFromError', () => {
    it('should derive error state from error object', () => {
      const error = new Error('Test error');

      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      // Verify error state is derived
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('componentDidCatch', () => {
    it('should capture error info', () => {
      const consoleSpy = vi.spyOn(console, 'error');

      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );

      // Verify componentDidCatch was called
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
