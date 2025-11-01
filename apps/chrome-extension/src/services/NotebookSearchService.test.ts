import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { notebookSearchService } from './NotebookSearchService';
import { db } from '../lib/db';
import type { NotebookMetadata } from '../types/folder';

describe('SearchService', () => {
  beforeEach(async () => {
    // Clear and seed test data
    await db.notebookMetadata.clear();

    const testData: NotebookMetadata[] = [
      {
        notebookId: 'nb1',
        customName: 'Python Machine Learning Guide',
        title: 'ML with Python',
        folderIds: ['f1'],
        tagIds: ['t1', 't2'],
        createdAt: new Date('2025-01-15').getTime(),
        lastUpdatedAt: new Date('2025-01-20').getTime(),
      },
      {
        notebookId: 'nb2',
        customName: 'JavaScript React Tutorial',
        title: 'React Basics',
        folderIds: ['f2'],
        tagIds: ['t2'],
        createdAt: new Date('2025-01-10').getTime(),
        lastUpdatedAt: new Date('2025-01-18').getTime(),
      },
      {
        notebookId: 'nb3',
        customName: 'Python Django Framework',
        title: 'Django Tutorial',
        folderIds: ['f1'],
        tagIds: ['t1'],
        createdAt: new Date('2025-01-05').getTime(),
        lastUpdatedAt: new Date('2025-01-15').getTime(),
      },
      {
        notebookId: 'nb4',
        customName: 'TypeScript Advanced Patterns',
        title: 'TS Patterns',
        folderIds: ['f3'],
        tagIds: ['t3'],
        createdAt: new Date('2025-01-01').getTime(),
        lastUpdatedAt: new Date('2025-01-10').getTime(),
      },
    ];

    await db.notebookMetadata.bulkAdd(testData);

    // Invalidate cache before each test
    notebookSearchService.invalidateCache();
  });

  afterEach(() => {
    // Clean up
    notebookSearchService.invalidateCache();
  });

  describe('searchNotebooks - text search', () => {
    it('should search by exact text match', async () => {
      const results = await notebookSearchService.searchNotebooks('Python', {});

      expect(results.length).toBeGreaterThan(0);
      const notebookIds = results.map(r => r.notebookId);
      expect(notebookIds).toContain('nb1');
      expect(notebookIds).toContain('nb3');
    });

    it('should perform fuzzy search with partial matches', async () => {
      const results = await notebookSearchService.searchNotebooks('machn learn', {});

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].notebookId).toBe('nb1'); // "Machine Learning"
    });

    it('should search in both customName and title fields', async () => {
      const results = await notebookSearchService.searchNotebooks('React', {});

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].notebookId).toBe('nb2');
    });

    it('should return empty array when no matches found', async () => {
      const results = await notebookSearchService.searchNotebooks('NonexistentKeyword123', {});

      expect(results).toEqual([]);
    });

    it('should return all notebooks when query is empty', async () => {
      const results = await notebookSearchService.searchNotebooks('', {});

      expect(results).toHaveLength(4);
    });
  });

  describe('searchNotebooks - folder filter', () => {
    it('should filter by single folder', async () => {
      const results = await notebookSearchService.searchNotebooks('', {
        folderIds: ['f1'],
      });

      expect(results).toHaveLength(2);
      const notebookIds = results.map(r => r.notebookId);
      expect(notebookIds).toContain('nb1');
      expect(notebookIds).toContain('nb3');
    });

    it('should filter by multiple folders (OR logic)', async () => {
      const results = await notebookSearchService.searchNotebooks('', {
        folderIds: ['f1', 'f2'],
      });

      expect(results).toHaveLength(3);
      const notebookIds = results.map(r => r.notebookId);
      expect(notebookIds).toContain('nb1');
      expect(notebookIds).toContain('nb2');
      expect(notebookIds).toContain('nb3');
    });

    it('should combine text search with folder filter', async () => {
      const results = await notebookSearchService.searchNotebooks('Python', {
        folderIds: ['f1'],
      });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.customName?.includes('Python'))).toBe(true);
    });
  });

  describe('searchNotebooks - tag filter', () => {
    it('should filter by tags with OR logic', async () => {
      const results = await notebookSearchService.searchNotebooks('', {
        tagIds: ['t1', 't2'],
        tagLogic: 'OR',
      });

      expect(results).toHaveLength(3); // nb1, nb2, nb3 all have t1 or t2
    });

    it('should filter by tags with AND logic', async () => {
      const results = await notebookSearchService.searchNotebooks('', {
        tagIds: ['t1', 't2'],
        tagLogic: 'AND',
      });

      expect(results).toHaveLength(1);
      expect(results[0].notebookId).toBe('nb1'); // Only nb1 has both t1 and t2
    });

    it('should filter by single tag', async () => {
      const results = await notebookSearchService.searchNotebooks('', {
        tagIds: ['t3'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].notebookId).toBe('nb4');
    });
  });

  describe('searchNotebooks - date filter', () => {
    it('should filter by created date range', async () => {
      const results = await notebookSearchService.searchNotebooks('', {
        dateRange: {
          from: new Date('2025-01-10'),
          to: new Date('2025-01-20'),
          type: 'created',
        },
      });

      expect(results).toHaveLength(2); // nb1 and nb2
      const notebookIds = results.map(r => r.notebookId);
      expect(notebookIds).toContain('nb1');
      expect(notebookIds).toContain('nb2');
    });

    it('should filter by modified date range', async () => {
      const results = await notebookSearchService.searchNotebooks('', {
        dateRange: {
          from: new Date('2025-01-15'),
          to: new Date('2025-01-25'),
          type: 'modified',
        },
      });

      expect(results).toHaveLength(3); // nb1, nb2, nb3
      const notebookIds = results.map(r => r.notebookId);
      expect(notebookIds).toContain('nb1');
      expect(notebookIds).toContain('nb2');
      expect(notebookIds).toContain('nb3');
    });
  });

  describe('searchNotebooks - combined filters', () => {
    it('should combine text + folder + tag filters', async () => {
      const results = await notebookSearchService.searchNotebooks('Python', {
        folderIds: ['f1'],
        tagIds: ['t1'],
      });

      expect(results).toHaveLength(2); // nb1 and nb3 match all criteria
    });

    it('should combine all filter types (text + folder + tag + date)', async () => {
      const results = await notebookSearchService.searchNotebooks('Python', {
        folderIds: ['f1'],
        tagIds: ['t1', 't2'],
        tagLogic: 'AND',
        dateRange: {
          from: new Date('2025-01-01'),
          to: new Date('2025-01-20'),
          type: 'created',
        },
      });

      // Only nb1 matches all: text=Python, folder=f1, tags=t1+t2, created in range
      expect(results).toHaveLength(1);
      expect(results[0].notebookId).toBe('nb1');
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return top 5 suggestions', async () => {
      const suggestions = await notebookSearchService.getSearchSuggestions('p');

      expect(suggestions.length).toBeLessThanOrEqual(5);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return empty array for queries less than 2 chars', async () => {
      const suggestions = await notebookSearchService.getSearchSuggestions('p');

      expect(suggestions).toEqual([]);
    });
  });

  describe('countNotebooks', () => {
    it('should count all notebooks when no filters', async () => {
      const count = await notebookSearchService.countNotebooks({});

      expect(count).toBe(4);
    });

    it('should count filtered notebooks', async () => {
      const count = await notebookSearchService.countNotebooks({
        folderIds: ['f1'],
      });

      expect(count).toBe(2);
    });
  });

  describe('cache management', () => {
    it('should invalidate cache when called', async () => {
      // First search initializes cache
      await notebookSearchService.searchNotebooks('Python', {});

      // Invalidate
      notebookSearchService.invalidateCache();

      // Next search should reinitialize (not throw error)
      const results = await notebookSearchService.searchNotebooks('Python', {});
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
