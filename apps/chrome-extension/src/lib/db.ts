/**
 * IndexedDB Database Schema
 * Using Dexie.js for IndexedDB management
 */

import Dexie, { type EntityTable } from 'dexie';
import type { AgentResultCache } from '../types/agent';
import type {
  ChatEntry,
  QueryHistoryEntry,
  NotebookCacheEntry,
  CapturedSourceEntry,
  AudioOverview,
  ExportHistoryEntry,
} from '../types/search';
import type { Folder, NotebookMetadata } from '../types/folder';
import { runFolderMigration } from './migrations/v2-folders';

/**
 * Database class extending Dexie
 */
class SuperNotebookLMDatabase extends Dexie {
  // Tables
  chats!: EntityTable<ChatEntry, 'id'>;
  queryHistory!: EntityTable<QueryHistoryEntry, 'id'>;
  notebookCache!: EntityTable<NotebookCacheEntry, 'id'>;
  capturedSources!: EntityTable<CapturedSourceEntry, 'id'>;
  audioOverviews!: EntityTable<AudioOverview, 'id'>;
  exportHistory!: EntityTable<ExportHistoryEntry, 'id'>;
  folders!: EntityTable<Folder, 'id'>;
  notebookMetadata!: EntityTable<NotebookMetadata, 'notebookId'>;
  agentResults!: EntityTable<AgentResultCache, 'id'>;

  constructor() {
    super('SuperNotebookLMDB');
    
    // Define schema version 1
    this.version(1).stores({
      // Chats table - stores AI chat history
      chats: 'id, timestamp, question, answer',
      
      // Query history table - stores search queries
      queryHistory: 'id, timestamp, isBookmarked, query',
      
      // Notebook cache table - caches NotebookLM content
      notebookCache: 'id, title, lastUpdated',
      
      // Captured sources table - stores captured URLs
      capturedSources: 'id, url, title, timestamp, platform',
    });

    // Define schema version 2 - Add audioOverviews table
    this.version(2).stores({
      chats: 'id, timestamp, question, answer',
      queryHistory: 'id, timestamp, isBookmarked, query',
      notebookCache: 'id, title, lastUpdated',
      capturedSources: 'id, url, title, timestamp, platform',
      // Audio overviews table - stores downloaded NotebookLM audio
      audioOverviews: 'id, notebookId, title, createdAt',
    });

    // Define schema version 3 - Add exportHistory table
    this.version(3).stores({
      chats: 'id, timestamp, question, answer',
      queryHistory: 'id, timestamp, isBookmarked, query',
      notebookCache: 'id, title, lastUpdated',
      capturedSources: 'id, url, title, timestamp, platform',
      audioOverviews: 'id, notebookId, title, createdAt',
      // Export history table - stores ChatGPT export events
      exportHistory: 'id, timestamp, exportType, success, sourceUrl',
    });

    // Define schema version 4 - Add folders and notebookMetadata tables
    this.version(4)
      .stores({
        chats: 'id, timestamp, question, answer',
        queryHistory: 'id, timestamp, isBookmarked, query',
        notebookCache: 'id, title, lastUpdated',
        capturedSources: 'id, url, title, timestamp, platform',
        audioOverviews: 'id, notebookId, title, createdAt',
        exportHistory: 'id, timestamp, exportType, success, sourceUrl',
        // Folder hierarchy table
        folders: 'id, parentId, createdAt, name, color',
        // Notebook metadata table with multi-entry indexes for folders/tags
        notebookMetadata: 'notebookId, customName, lastUpdatedAt, *folderIds, *tagIds',
      })
      .upgrade(async transaction => {
        await runFolderMigration(transaction);
      });

    // Define schema version 5 - Add agentResults cache table
    this.version(5).stores({
      chats: 'id, timestamp, question, answer',
      queryHistory: 'id, timestamp, isBookmarked, query',
      notebookCache: 'id, title, lastUpdated',
      capturedSources: 'id, url, title, timestamp, platform',
      audioOverviews: 'id, notebookId, title, createdAt',
      exportHistory: 'id, timestamp, exportType, success, sourceUrl',
      folders: 'id, parentId, createdAt, name, color',
      notebookMetadata: 'notebookId, customName, lastUpdatedAt, *folderIds, *tagIds',
      // Agent results cache table
      agentResults: 'id, agentId, cacheKey, expiresAt',
    });

    // Define schema version 6 - Add sync fields to chats table
    this.version(6).stores({
      // Chats table - stores AI chat history with Convex sync fields
      chats: 'id, timestamp, question, answer, convexId, cachedAt, syncedAt',
      queryHistory: 'id, timestamp, isBookmarked, query',
      notebookCache: 'id, title, lastUpdated',
      capturedSources: 'id, url, title, timestamp, platform',
      audioOverviews: 'id, notebookId, title, createdAt',
      exportHistory: 'id, timestamp, exportType, success, sourceUrl',
      folders: 'id, parentId, createdAt, name, color',
      notebookMetadata: 'notebookId, customName, lastUpdatedAt, *folderIds, *tagIds',
      agentResults: 'id, agentId, cacheKey, expiresAt',
    });
  }
}

// Create and export database instance
export const db = new SuperNotebookLMDatabase();

/**
 * Helper functions for database operations
 */

/**
 * Add a chat entry
 */
export async function addChatEntry(entry: Omit<ChatEntry, 'id'>): Promise<string> {
  const id = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await db.chats.add({ id, ...entry });
  return id;
}

/**
 * Get all chats
 */
export async function getAllChats(): Promise<ChatEntry[]> {
  return await db.chats.orderBy('timestamp').reverse().toArray();
}

/**
 * Search chats by keyword
 */
export async function searchChats(keyword: string): Promise<ChatEntry[]> {
  const lowerKeyword = keyword.toLowerCase();
  
  return await db.chats
    .filter(chat => 
      chat.question.toLowerCase().includes(lowerKeyword) ||
      chat.answer.toLowerCase().includes(lowerKeyword)
    )
    .toArray();
}

/**
 * Add query to history
 */
export async function addQueryHistory(query: string, resultCount: number): Promise<string> {
  const id = `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const entry = {
    id,
    query,
    timestamp: Date.now(),
    resultCount,
    isBookmarked: false,
  };
  
  console.log('[DB] Adding query to history:', entry);
  await db.queryHistory.add(entry);
  console.log('[DB] Query added successfully, ID:', id);
  
  return id;
}

/**
 * Get query history (last N queries)
 */
export async function getQueryHistory(limit = 10): Promise<QueryHistoryEntry[]> {
  const results = await db.queryHistory
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
  
  console.log('[DB] getQueryHistory found:', results.length, 'entries');
  return results;
}

/**
 * Get bookmarked queries
 */
export async function getBookmarkedQueries(): Promise<QueryHistoryEntry[]> {
  // Dexie: sortBy() returns a Promise, not a Collection
  // So we need to sort first, then reverse the resulting array
  const results = await db.queryHistory
    .where('isBookmarked')
    .equals(1)  // Dexie stores booleans as 0/1
    .sortBy('timestamp');
  
  console.log('[DB] getBookmarkedQueries found:', results.length);
  return results.reverse();
}

/**
 * Toggle bookmark status
 */
export async function toggleQueryBookmark(queryId: string): Promise<void> {
  const query = await db.queryHistory.get(queryId);
  if (query) {
    await db.queryHistory.update(queryId, {
      isBookmarked: !query.isBookmarked,
    });
  }
}

/**
 * Clear query history (keep bookmarked ones)
 */
export async function clearQueryHistory(): Promise<void> {
  const deleted = await db.queryHistory
    .where('isBookmarked')
    .equals(0)  // Dexie stores booleans as 0/1
    .delete();
  
  console.log('[DB] Cleared', deleted, 'query history entries (kept bookmarked)');
}

/**
 * Delete old query history (older than N days, excluding bookmarked)
 */
export async function cleanupOldQueryHistory(daysToKeep = 30): Promise<number> {
  const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  
  return await db.queryHistory
    .where('timestamp')
    .below(cutoffTime)
    .and(entry => !entry.isBookmarked)
    .delete();
}

/**
 * Add or update notebook cache entry
 */
export async function upsertNotebookCache(entry: NotebookCacheEntry): Promise<void> {
  await db.notebookCache.put(entry);
}

/**
 * Get all cached notebooks
 */
export async function getAllNotebooks(): Promise<NotebookCacheEntry[]> {
  return await db.notebookCache.toArray();
}

/**
 * Search notebooks by keyword
 */
export async function searchNotebooks(keyword: string): Promise<NotebookCacheEntry[]> {
  const lowerKeyword = keyword.toLowerCase();
  
  return await db.notebookCache
    .filter(notebook => 
      notebook.title.toLowerCase().includes(lowerKeyword) ||
      notebook.content.toLowerCase().includes(lowerKeyword)
    )
    .toArray();
}

/**
 * Add captured source
 */
export async function addCapturedSource(entry: Omit<CapturedSourceEntry, 'id'>): Promise<string> {
  const id = `source-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await db.capturedSources.add({ id, ...entry });
  return id;
}

/**
 * Get all captured sources
 */
export async function getAllCapturedSources(): Promise<CapturedSourceEntry[]> {
  return await db.capturedSources.orderBy('timestamp').reverse().toArray();
}

/**
 * Search captured sources by keyword
 */
export async function searchCapturedSources(keyword: string): Promise<CapturedSourceEntry[]> {
  const lowerKeyword = keyword.toLowerCase();
  
  return await db.capturedSources
    .filter(source => {
      const urlMatch = source.url.toLowerCase().includes(lowerKeyword);
      const titleMatch = source.title.toLowerCase().includes(lowerKeyword);
      const descMatch = source.description ? source.description.toLowerCase().includes(lowerKeyword) : false;
      return urlMatch || titleMatch || descMatch;
    })
    .toArray();
}

/**
 * Delete old chat entries (older than N days)
 */
export async function cleanupOldChats(daysToKeep = 90): Promise<number> {
  const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  
  const deleted = await db.chats
    .where('timestamp')
    .below(cutoffTime)
    .delete();
  
  if (deleted > 0) {
    console.log(`[DB] Cleaned up ${deleted} old chat entries (older than ${daysToKeep} days)`);
  }
  
  return deleted;
}

/**
 * Delete old notebook cache (older than N days)
 */
export async function cleanupOldNotebookCache(daysToKeep = 7): Promise<number> {
  const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  
  const deleted = await db.notebookCache
    .where('lastUpdated')
    .below(cutoffTime)
    .delete();
  
  if (deleted > 0) {
    console.log(`[DB] Cleaned up ${deleted} old notebook cache entries (older than ${daysToKeep} days)`);
  }
  
  return deleted;
}

/**
 * Estimate storage usage (approximate)
 */
export async function estimateStorageUsage(): Promise<void> {
  try {
    const [chatCount, queryCount, notebookCount, sourceCount] = await Promise.all([
      db.chats.count(),
      db.queryHistory.count(),
      db.notebookCache.count(),
      db.capturedSources.count(),
    ]);
    
    // Rough estimates: chat=500B, query=100B, notebook=2KB, source=200B
    const estimatedBytes = 
      (chatCount * 500) + 
      (queryCount * 100) + 
      (notebookCount * 2000) + 
      (sourceCount * 200);
    
    const estimatedMB = (estimatedBytes / 1024 / 1024).toFixed(2);
    
    console.log(`[DB] Storage estimate: ${estimatedMB}MB (${chatCount} chats, ${queryCount} queries, ${notebookCount} notebooks, ${sourceCount} sources)`);
    
    // Warn if approaching 50MB (reasonable limit)
    if (estimatedBytes > 50 * 1024 * 1024) {
      console.warn('[DB] Storage usage is high (>50MB). Consider clearing old data.');
    }
  } catch (error) {
    console.error('[DB] Failed to estimate storage:', error);
  }
}

/**
 * Add export history entry
 */
export async function addExportHistory(entry: Omit<ExportHistoryEntry, 'id'>): Promise<string> {
  const id = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await db.exportHistory.add({ id, ...entry });
  console.log('[DB] Export history added:', id, entry.exportType, entry.success);
  return id;
}

/**
 * Get export history (last N exports)
 */
export async function getExportHistory(limit = 50): Promise<ExportHistoryEntry[]> {
  return await db.exportHistory
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Get export history by type
 */
export async function getExportHistoryByType(exportType: ExportHistoryEntry['exportType']): Promise<ExportHistoryEntry[]> {
  return await db.exportHistory
    .where('exportType')
    .equals(exportType)
    .reverse()
    .sortBy('timestamp');
}

/**
 * Get successful exports only
 */
export async function getSuccessfulExports(limit = 50): Promise<ExportHistoryEntry[]> {
  return await db.exportHistory
    .where('success')
    .equals(1)  // Dexie stores booleans as 0/1
    .reverse()
    .sortBy('timestamp')
    .then(results => results.slice(0, limit));
}

/**
 * Get failed exports
 */
export async function getFailedExports(): Promise<ExportHistoryEntry[]> {
  return await db.exportHistory
    .where('success')
    .equals(0)
    .reverse()
    .sortBy('timestamp');
}

/**
 * Get export statistics
 */
export async function getExportStats(): Promise<{
  total: number;
  successful: number;
  failed: number;
  byType: Record<string, number>;
}> {
  const allExports = await db.exportHistory.toArray();
  
  const stats = {
    total: allExports.length,
    successful: allExports.filter(e => e.success).length,
    failed: allExports.filter(e => !e.success).length,
    byType: {} as Record<string, number>,
  };
  
  allExports.forEach(exp => {
    stats.byType[exp.exportType] = (stats.byType[exp.exportType] || 0) + 1;
  });
  
  return stats;
}

/**
 * Delete old export history (older than N days)
 */
export async function cleanupOldExportHistory(daysToKeep = 90): Promise<number> {
  const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  
  const deleted = await db.exportHistory
    .where('timestamp')
    .below(cutoffTime)
    .delete();
  
  if (deleted > 0) {
    console.log(`[DB] Cleaned up ${deleted} old export history entries (older than ${daysToKeep} days)`);
  }
  
  return deleted;
}

/**
 * Search export history by title
 */
export async function searchExportHistory(keyword: string): Promise<ExportHistoryEntry[]> {
  const lowerKeyword = keyword.toLowerCase();
  
  return await db.exportHistory
    .filter(entry => 
      entry.title.toLowerCase().includes(lowerKeyword) ||
      entry.sourceUrl.toLowerCase().includes(lowerKeyword)
    )
    .toArray();
}

/**
 * Initialize database with cleanup and monitoring
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Run all cleanup operations
    await Promise.all([
      cleanupOldChats(90),           // Keep 90 days of chat history
      cleanupOldQueryHistory(30),    // Keep 30 days of query history
      cleanupOldNotebookCache(7),    // Keep 7 days of notebook cache
      cleanupOldExportHistory(90),   // Keep 90 days of export history
    ]);
    
    // Log storage usage
    await estimateStorageUsage();
    
    console.log('[DB] Database initialized successfully with automatic cleanup');
  } catch (error) {
    console.error('[DB] Database initialization error:', error);
  }
}

// Auto-initialize on import
initializeDatabase();
