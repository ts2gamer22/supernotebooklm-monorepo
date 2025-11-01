import { httpAction } from "./_generated/server";
import { createAuth, authComponent } from "./auth";

// Debug route to test Better Auth initialization
export const debugAuth = httpAction(async (ctx) => {
  try {
    // Try to create auth instance
    const auth = createAuth(ctx);
    
    // Get the auth API
    const routes = Object.keys(auth.api || {});
    
    return new Response(
      JSON.stringify({
        status: "OK",
        message: "Better Auth initialized successfully",
        availableRoutes: routes.slice(0, 10), // First 10 routes
        baseURL: process.env.SITE_URL,
        hasGoogleProvider: !!process.env.GOOGLE_CLIENT_ID,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "ERROR",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
