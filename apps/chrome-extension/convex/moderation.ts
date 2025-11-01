import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { authComponent } from './auth';

// =============================================================================
// MODERATION CONFIGURATION
// =============================================================================

const PROFANITY_LIST = [
  // Basic profanity list (simplified for MVP)
  'fuck', 'shit', 'damn', 'bitch', 'ass', 'crap', 'piss',
  'cock', 'dick', 'pussy', 'cunt', 'bastard', 'slut', 'whore',
  // Hate speech indicators
  'nazi', 'hitler', 'racist', 'nigger', 'faggot', 'retard',
  // Add more as needed - this is a starter list
];

const SPAM_INDICATORS = [
  'click here', 'buy now', 'limited time', 'act now', 'free money',
  'make money fast', 'work from home', 'no credit check',
  'increase your', 'lose weight', 'viagra', 'casino', 'poker',
  // Add more spam patterns
];

const MAX_URLS_ALLOWED = 5;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_CONTENT_LENGTH = 100000; // 100KB
const DUPLICATE_CHECK_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_UNPUBLISH_REPORT_THRESHOLD = 5;

// =============================================================================
// CONTENT VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check for profanity in text
 * Uses word boundary checks to avoid false positives (e.g., "assessment" has "ass")
 */
function containsProfanity(text: string): { hasProfanity: boolean; matches: string[] } {
  const lowerText = text.toLowerCase();
  const matches: string[] = [];

  for (const word of PROFANITY_LIST) {
    // Create regex with word boundaries to match whole words
    // Also check for common variations (e.g., "fucking" contains "fuck")
    const wordBoundaryRegex = new RegExp(`\\b${word}\\b`, 'i');
    const containsRegex = new RegExp(`\\b${word}`, 'i'); // Matches "fuck" in "fucking"
    
    if (wordBoundaryRegex.test(text) || containsRegex.test(text)) {
      // Additional check: avoid false positives for short words
      if (word.length <= 3) {
        // For short words like "ass", require exact word match
        if (wordBoundaryRegex.test(text)) {
          matches.push(word);
        }
      } else {
        // For longer words, allow partial matches (catches variations)
        matches.push(word);
      }
    }
  }

  return {
    hasProfanity: matches.length > 0,
    matches,
  };
}

/**
 * Check for spam indicators
 */
function containsSpam(text: string): { isSpam: boolean; matches: string[] } {
  const lowerText = text.toLowerCase();
  const matches: string[] = [];

  for (const indicator of SPAM_INDICATORS) {
    if (lowerText.includes(indicator)) {
      matches.push(indicator);
    }
  }

  return {
    isSpam: matches.length > 0,
    matches,
  };
}

/**
 * Count URLs in text
 */
function countUrls(text: string): number {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches ? matches.length : 0;
}

/**
 * Validate content before publication
 * Returns error message if validation fails, null if passes
 */
export function validateContent(data: {
  title: string;
  description: string;
  content: string;
}): string | null {
  // 0. Empty content check
  if (!data.content || data.content.length === 0) {
    return 'Content cannot be empty';
  }

  // 1. Profanity check
  const titleProfanity = containsProfanity(data.title);
  if (titleProfanity.hasProfanity) {
    return `Title contains inappropriate language: ${titleProfanity.matches.join(', ')}`;
  }

  const descProfanity = containsProfanity(data.description);
  if (descProfanity.hasProfanity) {
    return `Description contains inappropriate language: ${descProfanity.matches.join(', ')}`;
  }

  // 2. Spam check
  const titleSpam = containsSpam(data.title);
  if (titleSpam.isSpam) {
    return `Title appears to be spam. Please remove: ${titleSpam.matches.join(', ')}`;
  }

  const descSpam = containsSpam(data.description);
  if (descSpam.isSpam) {
    return `Description appears to be spam. Please remove: ${descSpam.matches.join(', ')}`;
  }

  // 3. URL spam check
  const totalUrls = countUrls(data.content) + countUrls(data.description);
  if (totalUrls > MAX_URLS_ALLOWED) {
    return `Too many links (${totalUrls}). Maximum ${MAX_URLS_ALLOWED} links allowed.`;
  }

  // 4. Size limits
  if (data.description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description too long (${data.description.length} chars). Maximum ${MAX_DESCRIPTION_LENGTH} characters.`;
  }

  if (data.content.length > MAX_CONTENT_LENGTH) {
    return `Content too large (${data.content.length} chars). Maximum ${MAX_CONTENT_LENGTH} characters.`;
  }

  return null; // All checks passed
}

// =============================================================================
// MODERATION MUTATIONS
// =============================================================================

/**
 * Report a notebook for policy violations
 */
export const reportNotebook = mutation({
  args: {
    notebookId: v.id('publicNotebooks'),
    reason: v.string(), // Spam, Inappropriate, Copyright, Other
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error('You must be signed in to report notebooks');
    }

    // 2. Validate reason
    const validReasons = ['Spam', 'Inappropriate Content', 'Copyright Violation', 'Other'];
    if (!validReasons.includes(args.reason)) {
      throw new Error(`Invalid reason. Must be one of: ${validReasons.join(', ')}`);
    }

    // 3. Check if notebook exists
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook) {
      throw new Error('Notebook not found');
    }

    // 4. Prevent duplicate reports from same user
    const existingReport = await ctx.db
      .query('reportedNotebooks')
      .withIndex('by_reporter', (q) => q.eq('reporterId', user._id))
      .filter((q) => q.eq(q.field('notebookId'), args.notebookId))
      .first();

    if (existingReport) {
      throw new Error('You have already reported this notebook');
    }

    // 5. Create report
    const reportId = await ctx.db.insert('reportedNotebooks', {
      notebookId: args.notebookId,
      reporterId: user._id,
      reason: args.reason,
      details: args.details || '',
      status: 'pending',
      createdAt: Date.now(),
    });

    // 6. Check if we need to auto-unpublish (5+ reports)
    const reportCount = await ctx.db
      .query('reportedNotebooks')
      .withIndex('by_notebook', (q) => q.eq('notebookId', args.notebookId))
      .collect();

    if (reportCount.length >= AUTO_UNPUBLISH_REPORT_THRESHOLD) {
      // Auto-unpublish
      await ctx.db.patch(args.notebookId, {
        isPublic: false,
      });

      // Log moderation action
      await ctx.db.insert('moderationLogs', {
        notebookId: args.notebookId,
        userId: notebook.userId,
        violationType: 'reported',
        details: `Auto-unpublished after ${reportCount.length} reports`,
        action: 'unpublished',
        timestamp: Date.now(),
      });

      console.log(`[Moderation] Auto-unpublished notebook ${args.notebookId} after ${reportCount.length} reports`);
    }

    return {
      reportId,
      message: 'Thank you for your report. We will review this content.',
    };
  },
});

/**
 * Check if a notebook has been reported by the current user
 */
export const hasUserReportedNotebook = query({
  args: {
    notebookId: v.id('publicNotebooks'),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return false;
    }

    const report = await ctx.db
      .query('reportedNotebooks')
      .withIndex('by_reporter', (q) => q.eq('reporterId', user._id))
      .filter((q) => q.eq(q.field('notebookId'), args.notebookId))
      .first();

    return !!report;
  },
});

/**
 * Get report count for a notebook
 */
export const getNotebookReportCount = query({
  args: {
    notebookId: v.id('publicNotebooks'),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query('reportedNotebooks')
      .withIndex('by_notebook', (q) => q.eq('notebookId', args.notebookId))
      .collect();

    return reports.length;
  },
});

/**
 * Helper function to log a moderation violation
 * Used internally when automated checks fail
 */
export async function logModerationViolation(
  ctx: any,
  data: {
    notebookId?: any;
    userId: string;
    violationType: string;
    details: string;
    action: string;
  }
) {
  await ctx.db.insert('moderationLogs', {
    notebookId: data.notebookId || undefined,
    userId: data.userId,
    violationType: data.violationType,
    details: data.details,
    action: data.action,
    timestamp: Date.now(),
  });
}

// =============================================================================
// STRIKE SYSTEM (Story 4.8, Task 10)
// =============================================================================

/**
 * Get or create user moderation record
 * Returns existing record or creates new one with 0 strikes
 */
async function getUserModerationRecord(ctx: any, userId: string) {
  let record = await ctx.db
    .query('userModeration')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .first();

  if (!record) {
    // Create new record with 0 strikes
    const recordId = await ctx.db.insert('userModeration', {
      userId,
      moderationStrikes: 0,
    });
    record = await ctx.db.get(recordId);
  }

  return record;
}

/**
 * Check if user is currently banned
 * Returns ban info or null if not banned
 */
export const checkUserBanStatus = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('userModeration')
      .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
      .first();

    if (!record) {
      return { isBanned: false };
    }

    // Check if banned
    if (record.bannedUntil !== undefined) {
      // null = permanent ban
      if (record.bannedUntil === null) {
        return {
          isBanned: true,
          isPermanent: true,
          message: 'Your account has been permanently restricted due to repeated policy violations.',
        };
      }

      // Temporary ban - check if still active
      if (Date.now() < record.bannedUntil) {
        const daysLeft = Math.ceil((record.bannedUntil - Date.now()) / (24 * 60 * 60 * 1000));
        return {
          isBanned: true,
          isPermanent: false,
          bannedUntil: record.bannedUntil,
          daysLeft,
          message: `Your account is temporarily restricted for ${daysLeft} more day${daysLeft > 1 ? 's' : ''} due to policy violations.`,
        };
      }

      // Ban expired - note it in response (actual clearing happens in mutation)
    }

    return { isBanned: false, strikes: record.moderationStrikes };
  },
});

/**
 * Helper function to increment strikes and apply bans
 * Used by both incrementUserStrikes mutation and removeNotebook admin action
 */
async function applyStrikeToUser(
  ctx: any,
  userId: string,
  reason: string,
  notebookId?: any
) {
  // Get or create moderation record
  let record = await getUserModerationRecord(ctx, userId);

  // Increment strikes
  const newStrikes = record.moderationStrikes + 1;

  // Determine ban status based on strikes
  let bannedUntil: number | null | undefined = undefined;
  let action = 'warned';

  if (newStrikes === 1) {
    // First strike: Warning only
    action = 'warned';
    bannedUntil = undefined;
  } else if (newStrikes === 2) {
    // Second strike: 7-day temporary ban
    action = 'temp_banned';
    bannedUntil = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
  } else if (newStrikes >= 3) {
    // Third strike: Permanent ban
    action = 'perm_banned';
    bannedUntil = null; // null = permanent
  }

  // Update moderation record
  await ctx.db.patch(record._id, {
    moderationStrikes: newStrikes,
    bannedUntil,
    lastViolation: Date.now(),
  });

  // Log the moderation action
  await ctx.db.insert('moderationLogs', {
    userId: userId,
    notebookId: notebookId,
    violationType: 'strike_issued',
    details: `Strike ${newStrikes}/3: ${reason}`,
    action,
    timestamp: Date.now(),
  });

  return {
    strikes: newStrikes,
    action,
    bannedUntil,
    message:
      newStrikes === 1
        ? 'User received first warning'
        : newStrikes === 2
          ? 'User banned for 7 days (2nd strike)'
          : 'User permanently banned (3rd strike)',
  };
}

/**
 * Increment user's moderation strikes (admin only)
 * Implements 3-strike system:
 * - 1 strike: Warning
 * - 2 strikes: 7-day ban
 * - 3 strikes: Permanent ban
 */
export const incrementUserStrikes = mutation({
  args: {
    userId: v.string(),
    reason: v.string(),
    notebookId: v.optional(v.id('publicNotebooks')),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin authentication check in Phase 2
    // const admin = await authComponent.getAuthUser(ctx);
    // if (!admin?.isAdmin) throw new Error('Admin access required');

    return await applyStrikeToUser(ctx, args.userId, args.reason, args.notebookId);
  },
});

/**
 * Manually ban a user (admin only)
 * Can be temporary or permanent
 */
export const banUser = mutation({
  args: {
    userId: v.string(),
    reason: v.string(),
    duration: v.optional(v.union(v.literal('7d'), v.literal('30d'), v.literal('permanent'))),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin authentication check in Phase 2
    // const admin = await authComponent.getAuthUser(ctx);
    // if (!admin?.isAdmin) throw new Error('Admin access required');

    const duration = args.duration || 'permanent';

    // Calculate ban end time
    let bannedUntil: number | null | undefined;
    if (duration === 'permanent') {
      bannedUntil = null;
    } else if (duration === '7d') {
      bannedUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;
    } else {
      // 30d
      bannedUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
    }

    // Get or create moderation record
    let record = await getUserModerationRecord(ctx, args.userId);

    // Update ban status
    const patchData: any = {
      lastViolation: Date.now(),
      notes: args.reason,
    };
    if (bannedUntil !== undefined) {
      patchData.bannedUntil = bannedUntil;
    }
    await ctx.db.patch(record._id, patchData);

    // Log the ban
    await ctx.db.insert('moderationLogs', {
      userId: args.userId,
      violationType: 'manual_ban',
      details: `Manual ban (${duration}): ${args.reason}`,
      action: duration === 'permanent' ? 'perm_banned' : 'temp_banned',
      timestamp: Date.now(),
    });

    return {
      success: true,
      bannedUntil,
      message: `User ${duration === 'permanent' ? 'permanently' : 'temporarily'} banned`,
    };
  },
});

/**
 * Unban a user (admin only)
 */
export const unbanUser = mutation({
  args: {
    userId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin authentication check in Phase 2
    // const admin = await authComponent.getAuthUser(ctx);
    // if (!admin?.isAdmin) throw new Error('Admin access required');

    const record = await ctx.db
      .query('userModeration')
      .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
      .first();

    if (!record) {
      throw new Error('User moderation record not found');
    }

    // Clear ban
    await ctx.db.patch(record._id, {
      bannedUntil: undefined,
    });

    // Log the action
    await ctx.db.insert('moderationLogs', {
      userId: args.userId,
      violationType: 'unbanned',
      details: `User unbanned: ${args.reason}`,
      action: 'unbanned',
      timestamp: Date.now(),
    });

    return { success: true, message: 'User unbanned successfully' };
  },
});

// =============================================================================
// ADMIN MODERATION ACTIONS (Phase 2, Task 13)
// =============================================================================

/**
 * Admin approves a reported notebook (clears all reports)
 */
export const approveNotebook = mutation({
  args: {
    notebookId: v.id('publicNotebooks'),
    reviewerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin authentication check in Phase 2
    // const admin = await authComponent.getAuthUser(ctx);
    // if (!admin?.isAdmin) throw new Error('Admin access required');

    // Mark all reports for this notebook as "dismissed"
    const reports = await ctx.db
      .query('reportedNotebooks')
      .withIndex('by_notebook', (q) => q.eq('notebookId', args.notebookId))
      .collect();

    for (const report of reports) {
      await ctx.db.patch(report._id, {
        status: 'dismissed',
        reviewedAt: Date.now(),
        moderatorNotes: args.reviewerNotes || 'Approved by admin',
      });
    }

    // Ensure notebook is public
    const notebook = await ctx.db.get(args.notebookId);
    if (notebook && !notebook.isPublic) {
      await ctx.db.patch(args.notebookId, {
        isPublic: true,
      });
    }

    return {
      success: true,
      message: `Notebook approved. ${reports.length} report(s) dismissed.`,
    };
  },
});

/**
 * Admin removes a notebook and increments user's strikes
 * Implements strike system: 1st = warning, 2nd = 7-day ban, 3rd = permanent ban
 */
export const removeNotebook = mutation({
  args: {
    notebookId: v.id('publicNotebooks'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin authentication check in Phase 2
    // const admin = await authComponent.getAuthUser(ctx);
    // if (!admin?.isAdmin) throw new Error('Admin access required');

    // 1. Get notebook to find owner
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook) {
      throw new Error('Notebook not found');
    }

    // 2. Unpublish notebook
    await ctx.db.patch(args.notebookId, {
      isPublic: false,
    });

    // 3. Mark all reports as "resolved"
    const reports = await ctx.db
      .query('reportedNotebooks')
      .withIndex('by_notebook', (q) => q.eq('notebookId', args.notebookId))
      .collect();

    for (const report of reports) {
      await ctx.db.patch(report._id, {
        status: 'resolved',
        reviewedAt: Date.now(),
        moderatorNotes: `Removed: ${args.reason}`,
      });
    }

    // 4. Increment user's strikes using helper function
    // This automatically handles ban logic (1st = warning, 2nd = 7-day, 3rd = permanent)
    const strikeResult = await applyStrikeToUser(
      ctx,
      notebook.userId,
      args.reason,
      args.notebookId
    );

    return {
      success: true,
      message: `Notebook removed. ${strikeResult.message}`,
      strikes: strikeResult.strikes,
      userBanned: strikeResult.bannedUntil !== undefined,
    };
  },
});

// =============================================================================
// ADMIN QUERIES (Phase 2)
// =============================================================================

/**
 * Get all pending reports for admin review
 * Phase 2: Will be used in admin dashboard
 */
export const getPendingReports = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const reports = await ctx.db
      .query('reportedNotebooks')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .order('desc')
      .take(limit);

    // Enrich with notebook and reporter info
    const enriched = await Promise.all(
      reports.map(async (report) => {
        const notebook = await ctx.db.get(report.notebookId);
        // Note: In Phase 2, fetch user details via Better Auth
        return {
          ...report,
          notebook: notebook
            ? {
                title: notebook.title,
                userId: notebook.userId,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get moderation logs for a user
 */
export const getUserModerationLogs = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const logs = await ctx.db
      .query('moderationLogs')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit);

    return logs;
  },
});
