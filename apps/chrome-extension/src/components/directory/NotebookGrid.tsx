/**
 * NotebookGrid Component
 * Story 4.3: Directory Tab UI - Task 2
 * 
 * Displays a responsive grid of notebook cards with loading and empty states
 */

import { NotebookCard } from './NotebookCard';
import type { PublicNotebook } from '@/src/types/directory';
import { Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

interface NotebookGridProps {
  notebooks: PublicNotebook[] | undefined;
  isLoading?: boolean;
  hasMore?: boolean;
  onNotebookClick: (notebook: PublicNotebook) => void;
  onLoadMore?: () => void;
}

export function NotebookGrid({ 
  notebooks, 
  isLoading, 
  hasMore = false,
  onNotebookClick,
  onLoadMore
}: NotebookGridProps) {
  // Loading state
  if (isLoading || notebooks === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Loading notebooks...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (notebooks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold mb-2">No notebooks found</h3>
          <p className="text-sm text-gray-400">
            Be the first to share your research with the community!
          </p>
        </div>
      </div>
    );
  }

  // Grid layout
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {notebooks.map((notebook) => (
          <NotebookCard
            key={notebook._id}
            notebook={notebook}
            onClick={() => onNotebookClick(notebook)}
          />
        ))}
      </div>
      
      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={onLoadMore}
            variant="outline"
            className="border-nb-border hover:bg-nb-dark-300"
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton for initial load
 */
export function NotebookGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="bg-gray-800 rounded-lg p-4 animate-pulse"
        >
          <div className="h-6 bg-gray-700 rounded w-20 mb-2"></div>
          <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-full mb-1"></div>
          <div className="h-4 bg-gray-700 rounded w-full mb-1"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3 mb-4"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-700 rounded-full"></div>
              <div className="h-4 bg-gray-700 rounded w-24"></div>
            </div>
            <div className="h-4 bg-gray-700 rounded w-12"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
