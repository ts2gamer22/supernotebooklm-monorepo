import { FolderInput, Tag, X, Check } from 'lucide-react';
import { useSelectionStore } from '../../stores/useSelectionStore';
import { useState } from 'react';
import { BulkFolderMoveModal } from './BulkFolderMoveModal';
import { BulkTagModal } from './BulkTagModal';

interface BulkActionsToolbarProps {
  visibleNotebookIds: string[];
  onComplete?: () => void;
}

/**
 * BulkActionsToolbar - Compact action bar for bulk operations
 * 
 * Appears in header when 1+ notebooks are selected.
 * Compact design that fits within sidebar width.
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

  // Don't show toolbar if less than 1 selected
  if (selectedCount < 1) {
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
      {/* Compact bulk actions bar - fits in sidebar header */}
      <div className="bg-nb-dark-200 border-b border-nb-dark-300 px-3 py-2">
        {/* Top row: Selection count + clear */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-nb-blue flex items-center justify-center">
              <Check size={10} className="text-white" />
            </div>
            <span className="text-xs font-medium text-nb-text">
              {selectedCount} selected
            </span>
            {!allVisibleSelected && visibleNotebookIds.length > selectedCount && (
              <button
                onClick={handleSelectAll}
                className="text-xs text-nb-blue hover:underline ml-1"
                type="button"
              >
                (Select all {visibleNotebookIds.length})
              </button>
            )}
          </div>
          <button
            onClick={clearSelection}
            className="text-nb-gray-400 hover:text-nb-text"
            type="button"
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        </div>

        {/* Bottom row: Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleMoveToFolder}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-text rounded transition-colors flex-1 justify-center"
            type="button"
          >
            <FolderInput size={12} />
            <span>Move</span>
          </button>

          <button
            onClick={handleAddTags}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-text rounded transition-colors flex-1 justify-center"
            type="button"
          >
            <Tag size={12} />
            <span>Add Tags</span>
          </button>

          <button
            onClick={handleRemoveTags}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-text rounded transition-colors flex-1 justify-center"
            type="button"
          >
            <X size={12} />
            <span>Remove</span>
          </button>
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
