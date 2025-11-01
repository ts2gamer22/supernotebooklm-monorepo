# AI Agent Handoff: Web App Integration & Data Setup

**Project:** SuperNotebookLM Monorepo - Next.js Website Integration  
**Date:** 2025-11-01  
**Handoff From:** Phase 7 Deployment Agent  
**Handoff To:** Web Integration Agent  
**Estimated Time:** 6-8 hours

---

## 🎯 Mission Overview

Transform the Next.js website from a **mockup with fake data** into a **fully functional app** connected to Convex backend with proper authentication.

### Three Main Tasks:

1. **Remove ALL Mock Data** (2-3 hours)
2. **Populate Real Data via Convex CLI** (1-2 hours)  
3. **Implement Authentication UI** (3-4 hours)

---

## 📋 Prerequisites - READ FIRST!

### Critical Files to Read (In Order):

1. **`CODEBASE-ANALYSIS.md`** ← Complete website analysis (ALREADY READ THIS)
2. **`apps/chrome-extension/convex/schema.ts`** ← See what tables exist
3. **`apps/web/src/lib/convex.ts`** ← Convex client (already setup)
4. **`apps/web/src/lib/auth.ts`** ← BetterAuth client (already setup)

### Current State Summary:

**✅ What's Already Done:**
- Convex backend deployed to production: `https://cheery-salmon-841.convex.cloud`
- Website deployed to Vercel: `https://supernotebooklm-monorepo.vercel.app`
- ConvexProvider and AuthClient configured
- Environment variables set:
  - `NEXT_PUBLIC_CONVEX_URL`
  - `NEXT_PUBLIC_SITE_URL`
  - `BETTER_AUTH_SECRET`

**❌ What's NOT Done:**
- Website shows ONLY mock data
- No real notebooks/collections/users in Convex
- No login/signup UI exists
- Auth works but no UI to trigger it

---

## 🚀 TASK 1: Remove Mock Data & Connect Convex

### 1.1: Files With Mock Data (Priority Order)

| File | Mock Data | Convex API Needed | Priority |
|------|-----------|-------------------|----------|
| `app/notebooks/page.tsx` | `mockCategories` (50+ notebooks) | `api.notebooks.listPublicNotebooks` | 🔴 HIGH |
| `app/notebook/[id]/page.tsx` | Single notebook object | `api.notebooks.getById(id)` | 🔴 HIGH |
| `app/collections/page.tsx` | Collections array | `api.collections.listPublic` | 🟡 MEDIUM |
| `app/collection/[id]/page.tsx` | Single collection object | `api.collections.getById(id)` | 🟡 MEDIUM |
| `app/authors/page.tsx` | Authors array | `api.users.listPublicAuthors` | 🟢 LOW |
| `app/author/[id]/page.tsx` | Single author object | `api.users.getById(id)` | 🟢 LOW |
| `app/account/page.tsx` | `const userData = {...}` | `useSession()` + user queries | 🔴 HIGH |
| `components/sections/featured-notebooks.tsx` | Hardcoded notebooks | `api.notebooks.getFeatured` | 🟡 MEDIUM |
| `components/sections/featured-uploads.tsx` | Hardcoded uploads | `api.notebooks.getRecent` | 🟡 MEDIUM |
| `components/sections/trending-section.tsx` | Hardcoded trending | `api.notebooks.getTrending` | 🟡 MEDIUM |
| `components/sections/members-section.tsx` | Hardcoded members | `api.users.getTopContributors` | 🟢 LOW |

### 1.2: Implementation Pattern

**BEFORE (Current - Mock Data):**
```typescript
// app/notebooks/page.tsx
const mockCategories = [
  {
    id: "ai",
    name: "AI & Machine Learning", 
    notebooks: [/* hardcoded array */]
  },
  // ... more mock data
];

export default function NotebooksPage() {
  return <div>{mockCategories.map(...)}</div>;
}
```

**AFTER (With Convex):**
```typescript
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function NotebooksPage() {
  // Query real data from Convex
  const notebooks = useQuery(api.notebooks.listPublicNotebooks);
  
  // Show loading state
  if (notebooks === undefined) {
    return <LoadingSpinner />;
  }
  
  // Show empty state if no data
  if (notebooks.length === 0) {
    return <EmptyState message="No notebooks yet. Be the first to publish!" />;
  }
  
  // Group by category (or do this in Convex query)
  const categories = groupByCategory(notebooks);
  
  return (
    <div>
      {categories.map(category => (
        <CategorySection key={category.id} notebooks={category.notebooks} />
      ))}
    </div>
  );
}
```

### 1.3: Step-by-Step Instructions

#### Step A: Check Existing Convex Queries

**Navigate to extension Convex folder:**
```
apps/chrome-extension/convex/
```

**Check what queries/mutations exist:**
- `notebooks.ts` - Should have CRUD operations
- `chats.ts` - Chat history (extension specific)
- `users.ts` - User profiles
- Look for: `listPublicNotebooks`, `getById`, `create`, `update`, `delete`

**If queries DON'T exist, you need to create them.** (See Section 1.4)

#### Step B: Update Notebooks Page

**File:** `apps/web/src/app/notebooks/page.tsx`

**Current status:** Has `mockCategories` fallback

**Action:**
1. The page already uses `useQuery(api.notebooks.listPublicNotebooks)` ✅
2. BUT it falls back to `mockCategories` if no data
3. Remove the `mockCategories` constant
4. Update to show proper loading/empty states

**Code to update:**
```typescript
// DELETE THIS:
const mockCategories = [
  {
    id: "ai",
    name: "AI & Machine Learning",
    // ... 600 lines of mock data
  },
];

// UPDATE THIS:
const categories = publicNotebooks?.reduce((acc, notebook) => {
  // ... existing grouping logic
}, [] as any[]) || mockCategories; // ← REMOVE fallback

// TO THIS:
const categories = publicNotebooks?.reduce((acc, notebook) => {
  // ... existing grouping logic
}, [] as any[]) || []; // ← Return empty array instead

// UPDATE THIS:
const isMockData = !publicNotebooks || publicNotebooks.length === 0;

// CHANGE warning banner logic:
{isMockData && (
  <div className="warning">Showing mock data...</div>
)}

// TO THIS (show empty state instead):
{!isLoading && categories.length === 0 && (
  <div className="empty-state">
    <p>No notebooks published yet!</p>
    <Button onClick={openUploadDialog}>Publish the First Notebook</Button>
  </div>
)}
```

#### Step C: Update Individual Notebook Page

**File:** `apps/web/src/app/notebook/[id]/page.tsx`

**Current:** Shows mock data

**Action:**
1. Add "use client" directive
2. Import `useQuery` from convex/react
3. Query notebook by ID: `api.notebooks.getById({ id: params.id })`
4. Show loading state while fetching
5. Show 404 if notebook doesn't exist
6. Render real notebook data

**Template:**
```typescript
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export default function NotebookPage({ params }: { params: { id: string } }) {
  const notebook = useQuery(api.notebooks.getById, { 
    id: params.id as Id<"notebooks"> 
  });
  
  if (notebook === undefined) {
    return <LoadingSpinner />;
  }
  
  if (notebook === null) {
    return <NotFound message="Notebook not found" />;
  }
  
  return (
    <div>
      <h1>{notebook.title}</h1>
      <p>{notebook.description}</p>
      {/* ... rest of notebook UI */}
    </div>
  );
}
```

#### Step D: Update Collections Pages

**Files:** 
- `apps/web/src/app/collections/page.tsx`
- `apps/web/src/app/collection/[id]/page.tsx`

**Same pattern as notebooks:**
1. Remove mock data arrays
2. Add `useQuery(api.collections.listPublic)`
3. Add loading/empty states
4. Individual page: `useQuery(api.collections.getById, { id })`

#### Step E: Update Account Page

**File:** `apps/web/src/app/account/page.tsx`

**Current:** Shows `const userData = { ... }` mock object

**Action:**
1. Import `useSession` from `@/lib/auth`
2. Get current user from session
3. Query user's notebooks and collections
4. Show sign-in prompt if not authenticated

**Template:**
```typescript
"use client";
import { useSession } from "@/lib/auth";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AccountPage() {
  const { data: session, isPending } = useSession();
  
  // Redirect to login if not authenticated
  if (!isPending && !session) {
    return <SignInPrompt />;
  }
  
  // Query user's data
  const userNotebooks = useQuery(
    api.notebooks.getUserNotebooks,
    session?.user ? { userId: session.user.id } : "skip"
  );
  
  const userCollections = useQuery(
    api.collections.getUserCollections, 
    session?.user ? { userId: session.user.id } : "skip"
  );
  
  if (isPending || !session) {
    return <LoadingSpinner />;
  }
  
  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <UserStats notebooks={userNotebooks} collections={userCollections} />
      {/* ... rest of account UI */}
    </div>
  );
}
```

### 1.4: Create Missing Convex Queries

**If queries don't exist in `apps/chrome-extension/convex/notebooks.ts`, create them:**

**Navigate to:**
```
cd apps/chrome-extension/convex
```

**Add to `notebooks.ts`:**
```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all public notebooks
export const listPublicNotebooks = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("notebooks")
      .filter((q) => q.eq(q.field("isPublic"), true))
      .order("desc")
      .take(100);
  },
});

// Get featured notebooks (high views/likes)
export const getFeatured = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("notebooks")
      .filter((q) => q.eq(q.field("isPublic"), true))
      .order("desc")
      .take(6); // Top 6 for featured section
  },
});

// Get recent uploads
export const getRecent = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("notebooks")
      .filter((q) => q.eq(q.field("isPublic"), true))
      .order("desc")
      .take(10);
  },
});

// Get trending (most views in last 7 days)
export const getTrending = query({
  handler: async (ctx) => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return await ctx.db
      .query("notebooks")
      .filter((q) => 
        q.and(
          q.eq(q.field("isPublic"), true),
          q.gt(q.field("createdAt"), weekAgo)
        )
      )
      .order("desc")
      .take(10);
  },
});

// Get single notebook by ID
export const getById = query({
  args: { id: v.id("notebooks") },
  handler: async (ctx, args) => {
    const notebook = await ctx.db.get(args.id);
    
    // Only return if public (or user is owner - add auth check)
    if (!notebook || !notebook.isPublic) {
      return null;
    }
    
    // Increment view count
    await ctx.db.patch(args.id, {
      viewCount: (notebook.viewCount || 0) + 1,
    });
    
    return notebook;
  },
});

// Get user's notebooks
export const getUserNotebooks = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notebooks")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();
  },
});
```

**Deploy to Convex:**
```bash
cd apps/chrome-extension
npx convex deploy
```

---

## 🗄️ TASK 2: Populate Real Data

### 2.1: Data Collection

**User will provide you with real data in this format:**

```json
{
  "notebooks": [
    {
      "title": "Introduction to Machine Learning",
      "description": "A comprehensive guide to ML fundamentals",
      "category": "ai",
      "tags": ["ML", "AI", "Beginners"],
      "shareLink": "https://notebooklm.google.com/notebook/...",
      "isPublic": true,
      "userId": "user_123"
    },
    // ... more notebooks
  ],
  "collections": [
    {
      "title": "AI Learning Path",
      "description": "Curated notebooks for learning AI",
      "notebookIds": ["notebook_id_1", "notebook_id_2"],
      "isPublic": true,
      "userId": "user_123"
    }
  ],
  "users": [
    {
      "name": "Dr. Sarah Chen",
      "email": "sarah@example.com",
      "bio": "AI researcher and educator",
      "avatar": "https://...",
    }
  ]
}
```

### 2.2: Insert Data via Convex CLI

**Method 1: Via Convex Dashboard (Manual)**

1. Go to: `https://dashboard.convex.dev/t/ts2gamer22/cheery-salmon-841`
2. Click "Data" → Select table (notebooks/collections/users)
3. Click "Insert Document"
4. Paste JSON for each item
5. Repeat for all data

**Method 2: Via CLI Script (Automated - RECOMMENDED)**

**Create seed script:**

```typescript
// apps/chrome-extension/convex/seed.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedNotebooks = mutation({
  args: {
    notebooks: v.array(v.object({
      title: v.string(),
      description: v.string(),
      category: v.string(),
      tags: v.array(v.string()),
      shareLink: v.optional(v.string()),
      isPublic: v.boolean(),
      userId: v.string(),
    }))
  },
  handler: async (ctx, args) => {
    const ids = [];
    
    for (const notebook of args.notebooks) {
      const id = await ctx.db.insert("notebooks", {
        ...notebook,
        viewCount: Math.floor(Math.random() * 5000), // Random initial views
        bookmarkCount: Math.floor(Math.random() * 200),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      ids.push(id);
    }
    
    return { count: ids.length, ids };
  },
});

export const seedCollections = mutation({
  args: {
    collections: v.array(v.object({
      title: v.string(),
      description: v.string(),
      notebookIds: v.array(v.string()),
      isPublic: v.boolean(),
      userId: v.string(),
    }))
  },
  handler: async (ctx, args) => {
    const ids = [];
    
    for (const collection of args.collections) {
      const id = await ctx.db.insert("collections", {
        ...collection,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      ids.push(id);
    }
    
    return { count: ids.length, ids };
  },
});
```

**Deploy seed mutations:**
```bash
npx convex deploy
```

**Run seed script:**
```bash
npx convex run seed:seedNotebooks --args '{
  "notebooks": [
    {
      "title": "Machine Learning Basics",
      "description": "Learn ML fundamentals",
      "category": "ai",
      "tags": ["ML", "AI"],
      "isPublic": true,
      "userId": "user_123"
    }
  ]
}'
```

### 2.3: Verification

**After inserting data, verify:**

1. **Via Dashboard:**
   - Go to Data → notebooks table
   - Should see all inserted notebooks
   - Check fields are populated correctly

2. **Via Website:**
   - Visit `https://supernotebooklm-monorepo.vercel.app/notebooks`
   - Should see real notebooks (not mock data)
   - Click a notebook → Should load correctly

3. **Via CLI Query:**
```bash
npx convex run notebooks:listPublicNotebooks
# Should return array of notebooks
```

---

## 🔐 TASK 3: Implement Login/Signup UI

### 3.1: Current Auth Status

**✅ Already Done:**
- BetterAuth configured in Convex: `apps/chrome-extension/convex/auth.config.ts`
- Auth client setup: `apps/web/src/lib/auth.ts`
- Google OAuth credentials configured
- Multi-client support (web + extension)

**❌ Missing:**
- Login/Signup dialog component
- Sign-in button functionality
- User state display in navigation
- Protected routes logic

### 3.2: Create Auth Dialog Components

#### Component 1: AuthDialog (Main)

**File:** `apps/web/src/components/auth/AuthDialog.tsx`

```typescript
"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth";
import { Loader2 } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "signin" | "signup";
}

export default function AuthDialog({ open, onOpenChange, mode = "signin" }: AuthDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.href,
      });
      
      // Auth will redirect to Google, then back to callbackURL
      // On return, session will be established
      onOpenChange(false);
    } catch (err) {
      console.error("Auth error:", err);
      setError("Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {mode === "signin" ? "Welcome back" : "Create an account"}
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground mt-2">
            {mode === "signin" 
              ? "Sign in to access your notebooks and collections"
              : "Sign up to publish and manage your NotebookLM notebooks"
            }
          </p>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Google Sign In Button */}
          <Button
            onClick={handleGoogleAuth}
            disabled={isLoading}
            variant="outline"
            className="w-full h-11 text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  {/* Google Logo SVG */}
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>
          
          {error && (
            <div className="text-sm text-red-500 text-center p-3 bg-red-50 dark:bg-red-900/10 rounded-md">
              {error}
            </div>
          )}
          
          <div className="text-xs text-center text-muted-foreground mt-4">
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### Component 2: UserMenu (Dropdown)

**File:** `apps/web/src/components/auth/UserMenu.tsx`

```typescript
"use client";
import { useSession } from "@/lib/auth";
import { authClient } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, LogOut, BookOpen, FolderOpen } from "lucide-react";
import Link from "next/link";

export default function UserMenu() {
  const { data: session } = useSession();
  
  if (!session?.user) return null;
  
  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };
  
  const initials = session.user.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase() || "U";
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{session.user.name}</p>
            <p className="text-xs text-muted-foreground">{session.user.email}</p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/account" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            My Account
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/account?tab=notebooks" className="cursor-pointer">
            <BookOpen className="mr-2 h-4 w-4" />
            My Notebooks
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/account?tab=collections" className="cursor-pointer">
            <FolderOpen className="mr-2 h-4 w-4" />
            My Collections
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3.3: Update Navigation Header

**File:** `apps/web/src/components/sections/navigation-header.tsx`

**Replace the "Sign In" button with:**

```typescript
"use client";
import { useState } from "react";
import { useSession } from "@/lib/auth";
import AuthDialog from "@/components/auth/AuthDialog";
import UserMenu from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";

export default function NavigationHeader() {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { data: session, isPending } = useSession();
  
  return (
    <header className="fixed top-0 w-full z-50 ...">
      <nav className="...">
        {/* ... existing navigation links ... */}
        
        <div className="flex items-center gap-3">
          <UploadButton />
          
          {isPending ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : session ? (
            <UserMenu />
          ) : (
            <Button 
              onClick={() => setAuthDialogOpen(true)}
              variant="outline"
            >
              Sign In
            </Button>
          )}
        </div>
      </nav>
      
      <AuthDialog 
        open={authDialogOpen} 
        onOpenChange={setAuthDialogOpen}
        mode="signin"
      />
    </header>
  );
}
```

### 3.4: Protect Upload Dialog

**File:** `apps/web/src/components/ui/upload-dialog.tsx`

**Add auth check before allowing upload:**

```typescript
"use client";
import { useSession } from "@/lib/auth";
import { useState } from "react";

export default function UploadDialog({ open, onOpenChange }: Props) {
  const { data: session } = useSession();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  // If not signed in, show auth prompt
  if (open && !session) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in to Upload</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You need to sign in before uploading notebooks.
          </p>
          <Button onClick={() => setShowAuthPrompt(true)}>
            Sign In
          </Button>
        </DialogContent>
        
        {showAuthPrompt && (
          <AuthDialog 
            open={showAuthPrompt} 
            onOpenChange={setShowAuthPrompt}
          />
        )}
      </Dialog>
    );
  }
  
  // ... rest of upload form (only shown when authenticated)
}
```

### 3.5: Connect Upload to Convex

**Update submit handler in upload-dialog.tsx:**

```typescript
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function UploadDialog() {
  const { data: session } = useSession();
  const createNotebook = useMutation(api.notebooks.create);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) {
      setError("You must be signed in to upload");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      await createNotebook({
        title: formData.title,
        description: formData.description,
        shareLink: formData.shareLink,
        category: formData.category,
        tags: formData.tags.split(",").map(t => t.trim()),
        isPublic: true,
        userId: session.user.id,
      });
      
      setStep("success");
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setStep("form");
        resetForm();
        onOpenChange(false);
      }, 2000);
      
    } catch (error) {
      console.error("Upload error:", error);
      setError("Failed to upload notebook. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // ... rest of component
}
```

---

## ✅ Testing Checklist

### Before Marking Complete:

**Test 1: Mock Data Removed**
- [ ] Visit `/notebooks` - No "showing mock data" warning
- [ ] If no notebooks exist, shows proper empty state
- [ ] If notebooks exist, shows real data from Convex

**Test 2: Data Population**
- [ ] At least 10 notebooks visible on `/notebooks`
- [ ] Click a notebook → Opens detail page with correct data
- [ ] Collections page shows real collections
- [ ] Authors page shows real authors

**Test 3: Authentication**
- [ ] Click "Sign In" button → Dialog opens
- [ ] Click "Continue with Google" → Redirects to Google OAuth
- [ ] After OAuth: Redirects back and user is signed in
- [ ] Navigation shows user avatar/menu
- [ ] Click avatar → Dropdown menu appears
- [ ] Click "Sign Out" → User signs out successfully

**Test 4: Upload Flow**
- [ ] Click "Upload" button while signed out → Auth prompt
- [ ] Sign in, then click "Upload" → Form appears
- [ ] Fill form and submit → Notebook creates successfully
- [ ] New notebook appears in `/notebooks` list
- [ ] New notebook appears in user's account page

**Test 5: Account Page**
- [ ] Visit `/account` while signed out → Redirects to sign in
- [ ] Visit `/account` while signed in → Shows user data
- [ ] Shows user's notebooks (empty or populated)
- [ ] Shows user's collections (empty or populated)

**Test 6: Cross-Device Sync**
- [ ] Sign in on website
- [ ] Sign in on Chrome extension (same Google account)
- [ ] Create notebook on website
- [ ] Check extension → Notebook appears
- [ ] Create notebook on extension
- [ ] Check website → Notebook appears

---

## 🚨 Common Issues & Solutions

### Issue 1: "Cannot find module '@/convex/_generated/api'"

**Solution:**
```bash
cd apps/chrome-extension
npx convex dev
# Let it generate types, then Ctrl+C
```

The website imports from `../../../convex/_generated/api` (relative to chrome-extension)

### Issue 2: Auth redirect not working

**Check:**
1. `NEXT_PUBLIC_SITE_URL` is set correctly in Vercel
2. Google OAuth redirect URIs include your Vercel URL
3. BetterAuth `baseURL` matches `NEXT_PUBLIC_SITE_URL`

### Issue 3: Queries return `undefined` forever

**Debug:**
```typescript
const notebooks = useQuery(api.notebooks.listPublicNotebooks);
console.log("Notebooks:", notebooks); // Check what's returned

// If undefined forever:
// 1. Check ConvexProvider is in layout.tsx
// 2. Check NEXT_PUBLIC_CONVEX_URL is set
// 3. Check function exists in convex/notebooks.ts
```

### Issue 4: "User not authenticated" error on upload

**Check:**
1. User is signed in: `const { data: session } = useSession()`
2. Session has user object: `session?.user`
3. Mutation receives userId: `{ userId: session.user.id }`

---

## 📦 Deliverables

When you finish, provide:

1. **Summary of changes made** (bullet list)
2. **Number of notebooks/collections added** to Convex
3. **Screenshots** of:
   - Notebooks page with real data
   - Sign-in dialog
   - User menu dropdown
   - Account page showing user's notebooks
4. **Live URLs**:
   - Website: `https://supernotebooklm-monorepo.vercel.app`
   - Test account: Create one and share credentials (or use test Google account)
5. **Known issues** (if any remain)

---

## 📞 Questions for User

**Before starting, ask user:**

1. **Data to populate:**
   - "How many notebooks should I create? (Recommend: 20-50 for realistic demo)"
   - "What categories should notebooks be in? (Current: AI, Science, Tech, Business, Health, History)"
   - "Should I use real NotebookLM share links or placeholder URLs?"
   - "Should I create user profiles for authors, or use anonymous?"

2. **Features to prioritize:**
   - "Should I focus on notebooks first, or do collections equally?"
   - "Do you want search functionality working, or just browsing?"
   - "Should authors/contributors pages be fully functional?"

3. **Auth flow:**
   - "Do you have a specific Google account for testing, or should I use any?"
   - "Should account creation be restricted (invite-only) or open to everyone?"

---

## 🎯 Success Criteria

**Phase is complete when:**
- ✅ Zero mock data remains in codebase
- ✅ Website shows at least 20 real notebooks from Convex
- ✅ User can sign in with Google successfully
- ✅ User can upload a new notebook
- ✅ Account page shows user's own data
- ✅ All pages load without errors
- ✅ Cross-device sync works (test with extension)

---

**Estimated Time Breakdown:**
- Task 1 (Remove mock data): 2-3 hours
- Task 2 (Populate real data): 1-2 hours  
- Task 3 (Auth UI): 3-4 hours
- Testing & debugging: 1 hour

**Total: 7-10 hours**

---

## 📚 Resources

- **Convex Docs:** https://docs.convex.dev
- **BetterAuth Docs:** https://www.better-auth.com/docs
- **Shadcn/ui:** https://ui.shadcn.com
- **Next.js App Router:** https://nextjs.org/docs/app

---

**Good luck! Remember to ask user for real data before populating Convex.** 🚀
