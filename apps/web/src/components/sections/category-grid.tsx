"use client";

import Link from 'next/link';
import { Share, Copy, Download, ChevronDown } from 'lucide-react';

type CardItem = {
  id: number;
  title: string;
  codeSnippet: string;
  tags: string[];
  href: string;
};

type Category = {
  name: string;
  viewAllLink: string;
  items: CardItem[];
};

const categoriesData: Category[] = [
  {
    name: "AI",
    viewAllLink: "/category/ai",
    items: [
      { id: 1, title: "Introduction to Machine Learning", codeSnippet: "# Machine Learning Fundamentals\n\nThis notebook covers the essential concepts of machine learning including supervised learning, unsupervised learning, and reinforcement learning. We explore various algorithms and their applications in real-world scenarios...", tags: ["Machine Learning", "Neural Networks"], href: "/notebook/1" },
      { id: 2, title: "Large Language Models Explained", codeSnippet: "# Understanding LLMs\n\nLarge Language Models have revolutionized natural language processing. This comprehensive guide explores transformer architecture, attention mechanisms, and the training process behind models like GPT and BERT...", tags: ["LLM", "Transformers", "NLP"], href: "/notebook/2" },
      { id: 3, title: "Computer Vision Basics", codeSnippet: "# Computer Vision Fundamentals\n\nExplore the world of computer vision from image classification to object detection. Learn about convolutional neural networks, image preprocessing, and state-of-the-art architectures...", tags: ["Computer Vision", "CNN"], href: "/notebook/3" },
      { id: 4, title: "Reinforcement Learning Deep Dive", codeSnippet: "# Reinforcement Learning\n\nA comprehensive exploration of reinforcement learning concepts including Q-learning, policy gradients, and deep reinforcement learning. Includes practical examples and implementation strategies...", tags: ["RL", "Deep Learning"], href: "/notebook/4" },
    ],
  },
  {
    name: "Science",
    viewAllLink: "/category/science",
    items: [
      { id: 5, title: "Climate Change Modeling", codeSnippet: "# Climate Science Overview\n\nUnderstanding climate change through data analysis and modeling. This notebook examines temperature trends, carbon emissions, and predictive models for future climate scenarios...", tags: ["Climate", "Environment"], href: "/notebook/5" },
      { id: 6, title: "Quantum Mechanics Introduction", codeSnippet: "# Quantum Physics Fundamentals\n\nAn accessible introduction to quantum mechanics covering wave-particle duality, quantum entanglement, and the uncertainty principle. Includes visual demonstrations and thought experiments...", tags: ["Physics", "Quantum"], href: "/notebook/6" },
      { id: 7, title: "Genetics & DNA Sequencing", codeSnippet: "# Modern Genetics\n\nExplore the fundamentals of genetics, DNA structure, gene expression, and modern sequencing technologies. Learn about CRISPR, genetic engineering, and personalized medicine...", tags: ["Biology", "Genetics"], href: "/notebook/7" },
      { id: 8, title: "Astrophysics & Cosmology", codeSnippet: "# The Universe Explained\n\nJourney through space and time exploring stars, galaxies, black holes, and the structure of the universe. From the Big Bang to dark matter and dark energy...", tags: ["Astrophysics", "Space"], href: "/notebook/8" },
    ],
  },
];

const ArrowIcon = () => (
    <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 11.5L3.295 10.795L7.585 6.5L3.295 2.205L4 1.5L9 6.5L4 11.5Z" fill="#878787"/>
    </svg>
);

const CategoryCard = ({ item }: { item: CardItem }) => {
  const visibleTags = item.tags.slice(0, 2);
  const hiddenTagsCount = item.tags.length - visibleTags.length;

  return (
    <div className="border border-border bg-background max-h-[calc(100vh-8rem)] flex flex-col p-2">
      <div className="bg-card h-full mb-2 font-mono text-sm opacity-50 hover:opacity-100 transition-opacity group relative flex-grow p-2">
        <div className="group-hover:flex hidden absolute z-10 space-x-2 right-2 bottom-2">
          <button className="text-xs bg-white text-black rounded-full flex items-center justify-center p-1.5 size-7">
            <Share className="w-3 h-3" />
          </button>
          <button className="text-xs bg-white text-black rounded-full flex items-center justify-center p-1.5 size-7">
            <Copy className="w-3 h-3" />
          </button>
          <button className="text-xs bg-white text-black rounded-full flex items-center justify-center p-1.5 size-7">
            <Download className="size-3" />
          </button>
        </div>
        <Link href={item.href}>
          <div className="h-full overflow-y-auto hide-scrollbar">
            <code className="block pr-3 text-xs whitespace-pre-wrap">{item.codeSnippet}</code>
          </div>
        </Link>
      </div>
      <div className="flex flex-col p-0 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold tracking-tight truncate text-xs">{item.title}</h3>
        </div>
        {item.tags.length > 0 && (
          <div className="flex gap-2 items-center overflow-x-auto whitespace-nowrap cursor-pointer hover:bg-accent h-4 hide-scrollbar">
            {visibleTags.map((tag, index) => (
              <span key={index} className="text-muted-foreground font-mono flex-shrink-0 text-[10px]">{tag}</span>
            ))}
            {hiddenTagsCount > 0 && (
              <span className="text-muted-foreground font-mono flex gap-1 items-center text-[10px]">
                <span>+{hiddenTagsCount} more</span>
                <ChevronDown className="w-2 h-2" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CategorySection = ({ category }: { category: Category }) => (
  <section id={category.name} className="mt-10">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-normal">{category.name}</h3>
      <Link href={category.viewAllLink} className="text-sm text-muted-foreground flex items-center gap-1">
        <span>View all</span>
        <ArrowIcon />
      </Link>
    </div>
    <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-4">
      {category.items.map((item) => (
        <CategoryCard key={item.id} item={item} />
      ))}
    </div>
  </section>
);

const CategoryGrid = () => {
  return (
    <>
      {categoriesData.map((category) => (
        <CategorySection key={category.name} category={category} />
      ))}
    </>
  );
};

export default CategoryGrid;