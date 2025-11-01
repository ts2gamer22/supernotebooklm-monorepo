import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/src/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL, {
  // Optionally pause queries until authenticated
  // expectAuth: true,
});

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
