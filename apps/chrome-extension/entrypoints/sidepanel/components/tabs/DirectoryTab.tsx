/**
 * DirectoryTab Component
 * Story 4.3: Directory Tab UI - Tasks 1 & 8
 * 
 * Displays public notebooks with filtering, search, and sorting
 */

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { NotebookGrid } from '@/src/components/directory/NotebookGrid';
import { CategoryFilter } from '@/src/components/directory/CategoryFilter';
import { SortDropdown } from '@/src/components/directory/SortDropdown';
import { SearchInput } from '@/src/components/directory/SearchInput';
import { NotebookDetailModal } from '@/src/components/directory/NotebookDetailModal';
import { useDirectoryStore } from '@/src/stores/useDirectoryStore';
import type { PublicNotebook } from '@/src/types/directory';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { pollingService } from '@/src/services/PollingService';

export function DirectoryTab() {
  const {
    category,
    sortBy,
    searchQuery,
    selectedNotebook,
    lastFetchTime,
    unreadCount,
    setCategory,
    setSort,
    setSearch,
    selectNotebook,
    setLastFetchTime,
    setUnreadCount,
    clearUnread,
  } = useDirectoryStore();

  const [displayedNotebooks, setDisplayedNotebooks] = useState<PublicNotebook[]>([]);
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const previousNotebooksRef = useRef<Set<string>>(new Set());
  const ITEMS_PER_PAGE = 20;

  // Use search query if present, otherwise use regular query with filters
  const notebooks = useQuery(
    searchQuery
      ? api.notebooks.searchPublicNotebooks
      : api.notebooks.getPublicNotebooks,
    searchQuery
      ? {
          searchQuery,
          category: category !== 'All' ? category : undefined,
          limit: page * ITEMS_PER_PAGE,
        }
      : {
          category: category !== 'All' ? category : undefined,
          sortBy,
          limit: page * ITEMS_PER_PAGE,
        }
  );

  // Update displayed notebooks when data changes
  React.useEffect(() => {
    if (notebooks?.notebooks) {
      setDisplayedNotebooks(notebooks.notebooks);
    }
  }, [notebooks]);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [category, sortBy, searchQuery]);

  // Setup polling when tab is active
  useEffect(() => {
    console.log('[DirectoryTab] Setting up polling');

    const handlePoll = async () => {
      console.log('[DirectoryTab] Polling for updates');
      // The useQuery hook will automatically refetch
      // We just need to track the time
      setLastFetchTime(Date.now());
    };

    // Start polling with 60 second interval
    pollingService.start(handlePoll, {
      interval: 60000, // 60 seconds
      enabled: true,
    });

    // Cleanup on unmount
    return () => {
      console.log('[DirectoryTab] Cleaning up polling');
      pollingService.stop();
    };
  }, [setLastFetchTime]);

  // Detect new notebooks and update unread count
  useEffect(() => {
    if (notebooks?.notebooks && notebooks.notebooks.length > 0) {
      const currentIds = new Set(notebooks.notebooks.map(n => n._id));
      
      // Check for new notebooks
      if (previousNotebooksRef.current.size > 0) {
        const newNotebooks = notebooks.notebooks.filter(
          n => !previousNotebooksRef.current.has(n._id)
        );
        
        if (newNotebooks.length > 0) {
          console.log(`[DirectoryTab] ${newNotebooks.length} new notebooks detected`);
          setUnreadCount(newNotebooks.length);
          
          // Show notification (simple console log for MVP)
          console.log(`📚 ${newNotebooks.length} new notebook(s) published!`);
        }
      }
      
      // Update previous set
      previousNotebooksRef.current = currentIds;
    }
  }, [notebooks, setUnreadCount]);

  // Clear unread when user views the tab
  useEffect(() => {
    // Clear unread count when component mounts (user viewing tab)
    const timer = setTimeout(() => {
      if (unreadCount > 0) {
        clearUnread();
      }
    }, 2000); // Clear after 2 seconds of viewing

    return () => clearTimeout(timer);
  }, [unreadCount, clearUnread]);

  const handleLoadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const handleNotebookClick = (notebook: PublicNotebook) => {
    selectNotebook(notebook);
  };

  const handleCloseModal = () => {
    selectNotebook(null);
  };

  const handleEdit = (notebook: PublicNotebook) => {
    // TODO: Open edit modal (ShareModal from Story 4.2) with existing data
    console.log('Edit notebook:', notebook);
  };

  const handleDelete = () => {
    // Refresh notebooks after deletion
    setPage(1);
    selectNotebook(null);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await pollingService.poll();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getTimeSinceLastUpdate = () => {
    const seconds = pollingService.getTimeSinceLastPoll();
    if (seconds === 0) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <>
      <div className="directory-tab flex flex-col h-full bg-nb-dark-100">
        {/* Header */}
        <div className="p-4 border-b border-nb-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-nb-text">Public Directory</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-1 text-xs font-bold bg-nb-blue text-white rounded-full animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-nb-text-dim">
                {getTimeSinceLastUpdate()}
              </span>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2 hover:bg-nb-dark-300 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-nb-text-dim ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="mb-4">
            <SearchInput value={searchQuery} onChange={setSearch} />
          </div>
          
          {/* Filters Row */}
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <CategoryFilter selected={category} onSelect={setCategory} />
            {!searchQuery && <SortDropdown value={sortBy} onChange={setSort} />}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <NotebookGrid
            notebooks={displayedNotebooks}
            isLoading={notebooks === undefined}
            hasMore={notebooks?.hasMore ?? false}
            onNotebookClick={handleNotebookClick}
            onLoadMore={handleLoadMore}
          />
        </div>
      </div>

      {/* Detail Modal */}
      <NotebookDetailModal
        notebook={selectedNotebook}
        isOpen={selectedNotebook !== null}
        onClose={handleCloseModal}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </>
  );
}
