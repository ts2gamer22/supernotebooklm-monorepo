import { Book, ChevronRight } from 'lucide-react';

const notebooks = [
  { title: "AI Research Notes", href: "#" },
  { title: "Machine Learning Foundations", href: "#" },
  { title: "Climate Science Overview", href: "#" },
  { title: "Quantum Computing Basics", href: "#" },
  { title: "Biology & Genetics", href: "#" },
  { title: "Space Exploration", href: "#" },
  { title: "Neural Networks Deep Dive", href: "#" },
];

const FeaturedNotebooks = () => {
  return (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-normal">Featured Notebooks</h3>
        <a href="#" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
          <span>View all</span>
          <ChevronRight className="h-3 w-3" />
        </a>
      </div>
      <div className="overflow-x-auto hide-scrollbar">
        <div className="flex gap-2 pb-2">
          {notebooks.map((notebook) => (
            <a
              key={notebook.title}
              href={notebook.href}
              className="bg-background hover:bg-accent transition-colors border border-border rounded-full py-2 px-6 flex items-center gap-2 whitespace-nowrap text-sm font-medium"
            >
              <Book className="h-4 w-4 flex-shrink-0" />
              <span className="pr-4">{notebook.title}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedNotebooks;