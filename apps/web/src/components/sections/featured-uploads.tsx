import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const collectionsData = [
  {
    author: "Dr. Sarah Chen",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/icons/63r9v3zcpu-1.jpg",
    location: "Stanford AI Lab",
    title: "AI Ethics & Safety Collection",
    description: "A comprehensive collection of notebooks exploring ethical considerations in AI development, bias mitigation strategies, and safety protocols for large language models.",
    link: "#",
    authorLink: "#",
  },
  {
    author: "Prof. Michael Torres",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/icons/jv1pthzoh3-2.png",
    location: "MIT Research",
    title: "Climate Science Fundamentals",
    description: "Essential notebooks covering climate modeling, carbon cycle dynamics, and the latest research on global warming trends and mitigation strategies.",
    link: "#",
    authorLink: "#",
  },
  {
    author: "Dr. Emily Watson",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/icons/1mh2qyt2l0j-3.png",
    location: "Oxford University",
    title: "Quantum Computing Primer",
    description: "An accessible introduction to quantum computing concepts, qubit manipulation, quantum algorithms, and practical applications in cryptography and optimization.",
    link: "#",
    authorLink: "#",
  },
  {
    author: "Dr. James Liu",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/icons/9bov4x9et7-4.png",
    location: "DeepMind",
    title: "Neural Networks Masterclass",
    description: "Deep dive into neural network architectures, training techniques, transformer models, and state-of-the-art approaches in deep learning research.",
    link: "#",
    authorLink: "#",
  },
];

const FeaturedUploads = () => {
  return (
    <section className="mb-10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-normal">Featured Collection</h3>
        <Link href="#" className="text-sm text-muted-foreground flex items-center gap-1">
          <span>View all</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="w-full relative">
        <div className="overflow-x-auto hide-scrollbar">
          <div className="flex -ml-4">
            {collectionsData.map((collection, index) => (
              <div key={index} className="min-w-0 shrink-0 grow-0 basis-full pl-4 md:basis-1/2 lg:basis-1/4">
                <div className="border border-border text-card-foreground bg-transparent h-full">
                  <div className="flex h-full flex-col gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <Link href={collection.authorLink}>
                        <span className="relative flex shrink-0 overflow-hidden size-12 rounded-none">
                          <Image
                            className="aspect-square h-full w-full"
                            alt={collection.author}
                            src={collection.avatar}
                            width={48}
                            height={48}
                          />
                        </span>
                      </Link>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono line-clamp-1">
                          <Link href={collection.authorLink}>
                            <span className="line-clamp-1">{collection.author}</span>
                          </Link>
                          <span>•</span>
                          <span className="line-clamp-1">{collection.location}</span>
                        </div>
                        <h3 className="text-md line-clamp-1">{collection.title}</h3>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-2 flex-grow">
                      {collection.description}
                    </p>
                    <a
                      href={collection.link}
                      className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 w-fit bg-secondary text-muted-foreground hover:bg-accent rounded-full font-mono text-xs"
                    >
                      View
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedUploads;