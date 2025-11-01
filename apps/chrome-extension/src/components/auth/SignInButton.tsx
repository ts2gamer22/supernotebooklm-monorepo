import { useState } from "react";
import { authClient } from "@/src/lib/auth-client";

export function SignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("[Sign In] Starting Google OAuth flow...");
      
      const baseURL = import.meta.env.VITE_CONVEX_SITE_URL;
      
      // Use Better Auth's signIn.social with disableRedirect to get the OAuth URL
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${baseURL}`, // Redirect back to Convex site root after auth
        disableRedirect: true, // Don't auto-redirect, we'll open in popup
      }) as { url?: string };
      
      console.log("[Sign In] OAuth response:", result);
      
      if (result && result.url) {
        // Open the OAuth URL in a popup window
        const popup = window.open(
          result.url,
          "google-oauth",
          "width=600,height=700,scrollbars=yes"
        );
        
        if (!popup) {
          throw new Error("Failed to open authentication popup. Please allow popups for this extension.");
        }
        
        console.log("[Sign In] Popup opened, waiting for completion...");
        
        // Poll for popup closure and session establishment
        const checkInterval = setInterval(async () => {
          if (popup.closed) {
            clearInterval(checkInterval);
            console.log("[Sign In] Popup closed");
            
            // Wait a bit for session to sync
            setTimeout(() => {
              setLoading(false);
              // The ConvexBetterAuthProvider will automatically pick up the new session
            }, 1500);
          }
        }, 500);
        
        // Timeout after 5 minutes
        setTimeout(() => {
          if (!popup.closed) {
            clearInterval(checkInterval);
            popup.close();
            setError("Authentication timed out");
            setLoading(false);
          }
        }, 300000);
      } else {
        throw new Error("Failed to get OAuth URL from server");
      }
      
    } catch (err) {
      console.error("[Sign In] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4">
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="w-full max-w-xs px-6 py-3 bg-nb-blue hover:bg-nb-blue-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign in with Google"}
      </button>
      {error && (
        <p className="text-red-400 text-sm text-center max-w-xs">{error}</p>
      )}
    </div>
  );
}
