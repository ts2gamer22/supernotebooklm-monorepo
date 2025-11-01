/**
 * Zustand Store for Directory Tab State
 * Story 4.3: Directory Tab UI
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PublicNotebook, SortBy } from '@/src/types/directory';

interface DirectoryStore {
  // State
  category: string;
  sortBy: SortBy;
  searchQuery: string;
  selectedNotebook: PublicNotebook | null;
  lastFetchTime: number;
  unreadCount: number;

  // Actions
  setCategory: (category: string) => void;
  setSort: (sortBy: SortBy) => void;
  setSearch: (query: string) => void;
  selectNotebook: (notebook: PublicNotebook | null) => void;
  setLastFetchTime: (time: number) => void;
  setUnreadCount: (count: number) => void;
  clearUnread: () => void;
  reset: () => void;
}

const initialState = {
  category: 'All',
  sortBy: 'recent' as SortBy,
  searchQuery: '',
  selectedNotebook: null,
  lastFetchTime: Date.now(),
  unreadCount: 0,
};

export const useDirectoryStore = create<DirectoryStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Actions
      setCategory: (category) => set({ category, searchQuery: '' }), // Clear search when filtering by category
      setSort: (sortBy) => set({ sortBy }),
      setSearch: (searchQuery) => set({ searchQuery }),
      selectNotebook: (selectedNotebook) => set({ selectedNotebook }),
      setLastFetchTime: (lastFetchTime) => set({ lastFetchTime }),
      setUnreadCount: (unreadCount) => set({ unreadCount }),
      clearUnread: () => set({ unreadCount: 0 }),
      reset: () => set(initialState),
    }),
    {
      name: 'snlm-directory-store',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const result = await chrome.storage.local.get(name);
          return result[name] || null;
        },
        setItem: async (name, value) => {
          await chrome.storage.local.set({ [name]: value });
        },
        removeItem: async (name) => {
          await chrome.storage.local.remove(name);
        },
      })),
      // Only persist filters, not selected notebook
      partialize: (state) => ({
        category: state.category,
        sortBy: state.sortBy,
      }),
    }
  )
);
