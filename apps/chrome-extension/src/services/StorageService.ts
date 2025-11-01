/**
 * Storage Service - Quota monitoring and storage management
 *
 * Handles:
 * - Real-time quota monitoring with navigator.storage.estimate()
 * - Threshold checking (70%, 80%, 90%, 95%, 98%)
 * - Storage breakdown by content type (chats, audio, captures)
 * - Quota enforcement (blocking saves at thresholds)
 */

import { db } from '../lib/db';
import type { ChatEntry, CapturedSourceEntry } from '../types/search';

/**
 * Quota information from navigator.storage.estimate()
 */
export interface QuotaInfo {
  used: number;
  total: number;
  available: number;
  percentage: number;
  lastChecked: number;
}

/**
 * Storage breakdown by content type
 */
export interface StorageBreakdown {
  total: number;
  used: number;
  available: number;
  percentage: number;
  breakdown: {
    chats: { bytes: number; percentage: number; count: number };
    audio: { bytes: number; percentage: number; count: number };
    captures: { bytes: number; percentage: number; count: number };
    other: { bytes: number; percentage: number };
  };
}

/**
 * Storage item for list view
 */
export interface StorageItem {
  id: string;
  type: 'chat' | 'audio' | 'capture';
  title: string;
  size: number;
  date: number;
  notebookId?: string;
}

/**
 * Storage Service Class
 */
class StorageService {
  private thresholds = [70, 80, 90, 95, 98];
  private lastNotifiedThreshold: number | null = null;

  /**
   * Check storage quota and store in chrome.storage.local
   * Sends warning message to sidebar if threshold crossed
   */
  async checkQuota(): Promise<QuotaInfo> {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const total = estimate.quota || 500_000_000; // 500MB fallback
      const available = total - used;
      const percentage = total > 0 ? (used / total) * 100 : 0;

      const quotaInfo: QuotaInfo = {
        used,
        total,
        available,
        percentage,
        lastChecked: Date.now(),
      };

      // Store in chrome.storage.local
      await chrome.storage.local.set({ quotaInfo });

      // Check thresholds and notify
      await this.checkThresholds(quotaInfo);

      console.log('[StorageService] Quota checked:', {
        used: `${(used / 1_000_000).toFixed(2)}MB`,
        total: `${(total / 1_000_000).toFixed(2)}MB`,
        percentage: `${percentage.toFixed(2)}%`,
      });

      return quotaInfo;
    } catch (error) {
      console.error('[StorageService] Failed to check quota:', error);

      // Fallback quota info
      return {
        used: 0,
        total: 500_000_000,
        available: 500_000_000,
        percentage: 0,
        lastChecked: Date.now(),
      };
    }
  }

  /**
   * Check if quota crossed any threshold and send warning
   */
  private async checkThresholds(quota: QuotaInfo): Promise<void> {
    try {
      // Find highest crossed threshold
      const crossedThreshold = this.thresholds
        .slice()
        .reverse()
        .find((threshold) => quota.percentage >= threshold);

      if (crossedThreshold && crossedThreshold !== this.lastNotifiedThreshold) {
        console.log(`[StorageService] Threshold crossed: ${crossedThreshold}%`);

        // Send message to sidebar
        await chrome.runtime.sendMessage({
          type: 'STORAGE_WARNING',
          level: crossedThreshold,
          data: quota,
        });

        this.lastNotifiedThreshold = crossedThreshold;

        // Store threshold in chrome.storage.local
        await chrome.storage.local.set({ lastNotifiedThreshold: crossedThreshold });
      }
    } catch (error) {
      // Ignore errors from sendMessage (sidebar may not be open)
      console.debug('[StorageService] Could not send warning message:', error);
    }
  }

  /**
   * Get storage breakdown by content type
   */
  async getStorageBreakdown(): Promise<StorageBreakdown> {
    try {
      // Fetch all data from IndexedDB
      const [chats, captures] = await Promise.all([
        db.chats.toArray(),
        db.capturedSources.toArray(),
      ]);

      // Calculate size per type
      const chatBytes = chats.reduce((sum, chat) => {
        const size = new Blob([JSON.stringify(chat)]).size;
        return sum + size;
      }, 0);

      // Note: Audio not implemented yet in Story 2.4
      const audioBytes = 0;
      const audioCount = 0;

      const captureBytes = captures.reduce((sum, capture) => {
        const size = new Blob([JSON.stringify(capture)]).size;
        return sum + size;
      }, 0);

      const totalUsed = chatBytes + audioBytes + captureBytes;
      const quota = await this.checkQuota();
      const otherBytes = Math.max(0, quota.used - totalUsed);

      return {
        total: quota.total,
        used: quota.used,
        available: quota.available,
        percentage: quota.percentage,
        breakdown: {
          chats: {
            bytes: chatBytes,
            percentage: quota.used > 0 ? (chatBytes / quota.used) * 100 : 0,
            count: chats.length,
          },
          audio: {
            bytes: audioBytes,
            percentage: quota.used > 0 ? (audioBytes / quota.used) * 100 : 0,
            count: audioCount,
          },
          captures: {
            bytes: captureBytes,
            percentage: quota.used > 0 ? (captureBytes / quota.used) * 100 : 0,
            count: captures.length,
          },
          other: {
            bytes: otherBytes,
            percentage: quota.used > 0 ? (otherBytes / quota.used) * 100 : 0,
          },
        },
      };
    } catch (error) {
      console.error('[StorageService] Failed to get storage breakdown:', error);
      throw error;
    }
  }

  /**
   * Check if a save operation is allowed based on quota
   *
   * Rules:
   * - Block all saves at 98%
   * - Block audio saves at 95%
   * - Check if new save would exceed quota
   */
  async canSave(sizeBytes: number, type: 'chat' | 'audio' | 'capture'): Promise<boolean> {
    try {
      const quota = await this.checkQuota();

      // Block all saves at 98%
      if (quota.percentage >= 98) {
        console.warn('[StorageService] Save blocked: quota at 98%');
        return false;
      }

      // Block audio saves at 95%
      if (type === 'audio' && quota.percentage >= 95) {
        console.warn('[StorageService] Audio save blocked: quota at 95%');
        return false;
      }

      // Check if new save would exceed quota
      if (quota.used + sizeBytes > quota.total) {
        console.warn('[StorageService] Save blocked: would exceed quota');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[StorageService] canSave check failed:', error);
      // Allow save on error (fail open)
      return true;
    }
  }

  /**
   * Get all storage items for management UI
   */
  async getAllStorageItems(): Promise<StorageItem[]> {
    try {
      const [chats, captures] = await Promise.all([
        db.chats.toArray(),
        db.capturedSources.toArray(),
      ]);

      const items: StorageItem[] = [];

      // Add chats
      chats.forEach((chat) => {
        items.push({
          id: chat.id,
          type: 'chat',
          title: chat.question.slice(0, 80),
          size: new Blob([JSON.stringify(chat)]).size,
          date: chat.timestamp,
          notebookId: chat.notebookId,
        });
      });

      // Add captures
      captures.forEach((capture) => {
        items.push({
          id: capture.id,
          type: 'capture',
          title: capture.title,
          size: new Blob([JSON.stringify(capture)]).size,
          date: capture.timestamp,
        });
      });

      // Note: Audio items will be added when Story 2.4 is implemented

      return items;
    } catch (error) {
      console.error('[StorageService] Failed to get storage items:', error);
      return [];
    }
  }

  /**
   * Delete storage items by IDs
   */
  async deleteItems(items: StorageItem[]): Promise<number> {
    let deleted = 0;

    try {
      for (const item of items) {
        if (item.type === 'chat') {
          await db.chats.delete(item.id);
          deleted++;
        } else if (item.type === 'capture') {
          await db.capturedSources.delete(item.id);
          deleted++;
        }
        // Audio deletion will be added in Story 2.4
      }

      console.log(`[StorageService] Deleted ${deleted} items`);

      // Refresh quota after deletion
      await this.checkQuota();

      return deleted;
    } catch (error) {
      console.error('[StorageService] Failed to delete items:', error);
      throw error;
    }
  }

  /**
   * Calculate total size of selected items
   */
  calculateTotalSize(items: StorageItem[]): number {
    return items.reduce((sum, item) => sum + item.size, 0);
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// Export singleton instance
export const storageService = new StorageService();
