# Auth Diagnostic Checklist

Use this checklist to verify your Better Auth + Google OAuth setup is correct.

## ✅ Pre-Flight Checklist

Run these commands and verify the output:

### 1. Check Convex Environment Variables

```bash
cd C:\Users\Admin\Desktop\supernotebooklm\supernotebooklm-extension
npx convex env list
```

**Expected output should include:**
- ✅ `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID (ends with `.apps.googleusercontent.com`)
- ✅ `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret (starts with `GOCSPX-`)
- ✅ `BETTER_AUTH_SECRET` - Auto-generated secret (long random string)
- ✅ `SITE_URL` - `https://cheery-salmon-841.convex.site`

**If any are missing, set them:**
```bash
npx convex env set GOOGLE_CLIENT_ID "YOUR_CLIENT_ID"
npx convex env set GOOGLE_CLIENT_SECRET "YOUR_CLIENT_SECRET"
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
npx convex env set SITE_URL "https://cheery-salmon-841.convex.site"
```

### 2. Verify Extension Environment Variables

Check `.env` file in the extension root:

```bash
type .env
```

**Expected output:**
```bash
VITE_CONVEX_URL=https://cheery-salmon-841.convex.cloud
VITE_CONVEX_SITE_URL=https://cheery-salmon-841.convex.site
```

### 3. Check Google Cloud Console Configuration

Open: https://console.cloud.google.com/apis/credentials

Verify your OAuth 2.0 Client:
- ✅ Type: **Web application**
- ✅ Authorized redirect URIs includes:
  ```
  https://cheery-salmon-841.convex.site/api/auth/callback/google
  ```

### 4. Verify Extension ID

1. Load extension in Chrome: `chrome://extensions`
2. Copy the Extension ID (long alphanumeric string under extension name)
3. Open `convex/auth.ts` and verify it matches the trustedOrigins:

```typescript
trustedOrigins: [
  "chrome-extension://YOUR_EXTENSION_ID_HERE",
],
```

**Current configured ID:** `jegoogflhaohfcclehodbfmpfajkjlem`

If different, update `convex/auth.ts` and redeploy:
```bash
npx convex deploy
```

### 5. Check Convex Deployment Status

```bash
npx convex logs --tail
```

Look for any errors related to Better Auth or OAuth.

## 🧪 Testing Sequence

Follow this exact sequence to test:

### Step 1: Clean Slate
```bash
# Remove extension completely
# Go to chrome://extensions and remove SuperNotebookLM

# Rebuild extension
npm run build

# Clear Convex verification table (optional but recommended)
# Go to Convex dashboard → Data → verification table → Delete all entries
```

### Step 2: Reload Extension
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select: `C:\Users\Admin\Desktop\supernotebooklm\supernotebooklm-extension\.output\chrome-mv3`
5. Note the new Extension ID (if changed, update `convex/auth.ts`)

### Step 3: Open Extension with DevTools
1. Click extension icon OR open sidepanel
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. Look for debug logs starting with `[Auth Debug]`

### Step 4: Analyze Initial State

**Expected console output when NOT logged in:**
```
[Auth Debug] isPending: true
[Auth Debug] isPending: false
[Auth Debug] session: null
[Auth Debug] error: null
[Auth Debug] No user session, showing sign-in screen
```

**You should see:**
- Welcome screen with "SuperNotebookLM" title
- Feature descriptions
- "Sign in with Google" button

**If you see the sidebar tabs instead:**
- Old cached session is stuck
- Clear extension data and reload

### Step 5: Monitor Network During Sign-In

1. Open DevTools → Network tab
2. Click "Sign in with Google"
3. Complete OAuth flow

**Expected network requests:**
- ✅ `GET https://cheery-salmon-841.convex.site/api/auth/session` → 200 OK
- ✅ `GET https://accounts.google.com/o/oauth2/v2/auth?...` → OAuth consent screen
- ✅ `POST https://cheery-salmon-841.convex.site/api/auth/callback/google` → 302 redirect
- ✅ `GET https://cheery-salmon-841.convex.site/api/auth/session` → 200 OK with user data

### Step 6: Verify Successful Login

**Expected console output after successful login:**
```
[Auth Debug] isPending: false
[Auth Debug] session: {user: {id: "...", email: "...", name: "...", image: "..."}}
[Auth Debug] error: null
```

**You should see:**
- Full sidebar with tabs (AI Assistant, History, etc.)
- Your profile picture in top-right header
- "Sign Out" button

### Step 7: Check Convex Database

Go to Convex dashboard: https://dashboard.convex.dev

**Expected tables:**
- ✅ `user` - Should have 1 entry with your Google account details
- ✅ `account` - Should have 1 entry linking user to Google provider
- ✅ `session` - Should have 1 active session
- ✅ `verification` - May be empty or have temporary entries

## 🐛 Common Issues & Quick Fixes

### Issue: "isPending: true" forever
**Fix:**
```bash
# Check Convex is running
npx convex dev

# Or if deployed, check logs
npx convex logs
```

### Issue: "session: null" after OAuth completes
**Possible causes:**
1. Missing Google credentials in Convex
2. Extension ID mismatch in trustedOrigins
3. Account linking not configured (should be fixed in latest deployment)

**Fix:**
```bash
# Verify env vars
npx convex env list

# Clear verification table in Convex dashboard
# Clear extension data
# Try sign-in again
```

### Issue: Network shows errors
**Check:**
- CORS errors → Extension ID mismatch
- 401/403 errors → Google credentials issue
- 500 errors → Check Convex logs for backend errors

### Issue: Popup blocked
**Fix:** Allow popups for the extension in Chrome settings

## 📊 Success Criteria

Auth is working correctly when:
- ✅ Welcome screen shows when not logged in
- ✅ Google sign-in popup opens without errors
- ✅ OAuth consent screen loads
- ✅ After consent, popup closes automatically
- ✅ Sidebar appears with user profile
- ✅ Console shows `session: {user: {...}}`
- ✅ Session persists after closing and reopening extension
- ✅ Convex `user` table has your account
- ✅ Sign out button works

## 🆘 Still Not Working?

If you've followed all steps and it's still not working:

1. **Capture full diagnostic output:**
   ```bash
   npx convex env list > convex-env.txt
   npx convex logs > convex-logs.txt
   ```

2. **Export browser console logs:**
   - Open DevTools → Console
   - Right-click → "Save as..."

3. **Check Convex dashboard:**
   - Screenshot the `user`, `account`, `session`, and `verification` tables

4. **Verify Google OAuth setup:**
   - Screenshot your OAuth client configuration in Google Cloud Console

Share these artifacts for further debugging.
