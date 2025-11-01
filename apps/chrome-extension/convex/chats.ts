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
import { authComponent } from './auth';

// Helper function to get authenticated user
// NOTE: BetterAuth's authComponent.getAuthUser() only works for queries, not mutations
// For mutations, we use Convex's native ctx.auth.getUserIdentity()
async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    console.error('[requireAuth] No Convex identity found');
    throw new Error('Unauthenticated');
  }
  
  console.log('[requireAuth] Got identity:', { subject: identity.subject, email: identity.email });
  
  // For mutations, return a minimal user object compatible with BetterAuth structure
  // The identity.subject should be the user ID from BetterAuth
  return {
    _id: identity.subject,
    id: identity.subject,
    email: identity.email || '',
    name: identity.name || '',
  };
}

// ==========================================
// QUERIES (Read Operations)
// ==========================================

/**
 * List all user's chats (most recent first)
 */
export const listMine = query({
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
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
    const user = await authComponent.getAuthUser(ctx);
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
    const user = await authComponent.getAuthUser(ctx);
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
    const user = await authComponent.getAuthUser(ctx);
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
    // ============================================
    // DEBUG SECTION - Understanding Auth Context
    // ============================================
    console.log('[DEBUG] === chats:create mutation called ===');
    console.log('[DEBUG] ctx.auth exists?', !!ctx.auth);
    
    // Check 1: Convex native identity
    const identity = await ctx.auth.getUserIdentity();
    console.log('[DEBUG] getUserIdentity result:', {
      found: !!identity,
      subject: identity?.subject,
      email: identity?.email,
      issuer: identity?.issuer,
    });
    
    // Check 2: BetterAuth component
    try {
      const betterAuthUser = await authComponent.getAuthUser(ctx);
      console.log('[DEBUG] getAuthUser result:', {
        found: !!betterAuthUser,
        id: betterAuthUser?._id,
        email: betterAuthUser?.email,
      });
    } catch (error) {
      console.log('[DEBUG] getAuthUser error:', (error as Error).message);
    }
    
    console.log('[DEBUG] ====================================');
    
    // Get authenticated user (optional for now - fallback to anonymous)
    let userId: string;
    try {
      const user = await requireAuth(ctx);
      userId = user._id;
      console.log('[chats:create] Authenticated user:', userId);
    } catch (error) {
      // Fallback: Use anonymous user for now (temp fix)
      userId = 'anonymous';
      console.log('[chats:create] No auth, using anonymous. Error:', error);
    }

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
      userId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      localId: args.localId,
      extensionVersion: args.extensionVersion,
    });

    console.log('[chats:create] Chat created:', chatId);
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
        source: v.union(
          v.literal('notebooklm'),
          v.literal('chatgpt'),
          v.literal('claude'),
          v.literal('perplexity')
        ),
        localId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

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
        question: chat.question,
        answer: chat.answer,
        notebookId: chat.notebookId,
        timestamp: chat.timestamp,
        source: chat.source,
        userId: user._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        localId: chat.localId,
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
    const user = await requireAuth(ctx);

    const chat = await ctx.db.get(args.id);
    if (!chat) throw new Error('Chat not found');

    // Verify ownership
    if (chat.userId !== user._id) {
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
    const user = await requireAuth(ctx);

    const chat = await ctx.db.get(args.id);
    if (!chat) throw new Error('Chat not found');

    // Verify ownership
    if (chat.userId !== user._id) {
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
    const user = await requireAuth(ctx);

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
