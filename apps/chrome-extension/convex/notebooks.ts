import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { authComponent } from './auth';
import { validateContent, logModerationViolation } from './moderation';

// Validation constants
const NOTEBOOK_VALIDATION = {
  title: {
    minLength: 3,
    maxLength: 100,
  },
  description: {
    minLength: 10,
    maxLength: 500,
  },
  content: {
    minLength: 50,
    maxLength: 100000, // ~100KB text
  },
  tags: {
    maxItems: 10,
    maxLength: 30, // per tag
  },
};

const VALID_CATEGORIES = [
  'Research',
  'Tutorial',
  'Notes',
  'Analysis',
  'Learning',
  'Other',
];

const RATE_LIMIT = {
  maxPublishesPerDay: 10,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
};

// Helper function to get authenticated user
async function requireAuth(ctx: any) {
  const user = await authComponent.getAuthUser(ctx);
  if (!user) {
    throw new Error('User must be authenticated');
  }
  return user;
}

// Helper function to check rate limiting
async function checkRateLimit(ctx: any, userId: string) {
  const oneDayAgo = Date.now() - RATE_LIMIT.windowMs;
  const recentPublishes = await ctx.db
    .query('publicNotebooks')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .filter((q: any) => q.gte(q.field('createdAt'), oneDayAgo))
    .collect();

  if (recentPublishes.length >= RATE_LIMIT.maxPublishesPerDay) {
    throw new Error(`Rate limit exceeded. Maximum ${RATE_LIMIT.maxPublishesPerDay} notebooks per day.`);
  }
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new public notebook
 * Rate limited to 10 per user per day
 */
export const createPublicNotebook = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    content: v.string(),
    category: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const user = await requireAuth(ctx);

    // 2. Check if user is banned (Story 4.8, Task 10)
    const userModerationRecord = await ctx.db
      .query('userModeration')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    if (userModerationRecord && userModerationRecord.bannedUntil !== undefined) {
      // null = permanent ban
      if (userModerationRecord.bannedUntil === null) {
        throw new Error('Your account has been permanently restricted due to repeated policy violations. Contact support at support@supernotebooklm.com for appeals.');
      }

      // Temporary ban - check if still active
      if (Date.now() < userModerationRecord.bannedUntil) {
        const daysLeft = Math.ceil((userModerationRecord.bannedUntil - Date.now()) / (24 * 60 * 60 * 1000));
        throw new Error(`Your account is temporarily restricted for ${daysLeft} more day${daysLeft > 1 ? 's' : ''} due to policy violations. You may publish again after the ban expires.`);
      }

      // Ban expired - clear it automatically
      await ctx.db.patch(userModerationRecord._id, {
        bannedUntil: undefined,
      });
    }

    // 3. Content moderation checks (Story 4.8)
    const moderationError = validateContent({
      title: args.title,
      description: args.description,
      content: args.content,
    });

    if (moderationError) {
      // Log moderation violation
      await logModerationViolation(ctx, {
        userId: user._id,
        violationType: 'automated_check',
        details: moderationError,
        action: 'blocked',
      });

      throw new Error(moderationError);
    }

    // 4. Validate input length constraints
    if (args.title.length < NOTEBOOK_VALIDATION.title.minLength || 
        args.title.length > NOTEBOOK_VALIDATION.title.maxLength) {
      throw new Error(
        `Title must be ${NOTEBOOK_VALIDATION.title.minLength}-${NOTEBOOK_VALIDATION.title.maxLength} characters`
      );
    }

    if (args.description.length < NOTEBOOK_VALIDATION.description.minLength || 
        args.description.length > NOTEBOOK_VALIDATION.description.maxLength) {
      throw new Error(
        `Description must be ${NOTEBOOK_VALIDATION.description.minLength}-${NOTEBOOK_VALIDATION.description.maxLength} characters`
      );
    }

    if (args.content.length < NOTEBOOK_VALIDATION.content.minLength || 
        args.content.length > NOTEBOOK_VALIDATION.content.maxLength) {
      throw new Error(
        `Content must be ${NOTEBOOK_VALIDATION.content.minLength}-${NOTEBOOK_VALIDATION.content.maxLength} characters`
      );
    }

    if (!VALID_CATEGORIES.includes(args.category)) {
      throw new Error(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    const tags = args.tags || [];
    if (tags.length > NOTEBOOK_VALIDATION.tags.maxItems) {
      throw new Error(`Maximum ${NOTEBOOK_VALIDATION.tags.maxItems} tags allowed`);
    }

    for (const tag of tags) {
      if (tag.length > NOTEBOOK_VALIDATION.tags.maxLength) {
        throw new Error(`Each tag must be max ${NOTEBOOK_VALIDATION.tags.maxLength} characters`);
      }
    }

    // 5. Duplicate content check (Story 4.8)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentNotebooks = await ctx.db
      .query('publicNotebooks')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .filter((q: any) => q.gte(q.field('createdAt'), oneDayAgo))
      .collect();

    // Check for exact duplicate content
    for (const existing of recentNotebooks) {
      if (existing.title === args.title.trim() && existing.content === args.content) {
        await logModerationViolation(ctx, {
          userId: user._id,
          violationType: 'duplicate',
          details: `Attempted to publish duplicate notebook: "${args.title}"`,
          action: 'blocked',
        });

        throw new Error('You have already published this exact notebook recently. Please wait 24 hours before republishing.');
      }
    }

    // 6. Rate limiting - check publish count in last 24h
    await checkRateLimit(ctx, user._id);

    // 7. Insert notebook
    const notebookId = await ctx.db.insert('publicNotebooks', {
      userId: user._id,
      title: args.title.trim(),
      description: args.description.trim(),
      content: args.content,
      category: args.category,
      tags,
      viewCount: 0,
      bookmarkCount: 0,
      isPublic: true,
      createdAt: Date.now(),
    });

    return {
      notebookId,
      message: 'Notebook published successfully',
    };
  },
});

/**
 * Update an existing public notebook
 * Only the owner can update their notebook
 */
export const updatePublicNotebook = mutation({
  args: {
    notebookId: v.id('publicNotebooks'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()), // Story 4.5: Allow unpublishing
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const user = await requireAuth(ctx);

    // 2. Fetch notebook to verify ownership
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook) {
      throw new Error('Notebook not found');
    }

    if (notebook.userId !== user._id) {
      throw new Error('You can only edit your own notebooks');
    }

    // 3. Build updates object
    const updates: any = { updatedAt: Date.now() };

    if (args.title !== undefined) {
      if (args.title.length < NOTEBOOK_VALIDATION.title.minLength || 
          args.title.length > NOTEBOOK_VALIDATION.title.maxLength) {
        throw new Error(
          `Title must be ${NOTEBOOK_VALIDATION.title.minLength}-${NOTEBOOK_VALIDATION.title.maxLength} characters`
        );
      }
      updates.title = args.title.trim();
    }

    if (args.description !== undefined) {
      if (args.description.length < NOTEBOOK_VALIDATION.description.minLength || 
          args.description.length > NOTEBOOK_VALIDATION.description.maxLength) {
        throw new Error(
          `Description must be ${NOTEBOOK_VALIDATION.description.minLength}-${NOTEBOOK_VALIDATION.description.maxLength} characters`
        );
      }
      updates.description = args.description.trim();
    }

    if (args.category !== undefined) {
      if (!VALID_CATEGORIES.includes(args.category)) {
        throw new Error(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
      }
      updates.category = args.category;
    }

    if (args.tags !== undefined) {
      if (args.tags.length > NOTEBOOK_VALIDATION.tags.maxItems) {
        throw new Error(`Maximum ${NOTEBOOK_VALIDATION.tags.maxItems} tags allowed`);
      }
      for (const tag of args.tags) {
        if (tag.length > NOTEBOOK_VALIDATION.tags.maxLength) {
          throw new Error(`Each tag must be max ${NOTEBOOK_VALIDATION.tags.maxLength} characters`);
        }
      }
      updates.tags = args.tags;
    }

    if (args.isPublic !== undefined) {
      updates.isPublic = args.isPublic;
    }

    // 4. Update notebook
    await ctx.db.patch(args.notebookId, updates);

    return { success: true };
  },
});

/**
 * Delete a public notebook
 * Only the owner can delete their notebook
 */
export const deletePublicNotebook = mutation({
  args: {
    notebookId: v.id('publicNotebooks'),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const user = await requireAuth(ctx);

    // 2. Fetch notebook to verify ownership
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook) {
      throw new Error('Notebook not found');
    }

    if (notebook.userId !== user._id) {
      throw new Error('You can only delete your own notebooks');
    }

    // 3. Hard delete (alternatively could soft delete by setting isPublic: false)
    await ctx.db.delete(args.notebookId);

    return { success: true };
  },
});

/**
 * Increment view count for a notebook
 * Called when a user views the notebook detail page
 */
export const incrementViewCount = mutation({
  args: {
    notebookId: v.id('publicNotebooks'),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook) {
      throw new Error('Notebook not found');
    }

    await ctx.db.patch(args.notebookId, {
      viewCount: notebook.viewCount + 1,
    });

    return { viewCount: notebook.viewCount + 1 };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get public notebooks with pagination and filtering
 * Supports sorting by recent, popular, or trending
 */
export const getPublicNotebooks = query({
  args: {
    category: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal('recent'),
      v.literal('popular'),
      v.literal('trending')
    )),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    let notebooks;

    // Sort by different criteria
    if (args.sortBy === 'popular') {
      // Use viewCount index for sorting by popularity
      let query = ctx.db
        .query('publicNotebooks')
        .withIndex('by_views')
        .order('desc');

      const allNotebooks = await query.collect();
      // Filter by category and public visibility in memory
      notebooks = allNotebooks
        .filter(n => n.isPublic)
        .filter(n => !args.category || n.category === args.category)
        .slice(0, limit);
    } else {
      // Default: recent (by createdAt) or trending
      let query = ctx.db
        .query('publicNotebooks')
        .withIndex('by_public_created', (q) => q.eq('isPublic', true))
        .order('desc');

      const allNotebooks = await query.collect();
      // Filter by category in memory
      notebooks = allNotebooks
        .filter(n => !args.category || n.category === args.category)
        .slice(0, limit);
    }

    // Return notebooks with userId
    // Note: Client can fetch user details separately via Better Auth if needed
    return {
      notebooks,
      hasMore: notebooks.length === limit,
    };
  },
});

/**
 * Search public notebooks by title
 * Uses Convex search index for full-text search
 */
export const searchPublicNotebooks = query({
  args: {
    searchQuery: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Use search index with filters
    const searchQuery = ctx.db
      .query('publicNotebooks')
      .withSearchIndex('search_title_desc', (q) => {
        let sq = q.search('title', args.searchQuery).eq('isPublic', true);
        if (args.category) {
          sq = sq.eq('category', args.category);
        }
        return sq;
      });

    const results = await searchQuery.take(limit);

    // Return search results with userId
    // Note: Client can fetch user details separately via Better Auth if needed
    return { notebooks: results };
  },
});

/**
 * Get a single notebook by ID with author details
 * Returns null if not found or not public
 */
export const getNotebookById = query({
  args: {
    notebookId: v.id('publicNotebooks'),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.db.get(args.notebookId);

    if (!notebook || !notebook.isPublic) {
      return null; // Not found or not public
    }

    // Return notebook with userId
    // Note: Client can fetch user details separately via Better Auth if needed
    return notebook;
  },
});

// ============================================================================
// FILE STORAGE (Basic implementation for Story 4.1)
// Full implementation in Story 4.2
// ============================================================================

/**
 * Generate upload URL for file attachments
 * Requires authentication
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Attach file to notebook
 * Only notebook owner can attach files
 */
export const attachFileToNotebook = mutation({
  args: {
    notebookId: v.id('publicNotebooks'),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook) {
      throw new Error('Notebook not found');
    }

    if (notebook.userId !== user._id) {
      throw new Error('You can only attach files to your own notebooks');
    }

    const attachments = notebook.attachments || [];
    attachments.push(args.storageId);

    await ctx.db.patch(args.notebookId, { attachments });

    return { success: true };
  },
});

/**
 * Get file URL from storage ID
 */
export const getAttachmentUrl = query({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// ============================================================================
// TRENDING & DISCOVERY QUERIES (Story 4.6)
// ============================================================================

/**
 * Get trending notebooks
 * Algorithm: score = views / (age_in_days + 1)
 */
export const getTrendingNotebooks = query({
  args: {
    category: v.optional(v.string()),
    days: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const days = args.days || 7;

    // Fetch all public notebooks
    const allNotebooks = await ctx.db
      .query('publicNotebooks')
      .withIndex('by_public_created', (q) => q.eq('isPublic', true))
      .collect();

    // Filter by category if specified
    const notebooks = args.category
      ? allNotebooks.filter(n => n.category === args.category)
      : allNotebooks;

    // Calculate trending scores
    const scoredNotebooks = notebooks.map((notebook) => {
      const ageInDays = (Date.now() - notebook.createdAt) / (24 * 60 * 60 * 1000);
      // Trending score: views / (age + 1)
      // +1 prevents division by zero for brand new notebooks
      const trendingScore = notebook.viewCount / (ageInDays + 1);

      return {
        ...notebook,
        trendingScore,
      };
    });

    // Sort by trending score descending
    scoredNotebooks.sort((a, b) => b.trendingScore - a.trendingScore);

    // Return top N
    return {
      notebooks: scoredNotebooks.slice(0, limit),
      hasMore: scoredNotebooks.length > limit,
    };
  },
});

/**
 * Get featured notebooks
 * Manually curated content
 */
export const getFeaturedNotebooks = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const notebooks = await ctx.db
      .query('publicNotebooks')
      .withIndex('by_featured', (q) => q.eq('featured', true))
      .filter((q) => q.eq(q.field('isPublic'), true))
      .order('desc')
      .take(limit);

    return {
      notebooks,
      hasMore: notebooks.length === limit,
    };
  },
});

/**
 * Get new and noteworthy notebooks
 * Published in last 24 hours with > 10 views
 */
export const getNewAndNoteworthy = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const notebooks = await ctx.db
      .query('publicNotebooks')
      .withIndex('by_created', (q) => q.gte('createdAt', oneDayAgo))
      .filter((q) =>
        q.and(
          q.eq(q.field('isPublic'), true),
          q.gt(q.field('viewCount'), 10)
        )
      )
      .order('desc')
      .take(limit);

    return notebooks;
  },
});

/**
 * Get related notebooks
 * Same category, excluding current notebook
 */
export const getRelatedNotebooks = query({
  args: {
    notebookId: v.id('publicNotebooks'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;

    // Get current notebook
    const currentNotebook = await ctx.db.get(args.notebookId);
    if (!currentNotebook) return [];

    // Find notebooks in same category, excluding current
    const allInCategory = await ctx.db
      .query('publicNotebooks')
      .withIndex('by_category', (q) => q.eq('category', currentNotebook.category))
      .filter((q) =>
        q.and(
          q.eq(q.field('isPublic'), true),
          q.neq(q.field('_id'), args.notebookId)
        )
      )
      .collect();

    // Sort by viewCount descending (most popular first)
    allInCategory.sort((a, b) => b.viewCount - a.viewCount);

    return allInCategory.slice(0, limit);
  },
});

// ============================================================================
// USER PROFILE QUERIES (Story 4.5)
// ============================================================================

/**
 * Get all notebooks published by a specific user
 * Used for "My Published Notebooks" section in Settings
 */
export const getUserNotebooks = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error('Authentication required');
    }

    // Use provided userId or default to authenticated user
    const targetUserId = args.userId || user._id;

    // Fetch user's notebooks (both public and unpublished)
    const notebooks = await ctx.db
      .query('publicNotebooks')
      .withIndex('by_user', (q) => q.eq('userId', targetUserId))
      .order('desc') // Newest first
      .collect();

    return notebooks;
  },
});

/**
 * Get user profile stats
 * Returns total notebooks, total views, and account info
 */
export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error('Authentication required');
    }

    // Get all user's notebooks
    const notebooks = await ctx.db
      .query('publicNotebooks')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    // Calculate total views
    const totalViews = notebooks.reduce((sum, nb) => sum + nb.viewCount, 0);

    // Get only public notebooks count
    const publicNotebooks = notebooks.filter(nb => nb.isPublic);

    return {
      totalNotebooks: notebooks.length,
      publicNotebooks: publicNotebooks.length,
      totalViews,
      userId: user._id,
    };
  },
});
