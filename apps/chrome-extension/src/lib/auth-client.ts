import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  // Point to Convex site URL, NOT localhost
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL,
  plugins: [
    convexClient(),
    // NOTE: crossDomainClient removed - it expects chrome-extension:// redirects which are blocked
    // Extensions can share cookies with Convex, so crossDomain flow is not needed
  ],
});

// Export session hook for convenience
export const useSession = authClient.useSession;
