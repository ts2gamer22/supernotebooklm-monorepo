import { useState } from 'react';
import { X, Tag, Plus, Minus } from 'lucide-react';
import { useFolderStore } from '../../stores/useFolderStore';
import { useSelectionStore } from '../../stores/useSelectionStore';
import { folderService } from '../../services/FolderService';

interface BulkTagModalProps {
  mode: 'add' | 'remove';
  onClose: () => void;
  onComplete: () => void;
}

/**
 * BulkTagModal - Modal for adding/removing tags from multiple notebooks
 * 
 * Displays tag list and applies tag changes to all selected notebooks.
 */
export function BulkTagModal({ mode, onClose, onComplete }: BulkTagModalProps) {
  const tags = useFolderStore((state) => state.tags);
  const getSelectedIds = useSelectionStore((state) => state.getSelectedIds);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedNotebookIds = getSelectedIds();
  const selectedCount = selectedNotebookIds.length;

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  };

  const handleApply = async () => {
    if (selectedTagIds.size === 0) return;

    setIsProcessing(true);
    try {
      const tagIdsArray = Array.from(selectedTagIds);

      // Apply tag changes to all selected notebooks
      for (const notebookId of selectedNotebookIds) {
        for (const tagId of tagIdsArray) {
          if (mode === 'add') {
            await folderService.assignTag(notebookId, tagId);
          } else {
            await folderService.removeTag(notebookId, tagId);
          }
        }
      }

      // Show success toast
      const tagNames = tags
        .filter(t => selectedTagIds.has(t.id))
        .map(t => t.name)
        .join(', ');
      
      const action = mode === 'add' ? 'added to' : 'removed from';
      showToast(
        `${selectedTagIds.size} tag${selectedTagIds.size !== 1 ? 's' : ''} ${action} ${selectedCount} notebook${selectedCount !== 1 ? 's' : ''}`,
        'success'
      );

      onComplete();
      onClose();
    } catch (error) {
      console.error('[BulkTagModal] Failed to update tags:', error);
      showToast('Failed to update tags', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const Icon = mode === 'add' ? Plus : Minus;
  const title = mode === 'add' ? 'Add Tags' : 'Remove Tags';
  const description = mode === 'add' 
    ? 'Select tags to add to the selected notebooks:'
    : 'Select tags to remove from the selected notebooks:';

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-nb-dark-100 rounded-lg shadow-xl w-[400px] max-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-nb-dark-300">
          <h3 className="text-lg font-semibold text-nb-text flex items-center gap-2">
            <Icon size={18} />
            {title} ({selectedCount} notebook{selectedCount !== 1 ? 's' : ''})
          </h3>
          <button 
            onClick={onClose}
            className="text-nb-gray-400 hover:text-nb-text transition-colors"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tag list */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-nb-gray-400 mb-3">
            {description}
          </p>

          <div className="space-y-2">
            {tags.map(tag => (
              <label
                key={tag.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-nb-dark-200 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedTagIds.has(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  className="w-4 h-4 text-nb-blue bg-nb-dark-300 border-nb-dark-400 rounded focus:ring-2 focus:ring-nb-blue"
                />
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm text-nb-text">{tag.name}</span>
                <span className="text-xs text-nb-gray-400 ml-auto">
                  ({tag.count})
                </span>
              </label>
            ))}
          </div>

          {tags.length === 0 && (
            <div className="text-sm text-nb-gray-400 text-center py-8">
              No tags available. Create a tag first.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-nb-dark-300">
          <span className="text-xs text-nb-gray-400">
            {selectedTagIds.size} tag{selectedTagIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-nb-gray-400 hover:text-nb-text transition-colors"
              type="button"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedTagIds.size === 0 || isProcessing}
              className="px-4 py-2 text-sm bg-nb-blue hover:bg-nb-blue/90 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              {isProcessing ? 'Processing...' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function showToast(message: string, variant: 'success' | 'error'): void {
  if (!document.body) return;

  const containerId = 'snlm-toast-container';
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'snlm-toast-container';
    container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `snlm-toast snlm-toast--${variant}`;
  toast.style.cssText = `
    background: ${variant === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
  }, 2800);

  setTimeout(() => {
    toast.remove();
    if (container && container.childElementCount === 0) {
      container.remove();
    }
  }, 3200);
}
