import { LucideIcon } from 'lucide-react';
import { TabId } from '../types/tabs';

interface TabButtonProps {
  id: TabId;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: (id: TabId) => void;
}

export function TabButton({ id, label, icon: Icon, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={() => onClick(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(id);
        }
      }}
      tabIndex={0}
      role="tab"
      aria-selected={isActive}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={`
        flex-1 flex flex-col items-center justify-center gap-1.5
        min-w-0 px-2 py-2 transition-all duration-200
        border-b-2 border-transparent
        hover:bg-nb-dark-200 hover:text-nb-text
        focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-blue focus-visible:ring-inset
        ${isActive 
          ? 'border-b-nb-blue text-nb-blue bg-nb-dark-200' 
          : 'text-nb-text-dim'
        }
      `}
    >
      <Icon size={18} strokeWidth={2} className="flex-shrink-0" />
      <span className={`text-xs leading-tight text-center whitespace-nowrap ${isActive ? 'font-semibold' : 'font-normal'}`}>
        {label}
      </span>
    </button>
  );
}
