/**
 * Better Auth API Route Handler for Next.js
 * 
 * This handles auth directly without proxying to maintain proper cookie handling.
 * BetterAuth runs on Convex backend, accessed via the auth client.
 */

import { auth } from "@/lib/better-auth-server";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
