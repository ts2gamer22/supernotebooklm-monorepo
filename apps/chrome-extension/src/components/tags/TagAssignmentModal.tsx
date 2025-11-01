import { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { NotebookMetadata } from '../../types/folder';
import { useFolderStore } from '../../stores/useFolderStore';
import { TagAutocomplete } from './TagAutocomplete';

interface TagAssignmentModalProps {
  notebookId: string;
  metadata: NotebookMetadata;
  onClose: () => void;
}

const MAX_TAGS_PER_NOTEBOOK = 10;

export function TagAssignmentModal({ notebookId, metadata, onClose }: TagAssignmentModalProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(metadata.tagIds || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tags = useFolderStore(state => state.tags);
  const assignTag = useFolderStore(state => state.assignTag);
  const removeTag = useFolderStore(state => state.removeTag);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) {
      return tags;
    }

    const query = searchQuery.toLowerCase();
    return tags.filter(tag => tag.name.toLowerCase().includes(query));
  }, [tags, searchQuery]);

  const handleToggleTag = (tagId: string) => {
    setError(null);

    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(prev => prev.filter(id => id !== tagId));
    } else {
      if (selectedTagIds.length >= MAX_TAGS_PER_NOTEBOOK) {
        setError(`Maximum ${MAX_TAGS_PER_NOTEBOOK} tags per notebook`);
        return;
      }
      setSelectedTagIds(prev => [...prev, tagId]);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const toAdd = selectedTagIds.filter(id => !metadata.tagIds.includes(id));
      const toRemove = metadata.tagIds.filter(id => !selectedTagIds.includes(id));

      for (const tagId of toAdd) {
        await assignTag(notebookId, tagId);
      }

      for (const tagId of toRemove) {
        await removeTag(notebookId, tagId);
      }

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update tags';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="snlm-tag-assignment-modal"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tag-modal-title"
    >
      <div className="snlm-tag-assignment-modal__content">
        <div className="snlm-tag-assignment-modal__header">
          <h3 id="tag-modal-title" className="snlm-tag-assignment-modal__title">
            Manage Tags
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="snlm-tag-assignment-modal__close"
            aria-label="Close"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="snlm-tag-assignment-modal__search">
          <TagAutocomplete
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search tags..."
          />
        </div>

        <div className="snlm-tag-assignment-modal__body">
          {filteredTags.length === 0 ? (
            <div className="snlm-tag-assignment-modal__empty">
              {searchQuery ? 'No tags found matching your search.' : 'No tags yet. Create one first!'}
            </div>
          ) : (
            <div className="snlm-tag-assignment-modal__tags" role="group" aria-label="Available tags">
              {filteredTags.map(tag => {
                const isSelected = selectedTagIds.includes(tag.id);

                return (
                  <label
                    key={tag.id}
                    className={clsx('snlm-tag-assignment-modal__tag', {
                      'snlm-tag-assignment-modal__tag--disabled':
                        !isSelected && selectedTagIds.length >= MAX_TAGS_PER_NOTEBOOK,
                    })}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleTag(tag.id)}
                      disabled={!isSelected && selectedTagIds.length >= MAX_TAGS_PER_NOTEBOOK}
                      className="snlm-tag-assignment-modal__checkbox"
                      aria-label={`Toggle ${tag.name} tag`}
                    />
                    <div
                      className="snlm-tag-assignment-modal__color"
                      style={{ backgroundColor: tag.color }}
                      aria-hidden="true"
                    />
                    <span className="snlm-tag-assignment-modal__tag-name">{tag.name}</span>
                    <span className="snlm-tag-assignment-modal__tag-count">
                      ({tag.count})
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="snlm-tag-assignment-modal__error" role="alert">
            {error}
          </div>
        )}

        <div className="snlm-tag-assignment-modal__footer">
          <span className="snlm-tag-assignment-modal__counter">
            {selectedTagIds.length} / {MAX_TAGS_PER_NOTEBOOK} tags selected
          </span>
          <div className="snlm-tag-assignment-modal__actions">
            <button
              type="button"
              onClick={onClose}
              className="snlm-tag-assignment-modal__button snlm-tag-assignment-modal__button--secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="snlm-tag-assignment-modal__button snlm-tag-assignment-modal__button--primary"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
