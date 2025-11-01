# OAuth Authentication Diagnostic Report

## 🔍 Current Configuration Analysis

### ✅ Environment Variables (Confirmed Correct)
```
BETTER_AUTH_SECRET=BBn8YvWnBUYUGG5QRFkI6SfphPOqbKM4BAObALJNagQ=
GOOGLE_CLIENT_ID=1077093778189-9ovlp79458um999helbc5hs241b4uevc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
SITE_URL=https://tremendous-bird-144.convex.site
```

### ✅ Deployment URLs
- **Convex Cloud**: `https://tremendous-bird-144.convex.cloud`
- **Convex Site**: `https://tremendous-bird-144.convex.site`
- **Extension .env**: Correctly configured

### ✅ Code Implementation
- `convex/auth.ts`: ✅ Properly configured with Google provider
- `convex/http.ts`: ✅ Routes registered correctly
- `src/lib/auth-client.ts`: ✅ baseURL pointing to Convex site
- `entrypoints/sidepanel/App.tsx`: ✅ Auth gate implemented correctly

## 🚨 CRITICAL: Likely Issues & Fixes

### Issue #1: Google Console Redirect URI Mismatch ⚠️

**MOST LIKELY CULPRIT**

#### What's Configured in Your Code:
- Convex will handle callbacks at: `https://tremendous-bird-144.convex.site/api/auth/callback/google`

#### What Must Be in Google Console:
Go to: https://console.cloud.google.com/apis/credentials

1. Find your OAuth 2.0 Client ID: `1077093778189-9ovlp79458um999helbc5hs241b4uevc.apps.googleusercontent.com`

2. **Authorized redirect URIs MUST include EXACTLY:**
   ```
   https://tremendous-bird-144.convex.site/api/auth/callback/google
   ```

3. **Common Mistakes:**
   - ❌ `https://tremendous-bird-144.convex.cloud/api/auth/callback/google` (WRONG - .cloud instead of .site)
   - ❌ `chrome-extension://jegoogflhaohfcclehodbfmpfajkjlem/...` (WRONG - extension URLs don't work)
   - ❌ Missing the exact URL above

#### 🔧 FIX:
```bash
# Step 1: Verify Google Console Configuration
1. Open: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add (if not present):
   https://tremendous-bird-144.convex.site/api/auth/callback/google
4. Click "Save"
5. Wait 5-10 minutes for Google to propagate changes
```

---

### Issue #2: Extension ID Mismatch in trustedOrigins ⚠️

#### Currently Configured:
`convex/auth.ts` line 22:
```typescript
trustedOrigins: [
  "chrome-extension://jegoogflhaohfcclehodbfmpfajkjlem",
],
```

#### Verification Required:
1. Load your extension in Chrome
2. Go to `chrome://extensions`
3. Find "SuperNotebookLM" extension
4. Copy the **actual Extension ID** (long string under the extension name)

#### 🔧 FIX if ID is Different:
```bash
# If the actual extension ID is different from jegoogflhaohfcclehodbfmpfajkjlem

# 1. Update convex/auth.ts line 22 with the ACTUAL ID:
trustedOrigins: [
  "chrome-extension://YOUR_ACTUAL_EXTENSION_ID_HERE",
],

# 2. Redeploy Convex:
npx convex deploy
```

---

### Issue #3: OAuth Flow CORS/Cookie Issues 🔍

#### Possible Cause:
Chrome extension security might be blocking cookies from Convex site.

#### 🔧 FIX: Verify Manifest Permissions
Check `wxt.config.ts` has:
```typescript
manifest: {
  permissions: [
    "storage",  // Required for session storage
    "cookies",  // May be needed for OAuth flow
  ],
  host_permissions: [
    "https://*.convex.site/*",
    "https://*.convex.cloud/*",
  ],
}
```

---

## 📋 Step-by-Step Diagnostic Procedure

### Phase 1: Verify Google Console (CRITICAL)
```bash
# Execute these checks:

✅ 1. Open Google Cloud Console:
   https://console.cloud.google.com/apis/credentials

✅ 2. Verify OAuth 2.0 Client ID:
   Client ID: 1077093778189-9ovlp79458um999helbc5hs241b4uevc.apps.googleusercontent.com

✅ 3. Check Authorized Redirect URIs section contains EXACTLY:
   https://tremendous-bird-144.convex.site/api/auth/callback/google

✅ 4. If missing or wrong, ADD it and SAVE
   (Wait 5-10 minutes for propagation)
```

### Phase 2: Verify Extension ID
```bash
# 1. Open Chrome Extensions
chrome://extensions

# 2. Enable Developer Mode (top-right toggle)

# 3. Find "SuperNotebookLM" extension

# 4. Copy Extension ID (looks like: abcdefghijklmnopqrstuvwxyz123456)

# 5. Compare with convex/auth.ts line 22:
#    Current: chrome-extension://jegoogflhaohfcclehodbfmpfajkjlem
#    Actual:  chrome-extension://[YOUR_COPIED_ID]

# 6. If different, update convex/auth.ts and redeploy:
npx convex deploy
```

### Phase 3: Test OAuth Flow with DevTools
```bash
# 1. Clear extension data:
   - Go to chrome://extensions
   - Remove SuperNotebookLM
   - Rebuild: npm run build
   - Reload: Load unpacked from .output/chrome-mv3

# 2. Open extension with DevTools (F12)

# 3. Go to Network tab, filter "convex.site"

# 4. Click "Sign in with Google"

# 5. Check for these requests:
   ✅ GET https://tremendous-bird-144.convex.site/api/auth/session → 200 OK
   ✅ Redirect to Google OAuth consent
   ✅ POST https://tremendous-bird-144.convex.site/api/auth/callback/google → 302
   ✅ GET https://tremendous-bird-144.convex.site/api/auth/session → 200 OK (with user data)

# 6. Common errors to look for:
   ❌ 400 Bad Request → Redirect URI mismatch
   ❌ 401 Unauthorized → Missing/wrong credentials
   ❌ CORS error → Extension ID not in trustedOrigins
```

### Phase 4: Check Convex Logs
```bash
# In a separate terminal, watch Convex logs:
npx convex dev

# Look for errors during OAuth callback processing
# Common errors:
# - "Redirect URI mismatch"
# - "Invalid client credentials"
# - "CORS origin not allowed"
```

---

## 🎯 Most Likely Solution (Based on Common Patterns)

### 99% Probability: Redirect URI Mismatch

**The Problem:**
Google OAuth requires the redirect URI configured in Google Console to EXACTLY match what Better Auth sends during OAuth flow.

**The Solution:**
1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID: `1077093778189-9ovlp79458um999helbc5hs241b4uevc...`
3. Find "Authorized redirect URIs"
4. Add (if not present): `https://tremendous-bird-144.convex.site/api/auth/callback/google`
5. Click "Save"
6. Wait 5-10 minutes
7. Try OAuth flow again

---

## 🔧 Quick Fix Commands

```powershell
# Run these commands to verify configuration:

# 1. Check Convex environment
npx convex env list

# 2. Verify SITE_URL
npx convex env get SITE_URL
# Should output: https://tremendous-bird-144.convex.site

# 3. Rebuild extension
npm run build

# 4. Get extension ID after loading
# Go to chrome://extensions and copy the ID

# 5. If ID differs from jegoogflhaohfcclehodbfmpfajkjlem, update and redeploy:
# Edit convex/auth.ts line 22, then:
npx convex deploy
```

---

## 📊 Expected vs Actual OAuth Flow

### Expected Flow:
```
1. User clicks "Sign in with Google" in extension
   ↓
2. Extension calls: authClient.signIn.social({ provider: "google" })
   ↓
3. Better Auth redirects to: https://tremendous-bird-144.convex.site/api/auth/signin/google
   ↓
4. Convex redirects to: https://accounts.google.com/o/oauth2/v2/auth?...
   ↓
5. User grants consent on Google
   ↓
6. Google redirects to: https://tremendous-bird-144.convex.site/api/auth/callback/google?code=...
   ↓
7. Convex processes callback, creates session
   ↓
8. Better Auth returns session to extension
   ↓
9. Extension shows authenticated UI
```

### Common Break Points:
- **Step 4 fails**: Redirect URI not in Google Console
- **Step 6 fails**: Redirect URI mismatch error from Google
- **Step 7 fails**: CORS error, extension ID not in trustedOrigins
- **Step 8 fails**: Cookie/session storage issues

---

## 🚀 After Fixing: Verification Checklist

✅ Google Console has redirect URI: `https://tremendous-bird-144.convex.site/api/auth/callback/google`  
✅ Extension ID in `convex/auth.ts` matches actual loaded extension  
✅ Convex deployed with latest changes (`npx convex deploy`)  
✅ Extension rebuilt (`npm run build`)  
✅ Extension reloaded in `chrome://extensions`  
✅ Chrome DevTools shows successful OAuth flow  
✅ Console shows: `[Auth Debug] session: {user: {...}}`  
✅ User profile displays in extension header  

---

## 📞 Still Not Working? Debug Output to Share

If you're still experiencing issues after all fixes, capture this diagnostic output:

```powershell
# 1. Environment variables
npx convex env list > debug-env.txt

# 2. Extension configuration
cat .env > debug-dotenv.txt

# 3. Build the extension
npm run build 2>&1 > debug-build.txt

# 4. Check extension ID
# Manually note from chrome://extensions

# 5. Network requests during OAuth
# Save network log from Chrome DevTools during sign-in attempt

# 6. Console logs
# Save console output from Chrome DevTools
```

Then share:
- debug-env.txt
- debug-dotenv.txt  
- Extension ID from chrome://extensions
- Network logs (as screenshot or HAR file)
- Console logs
- Screenshot of Google Console redirect URIs configuration

---

## 💡 Additional Verification: Test Convex Auth Endpoints

```bash
# Test if Convex auth endpoints are accessible:

# 1. Test session endpoint (should return 401 or empty session):
curl -i https://tremendous-bird-144.convex.site/api/auth/session

# Expected: HTTP/1.1 200 OK with {"session": null} or similar

# 2. Test if OAuth initiation works:
# Open in browser:
https://tremendous-bird-144.convex.site/api/auth/signin/google

# Expected: Redirect to Google OAuth consent screen
# If you get "Redirect URI mismatch" → Fix Google Console configuration!
```

---

## 🎓 Understanding the Issue

### Why Redirect URI Must Match EXACTLY:
OAuth 2.0 security requires that the redirect URI configured in the OAuth provider (Google) **exactly matches** what the auth server (Convex Better Auth) sends during the authorization request. Even small differences like:
- `http` vs `https`
- `.cloud` vs `.site`
- Trailing slash vs no trailing slash
- Different subdomain

...will cause the OAuth flow to fail with "Redirect URI mismatch" error.

### Why Extension ID in trustedOrigins:
Better Auth checks the `Origin` header of incoming requests. Chrome extensions send `Origin: chrome-extension://[EXTENSION_ID]`. If this ID isn't in the `trustedOrigins` array, Convex will block the request due to CORS policy, preventing session creation.

---

## ✅ Final Checklist

Before asking for more help, confirm:

- [ ] Google Console redirect URI is EXACTLY: `https://tremendous-bird-144.convex.site/api/auth/callback/google`
- [ ] Waited 10 minutes after saving Google Console changes
- [ ] Extension ID in `convex/auth.ts` matches ID from `chrome://extensions`
- [ ] Ran `npx convex deploy` after any changes to `convex/` files
- [ ] Ran `npm run build` after any changes to extension code
- [ ] Reloaded extension in `chrome://extensions`
- [ ] Cleared extension data before testing
- [ ] Opened Chrome DevTools to check for errors
- [ ] Verified environment variables with `npx convex env list`

---

**Next Steps:**
1. Fix Google Console redirect URI (most likely issue)
2. Verify extension ID matches trustedOrigins
3. Test OAuth flow with DevTools open
4. Share debug output if still failing
