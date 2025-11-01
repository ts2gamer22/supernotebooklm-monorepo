import Fuse from 'fuse.js';
import { db } from '../lib/db';
import type { NotebookMetadata } from '../types/folder';

export interface SearchFilters {
  folderIds?: string[];
  tagIds?: string[];
  tagLogic?: 'AND' | 'OR';
  dateRange?: {
    from: Date;
    to: Date;
    type: 'created' | 'modified';
  };
}

export interface SearchResult extends NotebookMetadata {
  score?: number;
  matchedText?: string;
}

class SearchService {
  private fuse: Fuse<NotebookMetadata> | null = null;
  private lastDataUpdate: number = 0;

  /**
   * Initialize Fuse.js for fuzzy search
   */
  private async initFuse(): Promise<void> {
    const allMetadata = await db.notebookMetadata.toArray();

    this.fuse = new Fuse(allMetadata, {
      keys: [
        { name: 'customName', weight: 0.7 },
        { name: 'title', weight: 0.6 },
        { name: 'notebookId', weight: 0.3 },
      ],
      threshold: 0.4, // 0 = exact match, 1 = match anything
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true, // Match anywhere in the string
    });

    this.lastDataUpdate = Date.now();
  }

  /**
   * Search notebooks with text query and filters
   */
  async searchNotebooks(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult[]> {
    let results: SearchResult[];

    // Step 1: Text search (fuzzy)
    if (query.trim()) {
      if (!this.fuse || this.shouldRefreshCache()) {
        await this.initFuse();
      }

      const fuseResults = this.fuse!.search(query);
      results = fuseResults.map(r => ({
        ...r.item,
        score: r.score,
      }));
    } else {
      // No text query - get all notebooks
      const allMetadata = await db.notebookMetadata.toArray();
      results = allMetadata;
    }

    // Step 2: Filter by folder
    if (filters.folderIds && filters.folderIds.length > 0) {
      results = results.filter(nb =>
        nb.folderIds.some(fid => filters.folderIds!.includes(fid))
      );
    }

    // Step 3: Filter by tags (AND or OR logic)
    if (filters.tagIds && filters.tagIds.length > 0) {
      if (filters.tagLogic === 'AND') {
        // Notebook must have ALL selected tags
        results = results.filter(nb =>
          filters.tagIds!.every(tid => nb.tagIds.includes(tid))
        );
      } else {
        // OR: Notebook must have ANY selected tag
        results = results.filter(nb =>
          nb.tagIds.some(tid => filters.tagIds!.includes(tid))
        );
      }
    }

    // Step 4: Filter by date range
    if (filters.dateRange) {
      const { from, to, type } = filters.dateRange;

      results = results.filter(nb => {
        const dateValue = type === 'created' ? nb.createdAt : nb.lastUpdatedAt;
        if (!dateValue) return false;

        // Handle both Date objects and timestamps
        const nbDate = typeof dateValue === 'number' 
          ? new Date(dateValue) 
          : new Date(dateValue);
          
        return nbDate >= from && nbDate <= to;
      });
    }

    // Sort by relevance score (if available) or by date
    results.sort((a, b) => {
      if (a.score !== undefined && b.score !== undefined) {
        return a.score - b.score; // Lower score = better match
      }
      // Fallback to date sorting
      const aDate = a.lastUpdatedAt || a.createdAt || 0;
      const bDate = b.lastUpdatedAt || b.createdAt || 0;
      return (typeof bDate === 'number' ? bDate : new Date(bDate).getTime()) - 
             (typeof aDate === 'number' ? aDate : new Date(aDate).getTime());
    });

    return results;
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSearchSuggestions(query: string): Promise<string[]> {
    if (query.length < 2) return [];

    const results = await this.searchNotebooks(query, {});
    return results
      .map(r => r.customName || r.title || r.notebookId)
      .filter((name): name is string => !!name)
      .slice(0, 5); // Top 5 suggestions
  }

  /**
   * Check if cache should be refreshed
   */
  private shouldRefreshCache(): boolean {
    const CACHE_TTL = 60000; // 1 minute
    return Date.now() - this.lastDataUpdate > CACHE_TTL;
  }

  /**
   * Invalidate Fuse.js cache (call when notebooks added/removed)
   */
  invalidateCache(): void {
    this.fuse = null;
    this.lastDataUpdate = 0;
  }

  /**
   * Count notebooks matching filters (without text search)
   */
  async countNotebooks(filters: SearchFilters = {}): Promise<number> {
    const results = await this.searchNotebooks('', filters);
    return results.length;
  }
}

export const notebookSearchService = new SearchService();
