"use client";

import NavigationHeader from "@/components/sections/navigation-header";
import Link from "next/link";
import { Book, ChevronRight, TrendingUp, Clock, Heart, Eye, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@supernotebooklm/backend";

export default function NotebooksPage() {
  // Query public notebooks from Convex - using correct API function
  const result = useQuery(api.notebooks.getPublicNotebooks, {});
  const publicNotebooks = result?.notebooks;
  
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
        description: `Explore ${notebook.category} notebooks and research`,
        notebookCount: 1,
        notebooks: [notebook],
      });
    }
    
    return acc;
  }, [] as any[]) || [];
  
  const totalNotebooks = categories.reduce((sum, cat) => sum + cat.notebookCount, 0);
  const isLoading = result === undefined;
  const isEmpty = !isLoading && categories.length === 0;

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

        {/* Empty State */}
        {isEmpty && (
          <div className="mb-6 border border-border bg-card p-8 rounded-lg text-center">
            <Book className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Notebooks Published Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Be the first to share your NotebookLM knowledge! Upload your first notebook to get the community started.
            </p>
            <Button asChild>
              <Link href="/#upload">
                <Upload className="h-4 w-4 mr-2" />
                Publish First Notebook
              </Link>
            </Button>
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
        {!isEmpty && (
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
                    <Link key={notebook._id} href={`/notebook/${notebook._id}`}>
                      <div className="border border-border bg-card p-4 hover:bg-accent transition-colors h-full">
                        {/* Notebook Content */}
                        <div className="flex flex-col h-full">
                          <h3 className="text-sm font-medium mb-2 line-clamp-2">{notebook.title}</h3>
                          
                          {/* Description preview */}
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {notebook.description}
                          </p>
                          
                          {/* Tags */}
                          <div className="flex gap-2 flex-wrap mb-4">
                            {notebook.tags?.slice(0, 3).map((tag) => (
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
                              <span>{notebook.viewCount || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              <span>{notebook.bookmarkCount || 0}</span>
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
