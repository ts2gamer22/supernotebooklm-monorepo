/**
 * MessageActions Component
 * 
 * Provides action buttons for AI messages (Copy, Regenerate)
 * Adapted from AI Elements patterns
 */

import { useState } from 'react';
import { Copy, Check, RotateCcw, FileText, Loader2, Globe } from 'lucide-react';

interface MessageActionsProps {
  content: string;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
  onSummarize?: () => void;
  showSummarize?: boolean;
  isSummarizing?: boolean;
  hasSummary?: boolean;
  onTranslate?: () => void;
  showTranslate?: boolean;
  isTranslating?: boolean;
  hasTranslation?: boolean;
}

export function MessageActions({ 
  content, 
  onRegenerate, 
  showRegenerate = false,
  onSummarize,
  showSummarize = false,
  isSummarizing = false,
  hasSummary = false,
  onTranslate,
  showTranslate = false,
  isTranslating = false,
  hasTranslation = false
}: MessageActionsProps) {
  const [isCopied, setIsCopied] = useState(false);

  /**
   * Copy message content to clipboard
   */
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="relative size-8 p-1.5 text-nb-text-dim hover:text-nb-text hover:bg-nb-dark-300 rounded transition-colors"
        title="Copy message"
        type="button"
      >
        {isCopied ? (
          <Check size={14} className="text-green-400" />
        ) : (
          <Copy size={14} />
        )}
        <span className="sr-only">Copy message</span>
      </button>

      {/* Summarize Button */}
      {showSummarize && onSummarize && (
        <button
          onClick={onSummarize}
          disabled={isSummarizing}
          className="relative size-8 p-1.5 text-nb-text-dim hover:text-nb-text hover:bg-nb-dark-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={isSummarizing ? 'Summarizing...' : hasSummary ? 'Toggle summary' : 'Summarize'}
          type="button"
        >
          {isSummarizing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileText size={14} className={hasSummary ? 'text-nb-purple' : ''} />
          )}
          <span className="sr-only">{isSummarizing ? 'Summarizing' : hasSummary ? 'Toggle summary' : 'Summarize'}</span>
        </button>
      )}

      {/* Translate Button */}
      {showTranslate && onTranslate && (
        <button
          onClick={onTranslate}
          disabled={isTranslating}
          className="relative size-8 p-1.5 text-nb-text-dim hover:text-nb-text hover:bg-nb-dark-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={isTranslating ? 'Translating...' : hasTranslation ? 'Toggle translation' : 'Translate'}
          type="button"
        >
          {isTranslating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Globe size={14} className={hasTranslation ? 'text-nb-blue' : ''} />
          )}
          <span className="sr-only">{isTranslating ? 'Translating' : hasTranslation ? 'Toggle translation' : 'Translate'}</span>
        </button>
      )}

      {/* Regenerate Button */}
      {showRegenerate && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="relative size-8 p-1.5 text-nb-text-dim hover:text-nb-text hover:bg-nb-dark-300 rounded transition-colors"
          title="Regenerate response"
          type="button"
        >
          <RotateCcw size={14} />
          <span className="sr-only">Regenerate response</span>
        </button>
      )}
    </div>
  );
}
