import NavigationHeader from "@/components/sections/navigation-header";
import Link from "next/link";
import Image from "next/image";
import { FolderOpen, ChevronRight, Book, Heart, Users, Eye } from "lucide-react";

// Mock data for collections
const collections = [
  {
    id: "1",
    title: "AI Ethics & Safety Collection",
    description: "Comprehensive resources on responsible AI development, ethical considerations, and safety protocols",
    curator: {
      name: "Dr. Sarah Chen",
      avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_21.png",
    },
    notebookCount: 8,
    followers: 342,
    views: 2134,
    tags: ["AI", "Ethics", "Safety"],
  },
  {
    id: "2",
    title: "Climate Science Fundamentals",
    description: "Essential notebooks covering climate change, environmental science, and sustainability research",
    curator: {
      name: "Dr. Linda Green",
      avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_19.png",
    },
    notebookCount: 12,
    followers: 567,
    views: 3456,
    tags: ["Climate", "Science", "Environment"],
  },
  {
    id: "3",
    title: "Quantum Computing Primer",
    description: "From basics to advanced topics in quantum computing, algorithms, and quantum mechanics",
    curator: {
      name: "Prof. David Zhang",
      avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_20.png",
    },
    notebookCount: 6,
    followers: 423,
    views: 1987,
    tags: ["Quantum", "Physics", "Computing"],
  },
  {
    id: "4",
    title: "Full Stack Web Development",
    description: "Complete guide to modern web development with React, Node.js, databases, and deployment",
    curator: {
      name: "Alex Johnson",
      avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_23.png",
    },
    notebookCount: 15,
    followers: 892,
    views: 5234,
    tags: ["Web Dev", "React", "JavaScript"],
  },
  {
    id: "5",
    title: "Machine Learning Masterclass",
    description: "Curated collection of ML notebooks from fundamentals to advanced neural networks",
    curator: {
      name: "Prof. Michael Torres",
      avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_22.png",
    },
    notebookCount: 18,
    followers: 1234,
    views: 7891,
    tags: ["ML", "AI", "Deep Learning"],
  },
  {
    id: "6",
    title: "Startup Founder's Handbook",
    description: "Everything you need to know about building and scaling a startup from scratch",
    curator: {
      name: "Mark Thompson",
      avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_18.png",
    },
    notebookCount: 10,
    followers: 678,
    views: 3987,
    tags: ["Startup", "Business", "Entrepreneurship"],
  },
  {
    id: "7",
    title: "Medical Science Essentials",
    description: "Core medical knowledge, research methodologies, and healthcare innovations",
    curator: {
      name: "Dr. Nicole Adams",
      avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_19.png",
    },
    notebookCount: 14,
    followers: 456,
    views: 2765,
    tags: ["Medicine", "Health", "Research"],
  },
  {
    id: "8",
    title: "Computer Vision Deep Dive",
    description: "Comprehensive resources on image processing, CNNs, and computer vision applications",
    curator: {
      name: "Dr. Emily Watson",
      avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_17.png",
    },
    notebookCount: 11,
    followers: 734,
    views: 4321,
    tags: ["CV", "CNN", "AI"],
  },
  {
    id: "9",
    title: "System Design Patterns",
    description: "Learn scalable architecture, design patterns, and best practices for large systems",
    curator: {
      name: "Maria Garcia",
      avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_24.png",
    },
    notebookCount: 9,
    followers: 589,
    views: 3654,
    tags: ["Architecture", "Design", "Systems"],
  },
  {
    id: "10",
    title: "Historical Perspectives",
    description: "Curated notebooks exploring major historical events, civilizations, and cultural movements",
    curator: {
      name: "Prof. Marcus Stone",
      avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_25.png",
    },
    notebookCount: 7,
    followers: 345,
    views: 1987,
    tags: ["History", "Culture", "Civilization"],
  },
  {
    id: "11",
    title: "Data Science Toolkit",
    description: "Essential notebooks for data analysis, visualization, statistics, and Python libraries",
    curator: {
      name: "Dr. James Liu",
      avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_18.png",
    },
    notebookCount: 13,
    followers: 923,
    views: 5678,
    tags: ["Data Science", "Python", "Analytics"],
  },
  {
    id: "12",
    title: "Astrophysics Journey",
    description: "Explore the cosmos through notebooks on stars, galaxies, black holes, and cosmology",
    curator: {
      name: "Prof. Carlos Rodriguez",
      avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_17.png",
    },
    notebookCount: 8,
    followers: 512,
    views: 2876,
    tags: ["Space", "Physics", "Cosmology"],
  },
];

export default function CollectionsPage() {
  const totalNotebooks = collections.reduce((sum, col) => sum + col.notebookCount, 0);
  const totalFollowers = collections.reduce((sum, col) => sum + col.followers, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavigationHeader />
      
      <main className="mx-auto max-w-6xl px-6 pt-24 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 font-mono">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Collections</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <FolderOpen className="h-8 w-8" />
            <h1 className="text-xl font-normal">Explore Collections</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Discover curated collections of notebooks organized by topic. Follow collections to stay updated 
            with the latest additions and explore comprehensive learning paths.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">Total Collections</span>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-normal">{collections.length}</p>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">Total Notebooks</span>
              <Book className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-normal">{totalNotebooks}</p>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">Total Followers</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-normal">{(totalFollowers / 1000).toFixed(1)}k</p>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">Most Popular</span>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-normal">7.9k</p>
          </div>
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {collections.map((collection) => (
            <Link key={collection.id} href={`/collection/${collection.id}`}>
              <div className="border border-border bg-card p-6 hover:bg-accent transition-colors h-full">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 border border-border bg-background">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium mb-2 line-clamp-2">{collection.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {collection.description}
                    </p>
                  </div>
                </div>

                {/* Curator */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                  <Image
                    src={collection.curator.avatar}
                    alt={collection.curator.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {collection.curator.name}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {collection.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="text-[10px] font-mono text-muted-foreground border border-border px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <div className="flex items-center gap-1">
                    <Book className="h-3 w-3" />
                    <span>{collection.notebookCount} notebooks</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{collection.followers}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{collection.views}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
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
