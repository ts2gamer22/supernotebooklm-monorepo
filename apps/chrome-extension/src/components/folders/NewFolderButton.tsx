import { FormEvent, useState } from 'react';
import clsx from 'clsx';

interface NewFolderButtonProps {
  onCreate: (name: string) => Promise<void>;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function NewFolderButton({
  onCreate,
  disabled = false,
  label = '+ New Folder',
  className,
}: NewFolderButtonProps) {
  const [isCreating, setCreating] = useState(false);
  const [value, setValue] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) {
      setError('Folder name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onCreate(value.trim());
      setCreating(false);
      setValue('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create folder');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isCreating) {
    return (
      <button
        type="button"
        className={clsx('snlm-folder-button', className)}
        onClick={() => setCreating(true)}
        disabled={disabled}
      >
        {label}
      </button>
    );
  }

  return (
    <form className={clsx('snlm-folder-button snlm-folder-button--form', className)} onSubmit={handleSubmit}>
      <input
        className="snlm-folder-button__input"
        autoFocus
        placeholder="Folder name"
        value={value}
        onChange={event => {
          setValue(event.target.value);
          setError(null);
        }}
        disabled={isSubmitting}
      />
      <div className="snlm-folder-button__actions">
        <button type="submit" className="snlm-folder-button__submit" disabled={isSubmitting}>
          Create
        </button>
        <button
          type="button"
          className="snlm-folder-button__cancel"
          onClick={() => {
            setCreating(false);
            setValue('');
            setError(null);
          }}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
      {error ? <p className="snlm-folder-button__error">{error}</p> : null}
    </form>
  );
}
