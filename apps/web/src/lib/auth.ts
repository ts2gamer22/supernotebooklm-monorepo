/**
 * BetterAuth Client Configuration for Next.js Website
 * 
 * This provides authentication functionality using BetterAuth
 * integrated with our Convex backend.
 * 
 * Multi-client setup: This website shares auth with the Chrome extension.
 */

import { createAuthClient } from "better-auth/react";

// Validate environment variable
if (!process.env.NEXT_PUBLIC_SITE_URL) {
  console.warn(
    "⚠️ NEXT_PUBLIC_SITE_URL is not set.\n" +
    "Add this to .env.local:\n" +
    "NEXT_PUBLIC_SITE_URL=http://localhost:3000"
  );
}

// Create auth client
// baseURL should point to where the API routes are hosted (this site)
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000"),
  // Fetch function that goes through our API proxy
  fetchOptions: {
    credentials: 'include', // Important for cookies
  },
});

// Export hooks and methods
export const { signIn, signOut, useSession } = authClient;

// Log initialization (only in development)
if (process.env.NODE_ENV === "development") {
  console.log("🔐 BetterAuth client initialized:", process.env.NEXT_PUBLIC_SITE_URL);
}
