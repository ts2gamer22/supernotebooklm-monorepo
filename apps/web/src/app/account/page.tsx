"use client";

import NavigationHeader from "@/components/sections/navigation-header";
import Link from "next/link";
import Image from "next/image";
import { User, ChevronRight, Book, Settings, Edit2, Trash2, Plus, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@supernotebooklm/backend";
import { Id } from "@supernotebooklm/backend";
import { useState } from "react";

export default function AccountPage() {
  // Get current user session
  const { data: session, isPending } = useSession();
  
  // Fetch user's notebooks and stats
  const userNotebooks = useQuery(
    api.notebooks.getUserNotebooks,
    session?.user ? {} : "skip"
  );
  
  const userStats = useQuery(
    api.notebooks.getUserStats,
    session?.user ? {} : "skip"
  );
  
  // Delete notebook mutation
  const deleteNotebook = useMutation(api.notebooks.deletePublicNotebook);
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Loading state
  if (isPending) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavigationHeader />
        <main className="mx-auto max-w-6xl px-6 pt-24 pb-20">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-sm text-muted-foreground">Loading account...</span>
          </div>
        </main>
      </div>
    );
  }
  
  // Not signed in - show sign-in prompt
  if (!session || !session.user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavigationHeader />
        <main className="mx-auto max-w-6xl px-6 pt-24 pb-20">
          <div className="text-center py-20">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h1 className="text-2xl font-medium mb-2">Sign In Required</h1>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              You need to sign in to access your account and manage your notebooks.
            </p>
            <Button asChild>
              <Link href="/">
                <LogIn className="h-4 w-4 mr-2" />
                Go to Home & Sign In
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }
  
  const handleDelete = async (notebookId: string) => {
    if (!confirm("Are you sure you want to delete this notebook? This action cannot be undone.")) {
      return;
    }
    
    setDeletingId(notebookId);
    try {
      await deleteNotebook({ notebookId: notebookId as Id<"publicNotebooks"> });
    } catch (error) {
      console.error("Failed to delete notebook:", error);
      alert("Failed to delete notebook. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavigationHeader />
      
      <main className="mx-auto max-w-6xl px-6 pt-24 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 font-mono">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">My Account</span>
        </div>

        {/* Profile Header */}
        <div className="border border-border bg-card p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-6">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  width={96}
                  height={96}
                  className="rounded-full"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-normal mb-2">{session.user.name || "Anonymous User"}</h1>
                <p className="text-sm text-muted-foreground mb-2">{session.user.email}</p>
                <p className="text-xs text-muted-foreground font-mono mb-4">
                  User ID: {session.user.id.slice(0, 12)}...
                </p>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="font-medium">{userStats?.totalNotebooks || 0}</span>
                    <span className="text-muted-foreground ml-1">Notebooks</span>
                  </div>
                  <div>
                    <span className="font-medium">{userStats?.publicNotebooks || 0}</span>
                    <span className="text-muted-foreground ml-1">Public</span>
                  </div>
                  <div>
                    <span className="font-medium">{userStats?.totalViews || 0}</span>
                    <span className="text-muted-foreground ml-1">Total Views</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notebooks Section Header */}
        <div className="flex items-center gap-3 mb-6">
          <Book className="h-6 w-6" />
          <h2 className="text-lg font-normal">My Notebooks</h2>
        </div>

        {/* Notebooks Content */}
        <div>
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                Manage your notebooks. You can edit or delete any notebook you've created.
              </p>
              <Button className="rounded-full h-8 px-4 text-xs font-mono bg-white text-black hover:bg-white/90">
                <Plus className="h-3 w-3 mr-2" />
                Create Notebook
              </Button>
            </div>

            {userNotebooks === undefined ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-3 text-sm text-muted-foreground">Loading notebooks...</span>
              </div>
            ) : userNotebooks.length === 0 ? (
              <div className="border border-border bg-card p-12 text-center">
                <Book className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-sm font-medium mb-2">No Notebooks Yet</h3>
                <p className="text-xs text-muted-foreground mb-6">
                  Create your first notebook to share your knowledge with the community.
                </p>
                <Button className="rounded-full h-8 px-4 text-xs font-mono bg-white text-black hover:bg-white/90">
                  <Plus className="h-3 w-3 mr-2" />
                  Create First Notebook
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {userNotebooks.map((notebook) => (
                  <div key={notebook._id} className="border border-border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Link href={`/notebook/${notebook._id}`}>
                            <h3 className="text-sm font-medium hover:underline">{notebook.title}</h3>
                          </Link>
                          <span className={`text-[10px] font-mono px-2 py-1 rounded-full ${
                            notebook.isPublic 
                              ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                              : "bg-muted text-muted-foreground border border-border"
                          }`}>
                            {notebook.isPublic ? "Public" : "Private"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{notebook.description}</p>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-2 flex-wrap">
                            {notebook.tags?.slice(0, 5).map((tag) => (
                              <span 
                                key={tag}
                                className="text-[10px] font-mono text-muted-foreground border border-border px-2 py-1 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono ml-auto">
                            <span>{notebook.viewCount} views</span>
                            <span>{notebook.bookmarkCount || 0} likes</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(notebook._id)}
                          disabled={deletingId === notebook._id}
                        >
                          {deletingId === notebook._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p className="font-mono">© 2024 Supernotebooklm</p>
            <nav className="flex gap-6">
              <a href="/about" className="hover:text-foreground transition-colors">About</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="/contact" className="hover:text-foreground transition-colors">Contact</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
