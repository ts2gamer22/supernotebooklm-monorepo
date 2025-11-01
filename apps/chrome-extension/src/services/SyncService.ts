/**
 * Sync Service - Bidirectional sync between IndexedDB and Convex
 * 
 * This service implements:
 * - Push: Upload local chats to Convex (IndexedDB → Convex)
 * - Pull: Download remote chats from Convex (Convex → IndexedDB)
 * - Background sync: Runs every 5 minutes + on reconnect
 * - Offline queue: Retries failed syncs when back online
 */

import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";
import { db, type ChatEntry } from "../lib/db";

interface SyncOptions {
  syncInterval?: number;  // Sync every N milliseconds (default: 5 min)
  batchSize?: number;     // Max items to sync per batch (default: 50)
  maxRetries?: number;    // Max retry attempts (default: 3)
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSync: number;
  unsyncedChats: number;
  failedChats: number;
}

export class SyncService {
  private convex: ConvexReactClient;
  private options: Required<SyncOptions>;
  private intervalId?: number;
  private isSyncing = false;
  private lastSyncTimestamp = 0;
  
  constructor(convex: ConvexReactClient, options: SyncOptions = {}) {
    this.convex = convex;
    this.options = {
      syncInterval: options.syncInterval ?? 5 * 60 * 1000, // 5 minutes
      batchSize: options.batchSize ?? 50,
      maxRetries: options.maxRetries ?? 3,
    };
  }
  
  /**
   * Start background sync
   */
  start(): void {
    console.log('[SyncService] Starting background sync...', this.options);
    
    // Initial sync
    this.syncAll();
    
    // Periodic sync
    this.intervalId = setInterval(() => {
      if (!this.isSyncing) {
        this.syncAll();
      }
    }, this.options.syncInterval) as unknown as number;
    
    // Sync on network reconnect
    if (typeof self !== 'undefined') {
      self.addEventListener('online', () => {
        console.log('[SyncService] Network reconnected, syncing...');
        this.syncAll();
      });
    }
  }
  
  /**
   * Stop background sync
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log('[SyncService] Stopped');
  }
  
  /**
   * Sync all data types
   */
  async syncAll(): Promise<void> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress, skipping');
      return;
    }
    
    this.isSyncing = true;
    const startTime = Date.now();
    
    console.log('[SyncService] Starting sync...');
    
    try {
      await Promise.all([
        this.syncChats(),
        // TODO: Add other types when implemented
        // this.syncFolders(),
        // this.syncNotebookMetadata(),
      ]);
      
      this.lastSyncTimestamp = Date.now();
      const duration = Date.now() - startTime;
      console.log(`[SyncService] Sync complete in ${duration}ms`);
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Sync chats (push + pull)
   */
  async syncChats(): Promise<void> {
    await this.pushChatsToConvex();
    await this.pullChatsFromConvex();
  }
  
  /**
   * Push unsynced chats to Convex
   */
  private async pushChatsToConvex(): Promise<void> {
    try {
      // Get unsynced chats (no convexId and under retry limit)
      const unsyncedChats = await db.chats
        .filter(chat => 
          !chat.convexId && 
          (!chat.syncAttempts || chat.syncAttempts < this.options.maxRetries)
        )
        .limit(this.options.batchSize)
        .toArray();
      
      if (unsyncedChats.length === 0) {
        return;
      }
      
      console.log(`[SyncService] Pushing ${unsyncedChats.length} chats to Convex...`);
      
      // Bulk upload for efficiency
      const results = await this.convex.mutation(api.chats.bulkCreate, {
        chats: unsyncedChats.map(chat => ({
          question: chat.question,
          answer: chat.answer,
          notebookId: chat.notebookId || '',
          timestamp: chat.timestamp,
          source: chat.source as 'notebooklm' | 'chatgpt' | 'claude' | 'perplexity' || 'notebooklm',
          localId: chat.id,
        })),
      });
      
      // Update local records with Convex IDs
      for (const result of results) {
        if (result.localId && result.convexId) {
          await db.chats.update(result.localId, {
            convexId: result.convexId as string,
            syncedAt: Date.now(),
            syncError: undefined,
            syncAttempts: 0,
          });
        }
      }
      
      const successCount = results.filter(r => !r.skipped).length;
      console.log(`[SyncService] Successfully pushed ${successCount} chats (${results.length - successCount} duplicates skipped)`);
    } catch (error) {
      console.error('[SyncService] Push chats failed:', error);
      
      // Update sync attempts for failed chats
      const unsyncedChats = await db.chats
        .filter(chat => !chat.convexId)
        .limit(this.options.batchSize)
        .toArray();
      
      for (const chat of unsyncedChats) {
        await db.chats.update(chat.id, {
          syncError: error instanceof Error ? error.message : 'Unknown error',
          syncAttempts: (chat.syncAttempts || 0) + 1,
        });
      }
    }
  }
  
  /**
   * Pull remote chats from Convex
   */
  private async pullChatsFromConvex(): Promise<void> {
    try {
      // Get all remote chats (or only updated since last sync)
      const remoteChats = this.lastSyncTimestamp > 0
        ? await this.convex.query(api.chats.listMineUpdatedSince, { 
            since: this.lastSyncTimestamp 
          })
        : await this.convex.query(api.chats.listMine);
      
      if (!remoteChats || remoteChats.length === 0) {
        return;
      }
      
      console.log(`[SyncService] Pulling ${remoteChats.length} chats from Convex...`);
      
      let addedCount = 0;
      let updatedCount = 0;
      
      for (const remote of remoteChats) {
        // Check if chat exists locally
        const local = await db.chats
          .where('convexId')
          .equals(remote._id)
          .first();
        
        if (!local) {
          // New chat from another device/website
          await db.chats.add({
            id: remote.localId || `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            question: remote.question,
            answer: remote.answer,
            notebookId: remote.notebookId,
            timestamp: remote.timestamp,
            source: remote.source,
            convexId: remote._id,
            cachedAt: Date.now(),
            syncedAt: Date.now(),
          });
          addedCount++;
        } else if (remote.updatedAt > (local.syncedAt || 0)) {
          // Remote is newer, update local
          await db.chats.update(local.id, {
            question: remote.question,
            answer: remote.answer,
            notebookId: remote.notebookId,
            timestamp: remote.timestamp,
            cachedAt: Date.now(),
            syncedAt: remote.updatedAt,
          });
          updatedCount++;
        }
      }
      
      console.log(`[SyncService] Pulled chats: ${addedCount} added, ${updatedCount} updated`);
    } catch (error) {
      console.error('[SyncService] Pull chats failed:', error);
    }
  }
  
  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const unsyncedCount = await db.chats
      .filter(chat => !chat.convexId)
      .count();
    
    const failedCount = await db.chats
      .filter(chat => (chat.syncAttempts || 0) >= this.options.maxRetries)
      .count();
    
    return {
      isSyncing: this.isSyncing,
      lastSync: this.lastSyncTimestamp,
      unsyncedChats: unsyncedCount,
      failedChats: failedCount,
    };
  }
}

// Singleton instance (initialized in background script)
let syncServiceInstance: SyncService | null = null;

/**
 * Initialize sync service singleton
 */
export function initializeSyncService(
  convex: ConvexReactClient, 
  options?: SyncOptions
): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService(convex, options);
    console.log('[SyncService] Singleton initialized');
  }
  return syncServiceInstance;
}

/**
 * Get sync service instance (safe for UI components)
 * Returns null if not initialized yet
 */
export function getSyncService(): SyncService | null {
  if (!syncServiceInstance) {
    console.warn('[SyncService] Singleton not initialized yet. Make sure background script is running.');
  }
  return syncServiceInstance;
}

/**
 * Initialize sync service from UI context (creates local instance if needed)
 * This allows UI components to work even if background script hasn't initialized yet
 */
export function getOrCreateSyncService(
  convex: ConvexReactClient,
  options?: SyncOptions
): SyncService {
  if (!syncServiceInstance) {
    console.log('[SyncService] Creating instance from UI context');
    syncServiceInstance = new SyncService(convex, options);
  }
  return syncServiceInstance;
}
