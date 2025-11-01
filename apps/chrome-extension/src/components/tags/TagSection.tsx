import { useEffect } from 'react';
import { Tag as TagIcon } from 'lucide-react';
import { useFolderStore } from '../../stores/useFolderStore';
import { TagItem } from './TagItem';
import { NewTagButton } from './NewTagButton';

export function TagSection() {
  const tags = useFolderStore(state => state.tags);
  const loadFolders = useFolderStore(state => state.loadFolders);
  const isLoading = useFolderStore(state => state.isLoading);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  if (isLoading) {
    return (
      <div className="snlm-tag-section snlm-tag-section--loading">
        <div className="snlm-tag-section__skeleton" />
        <div className="snlm-tag-section__skeleton" />
      </div>
    );
  }

  return (
    <div className="snlm-tag-section">
      <div className="snlm-tag-section__header">
        <div className="snlm-tag-section__header-content">
          <div className="snlm-tag-section__badge">
            <TagIcon size={12} aria-hidden="true" />
            <span>TAGS</span>
            <span className="snlm-tag-section__count">({tags.length})</span>
          </div>
          <p className="snlm-tag-section__subtitle">Label notebooks across all folders</p>
        </div>
        <NewTagButton />
      </div>

      {tags.length === 0 ? (
        <div className="snlm-tag-section__empty">
          No tags yet. Create one to get started!
        </div>
      ) : (
        <div className="snlm-tag-section__list">
          {tags.map(tag => (
            <TagItem key={tag.id} tag={tag} />
          ))}
        </div>
      )}
    </div>
  );
}
