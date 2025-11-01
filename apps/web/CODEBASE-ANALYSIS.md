# NotebookLM Directory - Complete Codebase Analysis

**Generated:** 2025-10-31  
**Purpose:** Comprehensive documentation for future agents and developers  
**Status:** Frontend Mockup (No Backend Integration Yet)

---

## 🎯 Executive Summary

This Next.js website is currently a **frontend-only mockup/prototype** with:
- ✅ Complete UI/UX implementation
- ✅ Shadcn/ui component library
- ✅ Responsive design with animations
- ❌ **NO backend integration**
- ❌ **NO authentication implemented**
- ❌ **ALL data is hardcoded mock data**

### Critical Finding
The website has `better-auth`, `drizzle-orm`, `@libsql/client`, and `stripe` in `package.json` dependencies but **NONE are configured or used**. This is a clean slate for Convex integration.

---

## 📊 Technology Stack Analysis

### Current Dependencies

| Category | Technology | Version | Status |
|----------|-----------|---------|--------|
| **Framework** | Next.js | 15.3.5 | ✅ Implemented |
| **React** | React 19 | 19.0.0 | ✅ Implemented |
| **Styling** | Tailwind CSS | 4.x | ✅ Implemented |
| **UI Library** | Shadcn/ui (Radix) | Various | ✅ Implemented |
| **Animations** | Framer Motion | 12.23.22 | ✅ Implemented |
| **Auth** | Better Auth | 1.3.10 | ❌ NOT Configured |
| **Database ORM** | Drizzle ORM | 0.44.6 | ❌ NOT Configured |
| **Database** | LibSQL Client | 0.15.15 | ❌ NOT Configured |
| **Payments** | Stripe | 19.1.0 | ❌ NOT Configured |
| **3D Graphics** | Three.js + React Three Fiber | Latest | ✅ Partial (globe component) |

### Package Manager Issue

```bash
# PROBLEM: Project has BOTH lock files
- bun.lock (251KB)
- package-lock.json (141KB)
```

**Recommendation:** For monorepo setup with Chrome extension, migrate to **PNPM** (Turborepo best practice).

---

## 📁 Complete Directory Structure

```
notebooklm-directory/
├── public/                      # Static assets
├── src/
│   ├── app/                     # Next.js App Router pages
│   │   ├── page.tsx            # Homepage (with all sections)
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles
│   │   ├── global-error.tsx    # Error boundary
│   │   ├── account/
│   │   │   └── page.tsx        # User account page (MOCK DATA)
│   │   ├── notebooks/
│   │   │   └── page.tsx        # All notebooks listing (MOCK DATA)
│   │   ├── notebook/
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Individual notebook (MOCK DATA)
│   │   ├── collections/
│   │   │   └── page.tsx        # All collections (MOCK DATA)
│   │   ├── collection/
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Individual collection (MOCK DATA)
│   │   ├── authors/
│   │   │   └── page.tsx        # All authors (MOCK DATA)
│   │   └── author/
│   │       └── [id]/
│   │           └── page.tsx    # Individual author (MOCK DATA)
│   │
│   ├── components/
│   │   ├── sections/           # Homepage sections
│   │   │   ├── navigation-header.tsx       # Top navigation
│   │   │   ├── hero-section.tsx            # Hero with logo
│   │   │   ├── search-bar.tsx              # Search input (non-functional)
│   │   │   ├── featured-notebooks.tsx      # Horizontal scroll (MOCK)
│   │   │   ├── featured-uploads.tsx        # Recent uploads (MOCK)
│   │   │   ├── category-grid.tsx           # Category cards (MOCK)
│   │   │   ├── members-section.tsx         # Top contributors (MOCK)
│   │   │   ├── trending-section.tsx        # Trending notebooks (MOCK)
│   │   │   ├── additional-categories.tsx   # More categories (MOCK)
│   │   │   └── sponsor-badges.tsx          # Sponsor section (MOCK)
│   │   │
│   │   ├── ui/                 # Shadcn/ui components (50+ components)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── upload-dialog.tsx           # Notebook upload (NO backend)
│   │   │   └── ...             # All Shadcn components
│   │   │
│   │   └── ErrorReporter.tsx   # Error boundary component
│   │
│   ├── lib/
│   │   ├── utils.ts            # Tailwind cn() utility
│   │   └── hooks/
│   │       └── use-mobile.tsx  # Mobile detection hook
│   │
│   └── visual-edits/           # Visual editing tools (dev only)
│       ├── VisualEditsMessenger.tsx
│       └── component-tagger-loader.js
│
├── package.json
├── bun.lock                     # ⚠️ Should remove for monorepo
├── package-lock.json            # ⚠️ Should remove for monorepo
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json              # Shadcn/ui config
└── README.md
```

---

## 🔍 Feature-by-Feature Analysis

### 1. **Homepage (`/`)**

**File:** `src/app/page.tsx`

**Sections:**
1. Navigation Header (always visible, fixed)
2. Hero Section (logo + tagline)
3. Search Bar (UI only, no search functionality)
4. Featured Notebooks (horizontal scroll, mock data)
5. Featured Uploads (recent uploads, mock data)
6. Category Grid (6 categories, mock data)
7. Members Section (top contributors, mock data)
8. Additional Categories (more categories, mock data)
9. Footer (static links)

**Data Source:** All hardcoded in component files.

---

### 2. **Notebooks Page (`/notebooks`)**

**File:** `src/app/notebooks/page.tsx`

**Features:**
- Breadcrumb navigation
- Stats bar (Total, Categories, This Week, Most Liked)
- 6 categories with 4-6 notebooks each
- Grid layout (responsive)
- Each notebook shows:
  - Title
  - Author
  - Tags
  - View count
  - Like count

**Data:** 600 lines of mock data embedded in file:
```typescript
const categories = [
  {
    id: "ai",
    name: "AI & Machine Learning",
    notebookCount: 127,
    notebooks: [
      { id: "1", title: "...", author: "...", views: 1247, likes: 89 },
      // ... more mock data
    ]
  },
  // ... 5 more categories
];
```

**Links:** All notebook links go to `/notebook/[id]` but IDs are mock.

---

### 3. **Individual Notebook Page (`/notebook/[id]`)**

**File:** `src/app/notebook/[id]/page.tsx`

**Status:** Page exists but likely shows placeholder or uses mock data lookup.

**Expected Features (Not Implemented):**
- Notebook content
- Source documents
- Q&A history
- Like/bookmark functionality
- Share options

---

### 4. **Collections Pages**

**Files:**
- `src/app/collections/page.tsx` - List all collections
- `src/app/collection/[id]/page.tsx` - Individual collection

**Data:** Mock collections with titles, descriptions, notebook counts.

**Expected Features (Not Implemented):**
- Collection CRUD operations
- Add/remove notebooks from collections
- Public/private visibility toggle

---

### 5. **Authors Pages**

**Files:**
- `src/app/authors/page.tsx` - List all authors
- `src/app/author/[id]/page.tsx` - Individual author profile

**Data:** Mock author data (names, avatars, bio, stats).

**Expected Features (Not Implemented):**
- Author profiles with real data
- Follow/unfollow functionality
- Author's notebooks and collections

---

### 6. **Account Page (`/account`)**

**File:** `src/app/account/page.tsx`

**Features (UI Only):**
- Profile header with avatar
- Stats (notebooks, collections, likes)
- Tabs:
  - My Notebooks (with edit/delete buttons - no functionality)
  - My Collections (with edit/delete buttons - no functionality)
- Create buttons (no functionality)
- Public/Private status badges (static)

**Mock User Data:**
```typescript
const userData = {
  id: "current-user",
  name: "John Doe",
  email: "john.doe@example.com",
  avatar: "https://...",
  // ... more mock fields
};
```

**Authentication:** Links to `/login?next=/` but no login page exists.

---

### 7. **Upload Dialog**

**File:** `src/components/ui/upload-dialog.tsx`

**Form Fields:**
- NotebookLM Share Link (URL input)
- Title
- Description (textarea, 500 char limit)
- Category (dropdown with 10 categories)
- Tags (comma-separated)

**Submit Logic:**
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // TODO: Handle form submission
  setStep("success");
  // Shows success message, then resets
};
```

**Status:** UI complete, no API integration.

---

### 8. **Navigation Header**

**File:** `src/components/sections/navigation-header.tsx`

**Features:**
- Fixed position, backdrop blur
- Desktop nav: Notebooks, Collections, Authors links
- Upload button (opens UploadDialog)
- Sign In button → `/login?next=/`
- Mobile: Sheet menu with same links

**Authentication:** No actual auth check, always shows "Sign In" button.

---

## 🎨 UI Components Inventory

### Shadcn/ui Components (50+ installed)

<details>
<summary>Full Component List</summary>

- Accordion
- Alert / Alert Dialog
- Aspect Ratio
- Avatar
- Badge
- Breadcrumb
- Button / Button Group
- Calendar
- Card
- Carousel
- Chart
- Checkbox
- Collapsible
- Command
- Context Menu
- Dialog
- Drawer
- Dropdown Menu
- Empty
- Field
- Form
- Hover Card
- Input / Input Group / Input OTP
- Item
- Kbd
- Label
- Menubar
- Navigation / Navigation Menu
- Pagination
- Popover
- Progress
- Radio Group
- Resizable
- Scroll Area
- Select
- Separator
- Sheet
- Sidebar
- Skeleton
- Slider
- Sonner (Toast)
- Spinner
- Switch
- Table
- Tabs
- Textarea
- Toggle / Toggle Group
- Tooltip
- Upload Dialog (custom)

</details>

### Custom Components

- **Background Boxes** (`background-boxes.tsx`) - Animated background
- **Container Scroll Animation** - Parallax scroll effects
- **Component Separator** - Visual separators

---

## 🔐 Authentication Status

### Current State: NO AUTHENTICATION

**Evidence:**
1. No auth config files found
2. No session management
3. No protected routes
4. "Sign In" button links to `/login?next=/` (page doesn't exist)
5. Account page shows mock user data without login check

### Dependencies Present (Not Used)

```json
{
  "better-auth": "1.3.10"  // ← In package.json but ZERO configuration
}
```

**Next Steps:** Need to configure BetterAuth with Convex backend.

---

## 💾 Database Status

### Current State: NO DATABASE

**Evidence:**
1. No database connection files
2. No schema definitions
3. No queries or mutations
4. All data is hardcoded arrays in component files

### Dependencies Present (Not Used)

```json
{
  "drizzle-orm": "0.44.6",      // ← ORM not configured
  "drizzle-kit": "0.31.5",      // ← Migration tool not used
  "@libsql/client": "0.15.15"   // ← Database client not configured
}
```

**Note:** These were likely added with intention to use Turso/LibSQL, but never implemented.

**Recommendation:** Replace with Convex (already used in Chrome extension) for unified backend.

---

## 💳 Payments Status

### Current State: NO PAYMENT INTEGRATION

```json
{
  "stripe": "19.1.0"  // ← In package.json but ZERO usage
}
```

**Likely Use Cases (Future):**
- Premium features
- Sponsored listings
- Notebook monetization
- Subscription tiers

---

## 🎯 Data Models (Inferred from Mock Data)

### Notebook Model

```typescript
interface Notebook {
  id: string;
  title: string;
  description?: string;
  author: string;           // Should be User reference
  authorId?: string;
  shareLink?: string;       // NotebookLM share URL
  category: string;
  tags: string[];
  views: number;
  likes: number;
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### Collection Model

```typescript
interface Collection {
  id: string;
  title: string;
  description: string;
  notebookCount: number;
  notebooks?: string[];     // Array of notebook IDs
  isPublic: boolean;
  ownerId: string;
  createdAt?: Date;
}
```

### User/Author Model

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  joinedDate: Date;
  
  // Stats
  notebooksCount?: number;
  collectionsCount?: number;
  totalLikes?: number;
  totalViews?: number;
}
```

### Category Model

```typescript
interface Category {
  id: string;
  name: string;
  description: string;
  notebookCount: number;
  icon?: string;
  color?: string;
}
```

---

## 🔌 Integration Points Needed

### 1. Convex Backend Integration

**Files to Create:**
```
notebooklm-directory/
├── convex/                      # ← NEW: Shared with extension
│   ├── schema.ts               # Define Notebook, Collection, User tables
│   ├── notebooks.ts            # CRUD queries/mutations
│   ├── collections.ts          # Collection operations
│   ├── users.ts                # User profiles
│   ├── auth.config.ts          # BetterAuth config (multi-client)
│   └── http.ts                 # HTTP endpoints (webhooks, etc.)
├── src/
│   └── lib/
│       └── convex.ts           # ← NEW: Convex client setup
```

**ConvexProvider Setup:**
```tsx
// src/app/layout.tsx
import { ConvexProvider } from "convex/react";
import { convex } from "@/lib/convex";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ConvexProvider client={convex}>
          {children}
        </ConvexProvider>
      </body>
    </html>
  );
}
```

### 2. BetterAuth Integration

**Files to Create:**
```typescript
// src/lib/auth.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL,
});

export const { signIn, signOut, useSession } = authClient;
```

**Update Navigation:**
```typescript
// components/sections/navigation-header.tsx
import { useSession } from "@/lib/auth";

export default function NavigationHeader() {
  const { data: session } = useSession();
  
  return (
    <header>
      {session ? (
        <Button onClick={() => signOut()}>Sign Out</Button>
      ) : (
        <Button onClick={() => signIn.google()}>Sign In</Button>
      )}
    </header>
  );
}
```

### 3. Real Data Fetching

**Example: Notebooks Page**

**Before (Current):**
```typescript
// Hardcoded in component
const categories = [
  { id: "ai", name: "AI", notebooks: [...] },
  // ...
];
```

**After (With Convex):**
```typescript
// src/app/notebooks/page.tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function NotebooksPage() {
  const categories = useQuery(api.notebooks.getNotebooksByCategory);
  
  if (!categories) return <LoadingSpinner />;
  
  return (
    <div>
      {categories.map(category => (
        <CategorySection key={category.id} category={category} />
      ))}
    </div>
  );
}
```

### 4. Upload Functionality

**Update `upload-dialog.tsx`:**
```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function UploadDialog() {
  const submitNotebook = useMutation(api.notebooks.create);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitNotebook({
      title: formData.title,
      description: formData.description,
      shareLink: formData.shareLink,
      category: formData.category,
      tags: formData.tags.split(",").map(t => t.trim()),
    });
    setStep("success");
  };
  
  // ...
}
```

---

## 🔄 Monorepo Migration Plan

### Option 1: Turborepo + PNPM (RECOMMENDED)

**Why PNPM:**
- ✅ 3x faster than npm/yarn
- ✅ Efficient disk usage (symlinks)
- ✅ Turborepo best practice
- ✅ Industry standard for monorepos in 2025
- ✅ Native workspace support

**Why NOT Bun (for monorepo):**
- ❌ Turborepo has less mature Bun support
- ❌ Convex CLI works best with npm/pnpm
- ❌ Some dependencies may have compatibility issues
- ⚠️ Bun is great for single projects, but not ideal for complex monorepos yet

### Migration Steps

#### Step 1: Remove Old Lock Files
```bash
cd C:\Users\Admin\Desktop\supernotebooklm\notebooklm-directory
rm bun.lock package-lock.json
```

#### Step 2: Install PNPM
```bash
npm install -g pnpm
```

#### Step 3: Generate pnpm-lock.yaml
```bash
pnpm install
```

#### Step 4: Verify All Works
```bash
pnpm dev  # Should start Next.js on localhost:3000
```

#### Step 5: Monorepo Structure
```bash
# Create monorepo root
cd C:\Users\Admin\Desktop\supernotebooklm
mkdir supernotebooklm-monorepo
cd supernotebooklm-monorepo

# Move projects into apps/
mkdir -p apps packages
mv ../supernotebooklm-extension apps/chrome-extension
mv ../notebooklm-directory apps/web

# Extract shared Convex backend
mkdir -p packages/backend
mv apps/chrome-extension/convex packages/backend/convex
```

#### Step 6: Create Workspace Config

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Root `package.json`:**
```json
{
  "name": "supernotebooklm-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

**`turbo.json`:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", ".wxt/**"]
    }
  }
}
```

---

## 🚀 Development Workflow

### Current Workflow (Single Project)

```bash
cd notebooklm-directory
bun dev  # or npm run dev
# Opens http://localhost:3000
```

### Future Workflow (Monorepo)

```bash
# Terminal 1: Start Convex backend
cd packages/backend
npx convex dev

# Terminal 2: Start all apps
cd ../..
pnpm dev  # Runs both extension and web in parallel

# Or individual:
pnpm dev --filter=web             # Next.js only
pnpm dev --filter=chrome-extension # Extension only
```

---

## 📋 Checklist: Convex Integration Tasks

### Backend Setup

- [ ] Create `packages/backend` folder
- [ ] Move/create `convex/schema.ts` with all tables
- [ ] Create `convex/notebooks.ts` (queries/mutations)
- [ ] Create `convex/collections.ts`
- [ ] Create `convex/users.ts`
- [ ] Configure `convex/auth.config.ts` for multi-client
- [ ] Run `npx convex dev` and deploy schema

### Frontend Setup (Next.js)

- [ ] Install Convex: `pnpm add convex @convex-dev/better-auth better-auth`
- [ ] Create `src/lib/convex.ts` (Convex client)
- [ ] Create `src/lib/auth.ts` (BetterAuth client)
- [ ] Wrap app in `<ConvexProvider>` (layout.tsx)
- [ ] Add `.env.local` with `NEXT_PUBLIC_CONVEX_URL`

### Replace Mock Data

- [ ] **Notebooks Page** - Use `useQuery(api.notebooks.getByCategory)`
- [ ] **Individual Notebook** - Use `useQuery(api.notebooks.getById)`
- [ ] **Collections Page** - Use `useQuery(api.collections.list)`
- [ ] **Authors Page** - Use `useQuery(api.users.list)`
- [ ] **Account Page** - Use `useSession()` + user queries
- [ ] **Upload Dialog** - Use `useMutation(api.notebooks.create)`
- [ ] **Search Bar** - Implement real search with Convex

### Authentication

- [ ] Create Google OAuth credentials
- [ ] Configure BetterAuth in Convex
- [ ] Add multi-client support (web + extension)
- [ ] Create `/login` page (or use redirect)
- [ ] Update Navigation Header to show user state
- [ ] Protect account routes (middleware or client-side)

### Testing

- [ ] Test uploads from website
- [ ] Test browsing notebooks from website
- [ ] Test auth flow (Google sign-in)
- [ ] Test cross-client sync (sign in web → auto-sign in extension)
- [ ] Test public vs private notebooks

---

## 🔑 Environment Variables Needed

```bash
# .env.local (Next.js website)

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# BetterAuth
BETTER_AUTH_SECRET=your-secret-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Google OAuth (Better Auth)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional: Stripe (future)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 🎨 Design System

### Colors (Tailwind Config)

The site uses a **minimal, monochrome design** with:
- `foreground` - Primary text (black/white depending on theme)
- `muted-foreground` - Secondary text (gray)
- `border` - Border color (subtle gray)
- `accent` - Hover states
- `card` - Card background
- `background` - Page background

### Typography

- **Font:** System fonts (no custom font loaded)
- **Font Family:** `.font-mono` used for metadata/stats
- **Sizes:** Small (text-xs to text-sm), minimalist aesthetic
- **Style:** Clean, brutalist design

### Components Style

- Rounded corners: `rounded-full` for buttons, `rounded-md` for cards
- Borders: `border border-border` everywhere
- Hover effects: `hover:bg-accent transition-colors`
- Consistent spacing: `gap-2`, `gap-4`, `p-4`, `p-6`

---

## 🐛 Known Issues / Tech Debt

1. **Both bun.lock and package-lock.json present**
   - Indicates project switched package managers mid-development
   - Should standardize on one (recommend PNPM for monorepo)

2. **TypeScript build errors ignored**
   ```typescript
   // next.config.ts
   typescript: { ignoreBuildErrors: true }
   eslint: { ignoreDuringBuilds: true }
   ```
   - Should fix type errors before production

3. **All images allow any domain**
   ```typescript
   images: {
     remotePatterns: [{ protocol: 'https', hostname: '**' }]
   }
   ```
   - Security risk, should whitelist specific domains

4. **No error handling for data fetching**
   - When Convex integrated, add error boundaries and loading states

5. **Upload dialog has no validation**
   - Should validate NotebookLM URL format
   - Should prevent duplicate uploads

6. **Search bar is non-functional**
   - Needs Convex full-text search implementation

7. **No pagination**
   - Notebooks/collections/authors pages will need pagination when real data added

8. **Unused dependencies**
   - Should remove `drizzle-orm`, `@libsql/client` if using Convex
   - Should remove `stripe` until payment features are implemented

---

## 📚 Additional Resources

### Official Documentation Links

- **Next.js 15:** https://nextjs.org/docs
- **Convex:** https://docs.convex.dev
- **BetterAuth:** https://www.better-auth.com/docs
- **Shadcn/ui:** https://ui.shadcn.com
- **Turborepo:** https://turbo.build/repo/docs
- **PNPM Workspaces:** https://pnpm.io/workspaces

### Chrome Extension Codebase

**Location:** `C:\Users\Admin\Desktop\supernotebooklm\supernotebooklm-extension`

**Key Files to Reference:**
- `convex/schema.ts` - Database schema (should be shared)
- `convex/auth.config.ts` - BetterAuth setup
- `convex/notebooks.ts` - Notebook operations (can reuse)
- `src/lib/convex.ts` - Convex client setup

---

## 🎯 Immediate Next Steps

### Phase 1: Monorepo Setup (1-2 hours)
1. Remove `bun.lock` and `package-lock.json`
2. Install PNPM globally
3. Run `pnpm install` in website directory
4. Test that `pnpm dev` works
5. Create monorepo structure (parent folder, apps/, packages/)

### Phase 2: Convex Integration (2-4 hours)
1. Create `packages/backend` with shared Convex code
2. Update both apps to reference shared backend
3. Add ConvexProvider to Next.js layout
4. Test that both apps can read from same Convex backend

### Phase 3: Auth Setup (1-2 hours)
1. Configure BetterAuth multi-client in `convex/auth.config.ts`
2. Create auth client in Next.js (`src/lib/auth.ts`)
3. Update navigation to show user state
4. Test sign-in flow

### Phase 4: Replace Mock Data (4-6 hours)
1. Update notebooks page to use Convex queries
2. Update account page to use real user data
3. Implement upload functionality
4. Test all pages with real data

### Phase 5: Deploy (1 hour)
1. Deploy Convex backend: `npx convex deploy`
2. Deploy Next.js to Vercel
3. Update environment variables
4. Test production setup

---

## 📞 Future Agent Guidance

When working on this codebase:

1. **Before making changes:** Read this document fully to understand the current state

2. **Data fetching:** All pages currently use mock data. When you see hardcoded arrays, they need to be replaced with Convex queries.

3. **Authentication:** There is NO auth currently. Before working on account/upload features, ensure auth is implemented.

4. **Database:** There is NO database currently. Before adding features that need persistence, ensure Convex is integrated.

5. **Styling:** Follow the existing design system (borders, monospace fonts, minimal colors). Use Shadcn/ui components.

6. **Package manager:** After monorepo setup, ALWAYS use `pnpm` not npm/bun/yarn.

7. **Testing:** There are no tests currently. When adding backend integration, add tests.

---

## ✅ Conclusion

**Current Status:** Beautiful frontend mockup with zero backend integration.

**Path Forward:** 
1. Convert to PNPM
2. Create monorepo with Chrome extension
3. Integrate shared Convex backend
4. Replace all mock data with real queries
5. Ship to production

**Estimated Total Time:** 10-15 hours of focused development.

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-31  
**Author:** James (Dev Agent)
