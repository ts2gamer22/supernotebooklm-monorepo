/**
 * SortDropdown Component
 * Story 4.3: Directory Tab UI - Task 4
 * 
 * Dropdown for sorting notebooks (Most Recent, Most Viewed, Trending)
 */

import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { SortBy } from '@/src/types/directory';

interface SortDropdownProps {
  value: SortBy;
  onChange: (sortBy: SortBy) => void;
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Viewed' },
  { value: 'trending', label: 'Trending' },
];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-text rounded-lg transition-colors text-sm"
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-nb-dark-200 border border-nb-dark-300 rounded-lg shadow-lg z-10">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-nb-dark-300 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                value === option.value ? 'text-nb-blue font-medium' : 'text-nb-text'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
