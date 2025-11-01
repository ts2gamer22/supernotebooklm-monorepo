import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { notebookSearchService, type SearchFilters, type SearchResult } from '../../services/NotebookSearchService';
import { FilterChip } from './FilterChip';

interface SearchBarProps {
  onResultsChange: (notebookIds: string[], query: string) => void;
  placeholder?: string;
}

/**
 * SearchBar - Search and filter notebooks
 * 
 * Features:
 * - Fuzzy text search with 300ms debounce
 * - Active filter chips
 * - Clear all filters
 * - Real-time result count
 * 
 * Optimized for sidepanel display.
 */
export function SearchBar({ onResultsChange, placeholder = 'Search notebooks...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const debouncedQuery = useDebounce(query, 300);

  // Load total count on mount
  useEffect(() => {
    loadTotalCount();
  }, []);

  const loadTotalCount = async () => {
    try {
      const count = await notebookSearchService.countNotebooks({});
      setTotalCount(count);
    } catch (error) {
      console.error('[SearchBar] Failed to load total count:', error);
    }
  };

  // Perform search when query or filters change
  useEffect(() => {
    performSearch();
  }, [debouncedQuery, filters]);

  const performSearch = useCallback(async () => {
    setIsSearching(true);

    try {
      const searchResults = await notebookSearchService.searchNotebooks(debouncedQuery, filters);
      setResults(searchResults);

      // Notify parent component of filtered notebook IDs
      const notebookIds = searchResults.map(r => r.notebookId);
      onResultsChange(notebookIds, debouncedQuery);
    } catch (error) {
      console.error('[SearchBar] Search failed:', error);
      setResults([]);
      onResultsChange([], debouncedQuery);
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery, filters, onResultsChange]);

  const handleClearAll = () => {
    setQuery('');
    setFilters({});
    onResultsChange([], '');
  };

  const handleRemoveFilter = (filterType: keyof SearchFilters) => {
    setFilters(prev => {
      const updated = { ...prev };
      delete updated[filterType];
      return updated;
    });
  };

  const hasActiveFilters =
    query.trim() !== '' ||
    (filters.folderIds && filters.folderIds.length > 0) ||
    (filters.tagIds && filters.tagIds.length > 0) ||
    filters.dateRange !== undefined;

  const showResultCount = hasActiveFilters || query.trim() !== '';

  return (
    <div className="snlm-search-bar px-4 py-3 border-b border-nb-dark-300 space-y-2">
      {/* Search input */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-nb-gray-400"
        />
        <input
          id="snlm-search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 bg-nb-dark-200 text-nb-text text-sm border border-nb-dark-300 rounded-lg focus:outline-none focus:border-nb-blue focus:ring-1 focus:ring-nb-blue transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-nb-gray-400 hover:text-nb-text transition-colors"
            aria-label="Clear search"
            type="button"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Active filters and result count */}
      {(hasActiveFilters || showResultCount) && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter chips */}
          {query && (
            <FilterChip
              label={`"${query.length > 20 ? query.slice(0, 20) + '...' : query}"`}
              color="#3b82f6"
              onRemove={() => setQuery('')}
            />
          )}

          {filters.folderIds && filters.folderIds.length > 0 && (
            <FilterChip
              label={`${filters.folderIds.length} folder${filters.folderIds.length !== 1 ? 's' : ''}`}
              color="#8b5cf6"
              onRemove={() => handleRemoveFilter('folderIds')}
            />
          )}

          {filters.tagIds && filters.tagIds.length > 0 && (
            <FilterChip
              label={`${filters.tagIds.length} tag${filters.tagIds.length !== 1 ? 's' : ''} (${filters.tagLogic || 'OR'})`}
              color="#10b981"
              onRemove={() => handleRemoveFilter('tagIds')}
            />
          )}

          {filters.dateRange && (
            <FilterChip
              label={`${filters.dateRange.from.toLocaleDateString()} - ${filters.dateRange.to.toLocaleDateString()}`}
              color="#f59e0b"
              onRemove={() => handleRemoveFilter('dateRange')}
            />
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Result count */}
          {showResultCount && (
            <span className="text-xs text-nb-gray-400 whitespace-nowrap">
              {isSearching ? (
                'Searching...'
              ) : (
                <>
                  {results.length}
                  {totalCount > 0 && ` of ${totalCount}`}
                </>
              )}
            </span>
          )}

          {/* Clear all button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="text-xs text-nb-gray-400 hover:text-nb-text transition-colors whitespace-nowrap"
              type="button"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
