export type TabId = 'ai-assistant' | 'history' | 'folders' | 'directory' | 'agents' | 'settings';

export interface Tab {
  id: TabId;
  label: string;
  icon: string; // Lucide icon name
  description: string;
}

export const TABS: Tab[] = [
  {
    id: 'ai-assistant',
    label: 'AI Assistant',
    icon: 'Bot',
    description: 'Ask questions and get AI-powered responses',
  },
  {
    id: 'history',
    label: 'History',
    icon: 'BookOpen',
    description: 'View and organize saved chats',
  },
  {
    id: 'folders',
    label: 'Folders',
    icon: 'FolderTree',
    description: 'Organize notebooks with folders and tags',
  },
  {
    id: 'directory',
    label: 'Directory',
    icon: 'Globe',
    description: 'Browse public notebooks',
  },
  {
    id: 'agents',
    label: 'AI Agents',
    icon: 'Brain',
    description: 'Automated research workflows',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    description: 'Configure extension preferences',
  },
];
