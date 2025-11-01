/**
 * BetterAuth Multi-Client Configuration
 * 
 * This configuration allows both the Chrome extension and Next.js website
 * to authenticate with the same Convex backend.
 * 
 * Each client gets its own applicationID to track where users sign in from.
 */

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  providers: [
    {
      // Next.js Website
      domain: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      applicationID: "web",
    },
    {
      // Chrome Extension  
      // Extension origin will be like: chrome-extension://abcdefghijklmnop...
      domain: process.env.EXTENSION_ORIGIN || "http://localhost:3001",
      applicationID: "extension",
    },
  ],
};
