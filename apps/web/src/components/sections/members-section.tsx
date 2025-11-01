import Image from "next/image";
import { ChevronRight } from "lucide-react";

type Author = {
  name: string;
  href: string;
  image?: string;
  initial?: string;
};

const authors: Author[] = [
  {
    name: "Dr. Sarah Chen",
    href: "#",
    image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_21.png",
  },
  {
    name: "Prof. Michael Torres",
    href: "#",
    image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_17.png",
  },
  {
    name: "Dr. Emily Watson",
    href: "#",
    initial: "E",
  },
  {
    name: "Dr. James Liu",
    href: "#",
    initial: "J",
  },
  {
    name: "Prof. Maria Garcia",
    href: "#",
    image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_18.png",
  },
  {
    name: "Dr. Robert Kim",
    href: "#",
    image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_19.png",
  },
  {
    name: "Prof. Lisa Anderson",
    href: "#",
    image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_20.png",
  },
  {
    name: "Dr. Ahmed Hassan",
    href: "#",
    image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_22.png",
  },
  {
    name: "Dr. Rachel Green",
    href: "#",
    initial: "R",
  },
  {
    name: "Prof. David Park",
    href: "#",
    initial: "D",
  },
  {
    name: "Dr. Anna Kowalski",
    href: "#",
    initial: "A",
  },
  {
    name: "Dr. Marcus Johnson",
    href: "#",
    initial: "M",
  },
];

const MembersSection = () => {
  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-normal text-foreground">Featured Authors</h3>
        <a className="text-sm text-muted-foreground flex items-center gap-1" href="/authors">
          <span>View all</span>
          <ChevronRight className="h-4 w-4" />
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {authors.map((author) => (
          <a key={author.name} href={author.href}>
            <div className="border border-border bg-transparent p-4 flex items-center gap-4 hover:bg-accent transition-colors">
              <div className="relative flex shrink-0 overflow-hidden rounded-full h-12 w-12">
                {author.image ? (
                  <Image
                    src={author.image}
                    alt={`${author.name}'s profile photo`}
                    width={48}
                    height={48}
                    className="aspect-square h-full w-full"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                    <span className="text-foreground">{author.initial}</span>
                  </div>
                )}
              </div>
              <h3 className="text-sm font-medium text-foreground truncate">{author.name}</h3>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default MembersSection;