# Supernotebooklm Monorepo

**Status:** ✅ Phases 1-3 Complete | Ready for Phase 4  
**Last Updated:** 2025-11-01

---

## 🎯 Project Overview

This is a monorepo containing:
- **Chrome Extension** (WXT) - Captures chats from NotebookLM, ChatGPT, Claude, Perplexity
- **Next.js Website** - Public notebook directory and user dashboard
- **Shared Convex Backend** - Real-time database and authentication

**Key Features:**
- ✅ Local-first architecture (IndexedDB cache in extension)
- ✅ Cloud sync (Convex as source of truth)
- ✅ Cross-device sync (extension ↔ website)
- ✅ Unified authentication (BetterAuth with Google OAuth)
- ✅ Real-time updates across all clients

---

## 📁 Structure

```
supernotebooklm-monorepo/
├── apps/
│   ├── chrome-extension/       # WXT Chrome Extension
│   └── web/                    # Next.js Website (Next.js 15)
├── packages/
│   └── backend/                # Shared Convex Backend
│       └── convex/
│           ├── schema.ts       # Database schema
│           ├── chats.ts        # Chats API (sync)
│           ├── notebooks.ts    # Public notebooks API
│           ├── auth.config.ts  # Multi-client auth
│           └── ...
├── package.json                # Root workspace config
├── pnpm-workspace.yaml         # PNPM workspace
├── turbo.json                  # Turborepo pipeline
└── pnpm-lock.yaml              # 1,640 packages
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- PNPM >= 9.0.0 (installed: v10.14.0)
- Convex account (https://convex.dev)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Deploy Convex backend (first time)
cd packages/backend
npx convex dev
# Follow prompts to create deployment
# Copy deployment URL

# 3. Configure environment variables
# apps/web/.env.local
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# apps/chrome-extension/.env
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# 4. Start development
cd ../..
pnpm dev  # Starts all apps
```

---

## 📜 Available Scripts

### Root Level
```bash
pnpm dev                # Start all apps in dev mode
pnpm dev:web            # Start only Next.js website
pnpm dev:extension      # Start only Chrome extension

pnpm build              # Build all apps
pnpm build:web          # Build only website
pnpm build:extension    # Build only extension

pnpm test               # Run tests in all packages
pnpm lint               # Lint all packages
pnpm clean              # Clean all build outputs
```

### Individual Apps
```bash
# Website
cd apps/web
pnpm dev                # http://localhost:3000
pnpm build
pnpm lint

# Extension
cd apps/chrome-extension
pnpm dev                # Starts WXT dev server
pnpm build              # Build for Chrome
pnpm test               # Run Vitest tests
pnpm test:coverage      # Coverage report
```

---

## ✅ Completed Phases

### Phase 1: PNPM Setup ✅
- Removed conflicting lock files (bun.lock, package-lock.json)
- Installed all dependencies with PNPM (789 packages in website)
- Generated pnpm-lock.yaml

### Phase 2: Monorepo Setup ✅
- Created monorepo structure
- Moved projects to `apps/` folder
- Extracted shared backend to `packages/`
- Installed Turborepo v2.6.0
- All workspace packages detected (1,640 total packages)

### Phase 3: Convex Backend Setup ✅
- Updated schema with sync tables (chats, folders, notebookMetadata)
- Created chats API with 14 functions (8 queries + 6 mutations)
- Configured multi-client BetterAuth (extension + website)
- Added duplicate prevention and ownership checks
- Delta sync support for incremental updates

**See:** `PHASE-3-COMPLETE.md` for detailed documentation

---

## ⏳ Remaining Phases

### Phase 4: Website Integration (Next)
- Install Convex in website
- Create Convex client
- Replace mock data with real queries
- Add upload functionality
- **Estimated:** 3 hours

### Phase 5: IndexedDB Sync
- Update IndexedDB schema
- Create SyncService
- Implement push/pull sync
- Wire up integration
- **Estimated:** 4-6 hours

### Phase 6: Authentication
- Configure Google OAuth
- Update navigation
- Test sign-in flow
- **Estimated:** 1 hour

### Phase 7: Testing & Deploy
- Test all flows
- Deploy Convex
- Deploy website to Vercel
- **Estimated:** 1 hour

**Total Remaining:** 9-11 hours

---

## 🗄️ Database Schema

### Private User Data (Sync)
- **chats** - Chat history from extension
- **folders** - Folder hierarchy
- **notebookMetadata** - Tags and folder assignments

### Public Data (Community)
- **publicNotebooks** - Public notebook directory
- **reportedNotebooks** - Content moderation
- **moderationLogs** - Violation logs
- **userModeration** - Strike system

### Auth (BetterAuth Managed)
- **users** - User accounts
- **sessions** - Active sessions
- **accounts** - OAuth accounts
- **verifications** - Email verification

---

## 🔐 Authentication

**Provider:** BetterAuth + Google OAuth

**Multi-Client Support:**
- Next.js website (`applicationID: "web"`)
- Chrome extension (`applicationID: "extension"`)

**Features:**
- Single sign-on across both apps
- Session sync
- Secure token storage

---

## 📊 Tech Stack

### Frontend
- **Extension:** WXT + React 19 + Dexie.js (IndexedDB)
- **Website:** Next.js 15 + React 19 + Shadcn/ui

### Backend
- **Database:** Convex (real-time NoSQL)
- **Auth:** BetterAuth
- **File Storage:** Convex Storage

### DevOps
- **Monorepo:** Turborepo + PNPM workspaces
- **Deployment:** Vercel (website) + Convex (backend)
- **Testing:** Vitest + Playwright

---

## 📚 Documentation

- **MONOREPO-STATUS.md** - Monorepo setup and test results
- **PHASE-3-COMPLETE.md** - Convex backend implementation details
- **SYNC-ARCHITECTURE.md** - IndexedDB ↔ Convex sync design
- **SYNC-IMPLEMENTATION-GUIDE.md** - Step-by-step sync implementation
- **CODEBASE-ANALYSIS.md** (in apps/web) - Website architecture
- **CONVEX-INTEGRATION-GUIDE.md** (in apps/web) - Convex setup guide

---

## 🐛 Known Issues

1. **Website favicon error**
   - `favicon.ico` is corrupted
   - Production build fails
   - Dev mode works fine
   - **Fix:** Replace with valid image

2. **Extension convex folder**
   - Currently has its own convex/ folder
   - Needs to reference shared backend
   - **Fix:** Phase 4/5 task

3. **BetterAuth version warning**
   - autumn-js peer dependency mismatch
   - Minimal impact
   - **Fix:** Upgrade better-auth to latest

---

## 🔧 Troubleshooting

### Turborepo not found
```bash
pnpm install turbo -w
```

### Convex CLI not found
```bash
cd packages/backend
pnpm install
```

### Website build fails
```bash
# Favicon issue - replace favicon.ico
# Or use dev mode: pnpm dev:web
```

### Extension build fails
```bash
cd apps/chrome-extension
pnpm install
pnpm dev
```

---

## 🤝 Contributing

This monorepo uses:
- **PNPM** for package management
- **Turborepo** for build orchestration
- **Conventional Commits** for commit messages

**Workflow:**
1. Create feature branch
2. Make changes
3. Run `pnpm test` and `pnpm lint`
4. Commit with conventional commit message
5. Push and create PR

---

## 📝 License

Private project - All rights reserved

---

## 🙏 Acknowledgments

- **Convex** - Real-time backend platform
- **WXT** - Modern Chrome extension framework
- **Turborepo** - Monorepo build system
- **BetterAuth** - Authentication library

---

**Next Steps:** Deploy Convex backend and proceed to Phase 4 (Website Integration)

**Questions?** See documentation in the root folder.
