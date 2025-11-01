import { memo } from 'react';
import clsx from 'clsx';

export const FOLDER_COLOR_OPTIONS: Array<{ name: string; value: string }> = [
  { name: 'blue', value: '#60a5fa' },
  { name: 'purple', value: '#a855f7' },
  { name: 'green', value: '#34d399' },
  { name: 'red', value: '#f87171' },
  { name: 'orange', value: '#fb923c' },
  { name: 'yellow', value: '#facc15' },
  { name: 'pink', value: '#f472b6' },
  { name: 'gray', value: '#9ca3af' },
];

interface ColorPickerProps {
  selectedColor?: string | null;
  onSelect: (color: string) => void;
  className?: string;
}

export const ColorPicker = memo(function ColorPicker({
  selectedColor,
  onSelect,
  className,
}: ColorPickerProps) {
  return (
    <div className={clsx('snlm-color-picker', className)}>
      {FOLDER_COLOR_OPTIONS.map(option => {
        const isSelected =
          selectedColor?.toLowerCase() === option.value.toLowerCase() ||
          selectedColor?.toLowerCase() === option.name;

        return (
          <button
            key={option.name}
            type="button"
            className={clsx('snlm-color-picker__swatch', {
              'snlm-color-picker__swatch--selected': isSelected,
            })}
            style={{ backgroundColor: option.value }}
            aria-label={`Use ${option.name} folder color`}
            onClick={() => onSelect(option.value)}
          >
            {isSelected ? (
              <svg
                aria-hidden="true"
                className="snlm-color-picker__check"
                viewBox="0 0 20 20"
              >
                <polyline
                  points="4 11 8 15 16 5"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </button>
        );
      })}
    </div>
  );
});
