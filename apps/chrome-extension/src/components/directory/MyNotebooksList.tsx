/**
 * MyNotebooksList Component
 * Story 4.5: User Profile & My Published Notebooks - Task 3
 * 
 * Displays user's published notebooks with edit, delete, and unpublish actions
 */

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Edit, Trash2, Eye, EyeOff, X, Check } from 'lucide-react';
import type { PublicNotebook } from '@/src/types/directory';
import type { Id } from '../../../convex/_generated/dataModel';

interface MyNotebooksListProps {
  notebooks: PublicNotebook[];
}

export function MyNotebooksList({ notebooks }: MyNotebooksListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteNotebook = useMutation(api.notebooks.deletePublicNotebook);
  const updateNotebook = useMutation(api.notebooks.updatePublicNotebook);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(notebooks.map(nb => nb._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} notebook(s)? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      for (const id of selectedIds) {
        await deleteNotebook({ notebookId: id as Id<'publicNotebooks'> });
      }
      setSelectedIds(new Set());
    } catch (error) {
      console.error('[MyNotebooksList] Bulk delete error:', error);
      alert('Failed to delete some notebooks. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnpublish = async (notebookId: string, isPublic: boolean) => {
    try {
      await updateNotebook({
        notebookId: notebookId as Id<'publicNotebooks'>,
        isPublic: !isPublic,
      });
    } catch (error) {
      console.error('[MyNotebooksList] Unpublish error:', error);
      alert('Failed to update notebook. Please try again.');
    }
  };

  if (notebooks.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-nb-dark-300 mb-4">
          <Eye className="w-8 h-8 text-nb-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-nb-text mb-2">No Published Notebooks</h3>
        <p className="text-sm text-nb-gray-400 max-w-sm mx-auto">
          Share your first notebook to the public directory from the Directory tab!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-nb-blue/10 border border-nb-blue/30 rounded-lg">
          <span className="text-sm text-nb-text">
            <strong>{selectedIds.size}</strong> notebook{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : 'Delete Selected'}
          </button>
        </div>
      )}

      {/* List Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-nb-dark-300 border-b border-nb-dark-400">
        <input
          type="checkbox"
          checked={selectedIds.size === notebooks.length && notebooks.length > 0}
          onChange={handleSelectAll}
          className="w-4 h-4 rounded border-nb-dark-400 bg-nb-dark-200 text-nb-blue focus:ring-nb-blue focus:ring-offset-0"
        />
        <span className="flex-1 text-sm font-semibold text-nb-text">Title</span>
        <span className="w-20 text-sm font-semibold text-nb-text text-center">Views</span>
        <span className="w-32 text-sm font-semibold text-nb-text text-center">Status</span>
        <span className="w-40 text-sm font-semibold text-nb-text text-right">Actions</span>
      </div>

      {/* Notebook List */}
      <div className="space-y-2">
        {notebooks.map((notebook) => (
          <NotebookListItem
            key={notebook._id}
            notebook={notebook}
            isSelected={selectedIds.has(notebook._id)}
            isEditing={editingId === notebook._id}
            onToggleSelect={() => handleToggleSelect(notebook._id)}
            onEdit={() => setEditingId(notebook._id)}
            onSaveEdit={() => setEditingId(null)}
            onCancelEdit={() => setEditingId(null)}
            onDelete={async () => {
              if (confirm('Delete this notebook? This action cannot be undone.')) {
                try {
                  await deleteNotebook({ notebookId: notebook._id as Id<'publicNotebooks'> });
                } catch (error) {
                  console.error('[MyNotebooksList] Delete error:', error);
                  alert('Failed to delete notebook. Please try again.');
                }
              }
            }}
            onUnpublish={() => handleUnpublish(notebook._id, notebook.isPublic)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// NotebookListItem Component
// ============================================================================

interface NotebookListItemProps {
  notebook: PublicNotebook;
  isSelected: boolean;
  isEditing: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onUnpublish: () => void;
}

function NotebookListItem({
  notebook,
  isSelected,
  isEditing,
  onToggleSelect,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onUnpublish,
}: NotebookListItemProps) {
  const [title, setTitle] = useState(notebook.title);
  const [description, setDescription] = useState(notebook.description);
  const [isSaving, setIsSaving] = useState(false);

  const updateNotebook = useMutation(api.notebooks.updatePublicNotebook);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Title cannot be empty');
      return;
    }

    if (title.length < 3 || title.length > 100) {
      alert('Title must be 3-100 characters');
      return;
    }

    if (description.length < 10 || description.length > 500) {
      alert('Description must be 10-500 characters');
      return;
    }

    setIsSaving(true);
    try {
      await updateNotebook({
        notebookId: notebook._id as Id<'publicNotebooks'>,
        title: title.trim(),
        description: description.trim(),
      });
      onSaveEdit();
    } catch (error) {
      console.error('[NotebookListItem] Save error:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(notebook.title);
    setDescription(notebook.description);
    onCancelEdit();
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-nb-dark-200 border border-nb-dark-300 rounded-lg hover:bg-nb-dark-250 transition-colors">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        disabled={isEditing}
        className="w-4 h-4 rounded border-nb-dark-400 bg-nb-dark-200 text-nb-blue focus:ring-nb-blue focus:ring-offset-0 disabled:opacity-50"
      />

      {isEditing ? (
        // Edit Mode
        <div className="flex-1 space-y-3">
          <div>
            <label className="block text-xs text-nb-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-nb-dark-300 border border-nb-dark-400 rounded text-sm text-nb-text placeholder-nb-gray-500 focus:outline-none focus:border-nb-blue"
              placeholder="Enter notebook title"
              maxLength={100}
            />
            <p className="text-xs text-nb-gray-500 mt-1">{title.length}/100</p>
          </div>
          <div>
            <label className="block text-xs text-nb-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-nb-dark-300 border border-nb-dark-400 rounded text-sm text-nb-text placeholder-nb-gray-500 focus:outline-none focus:border-nb-blue resize-none"
              placeholder="Enter notebook description"
              maxLength={500}
            />
            <p className="text-xs text-nb-gray-500 mt-1">{description.length}/500</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-nb-blue hover:bg-nb-blue/90 disabled:bg-nb-blue/50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-nb-dark-300 hover:bg-nb-dark-400 disabled:opacity-50 text-nb-text text-sm font-medium rounded-lg border border-nb-dark-400 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // View Mode
        <>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-nb-text mb-1 truncate">{notebook.title}</h3>
            <p className="text-xs text-nb-gray-400 line-clamp-2">{notebook.description}</p>
            <p className="text-xs text-nb-gray-500 mt-1">
              {new Date(notebook.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="w-20 text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-nb-text">
              <Eye className="w-4 h-4 text-nb-gray-400" />
              <span>{notebook.viewCount}</span>
            </div>
          </div>

          <div className="w-32 text-center">
            {notebook.isPublic ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600/20 text-green-400 text-xs font-medium rounded">
                <Eye className="w-3 h-3" />
                Published
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-600/20 text-gray-400 text-xs font-medium rounded">
                <EyeOff className="w-3 h-3" />
                Unpublished
              </span>
            )}
          </div>

          <div className="w-40 flex items-center justify-end gap-2">
            <button
              onClick={onEdit}
              className="p-2 bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-text rounded border border-nb-dark-400 transition-colors"
              title="Edit notebook"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onUnpublish}
              className="p-2 bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-text rounded border border-nb-dark-400 transition-colors"
              title={notebook.isPublic ? 'Unpublish' : 'Publish'}
            >
              {notebook.isPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={onDelete}
              className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded border border-red-600/30 transition-colors"
              title="Delete notebook"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
