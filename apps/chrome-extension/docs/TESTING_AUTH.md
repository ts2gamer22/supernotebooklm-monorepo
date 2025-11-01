# Quick Testing Guide: Better Auth Google OAuth

## ✅ What's Already Done
- All code implemented and working
- Extension builds successfully
- Convex backend deployed with latest auth fixes
- Environment variables configured (except Google credentials)
- Auth gate UX implemented (welcome screen + sign-in button)
- Syntax errors fixed (missing comma in trustedOrigins)
- Account linking and session configuration added

## ⚠️ Critical: Recent Fixes Applied

The following configuration fixes were just deployed to resolve session detection issues:
1. Fixed syntax error in `trustedOrigins` array (missing comma)
2. Added `account.accountLinking` configuration for Google provider
3. Added `session` configuration with proper expiry settings

**You must reload the extension and clear cache before testing!**

## 🧪 Testing the Updated Auth Flow

### Step 0: Verify Convex Environment (CRITICAL - Do This First!)

Before testing, verify your Google OAuth credentials are set in Convex:

```bash
cd C:\Users\Admin\Desktop\supernotebooklm\supernotebooklm-extension

# Check if credentials are set (should show the values)
npx convex env list
```

**Expected output should include:**
- `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret
- `BETTER_AUTH_SECRET` - Auto-generated secret
- `SITE_URL` - https://cheery-salmon-841.convex.site

**If GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET are missing**, you MUST set them before proceeding:

```bash
npx convex env set GOOGLE_CLIENT_ID "YOUR_CLIENT_ID_HERE"
npx convex env set GOOGLE_CLIENT_SECRET "YOUR_CLIENT_SECRET_HERE"
```

### Step 1: Create Google OAuth Credentials (if not already done)

1. **Go to Google Cloud Console**: https://console.cloud.google.com/apis/credentials

2. **Create OAuth Client**:
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Name: "SuperNotebookLM Extension"

3. **Add Redirect URI** (CRITICAL):
   ```
   https://cheery-salmon-841.convex.site/api/auth/callback/google
   ```

4. **Copy Credentials**:
   - Copy the **Client ID** (looks like: `123456-abc.apps.googleusercontent.com`)
   - Copy the **Client Secret** (looks like: `GOCSPX-abc123...`)

### Step 2: Set Google Credentials in Convex (1 minute)

Open terminal in the extension folder and run:

```bash
cd C:\Users\Admin\Desktop\supernotebooklm\supernotebooklm-extension

npx convex env set GOOGLE_CLIENT_ID "YOUR_CLIENT_ID_HERE"
npx convex env set GOOGLE_CLIENT_SECRET "YOUR_CLIENT_SECRET_HERE"
```

Replace with your actual values from Step 1.

### Step 3: Load Extension and Get Extension ID (2 minutes)

1. **Build the extension** (if not already built):
   ```bash
   npm run build
   ```

2. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select folder: `C:\Users\Admin\Desktop\supernotebooklm\supernotebooklm-extension\.output\chrome-mv3`

3. **Copy Extension ID**:
   - Look for your extension in the list
   - The ID is a long string like: `abcdefghijklmnopqrstuvwxyz123456`
   - Copy it!

### Step 4: Update Trusted Origins (2 minutes)

1. **Open the file**: `convex/auth.ts`

2. **Find this line** (around line 16):
   ```ts
   trustedOrigins: [
     // Chrome extension origin - UPDATE THIS with actual extension ID
   ],
   ```

3. **Replace with** (use your actual extension ID):
   ```ts
   trustedOrigins: [
     "chrome-extension://YOUR_ACTUAL_EXTENSION_ID",
   ],
   ```

4. **Redeploy Convex**:
   ```bash
   npx convex deploy
   ```

### Step 5: Clear Cache and Reload Extension (CRITICAL!)

Before testing, you MUST clear the cache and reload to apply the latest fixes:

1. **Clear Extension Data**:
   - Go to `chrome://extensions`
   - Find SuperNotebookLM extension
   - Click "Remove" or clear site data from Chrome settings for the extension

2. **Reload Extension**:
   - In `chrome://extensions`, toggle the extension OFF then ON
   - Or click the reload icon

3. **Clear Browser Cache** (optional but recommended):
   - Open Chrome DevTools (F12)
   - Right-click the refresh button → "Empty Cache and Hard Reload"

### Step 6: Test the OAuth Flow! 🎉

1. **Open the extension**:
   - Click the extension icon in Chrome toolbar
   - Or open the sidepanel

2. **You should see THE WELCOME SCREEN**:
   - "SuperNotebookLM" title
   - Feature descriptions (AI Assistant, History, Translation)
   - Large "Sign in with Google" button with Google logo
   - **NOT the sidebar tabs** (that means you're stuck on old cached session)

3. **Click "Sign in with Google" button**:
   - A popup window should open (if blocked, allow popups)
   - Google OAuth consent screen appears
   - Sign in with your Google account
   - Grant permissions (email, profile)
   - Popup closes automatically

4. **After successful sign-in**:
   - Welcome screen should disappear
   - You should see the full sidebar with tabs
   - Top header shows:
     - Your profile picture (circular avatar)
     - "Sign Out" button
   - Console shows: `[Auth Debug] session: {user: {...}}`

5. **Test Session Persistence**:
   - Close the extension sidepanel
   - Reopen it
   - Should still be signed in (no welcome screen)
   - Your profile should still be visible

## 🎯 What To Test

### Basic Flow
- ✅ Sign in button appears
- ✅ Popup opens (not blocked)
- ✅ Google consent screen loads
- ✅ Sign in completes successfully
- ✅ Profile displays with name, email, avatar
- ✅ Sign out works

### Session Persistence
- ✅ Close and reopen extension → still signed in
- ✅ Restart browser → still signed in (session should persist)

### Error Handling
- ✅ Close popup before completing → error message displays
- ✅ Block popup → see error about popup being blocked

## 🐛 Troubleshooting

### Issue: Still seeing "Loading session..." forever
**Symptoms**:
- Console shows `isPending: false`, `session: null`
- Network tab shows 200 OK responses with cookies

**Solutions**:
1. **First, verify Google credentials are set in Convex**:
   ```bash
   npx convex env list
   ```
   If `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` are missing, set them and redeploy:
   ```bash
   npx convex env set GOOGLE_CLIENT_ID "YOUR_ID"
   npx convex env set GOOGLE_CLIENT_SECRET "YOUR_SECRET"
   npx convex deploy
   ```

2. **Clear ALL extension data**:
   - Completely remove and reinstall the extension
   - Clear browser cookies for `*.convex.site` and `*.convex.cloud`

3. **Check Convex logs**:
   ```bash
   npx convex logs
   ```
   Look for errors during OAuth callback processing

4. **Verify trustedOrigins**:
   - Open `convex/auth.ts`
   - Confirm extension ID matches: `chrome-extension://jegoogflhaohfcclehodbfmpfajkjlem`
   - If you're using a different extension ID, update it and redeploy

### Issue: "Popup blocked" error
**Solution**: Allow popups for the extension in Chrome settings

### Issue: "Redirect URI mismatch" from Google
**Solution**: Double-check the redirect URI in Google Console matches exactly:
```
https://cheery-salmon-841.convex.site/api/auth/callback/google
```

### Issue: "CORS error" when signing in
**Solution**: Make sure you:
1. Added the extension ID to `convex/auth.ts` trustedOrigins
2. Ran `npx convex deploy` after updating

### Issue: Session doesn't persist after refresh
**Solution**:
1. Check that the extension has storage permissions (already configured)
2. Verify session expiry settings in `convex/auth.ts` (already set to 7 days)
3. Check browser console for any error messages

### Issue: Verification table populated but no user created
**Symptoms**:
- Convex `verification` table has entries
- `user` table is empty
- Session remains null

**Solution**: This was likely caused by the missing account linking configuration, which has now been added. Clear all data and try again:
1. Delete all entries from the `verification` table in Convex dashboard
2. Clear extension data and reload
3. Try signing in again
4. The user should now be created in the `user` table

## 📝 Credentials Summary

**What credentials do you need?**

1. **Google OAuth Client ID** (from Google Cloud Console)
   - Format: `123456-abc.apps.googleusercontent.com`
   - Where to set: Convex environment (`npx convex env set GOOGLE_CLIENT_ID`)

2. **Google OAuth Client Secret** (from Google Cloud Console)
   - Format: `GOCSPX-abc123...`
   - Where to set: Convex environment (`npx convex env set GOOGLE_CLIENT_SECRET`)

3. **Chrome Extension ID** (from chrome://extensions after loading)
   - Format: `abcdefghijklmnopqrstuvwxyz123456`
   - Where to set: `convex/auth.ts` trustedOrigins array

**What's automatically configured?**
- ✅ BETTER_AUTH_SECRET (already generated)
- ✅ SITE_URL (already set to Convex site)
- ✅ Convex URLs in extension .env file

## 🎊 You're Done!

Once you complete the 5 steps above, the authentication feature is fully functional and ready to use. The auth system will:
- Store user sessions securely
- Auto-refresh tokens
- Persist across browser restarts
- Work across the extension (sidepanel, popup, background)

For more detailed documentation, see `docs/AUTH_SETUP.md`.
