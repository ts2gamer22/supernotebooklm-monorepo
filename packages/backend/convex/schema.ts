import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // ==========================================
  // BETTER AUTH TABLES (Auto-managed)
  // ==========================================
  // users, sessions, accounts, verifications
  // Note: moderationStrikes and bannedUntil fields managed by Better Auth adapter

  // ==========================================
  // PRIVATE USER DATA (Sync with Extension)
  // ==========================================

  // Chats - Private chat history from extension
  chats: defineTable({
    // Content
    question: v.string(),
    answer: v.string(),
    
    // Context
    notebookId: v.string(),          // NotebookLM notebook ID
    timestamp: v.number(),            // When chat occurred
    source: v.union(
      v.literal('notebooklm'),
      v.literal('chatgpt'),
      v.literal('claude'),
      v.literal('perplexity')
    ),
    
    // Owner (from BetterAuth)
    userId: v.string(),               // Better Auth user ID
    
    // Sync metadata
    createdAt: v.number(),            // Unix timestamp
    updatedAt: v.number(),            // Unix timestamp
    localId: v.optional(v.string()),  // Original IndexedDB ID from extension
    extensionVersion: v.optional(v.string()), // Extension version that created it
  })
    .index('by_user', ['userId'])
    .index('by_user_and_timestamp', ['userId', 'timestamp'])
    .index('by_notebook', ['notebookId'])
    .index('by_local_id', ['localId']),

  // Folders - Private folder hierarchy from extension
  folders: defineTable({
    name: v.string(),
    color: v.optional(v.string()),
    parentId: v.union(v.id('folders'), v.null()),
    
    // Owner
    userId: v.string(),               // Better Auth user ID
    
    // Sync metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    localId: v.optional(v.string()),  // Original IndexedDB ID
  })
    .index('by_user', ['userId'])
    .index('by_parent', ['parentId'])
    .index('by_local_id', ['localId']),

  // Notebook Metadata - Tags and folder assignments
  notebookMetadata: defineTable({
    notebookId: v.string(),           // NotebookLM notebook ID
    customName: v.optional(v.string()),
    folderIds: v.array(v.id('folders')),
    tagIds: v.array(v.string()),      // Tag IDs
    
    // Owner
    userId: v.string(),
    
    // Sync metadata
    lastUpdatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_notebook', ['notebookId']),

  // ==========================================
  // PUBLIC NOTEBOOKS (Community Directory)
  // ==========================================
  // Public Notebooks for Community Sharing (Story 4.1)
  publicNotebooks: defineTable({
    userId: v.string(),              // Better Auth user ID
    title: v.string(),               // Max 100 chars (validated in mutations)
    description: v.string(),         // Max 500 chars
    content: v.string(),             // Full notebook content (markdown), max 100KB
    category: v.string(),            // Categories: Research, Tutorial, Notes, Analysis, Learning, Other
    tags: v.array(v.string()),       // Optional tags for filtering (max 10 tags)
    viewCount: v.number(),           // Engagement metric
    bookmarkCount: v.optional(v.number()), // Future: user bookmarks (Story 4.5)
    isPublic: v.boolean(),           // Visibility flag (true for public directory)
    featured: v.optional(v.boolean()), // Story 4.6: Manually curated featured notebooks
    createdAt: v.number(),           // Unix timestamp
    updatedAt: v.optional(v.number()), // Unix timestamp
    attachments: v.optional(v.array(v.string())), // Convex storageIds (Story 4.2+)
  })
    .index('by_user', ['userId'])
    .index('by_category', ['category'])
    .index('by_created', ['createdAt'])
    .index('by_views', ['viewCount'])
    .index('by_public_created', ['isPublic', 'createdAt'])
    .index('by_featured', ['featured'])
    .searchIndex('search_title_desc', {
      searchField: 'title',
      filterFields: ['isPublic', 'category'],
    }),

  // Reported Notebooks for Content Moderation (Story 4.8)
  reportedNotebooks: defineTable({
    notebookId: v.id('publicNotebooks'),  // The notebook being reported
    reporterId: v.string(),                // User who reported (Better Auth user ID)
    reason: v.string(),                    // Report reason: Spam, Inappropriate, Copyright, Other
    details: v.optional(v.string()),       // Additional details from reporter
    status: v.string(),                    // pending, reviewed, resolved, dismissed
    createdAt: v.number(),                 // Unix timestamp
    reviewedAt: v.optional(v.number()),    // When admin reviewed (if any)
    reviewedBy: v.optional(v.string()),    // Admin who reviewed (user ID)
    moderatorNotes: v.optional(v.string()), // Internal admin notes
  })
    .index('by_notebook', ['notebookId'])
    .index('by_reporter', ['reporterId'])
    .index('by_status', ['status'])
    .index('by_created', ['createdAt']),

  // Moderation Logs for Violations (Story 4.8)
  moderationLogs: defineTable({
    notebookId: v.optional(v.id('publicNotebooks')), // Null if user-level violation
    userId: v.string(),                    // User who violated policy
    violationType: v.string(),             // profanity, spam, duplicate, size, reported
    details: v.string(),                   // Description of violation
    action: v.string(),                    // blocked, warned, unpublished, banned
    timestamp: v.number(),                 // Unix timestamp
    moderatorId: v.optional(v.string()),   // Admin who took action (if manual)
  })
    .index('by_user', ['userId'])
    .index('by_notebook', ['notebookId'])
    .index('by_type', ['violationType'])
    .index('by_timestamp', ['timestamp']),

  // User Moderation Data - Strike System (Story 4.8, Task 10)
  // Separate table to track user moderation status without modifying Better Auth schema
  userModeration: defineTable({
    userId: v.string(),                    // Better Auth user ID (unique)
    moderationStrikes: v.number(),         // Number of strikes (0-3)
    bannedUntil: v.optional(v.number()),   // Unix timestamp (null = permanent ban, undefined = not banned)
    lastViolation: v.optional(v.number()), // Timestamp of most recent violation
    notes: v.optional(v.string()),         // Admin notes about user's moderation history
  })
    .index('by_user', ['userId']),
});
