/**
 * Query History Component
 * Displays search history with bookmark and re-run functionality
 */

import { useState, useEffect } from 'react';
import { Clock, Bookmark, BookmarkCheck, RotateCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getQueryHistory,
  getBookmarkedQueries,
  toggleQueryBookmark,
  clearQueryHistory,
} from '../../../../src/lib/db';
import type { QueryHistoryEntry } from '../../../../src/types/search';

interface QueryHistoryProps {
  onRerunQuery: (query: string) => void;
}

/**
 * Query History Component
 */
export function QueryHistory({ onRerunQuery }: QueryHistoryProps) {
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [bookmarked, setBookmarked] = useState<QueryHistoryEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Load history and bookmarks
  useEffect(() => {
    loadHistory();
  }, [refreshTrigger]);
  
  // Auto-refresh every 2 seconds to pick up new queries
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  async function loadHistory() {
    console.log('[QueryHistory] Loading history...');
    try {
      const [recentHistory, savedQueries] = await Promise.all([
        getQueryHistory(10),
        getBookmarkedQueries(),
      ]);
      console.log('[QueryHistory] Loaded:', recentHistory.length, 'recent queries,', savedQueries.length, 'bookmarked');
      console.log('[QueryHistory] Recent queries:', recentHistory);
      setHistory(recentHistory);
      setBookmarked(savedQueries);
    } catch (error) {
      console.error('[QueryHistory] Failed to load history:', error);
    }
  }
  
  async function handleToggleBookmark(queryId: string) {
    try {
      await toggleQueryBookmark(queryId);
      await loadHistory(); // Reload to update UI
    } catch (error) {
      console.error('[QueryHistory] Failed to toggle bookmark:', error);
    }
  }
  
  async function handleClearHistory() {
    try {
      await clearQueryHistory();
      await loadHistory();
      setShowClearConfirm(false);
    } catch (error) {
      console.error('[QueryHistory] Failed to clear history:', error);
    }
  }
  
  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
  
  // Always show the component (with empty state if needed)
  
  return (
    <div className="border-t border-nb-dark-300 pt-3">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-2 py-1.5 hover:bg-nb-dark-200 rounded transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-nb-text-dim" />
          <span className="text-xs font-medium text-nb-text">Query History</span>
          <span className="text-xs text-nb-text-dim">
            ({history.length} recent)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-nb-text-dim" />
        ) : (
          <ChevronDown size={14} className="text-nb-text-dim" />
        )}
      </button>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-2 space-y-3">
          {/* Empty state */}
          {history.length === 0 && bookmarked.length === 0 && (
            <div className="px-2 py-3 text-center">
              <p className="text-xs text-nb-text-dim">
                No search history yet. Perform a search to see results here.
              </p>
            </div>
          )}
          
          {/* Bookmarked queries */}
          {bookmarked.length > 0 && (
            <div>
              <div className="flex items-center gap-1 px-2 mb-2">
                <BookmarkCheck size={12} className="text-nb-blue" />
                <span className="text-xs font-medium text-nb-text">Saved Searches</span>
              </div>
              <div className="space-y-1">
                {bookmarked.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-2 py-2 bg-nb-dark-200 rounded hover:bg-nb-dark-300 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-nb-text truncate">{entry.query}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-nb-text-dim">
                          {entry.resultCount} result{entry.resultCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-nb-text-dim">•</span>
                        <span className="text-xs text-nb-text-dim">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleToggleBookmark(entry.id)}
                        className="p-1 hover:bg-nb-dark-400 rounded transition-colors"
                        title="Remove bookmark"
                      >
                        <BookmarkCheck size={12} className="text-nb-blue" />
                      </button>
                      <button
                        onClick={() => onRerunQuery(entry.query)}
                        className="p-1 hover:bg-nb-dark-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Re-run search"
                      >
                        <RotateCw size={12} className="text-nb-blue" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Recent queries */}
          {history.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-medium text-nb-text">Recent</span>
                {!showClearConfirm ? (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs text-nb-text-dim hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClearHistory}
                      className="text-xs text-red-400 hover:text-red-300 font-medium"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="text-xs text-nb-text-dim hover:text-nb-text"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-2 py-2 bg-nb-dark-200 rounded hover:bg-nb-dark-300 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-nb-text truncate">{entry.query}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-nb-text-dim">
                          {entry.resultCount} result{entry.resultCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-nb-text-dim">•</span>
                        <span className="text-xs text-nb-text-dim">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleToggleBookmark(entry.id)}
                        className="p-1 hover:bg-nb-dark-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Bookmark search"
                      >
                        <Bookmark size={12} className="text-nb-text-dim hover:text-nb-blue" />
                      </button>
                      <button
                        onClick={() => onRerunQuery(entry.query)}
                        className="p-1 hover:bg-nb-dark-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Re-run search"
                      >
                        <RotateCw size={12} className="text-nb-blue" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
