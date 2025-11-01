"use client";

import NavigationHeader from "@/components/sections/navigation-header";
import Link from "next/link";
import Image from "next/image";
import { User, ChevronRight, Book, FolderOpen, Settings, Edit2, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Mock user data - in real app, fetch from session/API
const userData = {
  id: "current-user",
  name: "John Doe",
  email: "john.doe@example.com",
  avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_21.png",
  bio: "Software Engineer & ML Enthusiast",
  location: "San Francisco, CA",
  joinedDate: "2024-01-15",
};

const userNotebooks = [
  {
    id: "1",
    title: "My Machine Learning Notes",
    description: "Personal notes on ML algorithms and implementations",
    views: 234,
    likes: 45,
    tags: ["ML", "Python"],
    isPublic: true,
  },
  {
    id: "2",
    title: "React Best Practices",
    description: "Collection of React patterns and performance tips",
    views: 567,
    likes: 89,
    tags: ["React", "JavaScript"],
    isPublic: true,
  },
  {
    id: "3",
    title: "System Design Interview Prep",
    description: "Notes from system design preparation",
    views: 123,
    likes: 23,
    tags: ["System Design", "Interview"],
    isPublic: false,
  },
];

const userCollections = [
  {
    id: "1",
    title: "Full Stack Learning Path",
    description: "My curated collection for learning full stack development",
    notebookCount: 8,
    isPublic: true,
  },
  {
    id: "2",
    title: "AI Research Papers",
    description: "Important papers and notes on AI research",
    notebookCount: 12,
    isPublic: true,
  },
];

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<"notebooks" | "collections">("notebooks");

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
              <Image
                src={userData.avatar}
                alt={userData.name}
                width={96}
                height={96}
                className="rounded-full"
              />
              <div>
                <h1 className="text-xl font-normal mb-2">{userData.name}</h1>
                <p className="text-sm text-muted-foreground mb-2">{userData.bio}</p>
                <p className="text-xs text-muted-foreground font-mono mb-4">
                  {userData.location} • Joined {new Date(userData.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="font-medium">{userNotebooks.length}</span>
                    <span className="text-muted-foreground ml-1">Notebooks</span>
                  </div>
                  <div>
                    <span className="font-medium">{userCollections.length}</span>
                    <span className="text-muted-foreground ml-1">Collections</span>
                  </div>
                  <div>
                    <span className="font-medium">{userNotebooks.reduce((sum, n) => sum + n.likes, 0)}</span>
                    <span className="text-muted-foreground ml-1">Total Likes</span>
                  </div>
                </div>
              </div>
            </div>
            <Link href="/account/settings">
              <Button variant="outline" className="rounded-full h-8 px-4 text-xs font-mono">
                <Settings className="h-3 w-3 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("notebooks")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "notebooks"
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Book className="h-4 w-4" />
            My Notebooks
          </button>
          <button
            onClick={() => setActiveTab("collections")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "collections"
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            My Collections
          </button>
        </div>

        {/* Notebooks Tab */}
        {activeTab === "notebooks" && (
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

            <div className="space-y-4">
              {userNotebooks.map((notebook) => (
                <div key={notebook.id} className="border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Link href={`/notebook/${notebook.id}`}>
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
                      <p className="text-xs text-muted-foreground mb-3">{notebook.description}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-2 flex-wrap">
                          {notebook.tags.map((tag) => (
                            <span 
                              key={tag}
                              className="text-[10px] font-mono text-muted-foreground border border-border px-2 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono ml-auto">
                          <span>{notebook.views} views</span>
                          <span>{notebook.likes} likes</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collections Tab */}
        {activeTab === "collections" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                Manage your collections. Organize notebooks into curated collections.
              </p>
              <Button className="rounded-full h-8 px-4 text-xs font-mono bg-white text-black hover:bg-white/90">
                <Plus className="h-3 w-3 mr-2" />
                Create Collection
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userCollections.map((collection) => (
                <div key={collection.id} className="border border-border bg-card p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 border border-border bg-background">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/collection/${collection.id}`}>
                            <h3 className="text-sm font-medium hover:underline truncate">{collection.title}</h3>
                          </Link>
                          <span className={`text-[10px] font-mono px-2 py-1 rounded-full ${
                            collection.isPublic 
                              ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                              : "bg-muted text-muted-foreground border border-border"
                          }`}>
                            {collection.isPublic ? "Public" : "Private"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {collection.description}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {collection.notebookCount} notebooks
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
