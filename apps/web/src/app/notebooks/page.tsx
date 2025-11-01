"use client";

import NavigationHeader from "@/components/sections/navigation-header";
import Link from "next/link";
import { Book, ChevronRight, TrendingUp, Clock, Heart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@supernotebooklm/backend";

// Fallback mock data (used when Convex is not connected)
const mockCategories = [
  {
    id: "ai",
    name: "AI & Machine Learning",
    description: "Explore cutting-edge AI research, machine learning algorithms, and neural network architectures",
    notebookCount: 127,
    notebooks: [
      { id: "1", title: "Introduction to Machine Learning", author: "Dr. Sarah Chen", views: 1247, likes: 89, tags: ["ML", "AI"] },
      { id: "2", title: "Large Language Models Explained", author: "Prof. Michael Torres", views: 2103, likes: 156, tags: ["LLM", "NLP"] },
    ],
  },
];

export default function NotebooksPage() {
  // Query public notebooks from Convex
  const publicNotebooks = useQuery(api.notebooks.listPublicNotebooks);
  
  // Group notebooks by category
  const categories = publicNotebooks?.reduce((acc, notebook) => {
    const existingCategory = acc.find(cat => cat.id === notebook.category);
    
    if (existingCategory) {
      existingCategory.notebooks.push(notebook);
      existingCategory.notebookCount++;
    } else {
      acc.push({
        id: notebook.category,
        name: notebook.category.charAt(0).toUpperCase() + notebook.category.slice(1),
        description: `Notebooks in ${notebook.category}`,
        notebookCount: 1,
        notebooks: [notebook],
      });
    }
    
    return acc;
  }, [] as any[]) || mockCategories;
  
  const totalNotebooks = categories.reduce((sum, cat) => sum + cat.notebookCount, 0);
  const isLoading = publicNotebooks === undefined;
  const isMockData = !publicNotebooks || publicNotebooks.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavigationHeader />
      
      <main className="mx-auto max-w-6xl px-6 pt-24 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 font-mono">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Notebooks</span>
        </div>

        {/* Status Banner */}
        {isMockData && (
          <div className="mb-6 border border-yellow-500/20 bg-yellow-500/10 p-4 rounded-md">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-mono">
              ⚠️ Showing mock data. Connect to Convex to see real notebooks.
              <br />
              Add <code className="bg-black/20 px-1">NEXT_PUBLIC_CONVEX_URL</code> to <code className="bg-black/20 px-1">.env.local</code>
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Book className="h-8 w-8" />
            <h1 className="text-xl font-normal">Explore Notebooks</h1>
            {isLoading && (
              <span className="text-xs text-muted-foreground font-mono animate-pulse">
                Loading...
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Browse {totalNotebooks}+ notebooks across {categories.length} categories. Discover research notes, 
            learning materials, and knowledge bases shared by the community.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">Total Notebooks</span>
              <Book className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-normal">{totalNotebooks}+</p>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">Categories</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-normal">{categories.length}</p>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">This Week</span>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-normal">
              {publicNotebooks ? publicNotebooks.filter(n => 
                Date.now() - n.createdAt < 7 * 24 * 60 * 60 * 1000
              ).length : 47}
            </p>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">Most Liked</span>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-normal">
              {publicNotebooks ? Math.max(...publicNotebooks.map(n => n.bookmarkCount || 0), 0) : '2.1k'}
            </p>
          </div>
        </div>

        {/* Categories with Notebooks */}
        <div className="space-y-12">
          {categories.map((category) => (
            <div key={category.id}>
              {/* Category Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-normal">{category.name}</h2>
                    <span className="text-xs font-mono text-muted-foreground border border-border px-3 py-1 rounded-full">
                      {category.notebookCount} notebooks
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
                <Link href={`/category/${category.id}`}>
                  <Button variant="ghost" className="text-sm font-mono text-muted-foreground hover:text-foreground">
                    View all
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>

              {/* Notebooks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.notebooks.map((notebook) => (
                  <Link key={notebook.id || notebook._id} href={`/notebook/${notebook.id || notebook._id}`}>
                    <div className="border border-border bg-card p-4 hover:bg-accent transition-colors h-full">
                      {/* Notebook Content */}
                      <div className="flex flex-col h-full">
                        <h3 className="text-sm font-medium mb-2 line-clamp-2">{notebook.title}</h3>
                        
                        {/* Author */}
                        <p className="text-xs text-muted-foreground font-mono mb-3">
                          {notebook.author || 'Anonymous'}
                        </p>
                        
                        {/* Tags */}
                        <div className="flex gap-2 flex-wrap mb-4">
                          {notebook.tags?.map((tag) => (
                            <span 
                              key={tag}
                              className="text-[10px] font-mono text-muted-foreground border border-border px-2 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono mt-auto">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{notebook.views || notebook.viewCount || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            <span>{notebook.likes || notebook.bookmarkCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
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
