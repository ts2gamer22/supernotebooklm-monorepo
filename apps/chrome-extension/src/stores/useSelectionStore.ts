import { create } from 'zustand';

interface SelectionState {
  selectedNotebookIds: Set<string>;
  
  // Actions
  toggleSelection: (notebookId: string) => void;
  selectAll: (notebookIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (notebookId: string) => boolean;
  getSelectedCount: () => number;
  getSelectedIds: () => string[];
}

/**
 * useSelectionStore - Manages multi-select state for notebooks
 * 
 * Provides selection state and actions for bulk operations on notebooks.
 * Selection persists during filtering but is cleared on tab changes.
 */
export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedNotebookIds: new Set<string>(),

  toggleSelection: (notebookId: string) => {
    set((state) => {
      const newSelection = new Set(state.selectedNotebookIds);
      
      if (newSelection.has(notebookId)) {
        newSelection.delete(notebookId);
      } else {
        newSelection.add(notebookId);
      }
      
      return { selectedNotebookIds: newSelection };
    });
  },

  selectAll: (notebookIds: string[]) => {
    set({ selectedNotebookIds: new Set(notebookIds) });
  },

  clearSelection: () => {
    set({ selectedNotebookIds: new Set<string>() });
  },

  isSelected: (notebookId: string) => {
    return get().selectedNotebookIds.has(notebookId);
  },

  getSelectedCount: () => {
    return get().selectedNotebookIds.size;
  },

  getSelectedIds: () => {
    return Array.from(get().selectedNotebookIds);
  },
}));
