import NavigationHeader from "@/components/sections/navigation-header";
import Link from "next/link";
import Image from "next/image";
import { Users, ChevronRight, Book, Heart, MapPin, TrendingUp } from "lucide-react";

// Mock data for authors
const authors = [
  {
    id: "sarah-chen",
    name: "Dr. Sarah Chen",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_21.png",
    bio: "AI Research Scientist at Stanford AI Lab",
    location: "Stanford, CA",
    notebookCount: 12,
    totalLikes: 1247,
    specialties: ["Machine Learning", "Neural Networks", "Deep Learning"],
    featured: true,
  },
  {
    id: "michael-torres",
    name: "Prof. Michael Torres",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_22.png",
    bio: "Professor of Computer Science, MIT",
    location: "Boston, MA",
    notebookCount: 18,
    totalLikes: 2103,
    specialties: ["NLP", "LLMs", "AI Ethics"],
    featured: true,
  },
  {
    id: "emily-watson",
    name: "Dr. Emily Watson",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_17.png",
    bio: "Computer Vision Researcher",
    location: "San Francisco, CA",
    notebookCount: 9,
    totalLikes: 891,
    specialties: ["Computer Vision", "CNN", "Object Detection"],
    featured: true,
  },
  {
    id: "james-liu",
    name: "Dr. James Liu",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_18.png",
    bio: "Reinforcement Learning Expert",
    location: "Berkeley, CA",
    notebookCount: 15,
    totalLikes: 1456,
    specialties: ["Reinforcement Learning", "Robotics", "AI"],
    featured: false,
  },
  {
    id: "linda-green",
    name: "Dr. Linda Green",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_19.png",
    bio: "Climate Scientist & Environmental Researcher",
    location: "Seattle, WA",
    notebookCount: 8,
    totalLikes: 956,
    specialties: ["Climate Science", "Environment", "Sustainability"],
    featured: false,
  },
  {
    id: "david-zhang",
    name: "Prof. David Zhang",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_20.png",
    bio: "Quantum Computing Pioneer",
    location: "Cambridge, MA",
    notebookCount: 11,
    totalLikes: 1876,
    specialties: ["Quantum Computing", "Physics", "Algorithms"],
    featured: true,
  },
  {
    id: "alex-johnson",
    name: "Alex Johnson",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_23.png",
    bio: "Full Stack Developer & Tech Educator",
    location: "Austin, TX",
    notebookCount: 24,
    totalLikes: 2134,
    specialties: ["React", "JavaScript", "Web Development"],
    featured: true,
  },
  {
    id: "maria-garcia",
    name: "Maria Garcia",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_24.png",
    bio: "Senior Software Architect",
    location: "New York, NY",
    notebookCount: 16,
    totalLikes: 1789,
    specialties: ["System Design", "Architecture", "Microservices"],
    featured: false,
  },
  {
    id: "susan-park",
    name: "Dr. Susan Park",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_25.png",
    bio: "Molecular Biologist",
    location: "Cambridge, UK",
    notebookCount: 7,
    totalLikes: 678,
    specialties: ["Biology", "Genetics", "Research"],
    featured: false,
  },
  {
    id: "carlos-rodriguez",
    name: "Prof. Carlos Rodriguez",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_17.png",
    bio: "Astrophysicist & Space Researcher",
    location: "Pasadena, CA",
    notebookCount: 10,
    totalLikes: 1234,
    specialties: ["Astrophysics", "Space", "Cosmology"],
    featured: false,
  },
  {
    id: "mark-thompson",
    name: "Mark Thompson",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_18.png",
    bio: "Entrepreneur & Startup Advisor",
    location: "San Francisco, CA",
    notebookCount: 14,
    totalLikes: 1823,
    specialties: ["Startups", "Growth", "Business Strategy"],
    featured: false,
  },
  {
    id: "nicole-adams",
    name: "Dr. Nicole Adams",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_19.png",
    bio: "Nutritionist & Health Researcher",
    location: "Los Angeles, CA",
    notebookCount: 13,
    totalLikes: 1678,
    specialties: ["Nutrition", "Health", "Wellness"],
    featured: true,
  },
];

const featuredAuthors = authors.filter(a => a.featured);
const allAuthors = authors;

export default function AuthorsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavigationHeader />
      
      <main className="mx-auto max-w-6xl px-6 pt-24 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 font-mono">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Authors</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-8 w-8" />
            <h1 className="text-xl font-normal">Explore Authors</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Connect with researchers, educators, and knowledge creators sharing their expertise through notebooks. 
            Follow your favorite authors to stay updated with their latest work.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">Total Authors</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-normal">{authors.length}+</p>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">Total Notebooks</span>
              <Book className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-normal">{authors.reduce((sum, a) => sum + a.notebookCount, 0)}</p>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">Total Likes</span>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-normal">{(authors.reduce((sum, a) => sum + a.totalLikes, 0) / 1000).toFixed(1)}k</p>
          </div>
        </div>

        {/* Featured Authors */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5" />
            <h2 className="text-lg font-normal">Featured Authors</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredAuthors.map((author) => (
              <Link key={author.id} href={`/author/${author.id}`}>
                <div className="border border-border bg-card p-6 hover:bg-accent transition-colors">
                  <div className="flex items-start gap-4 mb-4">
                    <Image
                      src={author.avatar}
                      alt={author.name}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium mb-1 truncate">{author.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{author.bio}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{author.location}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Specialties */}
                  <div className="flex gap-2 flex-wrap mb-4">
                    {author.specialties.slice(0, 3).map((specialty) => (
                      <span 
                        key={specialty}
                        className="text-[10px] font-mono text-muted-foreground border border-border px-2 py-1 rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-4 border-t border-border">
                    <div className="flex items-center gap-1">
                      <Book className="h-3 w-3" />
                      <span>{author.notebookCount} notebooks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span>{author.totalLikes} likes</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* All Authors */}
        <div>
          <h2 className="text-lg font-normal mb-6">All Authors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allAuthors.map((author) => (
              <Link key={author.id} href={`/author/${author.id}`}>
                <div className="border border-border bg-card p-4 hover:bg-accent transition-colors">
                  <div className="flex items-center gap-4">
                    <Image
                      src={author.avatar}
                      alt={author.name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium mb-1 truncate">{author.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{author.bio}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                        <div className="flex items-center gap-1">
                          <Book className="h-3 w-3" />
                          <span>{author.notebookCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span>{author.totalLikes}</span>
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
