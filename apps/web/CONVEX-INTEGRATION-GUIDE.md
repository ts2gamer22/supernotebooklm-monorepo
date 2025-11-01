# Convex Backend Integration Guide

**For:** NotebookLM Directory Next.js Website  
**Backend:** Shared Convex instance with Chrome Extension  
**Auth:** BetterAuth with multi-client support  
**Date:** 2025-10-31

---

## 🎯 Overview

This guide shows how to integrate your Next.js website with the **existing Convex backend** used by the Chrome extension, enabling:

✅ **Single backend** for both web and extension  
✅ **Unified authentication** (sign in once, access everywhere)  
✅ **Real-time data sync** across platforms  
✅ **Type-safe API** with auto-generated TypeScript types  
✅ **Zero configuration** database with Convex  

---

## 📊 Current State vs. Target State

### Current State

```
Chrome Extension              Next.js Website
├── convex/                   ├── NO BACKEND
│   ├── schema.ts            ├── Mock data everywhere
│   ├── auth.config.ts       ├── BetterAuth (not configured)
│   └── notebooks.ts         ├── Drizzle ORM (not configured)
└── Uses: IndexedDB + Convex └── LibSQL (not configured)

❌ TWO SEPARATE SYSTEMS
❌ NO DATA SHARING
❌ NO UNIFIED AUTH
```

### Target State (Monorepo)

```
Monorepo Root
├── packages/
│   └── backend/
│       └── convex/                    ← SHARED BACKEND
│           ├── schema.ts              (Single source of truth)
│           ├── auth.config.ts         (Multi-client auth)
│           ├── notebooks.ts
│           └── http.ts
│
├── apps/
│   ├── chrome-extension/
│   │   └── Uses: @monorepo/backend   ← References shared backend
│   │
│   └── web/
│       └── Uses: @monorepo/backend   ← References shared backend

✅ ONE BACKEND
✅ SHARED DATA
✅ UNIFIED AUTH
✅ CROSS-PLATFORM SYNC
```

---

## 🔑 Key Convex Concepts

### 1. What is Convex?

Convex is a **backend-as-a-service** that provides:
- **Database** (NoSQL with relationships)
- **Real-time queries** (auto-updates when data changes)
- **Server functions** (queries, mutations, actions)
- **File storage**
- **Scheduled jobs**
- **Authentication** (via BetterAuth integration)

### 2. Queries vs. Mutations

```typescript
// QUERY - Read data (reactive, cached)
export const getNotebooks = query({
  handler: async (ctx) => {
    return await ctx.db.query("notebooks").collect();
  }
});

// MUTATION - Write data (transactional)
export const createNotebook = mutation({
  args: { title: v.string(), description: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notebooks", args);
  }
});
```

### 3. Real-Time Reactivity

```typescript
// In React component
const notebooks = useQuery(api.notebooks.getNotebooks);
// ☝️ Auto-updates when ANY notebook changes!
// No manual refetching needed.
```

---

## 📦 Installation

### Step 1: Install Dependencies

```bash
cd C:\Users\Admin\Desktop\supernotebooklm\notebooklm-directory

pnpm add convex @convex-dev/better-auth better-auth
```

### Step 2: Create Convex Client

**`src/lib/convex.ts`:**
```typescript
import { ConvexReactClient } from "convex/react";

export const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);
```

### Step 3: Wrap App in ConvexProvider

**`src/app/layout.tsx`:**
```tsx
import { ConvexProvider } from "convex/react";
import { convex } from "@/lib/convex";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ConvexProvider client={convex}>
          {children}
        </ConvexProvider>
      </body>
    </html>
  );
}
```

### Step 4: Add Environment Variable

**`.env.local`:**
```bash
# Get this from Chrome extension's .env or create new deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

---

## 🔐 BetterAuth Multi-Client Setup

### Problem: Two Apps Need Same Auth

The Chrome extension and website need to:
1. Share user accounts
2. Allow sign-in from either platform
3. Sync authentication state

### Solution: Multi-Client BetterAuth Config

**`packages/backend/convex/auth.config.ts`:**
```typescript
export default {
  providers: [
    {
      // Next.js website client
      domain: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      applicationID: "web",
    },
    {
      // Chrome extension client
      domain: process.env.EXTENSION_ORIGIN || "chrome-extension://YOUR_ID",
      applicationID: "extension",
    },
  ],
};
```

### Website Auth Client

**`src/lib/auth.ts`:**
```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL,
});

export const { signIn, signOut, useSession } = authClient;
```

### Usage in Components

**`src/components/sections/navigation-header.tsx`:**
```tsx
"use client";

import { useSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function NavigationHeader() {
  const { data: session, isLoading } = useSession();

  if (isLoading) return <div>Loading...</div>;

  return (
    <header>
      {session ? (
        <>
          <span>Welcome, {session.user.name}</span>
          <Button onClick={() => signOut()}>Sign Out</Button>
        </>
      ) : (
        <Button onClick={() => signIn.google()}>Sign In with Google</Button>
      )}
    </header>
  );
}
```

---

## 📝 Schema Design

### Convex Schema for Directory Website

**`packages/backend/convex/schema.ts`:**
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table (auto-created by BetterAuth)
  users: defineTable({
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Notebooks (public directory)
  notebooks: defineTable({
    title: v.string(),
    description: v.string(),
    shareLink: v.string(),           // NotebookLM public share URL
    category: v.string(),
    tags: v.array(v.string()),
    
    // Author info
    authorId: v.id("users"),
    authorName: v.string(),          // Denormalized for performance
    
    // Stats
    views: v.number(),
    likes: v.number(),
    
    // Visibility
    isPublic: v.boolean(),
    status: v.union(
      v.literal("pending"),          // Awaiting moderation
      v.literal("approved"),         // Live on directory
      v.literal("rejected"),         // Rejected by moderator
      v.literal("private")           // User-private
    ),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["category", "isPublic"],
    }),

  // Collections (curated lists of notebooks)
  collections: defineTable({
    title: v.string(),
    description: v.string(),
    notebookIds: v.array(v.id("notebooks")),
    
    // Owner
    ownerId: v.id("users"),
    ownerName: v.string(),
    
    // Visibility
    isPublic: v.boolean(),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_public", ["isPublic"]),

  // Likes (user likes on notebooks)
  likes: defineTable({
    userId: v.id("users"),
    notebookId: v.id("notebooks"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_notebook", ["notebookId"])
    .index("by_user_and_notebook", ["userId", "notebookId"]),

  // Views tracking (for analytics)
  views: defineTable({
    notebookId: v.id("notebooks"),
    userId: v.optional(v.id("users")), // null for anonymous
    createdAt: v.number(),
  }).index("by_notebook", ["notebookId"]),
});
```

---

## 🔌 API Functions

### Notebook Operations

**`packages/backend/convex/notebooks.ts`:**
```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ===============================
// QUERIES (Read Operations)
// ===============================

// Get all approved public notebooks
export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("notebooks")
      .filter((q) => q.eq(q.field("status"), "approved"))
      .order("desc")
      .take(100);
  },
});

// Get notebooks by category
export const getByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notebooks")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();
  },
});

// Get notebooks grouped by category
export const getNotebooksByCategory = query({
  handler: async (ctx) => {
    const categories = [
      "ai", "science", "technology", 
      "business", "health", "history"
    ];
    
    const result = [];
    for (const category of categories) {
      const notebooks = await ctx.db
        .query("notebooks")
        .withIndex("by_category", (q) => q.eq("category", category))
        .filter((q) => q.eq(q.field("status"), "approved"))
        .take(6);
      
      result.push({
        id: category,
        name: category.charAt(0).toUpperCase() + category.slice(1),
        notebooks,
        notebookCount: notebooks.length,
      });
    }
    
    return result;
  },
});

// Get single notebook by ID
export const getById = query({
  args: { id: v.id("notebooks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Search notebooks
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notebooks")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("isPublic", true)
      )
      .take(50);
  },
});

// Get user's notebooks (for account page)
export const getMyNotebooks = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();
    
    if (!user) throw new Error("User not found");
    
    return await ctx.db
      .query("notebooks")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .collect();
  },
});

// ===============================
// MUTATIONS (Write Operations)
// ===============================

// Create new notebook (from upload dialog)
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    shareLink: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();
    
    if (!user) throw new Error("User not found");
    
    const notebookId = await ctx.db.insert("notebooks", {
      ...args,
      authorId: user._id,
      authorName: user.name,
      views: 0,
      likes: 0,
      isPublic: true,
      status: "pending", // Requires moderation
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return notebookId;
  },
});

// Update notebook
export const update = mutation({
  args: {
    id: v.id("notebooks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const notebook = await ctx.db.get(args.id);
    if (!notebook) throw new Error("Notebook not found");
    
    // Check ownership
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();
    
    if (!user || notebook.authorId !== user._id) {
      throw new Error("Unauthorized");
    }
    
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete notebook
export const remove = mutation({
  args: { id: v.id("notebooks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const notebook = await ctx.db.get(args.id);
    if (!notebook) throw new Error("Notebook not found");
    
    // Check ownership
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();
    
    if (!user || notebook.authorId !== user._id) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.id);
  },
});

// Like notebook
export const like = mutation({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();
    
    if (!user) throw new Error("User not found");
    
    // Check if already liked
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_and_notebook", (q) =>
        q.eq("userId", user._id).eq("notebookId", args.notebookId)
      )
      .first();
    
    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      
      const notebook = await ctx.db.get(args.notebookId);
      if (notebook) {
        await ctx.db.patch(args.notebookId, {
          likes: Math.max(0, notebook.likes - 1),
        });
      }
    } else {
      // Like
      await ctx.db.insert("likes", {
        userId: user._id,
        notebookId: args.notebookId,
        createdAt: Date.now(),
      });
      
      const notebook = await ctx.db.get(args.notebookId);
      if (notebook) {
        await ctx.db.patch(args.notebookId, {
          likes: notebook.likes + 1,
        });
      }
    }
  },
});

// Track view (increment view count)
export const trackView = mutation({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    // Record view
    await ctx.db.insert("views", {
      notebookId: args.notebookId,
      userId: identity ? 
        (await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), identity.email))
          .first())?._id 
        : undefined,
      createdAt: Date.now(),
    });
    
    // Increment view count
    const notebook = await ctx.db.get(args.notebookId);
    if (notebook) {
      await ctx.db.patch(args.notebookId, {
        views: notebook.views + 1,
      });
    }
  },
});
```

---

## 🎨 Frontend Integration Examples

### Example 1: Notebooks Page (Replace Mock Data)

**Before (Mock Data):**
```tsx
// src/app/notebooks/page.tsx
const categories = [
  { id: "ai", name: "AI", notebooks: [...] }, // Hardcoded
];

export default function NotebooksPage() {
  return (
    <div>
      {categories.map(cat => <CategorySection category={cat} />)}
    </div>
  );
}
```

**After (Real Data):**
```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function NotebooksPage() {
  const categories = useQuery(api.notebooks.getNotebooksByCategory);
  
  if (!categories) {
    return <LoadingSpinner />;
  }
  
  return (
    <div>
      {categories.map(cat => (
        <CategorySection key={cat.id} category={cat} />
      ))}
    </div>
  );
}
```

### Example 2: Upload Dialog (Add Functionality)

**Before (No Backend):**
```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // TODO: Handle form submission
  setStep("success");
};
```

**After (Convex Mutation):**
```tsx
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function UploadDialog() {
  const createNotebook = useMutation(api.notebooks.create);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await createNotebook({
        title: formData.title,
        description: formData.description,
        shareLink: formData.shareLink,
        category: formData.category,
        tags: formData.tags.split(",").map(t => t.trim()),
      });
      
      setStep("success");
    } catch (error) {
      alert("Failed to upload notebook: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* ... form fields ... */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Notebook"}
      </Button>
    </form>
  );
}
```

### Example 3: Account Page (Real User Data)

**Before (Mock User):**
```tsx
const userData = {
  id: "current-user",
  name: "John Doe",
  // ... hardcoded
};
```

**After (Session + Query):**
```tsx
"use client";

import { useQuery } from "convex/react";
import { useSession } from "@/lib/auth";
import { api } from "@/convex/_generated/api";

export default function AccountPage() {
  const { data: session } = useSession();
  const myNotebooks = useQuery(api.notebooks.getMyNotebooks);
  
  if (!session) {
    return <Redirect to="/login" />;
  }
  
  if (!myNotebooks) {
    return <LoadingSpinner />;
  }
  
  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <div>
        {myNotebooks.map(notebook => (
          <NotebookCard key={notebook._id} notebook={notebook} />
        ))}
      </div>
    </div>
  );
}
```

### Example 4: Search Bar (Real Search)

**Before (Non-functional):**
```tsx
<input 
  type="search" 
  placeholder="Search notebooks..."
  // No functionality
/>
```

**After (Convex Search):**
```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const results = useQuery(
    api.notebooks.search, 
    query.length > 2 ? { query } : "skip"
  );
  
  return (
    <div>
      <input 
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search notebooks..."
      />
      
      {results && results.length > 0 && (
        <div className="search-results">
          {results.map(notebook => (
            <SearchResult key={notebook._id} notebook={notebook} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🚀 Deployment

### Step 1: Deploy Convex Backend

```bash
cd packages/backend
npx convex deploy --prod
```

This will:
- Deploy all functions
- Create production database
- Generate production URL

### Step 2: Update Environment Variables

**Vercel (Next.js):**
```bash
NEXT_PUBLIC_CONVEX_URL=https://your-prod.convex.cloud
BETTER_AUTH_SECRET=your-secret-key
NEXT_PUBLIC_SITE_URL=https://supernotebooklm.com
```

**Chrome Extension:**
```bash
VITE_CONVEX_URL=https://your-prod.convex.cloud
```

### Step 3: Deploy Next.js to Vercel

```bash
cd apps/web
vercel --prod
```

---

## 🔒 Security Considerations

### 1. Row-Level Security (RLS)

Always check user permissions in mutations:

```typescript
export const deleteNotebook = mutation({
  args: { id: v.id("notebooks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const notebook = await ctx.db.get(args.id);
    const user = await getUserByEmail(ctx, identity.email);
    
    // ✅ Check ownership
    if (notebook.authorId !== user._id) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.id);
  },
});
```

### 2. Input Validation

```typescript
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),           // ✅ Type-safe
    shareLink: v.string(),
    tags: v.array(v.string()),   // ✅ Validated
  },
  handler: async (ctx, args) => {
    // ✅ Additional validation
    if (args.title.length < 5) {
      throw new Error("Title too short");
    }
    
    if (!args.shareLink.includes("notebooklm.google.com")) {
      throw new Error("Invalid NotebookLM link");
    }
    
    // ... rest of handler
  },
});
```

### 3. Rate Limiting

Use Convex's built-in rate limiting:

```typescript
import { rateLimiter } from "convex-helpers/server/rateLimit";

const limiter = rateLimiter({
  name: "upload_notebook",
  maxRequests: 5,      // 5 uploads
  windowMs: 3600000,   // per hour
});

export const create = mutation({
  handler: async (ctx, args) => {
    await limiter.limit(ctx, "upload");
    // ... rest of handler
  },
});
```

---

## 📈 Performance Optimization

### 1. Pagination

For large lists, implement pagination:

```typescript
export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notebooks")
      .filter((q) => q.eq(q.field("status"), "approved"))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

Usage:
```tsx
const { results, status, loadMore } = usePaginatedQuery(
  api.notebooks.listPaginated,
  {},
  { initialNumItems: 20 }
);
```

### 2. Indexes for Fast Queries

Always index frequently queried fields:

```typescript
defineTable({
  // ... fields
})
  .index("by_category", ["category"])      // ✅ Fast category lookup
  .index("by_author", ["authorId"])        // ✅ Fast author lookup
  .searchIndex("search_title", {           // ✅ Full-text search
    searchField: "title"
  })
```

### 3. Denormalization

For read-heavy data, denormalize:

```typescript
notebooks: defineTable({
  authorId: v.id("users"),
  authorName: v.string(),      // ✅ Denormalized (no join needed)
  authorAvatar: v.string(),    // ✅ Denormalized
  // ...
})
```

---

## 🧪 Testing

### Testing Convex Functions

```typescript
// convex/notebooks.test.ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { create, list } from "./notebooks";

test("create notebook", async () => {
  const t = convexTest(schema);
  
  // Mock authenticated user
  t.setAuth({ sub: "user-123", email: "test@example.com" });
  
  // Create user
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      createdAt: Date.now(),
    });
  });
  
  // Create notebook
  const notebookId = await t.mutation(create, {
    title: "Test Notebook",
    description: "Test description",
    shareLink: "https://notebooklm.google.com/notebook/test",
    category: "ai",
    tags: ["test"],
  });
  
  expect(notebookId).toBeDefined();
  
  // Verify it's in database
  const notebooks = await t.query(list);
  expect(notebooks).toHaveLength(1);
  expect(notebooks[0].title).toBe("Test Notebook");
});
```

---

## ✅ Integration Checklist

### Backend Setup
- [ ] Create `packages/backend/convex/` folder
- [ ] Define schema in `schema.ts`
- [ ] Implement notebook operations in `notebooks.ts`
- [ ] Implement collection operations in `collections.ts`
- [ ] Configure BetterAuth in `auth.config.ts`
- [ ] Run `npx convex dev` to test locally
- [ ] Run `npx convex deploy` for production

### Frontend Setup
- [ ] Install: `pnpm add convex @convex-dev/better-auth better-auth`
- [ ] Create `src/lib/convex.ts`
- [ ] Create `src/lib/auth.ts`
- [ ] Wrap app in `<ConvexProvider>`
- [ ] Add `.env.local` with `NEXT_PUBLIC_CONVEX_URL`

### Replace Mock Data
- [ ] Notebooks page → `useQuery(api.notebooks.getNotebooksByCategory)`
- [ ] Account page → `useQuery(api.notebooks.getMyNotebooks)`
- [ ] Upload dialog → `useMutation(api.notebooks.create)`
- [ ] Search bar → `useQuery(api.notebooks.search)`
- [ ] Individual notebook → `useQuery(api.notebooks.getById)`

### Authentication
- [ ] Create Google OAuth app
- [ ] Configure BetterAuth
- [ ] Update navigation header
- [ ] Add protected routes
- [ ] Test sign-in flow

### Testing
- [ ] Write tests for Convex functions
- [ ] Test uploads
- [ ] Test auth flow
- [ ] Test cross-platform sync

---

## 📞 Support

**Convex Discord:** https://convex.dev/community  
**BetterAuth Docs:** https://www.better-auth.com/docs  
**Extension Backend:** `C:\Users\Admin\Desktop\supernotebooklm\supernotebooklm-extension\convex`

---

**Last Updated:** 2025-10-31  
**Author:** James (Dev Agent)
