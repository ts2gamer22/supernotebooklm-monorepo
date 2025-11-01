import NavigationHeader from "@/components/sections/navigation-header";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, MapPin, Calendar, Book, Heart, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock data - in real app, fetch based on params.id
const authorData = {
  id: "sarah-chen",
  name: "Dr. Sarah Chen",
  avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_21.png",
  bio: "AI Research Scientist at Stanford AI Lab specializing in machine learning, neural networks, and deep learning. Passionate about making AI research accessible to everyone.",
  location: "Stanford, CA",
  joinedDate: "2023-06-15",
  website: "https://sarahchen.ai",
  twitter: "@sarahchen",
  followers: 1247,
  following: 89,
  totalLikes: 3421,
  specialties: ["Machine Learning", "Neural Networks", "Deep Learning", "AI Ethics"],
};

const authorNotebooks = [
  {
    id: "1",
    title: "Introduction to Machine Learning",
    description: "A comprehensive guide covering the fundamentals of machine learning, including supervised learning, unsupervised learning, and reinforcement learning approaches.",
    views: 1247,
    likes: 89,
    tags: ["Machine Learning", "Neural Networks", "AI"],
    publishedDate: "2024-01-15",
  },
  {
    id: "2",
    title: "Neural Networks Deep Dive",
    description: "Detailed exploration of neural network architectures, from perceptrons to transformers, with practical implementations.",
    views: 891,
    likes: 67,
    tags: ["Neural Networks", "Deep Learning", "AI"],
    publishedDate: "2024-02-03",
  },
  {
    id: "3",
    title: "Transfer Learning Techniques",
    description: "Master transfer learning and fine-tuning pre-trained models for specific tasks with practical examples.",
    views: 654,
    likes: 48,
    tags: ["Transfer Learning", "ML", "Deep Learning"],
    publishedDate: "2024-02-18",
  },
  {
    id: "4",
    title: "Reinforcement Learning Basics",
    description: "Introduction to reinforcement learning concepts, algorithms, and real-world applications.",
    views: 745,
    likes: 54,
    tags: ["Reinforcement Learning", "AI", "ML"],
    publishedDate: "2024-01-28",
  },
  {
    id: "5",
    title: "AI Ethics & Bias",
    description: "Critical examination of ethical considerations in AI development and strategies for bias mitigation.",
    views: 523,
    likes: 42,
    tags: ["AI Ethics", "Bias", "Responsible AI"],
    publishedDate: "2024-03-05",
  },
  {
    id: "6",
    title: "Attention Mechanisms Explained",
    description: "Comprehensive guide to attention mechanisms and their role in modern deep learning architectures.",
    views: 876,
    likes: 71,
    tags: ["Attention", "Transformers", "Deep Learning"],
    publishedDate: "2024-02-22",
  },
];

const authorCollections = [
  {
    id: "1",
    title: "AI Ethics & Safety Collection",
    description: "Comprehensive resources on responsible AI development, ethical considerations, and safety protocols",
    notebookCount: 8,
    followers: 342,
  },
  {
    id: "2",
    title: "Deep Learning Fundamentals",
    description: "Complete guide to deep learning from basics to advanced topics",
    notebookCount: 12,
    followers: 567,
  },
];

export default function AuthorPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavigationHeader />
      
      <main className="mx-auto max-w-6xl px-6 pt-24 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 font-mono">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/authors" className="hover:text-foreground transition-colors">Authors</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{authorData.name}</span>
        </div>

        {/* Author Profile Header */}
        <div className="border border-border bg-card p-8 mb-8">
          <div className="flex items-start gap-6 mb-6">
            <Image
              src={authorData.avatar}
              alt={authorData.name}
              width={120}
              height={120}
              className="rounded-full"
            />
            <div className="flex-1">
              <h1 className="text-xl font-normal mb-2">{authorData.name}</h1>
              <p className="text-sm text-muted-foreground mb-4 max-w-3xl">{authorData.bio}</p>
              
              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono mb-4">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{authorData.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Joined {new Date(authorData.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
                {authorData.website && (
                  <a href={authorData.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    {authorData.website}
                  </a>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm mb-4">
                <div>
                  <span className="font-medium">{authorNotebooks.length}</span>
                  <span className="text-muted-foreground ml-1">Notebooks</span>
                </div>
                <div>
                  <span className="font-medium">{authorCollections.length}</span>
                  <span className="text-muted-foreground ml-1">Collections</span>
                </div>
                <div>
                  <span className="font-medium">{authorData.followers}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </div>
                <div>
                  <span className="font-medium">{authorData.totalLikes}</span>
                  <span className="text-muted-foreground ml-1">Total Likes</span>
                </div>
              </div>

              {/* Specialties */}
              <div className="flex gap-2 flex-wrap mb-4">
                {authorData.specialties.map((specialty) => (
                  <span 
                    key={specialty}
                    className="border border-border rounded-full px-4 py-1 text-xs font-mono text-muted-foreground"
                  >
                    {specialty}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button className="rounded-full h-8 px-6 text-xs font-mono bg-white text-black hover:bg-white/90">
                  <Users className="h-3 w-3 mr-2" />
                  Follow
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Collections Section */}
        {authorCollections.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-normal mb-6">Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {authorCollections.map((collection) => (
                <Link key={collection.id} href={`/collection/${collection.id}`}>
                  <div className="border border-border bg-card p-4 hover:bg-accent transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 border border-border bg-background">
                        <Book className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium mb-1 truncate">{collection.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{collection.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                      <span>{collection.notebookCount} notebooks</span>
                      <span>{collection.followers} followers</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Notebooks Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-normal">Notebooks</h2>
            <span className="text-xs font-mono text-muted-foreground">
              {authorNotebooks.length} notebooks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {authorNotebooks.map((notebook) => (
              <Link key={notebook.id} href={`/notebook/${notebook.id}`}>
                <div className="border border-border bg-card p-5 hover:bg-accent transition-colors h-full">
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-2 line-clamp-2">{notebook.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-3">{notebook.description}</p>
                    </div>

                    {/* Tags */}
                    <div className="flex gap-2 flex-wrap mb-4">
                      {notebook.tags.map((tag) => (
                        <span 
                          key={tag}
                          className="text-[10px] font-mono text-muted-foreground border border-border px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono mt-auto pt-4 border-t border-border">
                      <span>{new Date(notebook.publishedDate).toLocaleDateString()}</span>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{notebook.views}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span>{notebook.likes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
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
