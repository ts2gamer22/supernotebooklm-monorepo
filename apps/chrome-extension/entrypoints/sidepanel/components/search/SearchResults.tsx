/**
 * Search Results Component
 * Displays search results with source attribution and relevance scores
 */

import { Brain, MessageSquare, Link as LinkIcon, ExternalLink, Clock } from 'lucide-react';
import type { SearchResult } from '../../../../src/types/search';
import { askNotebookLMWithContext } from '../../../../src/services/SearchService';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading: boolean;
  onAskNotebookLM: (result: SearchResult) => void;
}

/**
 * Skeleton loader for search results
 */
function SearchResultSkeleton() {
  return (
    <div className="bg-nb-dark-200 rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 bg-nb-dark-300 rounded" />
        <div className="h-4 w-32 bg-nb-dark-300 rounded" />
      </div>
      <div className="h-4 w-full bg-nb-dark-300 rounded mb-2" />
      <div className="h-4 w-3/4 bg-nb-dark-300 rounded mb-2" />
      <div className="flex items-center justify-between mt-3">
        <div className="h-3 w-16 bg-nb-dark-300 rounded" />
        <div className="h-8 w-32 bg-nb-dark-300 rounded" />
      </div>
    </div>
  );
}

/**
 * Empty state when no results found
 */
function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-nb-dark-200 flex items-center justify-center mb-4">
        <MessageSquare size={32} className="text-nb-text-dim" />
      </div>
      <h3 className="text-lg font-medium text-nb-text mb-2">No results found</h3>
      <p className="text-sm text-nb-text-dim mb-4">
        No matches for &quot;{query}&quot; in your knowledge base.
      </p>
      <div className="text-xs text-nb-text-dim space-y-1">
        <p>Try:</p>
        <p>• Using different keywords</p>
        <p>• Checking your spelling</p>
        <p>• Searching for broader terms</p>
      </div>
    </div>
  );
}

/**
 * Get icon for source type
 */
function getSourceIcon(source: SearchResult['source']) {
  switch (source) {
    case 'notebook':
      return <Brain className="w-4 h-4 text-nb-purple" />;
    case 'chat':
      return <MessageSquare className="w-4 h-4 text-nb-blue" />;
    case 'captured-source':
      return <LinkIcon className="w-4 h-4 text-nb-green" />;
    default:
      return <MessageSquare className="w-4 h-4 text-nb-text-dim" />;
  }
}

/**
 * Get relevance score badge color
 */
function getScoreBadgeColor(score: number): string {
  if (score >= 80) return 'bg-green-500/20 text-green-400';
  if (score >= 60) return 'bg-blue-500/20 text-blue-400';
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-gray-500/20 text-gray-400';
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

/**
 * Search Results Component
 */
export function SearchResults({ results, query, isLoading, onAskNotebookLM }: SearchResultsProps) {
  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        <SearchResultSkeleton />
        <SearchResultSkeleton />
        <SearchResultSkeleton />
      </div>
    );
  }
  
  // Show empty state
  if (!isLoading && results.length === 0 && query) {
    return <EmptyState query={query} />;
  }
  
  // Show results
  return (
    <div className="space-y-3">
      {results.map((result) => (
        <div
          key={result.id}
          className="bg-nb-dark-200 rounded-lg p-4 hover:bg-nb-dark-300 transition-colors border border-transparent hover:border-nb-dark-400"
        >
          {/* Source attribution */}
          <div className="flex items-center gap-2 mb-2">
            {getSourceIcon(result.source)}
            <span className="text-sm font-medium text-nb-text">
              {result.sourceLabel}
              {result.sourceName && (
                <span className="text-nb-text-dim ml-1">- &quot;{result.sourceName}&quot;</span>
              )}
            </span>
          </div>
          
          {/* Snippet */}
          <p className="text-sm text-nb-text leading-relaxed mb-3">
            {result.snippet}
          </p>
          
          {/* Footer: Relevance score + timestamp + Ask NotebookLM button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-nb-text-dim">
              {/* Relevance score badge */}
              <span
                className={`px-2 py-1 rounded-full font-medium ${getScoreBadgeColor(result.relevanceScore)}`}
              >
                {result.relevanceScore}% match
              </span>
              
              {/* Timestamp */}
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatRelativeTime(result.timestamp)}
              </span>
            </div>
            
            {/* Ask NotebookLM button */}
            <button
              onClick={() => onAskNotebookLM(result)}
              className="flex items-center gap-1 px-3 py-1.5 bg-nb-blue hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
              title="Open in NotebookLM with context"
            >
              <ExternalLink size={12} />
              Ask NotebookLM
            </button>
          </div>
          
          {/* Optional: Show URL for captured sources */}
          {result.url && (
            <div className="mt-2 pt-2 border-t border-nb-dark-400">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-nb-blue hover:text-blue-400 flex items-center gap-1 break-all"
              >
                <LinkIcon size={10} />
                {result.url}
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
