# SuperNotebookLM - Production Deployment Guide

**Version:** 1.0  
**Date:** 2025-11-01  
**Status:** Ready for deployment when testing complete

---

## 📋 Pre-Deployment Checklist

### Before deploying to production, ensure:

- [ ] All Phase 7 tests pass (see PHASE-7-TESTING-CHECKLIST.md)
- [ ] No critical bugs or security issues
- [ ] Performance acceptable (memory < 200MB, responsive UI)
- [ ] Documentation up to date
- [ ] Team approval received
- [ ] Backup of current production (if updating existing deployment)

---

## 🚀 Deployment Steps

### Step 1: Deploy Convex Backend (Production)

**Estimated Time:** 5-10 minutes

```bash
# Navigate to extension directory
cd C:\Users\Admin\Desktop\supernotebooklm\supernotebooklm-monorepo\apps\chrome-extension

# Deploy to production
npx convex deploy --prod

# You'll get output like:
# ✅ Deployed to production: https://cheery-salmon-841.convex.cloud
```

**Copy the production URL** - you'll need it for the next steps.

**Set Production Environment Variables:**
```bash
# Set site URL (your website production URL)
npx convex env set --prod SITE_URL https://your-website.vercel.app

# Set Google OAuth credentials (if different from dev)
npx convex env set --prod GOOGLE_CLIENT_ID your_production_client_id
npx convex env set --prod GOOGLE_CLIENT_SECRET your_production_client_secret
```

**Verify Deployment:**
1. Go to: https://dashboard.convex.dev/t/ts2gamer22/cheery-salmon-841
2. Switch to "Production" deployment (top left dropdown)
3. Check "Data" → Tables should be empty initially
4. Check "Functions" → All functions should be deployed

---

### Step 2: Update Environment Variables

#### Extension Production Environment

Create: `apps/chrome-extension/.env.production`

```env
# Convex Production URLs
VITE_CONVEX_URL=https://cheery-salmon-841.convex.cloud
VITE_CONVEX_SITE_URL=https://cheery-salmon-841.convex.site

# Website URL (after Step 3)
NEXT_PUBLIC_SITE_URL=https://your-website.vercel.app
```

#### Website Production Environment

Create: `apps/web/.env.production`

```env
# Convex Production URL
NEXT_PUBLIC_CONVEX_URL=https://cheery-salmon-841.convex.cloud

# Website URL
NEXT_PUBLIC_SITE_URL=https://your-website.vercel.app

# Google OAuth (same as Convex env vars)
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
```

---

### Step 3: Deploy Website to Vercel

**Estimated Time:** 10-15 minutes

#### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Navigate to website directory
cd C:\Users\Admin\Desktop\supernotebooklm\supernotebooklm-monorepo\apps\web

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts:
# - Set up and deploy: Yes
# - Scope: Your team/account
# - Link to existing project: No (first time) or Yes (updating)
# - Project name: supernotebooklm
# - Directory: ./ (current)
# - Override settings: No

# You'll get:
# ✅ Production: https://supernotebooklm-xyz.vercel.app
```

**Copy the production website URL** - Update it in:
1. Extension `.env.production` (`NEXT_PUBLIC_SITE_URL`)
2. Convex env vars: `npx convex env set --prod SITE_URL <url>`

#### Option B: Deploy via Vercel Dashboard

1. Go to: https://vercel.com/new
2. Import Git Repository
3. Select your GitHub repo (push monorepo to GitHub first)
4. Configure:
   - **Framework:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `pnpm build --filter=web`
   - **Install Command:** `pnpm install`
5. Add Environment Variables (from .env.production above)
6. Click **Deploy**

**After Deployment:**
- Copy production URL
- Update in extension `.env.production`
- Update in Convex: `npx convex env set --prod SITE_URL <url>`

---

### Step 4: Build Production Extension

**Estimated Time:** 5 minutes

```bash
# Navigate to monorepo root
cd C:\Users\Admin\Desktop\supernotebooklm\supernotebooklm-monorepo

# Ensure .env.production is set (Step 2)

# Build extension for production
pnpm build:extension

# Output will be in:
# apps/chrome-extension/.output/chrome-mv3
```

**Verify Build:**
- Check build completed without errors
- Total size should be ~17-20 MB
- All files present (manifest.json, background.js, etc.)

---

### Step 5: Test Production Build Locally

**Before submitting to Chrome Web Store, test the production build:**

1. **Load in Chrome:**
   ```
   chrome://extensions/
   → Enable Developer mode
   → Load unpacked
   → Select: apps/chrome-extension/.output/chrome-mv3
   ```

2. **Test Critical Flows:**
   - [ ] Extension loads without errors
   - [ ] Sign in with Google works
   - [ ] Create a test chat in AI Assistant
   - [ ] Check Convex **Production** dashboard → Chat appears
   - [ ] Open production website → Sign in → Chat syncs
   - [ ] All content scripts work (test at least 2 platforms)

3. **Check Logs:**
   - No console errors in extension
   - No errors in Convex production logs
   - Auth flow completes successfully

**If any issues:** Fix, rebuild, and re-test before proceeding.

---

### Step 6: Package Extension for Chrome Web Store

**Estimated Time:** 5 minutes

```bash
# Navigate to build output
cd C:\Users\Admin\Desktop\supernotebooklm\supernotebooklm-monorepo\apps\chrome-extension\.output\chrome-mv3

# Create zip file
# Option A: Use 7-Zip or WinRAR
# Right-click folder → Send to → Compressed (zipped) folder

# Option B: PowerShell
Compress-Archive -Path * -DestinationPath supernotebooklm-v0.1.0.zip

# Move zip to a safe location
Move-Item supernotebooklm-v0.1.0.zip C:\Users\Admin\Desktop\
```

**Verify Zip:**
- Size: ~17-20 MB
- Contains: manifest.json, background.js, chunks/, assets/, etc.
- No node_modules or .git directories

---

### Step 7: Submit to Chrome Web Store

**Estimated Time:** 30-60 minutes (initial setup + review time)

#### 7.1: Create Developer Account (First Time Only)

1. Go to: https://chrome.google.com/webstore/devconsole
2. Sign in with Google account
3. Pay $5 one-time developer fee
4. Accept developer agreement

#### 7.2: Upload Extension

1. Click **"New Item"** button
2. Upload `supernotebooklm-v0.1.0.zip`
3. Click **"Upload"**

Wait for upload and processing (~1 minute).

#### 7.3: Fill Store Listing

**Product details:**
- **Name:** SuperNotebookLM
- **Summary:** (130 characters max)
  ```
  AI-powered research companion that enhances NotebookLM with chat history, cross-platform sync, and content import from multiple sources
  ```
- **Description:** (detailed, see template below)
- **Category:** Productivity
- **Language:** English

**Privacy:**
- **Single purpose:** AI-powered research assistant and NotebookLM companion
- **Host permissions:** Explain each domain (notebooklm.google.com for auto-capture, chat.openai.com for imports, etc.)
- **Data usage:** 
  - Chats stored locally and synced to Convex
  - Google OAuth for authentication
  - No data sold to third parties
- **Privacy policy URL:** Your website URL + /privacy (create this page)

**Assets Required:**
- **Icon:** 128x128 (already in extension)
- **Small tile:** 440x280 promotional image
- **Screenshots:** 1280x800 or 640x400
  - Minimum 1, recommended 5
  - Show: AI Assistant, History tab, Settings, Search, Sync indicator
- **Promotional images (optional):**
  - Marquee: 1400x560
  - Large tile: 920x680

**Detailed Description Template:**
```
SuperNotebookLM is an AI-powered research companion that enhances your NotebookLM experience with:

🤖 AI Assistant
- Built-in AI chat powered by Chrome's Gemini Nano
- Instant answers without leaving your workflow
- Markdown formatting and code syntax highlighting

📚 Chat History & Search
- Auto-save all NotebookLM Q&A interactions
- Full-text search across all conversations
- Organize with folders and tags

☁️ Cross-Platform Sync
- Sign in with Google to sync across devices
- Real-time synchronization via Convex
- Offline mode with automatic sync when online

🔗 Multi-Platform Import
- Import conversations from ChatGPT, Claude, Perplexity
- Add YouTube transcripts to your notebooks
- Capture Reddit threads
- One-click "Add to NotebookLM" buttons

🎯 Privacy-First
- Data stored securely in your own Convex workspace
- Google OAuth for authentication
- No data sold or shared with third parties
- Local-first with optional cloud sync

Perfect for:
- Students and researchers
- Content creators
- Knowledge workers
- Anyone using NotebookLM for research

Requirements:
- Chrome 130+ with Gemini Nano enabled
- Google account for cloud sync (optional)

Open source and transparent.
```

#### 7.4: Submit for Review

1. Review all information
2. Click **"Submit for Review"**
3. Wait for Chrome Web Store team review (typically 1-7 days)

**Review Status:**
- Pending review: Yellow badge
- In review: Blue badge  
- Published: Green badge
- Rejected: Red badge (review feedback, fix, resubmit)

---

### Step 8: Post-Deployment Monitoring

#### Monitor Convex Production

1. **Check Error Logs:**
   ```
   https://dashboard.convex.dev/t/ts2gamer22/cheery-salmon-841
   → Switch to Production
   → Logs tab → Filter by errors
   ```

2. **Monitor Usage:**
   - Number of users (check `users` table)
   - Number of chats created
   - Sync frequency
   - API latency

#### Monitor Website (Vercel)

1. **Vercel Dashboard:**
   ```
   https://vercel.com/your-account/supernotebooklm
   → Analytics
   → Check page views, errors
   ```

2. **Real User Monitoring:**
   - Page load times
   - Error rates
   - Geographic distribution

#### Monitor Extension

1. **Chrome Web Store Dashboard:**
   ```
   https://chrome.google.com/webstore/devconsole
   → SuperNotebookLM
   → Statistics
   ```

2. **Metrics to Track:**
   - Daily active users (DAU)
   - Weekly installs/uninstalls
   - Average rating
   - User reviews

3. **User Feedback:**
   - Read reviews regularly
   - Respond to questions
   - Track common issues
   - Plan updates based on feedback

---

## 🔄 Updating After Initial Deployment

### For Extension Updates:

1. **Update version in manifest:**
   ```json
   // wxt.config.ts
   manifest: {
     version: "0.1.1" // Increment
   }
   ```

2. **Build new version:**
   ```bash
   cd apps/chrome-extension
   pnpm build
   ```

3. **Package and upload:**
   - Zip new build
   - Upload to Chrome Web Store Developer Dashboard
   - Submit for review

4. **Users auto-update:**
   - Chrome auto-updates extensions within ~few hours
   - Users can manually update: chrome://extensions/ → Update

### For Website Updates:

```bash
# Simply push to main branch (if connected to Vercel)
git push origin main

# Or manually deploy
cd apps/web
vercel --prod
```

### For Convex Backend Updates:

```bash
cd apps/chrome-extension
npx convex deploy --prod
# Changes deploy immediately to production
```

---

## 🚨 Rollback Procedure

### If Issues Found in Production:

#### Extension Rollback:
1. Go to Chrome Web Store Developer Dashboard
2. Deactivate current version (temporarily remove from store)
3. Upload previous working version
4. Communicate to users about the issue

#### Website Rollback (Vercel):
1. Go to Vercel dashboard
2. Deployments tab
3. Find previous working deployment
4. Click "..." → "Promote to Production"

#### Convex Rollback:
1. Go to Convex dashboard
2. Deployments tab
3. Find previous working deployment
4. Click "Restore"

---

## 📊 Success Metrics

### Day 1-7 (Launch Week):
- [ ] 0 critical bugs reported
- [ ] Extension loads successfully for 95%+ users
- [ ] Authentication works without issues
- [ ] Sync works reliably
- [ ] Positive user reviews (>4 stars average)

### Week 2-4:
- [ ] Growing user base
- [ ] Low error rate (< 1% of requests)
- [ ] Good performance metrics (load times < 2s)
- [ ] Active user engagement (DAU/MAU ratio > 0.3)

### Month 2+:
- [ ] Stable user retention
- [ ] Feature requests prioritized
- [ ] Regular updates based on feedback
- [ ] Community building (Discord, docs site, etc.)

---

## 🆘 Troubleshooting

### Common Issues:

#### "Extension failed review"
- Read rejection reason carefully
- Common issues: Privacy policy, permissions, manifest errors
- Fix, resubmit with explanation of changes

#### "Users can't authenticate"
- Check Google OAuth credentials are correct
- Verify redirect URLs match
- Check Convex env vars are set correctly
- Test in incognito mode

#### "Sync not working"
- Check Convex production deployment is running
- Verify environment variables are correct
- Check Convex logs for errors
- Test locally with production env vars

#### "Website not loading"
- Check Vercel deployment status
- Verify environment variables in Vercel
- Check build logs for errors
- Test locally with `pnpm dev:web`

---

## 📞 Support Contacts

### Services:

- **Convex Support:** https://discord.gg/convex
- **Vercel Support:** https://vercel.com/support
- **Chrome Web Store:** https://support.google.com/chrome_webstore

### Project Resources:

- **Documentation:** All .md files in repo
- **Convex Dashboard:** https://dashboard.convex.dev
- **Vercel Dashboard:** https://vercel.com
- **Chrome Web Store Dashboard:** https://chrome.google.com/webstore/devconsole

---

## ✅ Deployment Checklist Summary

```
□ Pre-Deployment
  □ All tests pass
  □ No critical bugs
  □ Performance acceptable
  □ Team approval

□ Step 1: Deploy Convex Backend
  □ npx convex deploy --prod
  □ Set production env vars
  □ Verify in dashboard

□ Step 2: Update Environment Variables
  □ Create .env.production files
  □ Set all required variables
  □ Double-check URLs

□ Step 3: Deploy Website
  □ Deploy to Vercel
  □ Verify website loads
  □ Test sign-in flow

□ Step 4: Build Production Extension
  □ pnpm build:extension
  □ Verify build success
  □ Check file sizes

□ Step 5: Test Production Build
  □ Load in Chrome
  □ Test all critical flows
  □ Check production data

□ Step 6: Package Extension
  □ Zip build output
  □ Verify zip contents
  □ Save to safe location

□ Step 7: Submit to Chrome Web Store
  □ Create developer account
  □ Upload extension
  □ Fill store listing
  □ Submit for review

□ Step 8: Monitor Production
  □ Check Convex logs
  □ Monitor Vercel analytics
  □ Track user metrics
  □ Respond to feedback
```

---

**End of Deployment Guide**

**Version:** 1.0  
**Last Updated:** 2025-11-01  
**Status:** Ready for production when approved
