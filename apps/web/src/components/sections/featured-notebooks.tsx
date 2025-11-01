"use client";

import { Book, ChevronRight } from 'lucide-react';
import { useQuery } from "convex/react";
import { api } from "@supernotebooklm/backend";
import Link from "next/link";

const FeaturedNotebooks = () => {
  // Fetch featured notebooks from Convex
  const result = useQuery(api.notebooks.getFeaturedNotebooks, { limit: 10 });
  const notebooks = result?.notebooks || [];

  // Don't show section if no featured notebooks
  if (notebooks.length === 0) {
    return null;
  }

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
            <Link
              key={notebook._id}
              href={`/notebook/${notebook._id}`}
              className="bg-background hover:bg-accent transition-colors border border-border rounded-full py-2 px-6 flex items-center gap-2 whitespace-nowrap text-sm font-medium"
            >
              <Book className="h-4 w-4 flex-shrink-0" />
              <span className="pr-4">{notebook.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedNotebooks;