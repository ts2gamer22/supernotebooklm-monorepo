import { useState, useCallback, useEffect } from 'react';
import { FolderTree } from '@/src/components/folders/FolderTree';
import { SearchBar } from '@/src/components/search/SearchBar';
import { BulkActionsToolbar } from '@/src/components/folders/BulkActionsToolbar';
import { useSelectionStore } from '@/src/stores/useSelectionStore';

/**
 * FoldersTab - Displays folder tree and tags for organizing notebooks
 * 
 * This tab provides a stable UI for folder/tag management within the extension sidepanel,
 * independent of NotebookLM's DOM structure. The FolderTree component internally includes
 * the TagSection component.
 * 
 * Features:
 * - Hierarchical folder structure with drag-and-drop
 * - Collapsible folders with state persistence
 * - Tag management for cross-folder categorization
 * - Context menus for folder/tag operations
 * - Color-coded organization
 * - Search and filter notebooks by name, folder, tag, or date
 */
export function FoldersTab() {
  const [filteredNotebookIds, setFilteredNotebookIds] = useState<string[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const getSelectedCount = useSelectionStore((state) => state.getSelectedCount);

  const handleSearchResults = useCallback((notebookIds: string[], query: string) => {
    // null means show all, empty array means no results
    setFilteredNotebookIds(query || notebookIds.length > 0 ? notebookIds : null);
    setSearchQuery(query);
    
    // Clear selection when filter changes
    if (getSelectedCount() > 0) {
      clearSelection();
    }
  }, [clearSelection, getSelectedCount]);

  // Clear selection when tab unmounts
  useEffect(() => {
    return () => {
      clearSelection();
    };
  }, [clearSelection]);

  return (
    <div 
      className="h-full w-full flex flex-col bg-nb-dark-100"
      role="tabpanel"
      aria-label="Folders and tags organization"
    >
      {/* Search bar at top */}
      <SearchBar onResultsChange={handleSearchResults} />
      
      {/* Bulk actions toolbar (appears when 2+ notebooks selected) */}
      <BulkActionsToolbar 
        visibleNotebookIds={filteredNotebookIds || []}
        onComplete={() => {
          // Refresh could be added here if needed
        }}
      />
      
      {/* FolderTree with search results */}
      <div className="flex-1 overflow-auto">
        <FolderTree 
          filteredNotebookIds={filteredNotebookIds}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}
