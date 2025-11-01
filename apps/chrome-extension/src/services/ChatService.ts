/**
 * Chat Service - Write-through cache pattern
 * 
 * Writes to Convex first (source of truth), then caches locally in IndexedDB.
 * Fallback: If offline or error, saves locally only and marks for sync.
 */

import { convex } from '../lib/convex';
import { api } from '../../convex/_generated/api';
import { db, type ChatEntry } from '../lib/db';

export class ChatService {
  /**
   * Save chat with write-through pattern
   * 
   * @param chat - Chat data (without id)
   * @returns Object with localId and optional convexId
   */
  static async saveChat(
    chat: Omit<ChatEntry, 'id' | 'convexId' | 'cachedAt' | 'syncedAt' | 'syncError' | 'syncAttempts'>
  ): Promise<{ localId: string; convexId?: string }> {
    const localId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('[ChatService] Saving chat to Convex...');
      
      // Step 1: Write to Convex (primary source of truth)
      const convexId = await convex.mutation(api.chats.create, {
        question: chat.question,
        answer: chat.answer,
        notebookId: chat.notebookId || '',
        timestamp: chat.timestamp,
        source: chat.source as 'notebooklm' | 'chatgpt' | 'claude' | 'perplexity' || 'notebooklm',
        localId,
      });
      
      console.log('[ChatService] Chat saved to Convex:', convexId);
      
      // Step 2: Cache in IndexedDB with convexId
      await db.chats.add({
        id: localId,
        ...chat,
        convexId: convexId as string,
        cachedAt: Date.now(),
        syncedAt: Date.now(),
      });
      
      console.log('[ChatService] Chat cached locally:', localId);
      
      return { localId, convexId: convexId as string };
    } catch (error) {
      console.error('[ChatService] Failed to save to Convex:', error);
      
      // Fallback: Save to IndexedDB only, mark for sync
      await db.chats.add({
        id: localId,
        ...chat,
        syncError: error instanceof Error ? error.message : 'Unknown error',
        syncAttempts: 0, // Will be picked up by SyncService
      });
      
      console.warn('[ChatService] Chat saved locally only (will sync later)');
      
      // Re-throw to let caller know about the error
      throw error;
    }
  }
  
  /**
   * Update chat
   * 
   * @param chatId - Local chat ID
   * @param updates - Fields to update
   */
  static async updateChat(
    chatId: string,
    updates: Partial<Pick<ChatEntry, 'question' | 'answer' | 'notebookId'>>
  ): Promise<void> {
    const chat = await db.chats.get(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Update Convex first if chat has convexId
    if (chat.convexId) {
      try {
        await convex.mutation(api.chats.update, {
          id: chat.convexId as any,
          ...updates,
        });
        
        // Update local cache
        await db.chats.update(chatId, {
          ...updates,
          syncedAt: Date.now(),
        });
      } catch (error) {
        console.error('[ChatService] Failed to update Convex:', error);
        
        // Update locally anyway, mark as unsynced
        await db.chats.update(chatId, {
          ...updates,
          syncError: error instanceof Error ? error.message : 'Unknown error',
        });
        
        throw error;
      }
    } else {
      // No convexId yet, just update locally
      await db.chats.update(chatId, updates);
    }
  }
  
  /**
   * Delete chat
   * 
   * @param chatId - Local chat ID
   */
  static async deleteChat(chatId: string): Promise<void> {
    const chat = await db.chats.get(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Delete from Convex first if chat has convexId
    if (chat.convexId) {
      try {
        await convex.mutation(api.chats.remove, { id: chat.convexId as any });
      } catch (error) {
        console.error('[ChatService] Failed to delete from Convex:', error);
        // Continue with local deletion anyway
      }
    }
    
    // Delete from IndexedDB
    await db.chats.delete(chatId);
  }
  
  /**
   * Get all chats (from local cache)
   * 
   * Use this for instant UI updates. SyncService will keep cache fresh.
   */
  static async getAllChats(): Promise<ChatEntry[]> {
    return await db.chats.orderBy('timestamp').reverse().toArray();
  }
  
  /**
   * Search chats (from local cache)
   * 
   * @param keyword - Search term
   */
  static async searchChats(keyword: string): Promise<ChatEntry[]> {
    const lowerKeyword = keyword.toLowerCase();
    
    return await db.chats
      .filter(chat => 
        chat.question.toLowerCase().includes(lowerKeyword) ||
        chat.answer.toLowerCase().includes(lowerKeyword)
      )
      .toArray();
  }
}
