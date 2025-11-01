/**
 * Search Types
 * TypeScript interfaces for the Smart Query Assistant search functionality
 */

/**
 * Source types for search results
 */
export type SearchSourceType = 'chat' | 'notebook' | 'captured-source';

/**
 * Search result interface
 */
export interface SearchResult {
  id: string;
  source: SearchSourceType;
  sourceLabel: string; // Human-readable label (e.g., "From NotebookLM")
  sourceName?: string; // Specific notebook/chat name
  snippet: string; // Result preview (truncated to 200 chars)
  fullContent?: string; // Full content if available
  relevanceScore: number; // 0-100
  timestamp: number;
  url?: string; // For captured sources
  metadata?: Record<string, unknown>;
}

/**
 * Enhanced query interface
 */
export interface EnhancedQuery {
  original: string;
  variations: string[];
  keywords: string[];
}

/**
 * Search options interface
 */
export interface SearchOptions {
  query: string;
  sources?: SearchSourceType[]; // Filter by source types
  limit?: number; // Max results (default: 20)
  minRelevanceScore?: number; // Minimum score to include (default: 0)
}

/**
 * Query history entry
 */
export interface QueryHistoryEntry {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
  isBookmarked: boolean;
}

/**
 * Notebook cache entry (for NotebookLM content)
 */
export interface NotebookCacheEntry {
  id: string;
  title: string;
  sources: string[];
  content: string;
  lastUpdated: number;
}

/**
 * Captured source entry
 */
export interface CapturedSourceEntry {
  id: string;
  url: string;
  title: string;
  description?: string;
  timestamp: number;
  platform?: string; // e.g., "ChatGPT", "Claude", "Perplexity"
}

/**
 * Chat entry for search (simplified from chatStore)
 */
export interface ChatEntry {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
  notebookId?: string;
  source?: string;
  tags?: string[];

  // Sync fields for Convex integration
  convexId?: string;           // Convex database ID
  cachedAt?: number;           // When cached locally (timestamp)
  syncedAt?: number;           // When last synced successfully (timestamp)
  syncError?: string;          // Last sync error message (if any)
  syncAttempts?: number;       // Number of failed sync attempts
}

/**
 * Audio Overview entry (NotebookLM audio podcasts)
 */
export interface AudioOverview {
  id: string;
  notebookId: string;
  title: string;
  audioBlob: Blob;
  duration: number; // seconds
  createdAt: number; // timestamp
  fileSize?: number; // bytes
}

/**
 * Export type for ChatGPT conversations
 */
export type ExportType = 'notebooklm' | 'markdown' | 'pdf';

/**
 * Export history entry
 */
export interface ExportHistoryEntry {
  id: string;
  title: string; // Conversation title
  exportType: ExportType; // Type of export
  sourceUrl: string; // ChatGPT conversation URL
  timestamp: number; // When exported
  messageCount: number; // Number of messages in conversation
  contentLength: number; // Character count of formatted content
  success: boolean; // Whether export succeeded
  errorMessage?: string; // Error details if failed
  metadata?: {
    notebookId?: string; // If exported to NotebookLM
    fileName?: string; // If downloaded as file
  };
}
