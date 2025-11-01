/**
 * Badge Component
 * Small label component for displaying tags and categories
 */

import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors';
    
    const variantStyles = {
      default: 'bg-blue-600 text-white',
      secondary: 'bg-gray-700 text-gray-200',
      outline: 'border border-gray-600 bg-transparent text-gray-300',
    };
    
    return (
      <span
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
