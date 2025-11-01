import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AIMessage } from '../../../src/types/ai';
import { ChatService } from '../../../src/services/ChatService';

interface ChatState {
  messages: AIMessage[];
  addMessage: (message: AIMessage) => void;
  setMessages: (messages: AIMessage[]) => void;
  clearChat: () => void;
}

// Adapter for chrome.storage.local compatible with Zustand's async storage API
const chromeStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(name);
    const value = result?.[name];
    return typeof value === 'string' ? value : value ? JSON.stringify(value) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [name]: value });
  },
  removeItem: async (name: string): Promise<void> => {
    await chrome.storage.local.remove(name);
  },
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: async (message) => {
        set((state) => ({ messages: [...state.messages, message] }));
        
        // Save to Convex + IndexedDB for search functionality
        // Save pairs of user question + assistant answer
        if (message.role === 'assistant') {
          // Get the previous message (should be user question)
          const state = useChatStore.getState();
          const messages = state.messages;
          const lastUserMessage = messages[messages.length - 2];
          
          if (lastUserMessage && lastUserMessage.role === 'user') {
            try {
              // Use ChatService for write-through to Convex
              await ChatService.saveChat({
                question: lastUserMessage.content,
                answer: message.content,
                timestamp: Date.now(),
                notebookId: '',
                source: 'notebooklm',
              });
              console.log('[ChatStore] Saved to Convex + IndexedDB');
            } catch (error) {
              console.error('[ChatStore] Failed to save chat:', error);
              // Chat is still saved locally by ChatService fallback
            }
          }
        }
      },
      setMessages: (messages) => set({ messages }),
      clearChat: () => set({ messages: [] }),
    }),
    {
      name: 'ai-assistant-chat-storage',
      storage: createJSONStorage(() => chromeStorage),
      version: 1,
    }
  )
);
