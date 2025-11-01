/**
 * Storage Item List Component
 *
 * Displays list of all storage items with:
 * - Virtual scrolling for 1000+ items
 * - Sorting by size, date, type
 * - Filtering by type, date range, notebook
 * - Quick filters (old chats, old audio, large items)
 * - Bulk selection
 */

import { useState, useEffect, useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import { MessageSquare, FileText, Music, ChevronDown } from 'lucide-react';
import { storageService } from '../../services/StorageService';
import type { StorageBreakdown, StorageItem } from '../../services/StorageService';

interface StorageItemListProps {
  breakdown: StorageBreakdown;
  selectedItems: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onItemsDeleted: () => void;
}

type SortOption = 'size-desc' | 'size-asc' | 'date-desc' | 'date-asc' | 'type';
type FilterType = 'all' | 'chat' | 'audio' | 'capture';
type QuickFilter = 'none' | 'chats-90d' | 'audio-30d' | 'large-10mb';

export function StorageItemList({
  breakdown,
  selectedItems,
  onSelectionChange,
  onItemsDeleted,
}: StorageItemListProps) {
  const [allItems, setAllItems] = useState<StorageItem[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('size-desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('none');

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const items = await storageService.getAllStorageItems();
    setAllItems(items);
  }

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let items = [...allItems];

    // Apply type filter
    if (filterType !== 'all') {
      items = items.filter((item) => item.type === filterType);
    }

    // Apply quick filters
    const now = Date.now();
    if (quickFilter === 'chats-90d') {
      const cutoff = now - 90 * 24 * 60 * 60 * 1000;
      items = items.filter((item) => item.type === 'chat' && item.date < cutoff);
    } else if (quickFilter === 'audio-30d') {
      const cutoff = now - 30 * 24 * 60 * 60 * 1000;
      items = items.filter((item) => item.type === 'audio' && item.date < cutoff);
    } else if (quickFilter === 'large-10mb') {
      items = items.filter((item) => item.size > 10 * 1024 * 1024);
    }

    // Apply sorting
    items.sort((a, b) => {
      switch (sortBy) {
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        case 'date-desc':
          return b.date - a.date;
        case 'date-asc':
          return a.date - b.date;
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return items;
  }, [allItems, sortBy, filterType, quickFilter]);

  function toggleSelection(itemId: string) {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    onSelectionChange(newSelection);
  }

  function toggleSelectAll() {
    if (selectedItems.size === filteredAndSortedItems.length) {
      // Deselect all
      onSelectionChange(new Set());
    } else {
      // Select all visible items
      const allIds = new Set(filteredAndSortedItems.map((item) => item.id));
      onSelectionChange(allIds);
    }
  }

  function getItemIcon(type: string) {
    switch (type) {
      case 'chat':
        return <MessageSquare size={18} className="text-blue-400" />;
      case 'audio':
        return <Music size={18} className="text-purple-400" />;
      case 'capture':
        return <FileText size={18} className="text-green-400" />;
      default:
        return null;
    }
  }

  // Row renderer for virtual list
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = filteredAndSortedItems[index];
    const isSelected = selectedItems.has(item.id);
    const date = new Date(item.date).toLocaleDateString();

    return (
      <div
        style={style}
        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${
          isSelected ? 'bg-gray-700/30' : ''
        }`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelection(item.id)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex-shrink-0">{getItemIcon(item.type)}</div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{item.title}</p>
          <p className="text-xs text-gray-400">
            {date} • {item.notebookId || 'No notebook'}
          </p>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-sm text-gray-300">{storageService.formatBytes(item.size)}</p>
          <p className="text-xs text-gray-500 capitalize">{item.type}</p>
        </div>
      </div>
    );
  };

  const totalSize = storageService.calculateTotalSize(filteredAndSortedItems);
  const selectedSize = storageService.calculateTotalSize(
    allItems.filter((item) => selectedItems.has(item.id))
  );

  return (
    <div className="space-y-4">
      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-3">
        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="appearance-none bg-gray-700 text-white px-4 py-2 pr-8 rounded-lg text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="size-desc">Size (largest first)</option>
            <option value="size-asc">Size (smallest first)</option>
            <option value="date-desc">Date (newest first)</option>
            <option value="date-asc">Date (oldest first)</option>
            <option value="type">Type</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>

        {/* Type Filter */}
        <div className="flex gap-1 bg-gray-700 rounded-lg p-1">
          {(['all', 'chat', 'audio', 'capture'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
            </button>
          ))}
        </div>

        {/* Quick Filters */}
        <div className="relative">
          <select
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value as QuickFilter)}
            className="appearance-none bg-gray-700 text-white px-4 py-2 pr-8 rounded-lg text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">Quick Filters</option>
            <option value="chats-90d">Chats &gt; 90 days</option>
            <option value="audio-30d">Audio &gt; 30 days</option>
            <option value="large-10mb">Large items (&gt; 10MB)</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div>
          {filteredAndSortedItems.length} items ({storageService.formatBytes(totalSize)})
        </div>
        {selectedItems.size > 0 && (
          <div className="text-blue-400">
            {selectedItems.size} selected ({storageService.formatBytes(selectedSize)})
          </div>
        )}
      </div>

      {/* Select All */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg">
        <input
          type="checkbox"
          checked={filteredAndSortedItems.length > 0 && selectedItems.size === filteredAndSortedItems.length}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-300">
          Select all {filteredAndSortedItems.length} items
        </span>
      </div>

      {/* Virtual List */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        {filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No items found
          </div>
        ) : (
          <FixedSizeList
            height={400}
            itemCount={filteredAndSortedItems.length}
            itemSize={72}
            width="100%"
          >
            {Row}
          </FixedSizeList>
        )}
      </div>
    </div>
  );
}
