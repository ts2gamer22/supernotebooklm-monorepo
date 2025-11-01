import { useState } from 'react';
import { X, FolderInput } from 'lucide-react';
import { useFolderStore } from '../../stores/useFolderStore';
import { useSelectionStore } from '../../stores/useSelectionStore';
import { folderService } from '../../services/FolderService';

interface BulkFolderMoveModalProps {
  onClose: () => void;
  onComplete: () => void;
}

/**
 * BulkFolderMoveModal - Modal for moving multiple notebooks to a folder
 * 
 * Displays folder tree and moves all selected notebooks to chosen folder.
 */
export function BulkFolderMoveModal({ onClose, onComplete }: BulkFolderMoveModalProps) {
  const folders = useFolderStore((state) => state.folders);
  const getSelectedIds = useSelectionStore((state) => state.getSelectedIds);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const selectedNotebookIds = getSelectedIds();
  const selectedCount = selectedNotebookIds.length;

  const handleMove = async () => {
    if (!selectedFolderId) return;

    setIsMoving(true);
    try {
      // Move all selected notebooks
      for (const notebookId of selectedNotebookIds) {
        await folderService.moveNotebook(notebookId, selectedFolderId);
      }

      // Find folder name for toast
      const targetFolder = folders.find(f => f.id === selectedFolderId);
      const folderName = targetFolder?.name || 'folder';

      // Show success toast
      showToast(`${selectedCount} notebook${selectedCount !== 1 ? 's' : ''} moved to ${folderName}`, 'success');

      onComplete();
      onClose();
    } catch (error) {
      console.error('[BulkFolderMove] Failed to move notebooks:', error);
      showToast('Failed to move notebooks', 'error');
    } finally {
      setIsMoving(false);
    }
  };

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
            <FolderInput size={18} />
            Move {selectedCount} Notebook{selectedCount !== 1 ? 's' : ''}
          </h3>
          <button 
            onClick={onClose}
            className="text-nb-gray-400 hover:text-nb-text transition-colors"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-nb-gray-400 mb-3">
            Select a folder to move the selected notebooks:
          </p>

          <div className="space-y-1">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={`
                  w-full text-left px-3 py-2 rounded-md transition-colors
                  ${selectedFolderId === folder.id 
                    ? 'bg-nb-blue text-white' 
                    : 'hover:bg-nb-dark-200 text-nb-text'
                  }
                `}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: folder.color }}
                  />
                  <span className="text-sm">{folder.name}</span>
                  {folder.notebookIds && (
                    <span className="text-xs text-nb-gray-400 ml-auto">
                      ({folder.notebookIds.length})
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {folders.length === 0 && (
            <div className="text-sm text-nb-gray-400 text-center py-8">
              No folders available. Create a folder first.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-nb-dark-300">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-nb-gray-400 hover:text-nb-text transition-colors"
            type="button"
            disabled={isMoving}
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedFolderId || isMoving}
            className="px-4 py-2 text-sm bg-nb-blue hover:bg-nb-blue/90 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            {isMoving ? 'Moving...' : 'Move'}
          </button>
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
