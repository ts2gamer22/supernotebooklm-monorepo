import { useEffect } from 'react';
import clsx from 'clsx';

interface FolderContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  folderName: string;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onAddSubfolder: () => void;
  onChangeColor: () => void;
  canRename?: boolean;
  canDelete?: boolean;
  canAddSubfolder?: boolean;
  canChangeColor?: boolean;
}

export function FolderContextMenu({
  visible,
  position,
  folderName,
  onClose,
  onRename,
  onDelete,
  onAddSubfolder,
  onChangeColor,
  canRename = true,
  canDelete = true,
  canAddSubfolder = true,
  canChangeColor = true,
}: FolderContextMenuProps) {
  useEffect(() => {
    if (!visible) {
      return;
    }

    const handleClickAway = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.snlm-folder-context-menu')) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickAway, true);
    document.addEventListener('keyup', handleEscape, true);

    return () => {
      document.removeEventListener('mousedown', handleClickAway, true);
      document.removeEventListener('keyup', handleEscape, true);
    };
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  const style: React.CSSProperties = {
    top: position.y,
    left: position.x,
  };

  return (
    <div className={clsx('snlm-folder-context-menu')} style={style}>
      <span className="snlm-folder-context-menu__label" title={folderName}>
        {folderName}
      </span>
      {canRename ? (
        <button
          type="button"
          className="snlm-folder-context-menu__item"
          onClick={() => {
            onRename();
            onClose();
          }}
        >
          Rename
        </button>
      ) : null}
      {canAddSubfolder ? (
        <button
          type="button"
          className="snlm-folder-context-menu__item"
          onClick={() => {
            onAddSubfolder();
            onClose();
          }}
        >
          Add Subfolder
        </button>
      ) : null}
      {canChangeColor ? (
        <button
          type="button"
          className="snlm-folder-context-menu__item"
          onClick={() => {
            onChangeColor();
            onClose();
          }}
        >
          Change Color
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          className="snlm-folder-context-menu__item snlm-folder-context-menu__item--danger"
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          Delete...
        </button>
      ) : null}
    </div>
  );
}
