/**
 * Convex Client Configuration for Next.js Website
 * 
 * This client connects the website to the shared Convex backend.
 * The backend is shared with the Chrome extension for unified data access.
 */

import { ConvexReactClient } from "convex/react";

// Validate environment variable
if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  console.warn(
    "⚠️ NEXT_PUBLIC_CONVEX_URL is not set. Convex features will not work.\n" +
    "Add this to .env.local:\n" +
    "NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud"
  );
}

// Create and export Convex client
export const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || ""
);

// Log connection status (only in development)
if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_CONVEX_URL) {
  console.log("🔌 Convex client initialized:", process.env.NEXT_PUBLIC_CONVEX_URL);
}
