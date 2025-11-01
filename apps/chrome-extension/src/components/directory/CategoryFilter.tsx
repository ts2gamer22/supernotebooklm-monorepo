/**
 * CategoryFilter Component
 * Story 4.3: Directory Tab UI - Task 5
 * 
 * Displays category filter buttons
 */

import { CATEGORIES } from '@/src/types/directory';

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            selected === category
              ? 'bg-nb-blue text-white shadow-md'
              : 'bg-nb-dark-300 text-nb-gray-300 hover:bg-nb-dark-400 hover:text-white'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
