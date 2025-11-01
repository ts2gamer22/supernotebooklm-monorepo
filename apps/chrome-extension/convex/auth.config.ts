/**
 * BetterAuth Multi-Client Configuration
 *
 * Supports authentication from multiple clients:
 * 1. Chrome Extension (existing)
 * 2. Next.js Website (new, in monorepo)
 *
 * Users can sign in from either platform and sessions sync across both.
 */

// Get environment variables
// SITE_URL is the Convex site URL (set in Convex env)
const convexSiteUrl = process.env.SITE_URL!;

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  providers: [
    {
      // Primary domain - Convex site URL
      // This matches the baseURL in both extension and website auth clients
      domain: convexSiteUrl,
      applicationID: "convex",
    },
  ],
};
