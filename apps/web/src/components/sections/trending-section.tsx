import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, ChevronUp } from 'lucide-react';

interface TrendingPost {
  author: string;
  avatar: string;
  title: string;
  description: string;
  href: string;
  votes: number | null;
}

const trendingPosts: TrendingPost[] = [
  {
    author: "Dr. Sarah Chen",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_23.png",
    title: "How I Use NotebookLM for Research",
    description: "A comprehensive guide on leveraging NotebookLM for academic research. Learn techniques for organizing sources, generating insights, and synthesizing information effectively.",
    href: "#",
    votes: 24,
  },
  {
    author: "Prof. Michael Torres",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_24.png",
    title: "10 NotebookLM Features You Didn't Know About",
    description: "Discover hidden features and power-user tips for NotebookLM that can dramatically improve your workflow and research productivity.",
    href: "#",
    votes: 18,
  },
  {
    author: "Dr. Emily Watson",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_25.png",
    title: "Building Knowledge Graphs with NotebookLM",
    description: "Learn how to create interconnected knowledge structures using NotebookLM. Perfect for researchers, students, and knowledge workers.",
    href: "#",
    votes: 15,
  },
];

const TrendingSection = () => {
  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-normal">Trending in Community</h3>
        <Link href="#" className="text-sm text-muted-foreground flex items-center gap-1">
          <span>View all</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex flex-col gap-6">
        {trendingPosts.map((post, index) => (
          <div key={index} className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Image
                src={post.avatar}
                alt={`${post.author} avatar`}
                width={32}
                height={32}
                className="rounded-full w-8 h-8 object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{post.author}</p>
                </div>
                <Link href={post.href}>
                  <h4 className="text-sm font-semibold text-foreground hover:underline">{post.title}</h4>
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-2">{post.description}</p>
              </div>
            </div>
            {post.votes !== null && (
              <button className="border border-border rounded-md flex flex-col text-muted-foreground items-center justify-center p-1.5 w-10 h-10 hover:bg-accent shrink-0">
                <ChevronUp className="w-4 h-4" />
                <span className="text-[10px] tabular-nums font-mono">{post.votes}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrendingSection;