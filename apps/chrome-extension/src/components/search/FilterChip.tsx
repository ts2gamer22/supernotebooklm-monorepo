import { X } from 'lucide-react';

interface FilterChipProps {
  label: string;
  color?: string;
  onRemove: () => void;
}

/**
 * FilterChip - Removable filter badge
 * 
 * Displays an active filter with a remove button.
 * Used to show text search, folder, tag, and date filters.
 */
export function FilterChip({ label, color = '#6b7280', onRemove }: FilterChipProps) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-90"
      style={{ backgroundColor: color, color: '#ffffff' }}
    >
      <span className="truncate max-w-[200px]">{label}</span>
      <button
        onClick={onRemove}
        className="hover:bg-white/20 rounded-full p-0.5 flex-shrink-0"
        aria-label={`Remove filter: ${label}`}
        type="button"
      >
        <X size={12} />
      </button>
    </div>
  );
}
