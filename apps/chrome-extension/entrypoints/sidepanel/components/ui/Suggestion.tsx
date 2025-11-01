/**
 * Suggestion Components
 * 
 * Displays clickable suggestion chips for user interaction
 * Adapted from AI Elements
 */

import { type ComponentProps } from 'react';
import { Button } from './Button';
import { cn } from '../../../../src/lib/utils';

export interface SuggestionsProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Suggestions - container for suggestion chips with horizontal scroll
 */
export function Suggestions({
  className,
  children,
  ...props
}: SuggestionsProps) {
  return (
    <div className="w-full" {...props}>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {children}
      </div>
    </div>
  );
}

export interface SuggestionProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
  suggestion: string;
  onClick?: (suggestion: string) => void;
}

/**
 * Suggestion - individual clickable suggestion chip
 */
export function Suggestion({
  suggestion,
  onClick,
  className,
  variant = 'outline',
  size = 'sm',
  children,
  ...props
}: SuggestionProps) {
  function handleClick() {
    onClick?.(suggestion);
  }

  return (
    <Button
      className={cn('cursor-pointer rounded-full px-3 py-1 text-xs border-nb-blue/30 bg-nb-blue/20 hover:bg-nb-blue/30 text-nb-blue h-auto min-h-0', className)}
      onClick={handleClick}
      type="button"
      variant="outline"
      {...props}
    >
      {children || suggestion}
    </Button>
  );
}
