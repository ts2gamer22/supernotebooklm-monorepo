import { useState, useRef, useEffect } from 'react';
import { Plus, X, Check } from 'lucide-react';
import clsx from 'clsx';
import { useFolderStore } from '../../stores/useFolderStore';
import { ColorPicker, FOLDER_COLOR_OPTIONS } from '../folders/ColorPicker';

const MAX_TAG_NAME_LENGTH = 30;

export function NewTagButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(FOLDER_COLOR_OPTIONS[0].value);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const createTag = useFolderStore(state => state.createTag);
  const tags = useFolderStore(state => state.tags);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const validateTagName = (name: string): string | null => {
    const trimmed = name.trim();

    if (!trimmed) {
      return 'Tag name is required';
    }

    if (trimmed.length > MAX_TAG_NAME_LENGTH) {
      return `Tag name must be ${MAX_TAG_NAME_LENGTH} characters or less`;
    }

    const duplicate = tags.find(
      tag => tag.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (duplicate) {
      return 'Tag already exists';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateTagName(tagName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      await createTag(tagName.trim(), selectedColor);
      setTagName('');
      setSelectedColor(FOLDER_COLOR_OPTIONS[0].value);
      setIsOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tag';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTagName('');
    setError(null);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="snlm-new-tag-button"
        aria-label="Create new tag"
      >
        <Plus size={14} aria-hidden="true" />
        New Tag
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="snlm-new-tag-form">
      <div className="snlm-new-tag-form__input-group">
        <input
          ref={inputRef}
          type="text"
          value={tagName}
          onChange={e => {
            setTagName(e.target.value);
            setError(null);
          }}
          placeholder="Tag name"
          maxLength={MAX_TAG_NAME_LENGTH}
          className={clsx('snlm-new-tag-form__input', {
            'snlm-new-tag-form__input--error': error,
          })}
          aria-label="Tag name"
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'tag-error' : undefined}
        />
        <div className="snlm-new-tag-form__actions">
          <button
            type="submit"
            disabled={isSubmitting}
            className="snlm-new-tag-form__submit"
            aria-label="Create tag"
          >
            <Check size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="snlm-new-tag-form__cancel"
            aria-label="Cancel"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <ColorPicker
        selectedColor={selectedColor}
        onSelect={setSelectedColor}
        className="snlm-new-tag-form__color-picker"
      />

      {error && (
        <div id="tag-error" className="snlm-new-tag-form__error" role="alert">
          {error}
        </div>
      )}
    </form>
  );
}
