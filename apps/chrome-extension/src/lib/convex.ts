/**
 * Convex Client for Extension Services
 * 
 * This exports the Convex client for use in services (SyncService, ChatService, etc.)
 * Separate from the React provider to allow non-React code to use Convex.
 */

import { ConvexReactClient } from "convex/react";

// Validate environment variable
const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.error('[Convex] VITE_CONVEX_URL not set in .env.local');
  throw new Error('VITE_CONVEX_URL environment variable is required');
}

// Create Convex client instance
export const convex = new ConvexReactClient(convexUrl);

console.log('[Convex] Client initialized:', convexUrl);
