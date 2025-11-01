import NavigationHeader from "@/components/sections/navigation-header";
import Image from "next/image";
import Link from "next/link";
import { Share, Copy, Book, Calendar, User, ChevronRight, Heart, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock data - in real app, fetch based on params.id
const collectionData = {
  id: "1",
  title: "AI Ethics & Safety Collection",
  description: "A comprehensive collection of notebooks exploring ethical considerations in AI development, bias mitigation strategies, and safety protocols for large language models. This curated set provides essential knowledge for responsible AI development.",
  curator: {
    name: "Dr. Sarah Chen",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/icons/63r9v3zcpu-1.jpg",
    bio: "AI Research Scientist at Stanford AI Lab",
    location: "Stanford AI Lab",
    href: "/author/sarah-chen",
  },
  createdAt: "2024-01-10",
  updatedAt: "2024-02-28",
  notebookCount: 12,
  followers: 234,
  totalViews: 5420,
  category: "AI & Ethics",
  notebooks: [
    {
      id: "1",
      title: "Introduction to AI Ethics",
      description: "Foundational concepts in AI ethics, covering fairness, accountability, transparency, and the societal impact of artificial intelligence systems.",
      author: "Dr. Sarah Chen",
      tags: ["Ethics", "AI", "Philosophy"],
      views: 892,
      likes: 67,
      href: "/notebook/1",
      codeSnippet: "# AI Ethics Fundamentals\n\nExploring the core principles of ethical AI development...",
    },
    {
      id: "2",
      title: "Bias Detection in Machine Learning Models",
      description: "Techniques and tools for identifying and measuring bias in machine learning models, with practical examples and case studies.",
      author: "Prof. Michael Torres",
      tags: ["Bias", "ML", "Fairness"],
      views: 756,
      likes: 54,
      href: "/notebook/2",
      codeSnippet: "# Detecting Bias in ML Models\n\nLearn how to identify and measure bias...",
    },
    {
      id: "3",
      title: "Fairness Constraints in AI Systems",
      description: "Implementation strategies for building fair AI systems, including mathematical frameworks and real-world applications.",
      author: "Dr. Emily Watson",
      tags: ["Fairness", "AI", "Constraints"],
      views: 643,
      likes: 48,
      href: "/notebook/3",
      codeSnippet: "# Implementing Fairness Constraints\n\nMathematical approaches to fairness...",
    },
    {
      id: "4",
      title: "Transparency in Neural Networks",
      description: "Methods for making neural network decisions more interpretable and transparent to users and stakeholders.",
      author: "Dr. James Liu",
      tags: ["Transparency", "Neural Networks", "XAI"],
      views: 521,
      likes: 42,
      href: "/notebook/4",
      codeSnippet: "# Neural Network Transparency\n\nExplainable AI techniques...",
    },
    {
      id: "5",
      title: "Privacy-Preserving Machine Learning",
      description: "Techniques for training ML models while protecting user privacy, including differential privacy and federated learning.",
      author: "Prof. Maria Garcia",
      tags: ["Privacy", "ML", "Security"],
      views: 487,
      likes: 39,
      href: "/notebook/5",
      codeSnippet: "# Privacy in ML\n\nDifferential privacy fundamentals...",
    },
    {
      id: "6",
      title: "AI Safety Protocols",
      description: "Best practices and protocols for developing safe AI systems that align with human values and intentions.",
      author: "Dr. Robert Kim",
      tags: ["Safety", "AI", "Protocols"],
      views: 412,
      likes: 35,
      href: "/notebook/6",
      codeSnippet: "# AI Safety Frameworks\n\nEnsuring safe AI deployment...",
    },
    {
      id: "7",
      title: "Algorithmic Accountability",
      description: "Frameworks for holding AI systems accountable, including audit trails, documentation, and impact assessments.",
      author: "Prof. Lisa Anderson",
      tags: ["Accountability", "AI", "Governance"],
      views: 398,
      likes: 31,
      href: "/notebook/7",
      codeSnippet: "# AI Accountability Frameworks\n\nBuilding accountable systems...",
    },
    {
      id: "8",
      title: "Ethical Decision-Making in AI",
      description: "Decision frameworks for navigating ethical dilemmas in AI development and deployment.",
      author: "Dr. Ahmed Hassan",
      tags: ["Ethics", "Decision Making", "AI"],
      views: 365,
      likes: 28,
      href: "/notebook/8",
      codeSnippet: "# Ethical AI Decisions\n\nFrameworks for ethical choices...",
    },
  ],
  relatedCollections: [
    {
      id: "2",
      title: "Machine Learning Fundamentals",
      curator: "Prof. Michael Torres",
      notebookCount: 15,
      href: "/collection/2",
    },
    {
      id: "3",
      title: "Deep Learning Advanced Topics",
      curator: "Dr. Emily Watson",
      notebookCount: 10,
      href: "/collection/3",
    },
    {
      id: "4",
      title: "Natural Language Processing",
      curator: "Dr. James Liu",
      notebookCount: 18,
      href: "/collection/4",
    },
  ],
};

export default function CollectionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavigationHeader />
      
      <main className="mx-auto max-w-6xl px-6 pt-24 pb-20">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 font-mono">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/collections" className="hover:text-foreground transition-colors">Collections</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{collectionData.title}</span>
          </div>

          <div className="flex items-start gap-4 mb-6">
            <div className="border border-border p-3 bg-card">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-normal mb-2">{collectionData.title}</h1>
              <p className="text-sm text-muted-foreground mb-4 max-w-3xl">{collectionData.description}</p>
            </div>
          </div>

          {/* Curator Info */}
          <Link href={collectionData.curator.href}>
            <div className="flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity w-fit">
              <Image
                src={collectionData.curator.avatar}
                alt={collectionData.curator.name}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <p className="text-xs text-muted-foreground font-mono">Curated by</p>
                <p className="text-sm font-medium">{collectionData.curator.name}</p>
                <p className="text-xs text-muted-foreground">{collectionData.curator.location}</p>
              </div>
            </div>
          </Link>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground font-mono mb-6 pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Book className="h-3 w-3" />
              <span>{collectionData.notebookCount} notebooks</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span>{collectionData.followers} followers</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-3 w-3" />
              <span>{collectionData.totalViews} total views</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>Updated {new Date(collectionData.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              size="sm"
              className="rounded-full h-8 px-4 text-xs font-mono bg-white text-black hover:bg-white/90"
            >
              <Heart className="h-3 w-3 mr-2" />
              Follow Collection
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="rounded-full h-8 px-4 text-xs font-mono"
            >
              <Share className="h-3 w-3 mr-2" />
              Share
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="rounded-full h-8 px-4 text-xs font-mono"
            >
              <Copy className="h-3 w-3 mr-2" />
              Copy Link
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Notebooks Grid */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-base font-normal">Notebooks in this Collection</h2>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {collectionData.notebookCount} notebooks
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {collectionData.notebooks.map((notebook) => (
                <Link key={notebook.id} href={notebook.href}>
                  <div className="border border-border bg-background h-full flex flex-col hover:border-muted-foreground transition-colors">
                    {/* Code Preview */}
                    <div className="bg-card p-4 font-mono text-xs opacity-50 hover:opacity-100 transition-opacity h-32 overflow-hidden">
                      <code className="text-muted-foreground whitespace-pre-wrap">
                        {notebook.codeSnippet}
                      </code>
                    </div>
                    
                    {/* Notebook Info */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-sm font-semibold mb-2 line-clamp-2">{notebook.title}</h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">
                        {notebook.description}
                      </p>
                      
                      {/* Tags */}
                      <div className="flex gap-2 flex-wrap mb-3">
                        {notebook.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[10px] font-mono text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                        {notebook.tags.length > 2 && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            +{notebook.tags.length - 2} more
                          </span>
                        )}
                      </div>

                      {/* Author & Stats */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-3 border-t border-border">
                        <span>{notebook.author}</span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Heart className="h-2.5 w-2.5" />
                            {notebook.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <Book className="h-2.5 w-2.5" />
                            {notebook.views}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Curator Card */}
            <div className="border border-border bg-card p-6 mb-6">
              <h3 className="text-sm font-medium mb-4">About the Curator</h3>
              <Link href={collectionData.curator.href}>
                <div className="flex items-start gap-3 mb-4">
                  <Image
                    src={collectionData.curator.avatar}
                    alt={collectionData.curator.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div>
                    <h4 className="text-sm font-medium hover:underline">{collectionData.curator.name}</h4>
                    <p className="text-xs text-muted-foreground">{collectionData.curator.bio}</p>
                  </div>
                </div>
              </Link>
              <Button className="w-full rounded-full h-8 text-xs font-mono bg-secondary text-foreground hover:bg-accent">
                View Profile
              </Button>
            </div>

            {/* Collection Stats */}
            <div className="border border-border bg-card p-6 mb-6">
              <h3 className="text-sm font-medium mb-4">Collection Stats</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-mono">Total Notebooks</span>
                  <span className="font-medium">{collectionData.notebookCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-mono">Total Views</span>
                  <span className="font-medium">{collectionData.totalViews.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-mono">Followers</span>
                  <span className="font-medium">{collectionData.followers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-mono">Category</span>
                  <span className="font-medium">{collectionData.category}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-mono">Last Updated</span>
                  <span className="font-medium">
                    {new Date(collectionData.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Related Collections */}
            <div className="border border-border bg-card p-6">
              <h3 className="text-sm font-medium mb-4">Related Collections</h3>
              <div className="space-y-4">
                {collectionData.relatedCollections.map((collection) => (
                  <Link key={collection.id} href={collection.href}>
                    <div className="border border-border p-3 hover:bg-accent transition-colors">
                      <h4 className="text-xs font-medium mb-2 line-clamp-2">{collection.title}</h4>
                      <p className="text-[10px] text-muted-foreground font-mono mb-1">{collection.curator}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {collection.notebookCount} notebooks
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
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
