/**
 * Chats API - Private chat history sync between extension and Convex
 * 
 * This API provides:
 * - Create, update, delete operations for chats
 * - List user's chats with sorting
 * - Bulk operations for initial sync
 * - Delta sync (only changed since timestamp)
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// ==========================================
// QUERIES (Read Operations)
// ==========================================

/**
 * List all user's chats (most recent first)
 */
export const listMine = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .first();
    
    if (!user) return [];
    
    return await ctx.db
      .query('chats')
      .withIndex('by_user_and_timestamp', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(1000); // Max 1000 chats
  },
});

/**
 * Get chats updated since timestamp (for delta sync)
 */
export const listMineUpdatedSince = query({
  args: { since: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .first();
    
    if (!user) return [];
    
    return await ctx.db
      .query('chats')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.gt(q.field('updatedAt'), args.since))
      .collect();
  },
});

/**
 * Get single chat by ID
 */
export const getById = query({
  args: { id: v.id('chats') },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.id);
    if (!chat) return null;
    
    // Verify ownership
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .first();
    
    if (!user || chat.userId !== user._id) {
      return null;
    }
    
    return chat;
  },
});

/**
 * Get sync stats (for debugging)
 */
export const getSyncStats = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .first();
    
    if (!user) return null;
    
    const chats = await ctx.db
      .query('chats')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    
    return {
      totalChats: chats.length,
      sources: {
        notebooklm: chats.filter((c) => c.source === 'notebooklm').length,
        chatgpt: chats.filter((c) => c.source === 'chatgpt').length,
        claude: chats.filter((c) => c.source === 'claude').length,
        perplexity: chats.filter((c) => c.source === 'perplexity').length,
      },
      oldestChat: chats[chats.length - 1]?.timestamp,
      newestChat: chats[0]?.timestamp,
    };
  },
});

// ==========================================
// MUTATIONS (Write Operations)
// ==========================================

/**
 * Create a new chat
 */
export const create = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    notebookId: v.string(),
    timestamp: v.number(),
    source: v.union(
      v.literal('notebooklm'),
      v.literal('chatgpt'),
      v.literal('claude'),
      v.literal('perplexity')
    ),
    localId: v.optional(v.string()),
    extensionVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .first();
    
    if (!user) throw new Error('User not found');
    
    // Check for duplicate (by localId to prevent double-uploads)
    if (args.localId) {
      const existing = await ctx.db
        .query('chats')
        .withIndex('by_local_id', (q) => q.eq('localId', args.localId))
        .first();
      
      if (existing) {
        console.log(`Chat with localId ${args.localId} already exists`);
        return existing._id;
      }
    }
    
    // Create chat
    const chatId = await ctx.db.insert('chats', {
      question: args.question,
      answer: args.answer,
      notebookId: args.notebookId,
      timestamp: args.timestamp,
      source: args.source,
      userId: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      localId: args.localId,
      extensionVersion: args.extensionVersion,
    });
    
    return chatId;
  },
});

/**
 * Bulk create chats (for initial sync)
 */
export const bulkCreate = mutation({
  args: {
    chats: v.array(
      v.object({
        question: v.string(),
        answer: v.string(),
        notebookId: v.string(),
        timestamp: v.number(),
        source: v.string(),
        localId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .first();
    
    if (!user) throw new Error('User not found');
    
    const results = [];
    
    for (const chat of args.chats) {
      // Check for duplicates
      if (chat.localId) {
        const existing = await ctx.db
          .query('chats')
          .withIndex('by_local_id', (q) => q.eq('localId', chat.localId))
          .first();
        
        if (existing) {
          results.push({ localId: chat.localId, convexId: existing._id, skipped: true });
          continue;
        }
      }
      
      // Insert
      const chatId = await ctx.db.insert('chats', {
        ...chat,
        userId: user._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      results.push({ localId: chat.localId, convexId: chatId, skipped: false });
    }
    
    return results;
  },
});

/**
 * Update a chat
 */
export const update = mutation({
  args: {
    id: v.id('chats'),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    notebookId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    const chat = await ctx.db.get(args.id);
    if (!chat) throw new Error('Chat not found');
    
    // Verify ownership
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .first();
    
    if (!user || chat.userId !== user._id) {
      throw new Error('Unauthorized');
    }
    
    // Update
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a chat
 */
export const remove = mutation({
  args: { id: v.id('chats') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    const chat = await ctx.db.get(args.id);
    if (!chat) throw new Error('Chat not found');
    
    // Verify ownership
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .first();
    
    if (!user || chat.userId !== user._id) {
      throw new Error('Unauthorized');
    }
    
    await ctx.db.delete(args.id);
  },
});

/**
 * Delete all chats for current user (for testing/cleanup)
 */
export const deleteAll = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .first();
    
    if (!user) throw new Error('User not found');
    
    const chats = await ctx.db
      .query('chats')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    
    for (const chat of chats) {
      await ctx.db.delete(chat._id);
    }
    
    return { deleted: chats.length };
  },
});
