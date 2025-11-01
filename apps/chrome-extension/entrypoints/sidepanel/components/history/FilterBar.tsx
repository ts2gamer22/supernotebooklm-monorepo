import { useState, useEffect } from 'react';
import { Search, X, Calendar, Filter } from 'lucide-react';

interface FilterBarProps {
  dateRange: '7d' | '30d' | '90d' | 'all';
  onDateRangeChange: (range: '7d' | '30d' | '90d' | 'all') => void;
  selectedNotebook: string;
  onNotebookChange: (notebookId: string) => void;
  selectedSource: 'all' | 'ai' | 'notebooklm';
  onSourceChange: (source: 'all' | 'ai' | 'notebooklm') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  notebooks: string[];
}

export function FilterBar({
  dateRange,
  onDateRangeChange,
  selectedNotebook,
  onNotebookChange,
  selectedSource,
  onSourceChange,
  searchQuery,
  onSearchChange,
  notebooks,
}: FilterBarProps) {
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(debouncedQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [debouncedQuery, onSearchChange]);

  return (
    <div className="px-4 py-3 bg-nb-dark-100 border-b border-nb-dark-300 space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-nb-text-dim" />
        <input
          type="text"
          placeholder="Search chats..."
          value={debouncedQuery}
          onChange={(e) => setDebouncedQuery(e.target.value)}
          className="w-full pl-10 pr-8 py-2 bg-nb-dark-200 border border-nb-dark-300 rounded text-sm text-nb-text placeholder-nb-text-dim focus:outline-none focus:border-nb-blue"
        />
        {debouncedQuery && (
          <button
            onClick={() => setDebouncedQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-nb-text-dim hover:text-nb-text"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-nb-text-dim" />
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value as '7d' | '30d' | '90d' | 'all')}
            className="px-2 py-1 bg-nb-dark-200 border border-nb-dark-300 rounded text-xs text-nb-text focus:outline-none focus:border-nb-blue"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        {/* Notebook Filter */}
        {notebooks.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-nb-text-dim" />
            <select
              value={selectedNotebook}
              onChange={(e) => onNotebookChange(e.target.value)}
              className="px-2 py-1 bg-nb-dark-200 border border-nb-dark-300 rounded text-xs text-nb-text focus:outline-none focus:border-nb-blue"
            >
              <option value="all">All Notebooks</option>
              {notebooks.map((notebookId) => (
                <option key={notebookId} value={notebookId}>
                  {notebookId}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Source Filter */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSourceChange('all')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              selectedSource === 'all'
                ? 'bg-nb-blue text-white'
                : 'bg-nb-dark-200 text-nb-text-dim hover:bg-nb-dark-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onSourceChange('ai')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              selectedSource === 'ai'
                ? 'bg-nb-blue text-white'
                : 'bg-nb-dark-200 text-nb-text-dim hover:bg-nb-dark-300'
            }`}
          >
            AI Assistant
          </button>
          <button
            onClick={() => onSourceChange('notebooklm')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              selectedSource === 'notebooklm'
                ? 'bg-purple-500 text-white'
                : 'bg-nb-dark-200 text-nb-text-dim hover:bg-nb-dark-300'
            }`}
          >
            NotebookLM
          </button>
        </div>
      </div>

      {/* Results Summary */}
      {searchQuery && (
        <div className="text-xs text-nb-text-dim">
          Searching for: <span className="text-nb-text font-medium">"{searchQuery}"</span>
        </div>
      )}
    </div>
  );
}
