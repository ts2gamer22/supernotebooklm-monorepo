import { forwardRef } from 'react';
import { Search } from 'lucide-react';

interface TagAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const TagAutocomplete = forwardRef<HTMLInputElement, TagAutocompleteProps>(
  function TagAutocomplete({ value, onChange, placeholder, className }, ref) {
    return (
      <div className="snlm-tag-autocomplete">
        <Search size={16} className="snlm-tag-autocomplete__icon" aria-hidden="true" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'Search tags...'}
          className={`snlm-tag-autocomplete__input ${className || ''}`}
          aria-label={placeholder || 'Search tags'}
        />
      </div>
    );
  }
);
