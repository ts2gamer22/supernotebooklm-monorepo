import { authClient } from "@/src/lib/auth-client";
import { SignInButton } from "./SignInButton";

export function UserProfile() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-nb-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return <SignInButton />;
  }

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  return (
    <div className="flex items-center space-x-3 p-4 bg-nb-dark-200 rounded-lg">
      {session.user.image && (
        <img
          src={session.user.image}
          alt={session.user.name || "User"}
          className="w-10 h-10 rounded-full"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">
          {session.user.name || "User"}
        </p>
        <p className="text-nb-gray-400 text-sm truncate">
          {session.user.email}
        </p>
      </div>
      <button
        onClick={handleSignOut}
        className="px-3 py-1.5 text-sm bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-gray-300 rounded transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
