import * as Icons from 'lucide-react';
import { TABS } from '../types/tabs';
import { useTabStore } from '../store/tabStore';
import { TabButton } from './TabButton';

export function TabBar() {
  const { activeTab, setActiveTab } = useTabStore();

  return (
    <div 
      className="flex items-stretch w-full h-16 bg-nb-dark-100 border-b border-nb-dark-300"
      role="tablist"
      aria-label="Main navigation tabs"
    >
      {TABS.map((tab) => {
        const Icon = Icons[tab.icon as keyof typeof Icons] as any;
        return (
          <TabButton
            key={tab.id}
            id={tab.id}
            label={tab.label}
            icon={Icon}
            isActive={activeTab === tab.id}
            onClick={setActiveTab}
          />
        );
      })}
    </div>
  );
}
