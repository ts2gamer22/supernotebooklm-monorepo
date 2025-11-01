/**
 * useDirectoryStore Tests
 * Story 4.3: Directory Tab UI - Task 12
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDirectoryStore } from './useDirectoryStore';
import type { PublicNotebook } from '@/src/types/directory';

// Mock chrome.storage.local
const mockStorage = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};

vi.stubGlobal('chrome', {
  storage: {
    local: mockStorage,
  },
});

describe('useDirectoryStore', () => {
  const mockNotebook: PublicNotebook = {
    _id: '1',
    _creationTime: Date.now(),
    userId: 'user1',
    title: 'Test Notebook',
    description: 'Test Description',
    content: 'Test Content',
    category: 'Research',
    tags: ['tag1'],
    viewCount: 10,
    isPublic: true,
    createdAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    const { result } = renderHook(() => useDirectoryStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useDirectoryStore());

    expect(result.current.category).toBe('All');
    expect(result.current.sortBy).toBe('recent');
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedNotebook).toBe(null);
  });

  it('should update category', () => {
    const { result } = renderHook(() => useDirectoryStore());

    act(() => {
      result.current.setCategory('Research');
    });

    expect(result.current.category).toBe('Research');
  });

  it('should clear search query when category changes', () => {
    const { result } = renderHook(() => useDirectoryStore());

    act(() => {
      result.current.setSearch('test query');
    });

    expect(result.current.searchQuery).toBe('test query');

    act(() => {
      result.current.setCategory('Research');
    });

    expect(result.current.searchQuery).toBe('');
  });

  it('should update sortBy', () => {
    const { result } = renderHook(() => useDirectoryStore());

    act(() => {
      result.current.setSort('popular');
    });

    expect(result.current.sortBy).toBe('popular');
  });

  it('should update search query', () => {
    const { result } = renderHook(() => useDirectoryStore());

    act(() => {
      result.current.setSearch('typescript tutorials');
    });

    expect(result.current.searchQuery).toBe('typescript tutorials');
  });

  it('should select notebook', () => {
    const { result } = renderHook(() => useDirectoryStore());

    act(() => {
      result.current.selectNotebook(mockNotebook);
    });

    expect(result.current.selectedNotebook).toEqual(mockNotebook);
  });

  it('should clear selected notebook', () => {
    const { result } = renderHook(() => useDirectoryStore());

    act(() => {
      result.current.selectNotebook(mockNotebook);
    });

    expect(result.current.selectedNotebook).toEqual(mockNotebook);

    act(() => {
      result.current.selectNotebook(null);
    });

    expect(result.current.selectedNotebook).toBe(null);
  });

  it('should reset to initial state', () => {
    const { result } = renderHook(() => useDirectoryStore());

    // Change all state values
    act(() => {
      result.current.setCategory('Research');
      result.current.setSort('popular');
      result.current.setSearch('test');
      result.current.selectNotebook(mockNotebook);
    });

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.category).toBe('All');
    expect(result.current.sortBy).toBe('recent');
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedNotebook).toBe(null);
  });

  it('should persist category and sortBy to chrome.storage', async () => {
    const { result } = renderHook(() => useDirectoryStore());

    act(() => {
      result.current.setCategory('Tutorial');
      result.current.setSort('trending');
    });

    // Wait for persistence
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify chrome.storage.local.set was called
    expect(mockStorage.set).toHaveBeenCalled();
  });

  it('should not persist selectedNotebook to storage', async () => {
    const { result } = renderHook(() => useDirectoryStore());

    act(() => {
      result.current.selectNotebook(mockNotebook);
    });

    // Wait for potential persistence
    await new Promise(resolve => setTimeout(resolve, 100));

    // The selectedNotebook should not be persisted (only category and sortBy)
    // This is handled by the partialize option in the store
    const calls = mockStorage.set.mock.calls;
    if (calls.length > 0) {
      const persistedData = calls[calls.length - 1][0];
      expect(persistedData).not.toHaveProperty('selectedNotebook');
    }
  });
});
