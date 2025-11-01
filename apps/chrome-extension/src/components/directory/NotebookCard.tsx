/**
 * NotebookCard Component
 * Story 4.3: Directory Tab UI - Task 3
 * 
 * Displays a public notebook card with title, description, category, stats
 */

import { Eye, User } from 'lucide-react';
import type { PublicNotebook } from '@/src/types/directory';
import { memo } from 'react';

interface NotebookCardProps {
  notebook: PublicNotebook;
  onClick: () => void;
}

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  Research: 'bg-blue-600 text-blue-100',
  Tutorial: 'bg-green-600 text-green-100',
  Notes: 'bg-yellow-600 text-yellow-100',
  Analysis: 'bg-purple-600 text-purple-100',
  Learning: 'bg-pink-600 text-pink-100',
  Other: 'bg-gray-600 text-gray-100',
};

export const NotebookCard = memo(function NotebookCard({ notebook, onClick }: NotebookCardProps) {
  const categoryColor = CATEGORY_COLORS[notebook.category] || CATEGORY_COLORS.Other;

  return (
    <div
      onClick={onClick}
      className="p-4 bg-nb-dark-200 border border-nb-dark-300 rounded-lg cursor-pointer hover:bg-nb-dark-300 hover:border-nb-blue/50 transition-all group"
    >
      {/* Category Badge */}
      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded mb-3 ${categoryColor}`}>
        {notebook.category}
      </span>

      {/* Title */}
      <h3 className="text-base font-semibold text-nb-text mb-2 line-clamp-2 group-hover:text-nb-blue transition-colors">
        {notebook.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-nb-gray-400 mb-4 line-clamp-3">
        {notebook.description}
      </p>

      {/* Footer: Stats */}
      <div className="flex items-center justify-between text-xs text-nb-gray-500">
        {/* View Count */}
        <div className="flex items-center gap-1.5">
          <Eye className="w-4 h-4" />
          <span>{notebook.viewCount.toLocaleString()} views</span>
        </div>

        {/* Author placeholder (will be populated in Story 4.4) */}
        <div className="flex items-center gap-1.5">
          <User className="w-4 h-4" />
          <span>User</span>
        </div>
      </div>

      {/* Tags (if any) */}
      {notebook.tags && notebook.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {notebook.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-nb-dark-100 text-nb-gray-400 text-xs rounded"
            >
              #{tag}
            </span>
          ))}
          {notebook.tags.length > 3 && (
            <span className="px-2 py-0.5 text-nb-gray-500 text-xs">
              +{notebook.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
