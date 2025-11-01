import { create } from 'zustand';
import { TabId } from '../types/tabs';

interface TabStore {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export const useTabStore = create<TabStore>((set) => ({
  activeTab: 'ai-assistant', // Default to AI Assistant
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
