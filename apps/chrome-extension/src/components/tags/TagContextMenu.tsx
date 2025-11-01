import { useState, useRef, useEffect } from 'react';
import { Edit2, Palette, Trash2, X, Check } from 'lucide-react';
import clsx from 'clsx';
import type { Tag } from '../../types/folder';
import { useFolderStore } from '../../stores/useFolderStore';
import { ColorPicker, FOLDER_COLOR_OPTIONS } from '../folders/ColorPicker';

interface TagContextMenuProps {
  tag: Tag;
  position: { x: number; y: number };
  onClose: () => void;
}

const MAX_TAG_NAME_LENGTH = 30;

export function TagContextMenu({ tag, position, onClose }: TagContextMenuProps) {
  const [mode, setMode] = useState<'menu' | 'rename' | 'color' | 'delete'>('menu');
  const [renameValue, setRenameValue] = useState(tag.name);
  const [selectedColor, setSelectedColor] = useState(tag.color);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateTag = useFolderStore(state => state.updateTag);
  const deleteTag = useFolderStore(state => state.deleteTag);
  const tags = useFolderStore(state => state.tags);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (mode === 'rename' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [mode]);

  const validateTagName = (name: string): string | null => {
    const trimmed = name.trim();

    if (!trimmed) {
      return 'Tag name is required';
    }

    if (trimmed.length > MAX_TAG_NAME_LENGTH) {
      return `Tag name must be ${MAX_TAG_NAME_LENGTH} characters or less`;
    }

    const duplicate = tags.find(
      t => t.id !== tag.id && t.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (duplicate) {
      return 'Tag already exists';
    }

    return null;
  };

  const handleRename = async () => {
    setError(null);

    const validationError = validateTagName(renameValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      await updateTag(tag.id, { name: renameValue.trim() });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename tag';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleColorChange = async () => {
    setIsSubmitting(true);

    try {
      await updateTag(tag.id, { color: selectedColor });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update color';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);

    try {
      await deleteTag(tag.id);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete tag';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={menuRef}
      className="snlm-tag-context-menu"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      role="menu"
      aria-label="Tag actions"
    >
      {mode === 'menu' && (
        <>
          <button
            type="button"
            className="snlm-tag-context-menu__item"
            onClick={() => setMode('rename')}
            role="menuitem"
          >
            <Edit2 size={14} aria-hidden="true" />
            Rename
          </button>
          <button
            type="button"
            className="snlm-tag-context-menu__item"
            onClick={() => setMode('color')}
            role="menuitem"
          >
            <Palette size={14} aria-hidden="true" />
            Change Color
          </button>
          <button
            type="button"
            className="snlm-tag-context-menu__item snlm-tag-context-menu__item--danger"
            onClick={() => setMode('delete')}
            role="menuitem"
          >
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </button>
        </>
      )}

      {mode === 'rename' && (
        <div className="snlm-tag-context-menu__rename">
          <input
            ref={inputRef}
            type="text"
            value={renameValue}
            onChange={e => {
              setRenameValue(e.target.value);
              setError(null);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleRename();
              }
            }}
            maxLength={MAX_TAG_NAME_LENGTH}
            className={clsx('snlm-tag-context-menu__input', {
              'snlm-tag-context-menu__input--error': error,
            })}
            aria-label="Tag name"
            aria-invalid={error ? 'true' : 'false'}
          />
          <div className="snlm-tag-context-menu__actions">
            <button
              type="button"
              onClick={handleRename}
              disabled={isSubmitting}
              className="snlm-tag-context-menu__action snlm-tag-context-menu__action--primary"
              aria-label="Save"
            >
              <Check size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('menu');
                setRenameValue(tag.name);
                setError(null);
              }}
              className="snlm-tag-context-menu__action"
              aria-label="Cancel"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          {error && (
            <div className="snlm-tag-context-menu__error" role="alert">
              {error}
            </div>
          )}
        </div>
      )}

      {mode === 'color' && (
        <div className="snlm-tag-context-menu__color">
          <ColorPicker selectedColor={selectedColor} onSelect={setSelectedColor} />
          <div className="snlm-tag-context-menu__actions">
            <button
              type="button"
              onClick={handleColorChange}
              disabled={isSubmitting}
              className="snlm-tag-context-menu__action snlm-tag-context-menu__action--primary"
              aria-label="Save"
            >
              <Check size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('menu');
                setSelectedColor(tag.color);
                setError(null);
              }}
              className="snlm-tag-context-menu__action"
              aria-label="Cancel"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          {error && (
            <div className="snlm-tag-context-menu__error" role="alert">
              {error}
            </div>
          )}
        </div>
      )}

      {mode === 'delete' && (
        <div className="snlm-tag-context-menu__delete">
          <p className="snlm-tag-context-menu__delete-message">
            {tag.count > 0
              ? `Remove tag from ${tag.count} notebook${tag.count === 1 ? '' : 's'}?`
              : 'Delete this tag?'}
          </p>
          <div className="snlm-tag-context-menu__actions">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="snlm-tag-context-menu__action snlm-tag-context-menu__action--danger"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setMode('menu')}
              className="snlm-tag-context-menu__action"
            >
              Cancel
            </button>
          </div>
          {error && (
            <div className="snlm-tag-context-menu__error" role="alert">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
