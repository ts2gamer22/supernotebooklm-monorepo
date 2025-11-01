/**
 * CodeBlock Component
 * 
 * Provides syntax highlighting, line numbers, and copy to clipboard functionality
 * Adapted from AI Elements with our custom styling
 */

import { type ComponentProps, type HTMLAttributes, type ReactNode, createContext, useContext, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../../../src/lib/utils';

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: '',
});

export interface CodeBlockProps extends HTMLAttributes<HTMLDivElement> {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  children?: ReactNode;
}

/**
 * CodeBlock - displays code with syntax highlighting
 */
export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) {
  return (
    <CodeBlockContext.Provider value={{ code }}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-md border border-nb-dark-300 bg-nb-dark-200',
          className
        )}
        {...props}
      >
        <div className="relative">
          {/* Light theme (hidden in dark mode) */}
          <SyntaxHighlighter
            className="overflow-hidden !m-0"
            codeTagProps={{
              className: 'font-mono text-sm',
            }}
            customStyle={{
              margin: 0,
              padding: '1rem',
              fontSize: '0.875rem',
              background: 'hsl(var(--nb-dark-200))',
              color: 'hsl(var(--nb-text))',
            }}
            language={language}
            lineNumberStyle={{
              color: 'hsl(var(--nb-text-dim))',
              paddingRight: '1rem',
              minWidth: '2.5rem',
            }}
            showLineNumbers={showLineNumbers}
            style={oneDark}
          >
            {code}
          </SyntaxHighlighter>
          
          {/* Copy button positioned in top-right */}
          {children && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
}

export interface CodeBlockCopyButtonProps extends ComponentProps<typeof Button> {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
}

/**
 * CodeBlockCopyButton - copy button for code blocks
 */
export function CodeBlockCopyButton({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  async function copyToClipboard() {
    if (typeof window === 'undefined' || !navigator.clipboard?.writeText) {
      onError?.(new Error('Clipboard API not available'));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  }

  const Icon = isCopied ? Check : Copy;

  return (
    <Button
      className={cn('shrink-0', className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      type="button"
      title={isCopied ? 'Copied!' : 'Copy code'}
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
}
