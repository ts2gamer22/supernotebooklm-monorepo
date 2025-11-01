# Debug Auth Mutation Issue

**Issue:** Mutations still failing with "Unauthenticated" error

## Steps to Debug

###1. Reload Extension
```
chrome://extensions/ → SuperNotebookLM → Reload
```

### 2. Try Creating a Chat
- Open AI Assistant
- Ask: "test"
- Wait for response

### 3. Check Convex Logs
Go to: https://dashboard.convex.dev/t/ts2gamer22/cheery-salmon-841/logs

Look for:
```
[requireAuth] Failed - BetterAuth user: ...
[requireAuth] Convex identity: ...
```

### 4. Expected Scenarios

**Scenario A: Both null**
```
[requireAuth] BetterAuth user: null
[requireAuth] Convex identity: null
```
**Problem:** No auth token being sent
**Fix:** Check ConvexBetterAuthProvider setup

**Scenario B: Convex identity exists, BetterAuth user null**
```
[requireAuth] BetterAuth user: null
[requireAuth] Convex identity: { subject: "...", ... }
```
**Problem:** BetterAuth component can't match Convex identity to user
**Fix:** Check auth.config.ts domain/applicationID

**Scenario C: Query works but mutation doesn't**
**Problem:** Different auth handling for mutations vs queries
**Fix:** Use different auth approach for mutations

## Possible Fixes

### Fix 1: Check if auth token is being sent
```typescript
// In chats.ts, add at top of create mutation:
handler: async (ctx, args) => {
  console.log('[create mutation] ctx.auth:', ctx.auth);
  console.log('[create mutation] getUserIdentity:', await ctx.auth.getUserIdentity());
  // rest of code...
}
```

### Fix 2: Use Convex native auth instead
```typescript
async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Unauthenticated');
  }
  
  // Return a minimal user object with just the ID
  return {
    _id: identity.subject,
    id: identity.subject,
    email: identity.email || 'unknown',
  };
}
```

### Fix 3: Check ConvexBetterAuthProvider is passing auth
```typescript
// In main.tsx, log when provider mounts:
useEffect(() => {
  console.log('[ConvexBetterAuthProvider] Mounted');
  console.log('[Auth Client] Session:', authClient.useSession());
}, []);
```

## Next Steps

1. Reload extension
2. Try creating chat
3. Check what logs appear in Convex dashboard
4. Report back what you see in the logs
