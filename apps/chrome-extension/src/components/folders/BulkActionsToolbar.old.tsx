import { CheckSquare, XSquare, FolderInput, Tag, X } from 'lucide-react';
import { useSelectionStore } from '../../stores/useSelectionStore';
import { useFolderStore } from '../../stores/useFolderStore';
import { useState } from 'react';
import { BulkFolderMoveModal } from './BulkFolderMoveModal';
import { BulkTagModal } from './BulkTagModal';

interface BulkActionsToolbarProps {
  visibleNotebookIds: string[];
  onComplete?: () => void;
}

/**
 * BulkActionsToolbar - Toolbar for bulk operations on selected notebooks
 * 
 * Appears when 2+ notebooks are selected. Provides:
 * - Select All / Clear Selection
 * - Move to Folder
 * - Add/Remove Tags
 */
export function BulkActionsToolbar({ visibleNotebookIds, onComplete }: BulkActionsToolbarProps) {
  const selectedNotebookIds = useSelectionStore((state) => state.selectedNotebookIds);
  const selectAll = useSelectionStore((state) => state.selectAll);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const getSelectedCount = useSelectionStore((state) => state.getSelectedCount);
  const selectedCount = getSelectedCount();
  
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagModalMode, setTagModalMode] = useState<'add' | 'remove'>('add');

  // Don't show toolbar if less than 2 selected
  if (selectedCount < 2) {
    return null;
  }

  const handleSelectAll = () => {
    selectAll(visibleNotebookIds);
  };

  const handleMoveToFolder = () => {
    setShowFolderModal(true);
  };

  const handleAddTags = () => {
    setTagModalMode('add');
    setShowTagModal(true);
  };

  const handleRemoveTags = () => {
    setTagModalMode('remove');
    setShowTagModal(true);
  };

  const handleOperationComplete = () => {
    clearSelection();
    onComplete?.();
  };

  const allVisibleSelected = visibleNotebookIds.length > 0 && 
    visibleNotebookIds.every(id => selectedNotebookIds.has(id));

  return (
    <>
      <div className="snlm-bulk-toolbar sticky top-0 z-20 bg-nb-dark-200 border-b border-nb-dark-300 px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Selection info */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-nb-text">
              {selectedCount} selected
            </span>
            
            <button
              onClick={allVisibleSelected ? clearSelection : handleSelectAll}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-nb-gray-400 hover:text-nb-text transition-colors"
              type="button"
            >
              {allVisibleSelected ? (
                <>
                  <XSquare size={14} />
                  Clear All
                </>
              ) : (
                <>
                  <CheckSquare size={14} />
                  Select All ({visibleNotebookIds.length})
                </>
              )}
            </button>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleMoveToFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-text rounded-md transition-colors"
              type="button"
            >
              <FolderInput size={14} />
              Move to Folder
            </button>

            <button
              onClick={handleAddTags}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-text rounded-md transition-colors"
              type="button"
            >
              <Tag size={14} />
              Add Tags
            </button>

            <button
              onClick={handleRemoveTags}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-text rounded-md transition-colors"
              type="button"
            >
              <X size={14} />
              Remove Tags
            </button>

            <button
              onClick={clearSelection}
              className="ml-2 p-1.5 text-nb-gray-400 hover:text-nb-text transition-colors"
              type="button"
              aria-label="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFolderModal && (
        <BulkFolderMoveModal
          onClose={() => setShowFolderModal(false)}
          onComplete={handleOperationComplete}
        />
      )}

      {showTagModal && (
        <BulkTagModal
          mode={tagModalMode}
          onClose={() => setShowTagModal(false)}
          onComplete={handleOperationComplete}
        />
      )}
    </>
  );
}
