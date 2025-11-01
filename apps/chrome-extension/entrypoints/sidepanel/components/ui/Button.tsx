import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '../../../../src/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

/**
 * Button Component
 * Simple button with variant and size support
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nb-blue',
          'disabled:pointer-events-none disabled:opacity-50',
          // Variant styles
          variant === 'default' && 'bg-nb-blue text-white hover:bg-blue-600',
          variant === 'ghost' && 'hover:bg-nb-dark-300 hover:text-nb-text',
          variant === 'outline' && 'border border-nb-dark-300 bg-transparent hover:bg-nb-dark-200',
          // Size styles
          size === 'default' && 'h-10 px-4 py-2',
          size === 'sm' && 'h-9 px-3',
          size === 'icon' && 'h-9 w-9',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
