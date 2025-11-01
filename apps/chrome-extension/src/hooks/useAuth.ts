import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/src/lib/auth-client";

export const useAuth = () => {
  const { data: session, isPending, error } = authClient.useSession();
  const user = useQuery(api.auth.getCurrentUser);

  return {
    session,
    user,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    error,
    signIn: () => authClient.signIn.social({ provider: "google" }),
    signOut: () => authClient.signOut(),
  };
};
