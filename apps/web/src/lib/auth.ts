/**
 * BetterAuth Client Configuration for Next.js Website
 * 
 * This provides authentication functionality using BetterAuth
 * integrated with our Convex backend.
 * 
 * IMPORTANT: Points directly to Convex site where BetterAuth is hosted.
 */

import { createAuthClient } from "better-auth/react";

// Convex site URL is where BetterAuth is actually running
const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '.convex.site') || 
                        'https://cheery-salmon-841.convex.site';

// Create auth client pointing to Convex backend
export const authClient = createAuthClient({
  baseURL: CONVEX_SITE_URL, // Auth happens on Convex, not on this site
  fetchOptions: {
    credentials: 'include', // Include cookies for cross-origin
  },
});

// Export hooks and methods
export const { signIn, signOut, useSession } = authClient;

// Log initialization (only in development)
if (process.env.NODE_ENV === "development") {
  console.log("🔐 BetterAuth client initialized:", process.env.NEXT_PUBLIC_SITE_URL);
}
