import { memo, useState } from 'react';
import clsx from 'clsx';
import type { Tag } from '../../types/folder';
import { TagContextMenu } from './TagContextMenu';

interface TagItemProps {
  tag: Tag;
  onClick?: () => void;
}

export const TagItem = memo(function TagItem({ tag, onClick }: TagItemProps) {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className="snlm-tag-item"
        style={{
          backgroundColor: tag.color,
          color: '#ffffff',
        }}
        title={`Filter by ${tag.name}`}
        aria-label={`Filter by ${tag.name} tag`}
      >
        <span className="snlm-tag-item__name">{tag.name}</span>
        {tag.count > 0 && (
          <span className="snlm-tag-item__count" aria-label={`${tag.count} notebooks`}>
            {tag.count}
          </span>
        )}
      </button>

      {isContextMenuOpen && (
        <TagContextMenu
          tag={tag}
          position={contextMenuPosition}
          onClose={() => setIsContextMenuOpen(false)}
        />
      )}
    </>
  );
});
