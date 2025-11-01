import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Folder as FolderIcon } from 'lucide-react';
import clsx from 'clsx';
import { useSelectionStore } from '../../stores/useSelectionStore';

export interface FolderNotebookNode {
  id: string;
  name: string;
  lastUpdatedAt?: number;
  url: string;
}

interface FolderItemProps {
  id: string;
  name: string;
  color: string;
  depth: number;
  isCollapsed: boolean;
  isSelected: boolean;
  isRenaming: boolean;
  notebookCount: number;
  notebooks: FolderNotebookNode[];
  onSelect: () => void;
  onToggleCollapse: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onDropNotebook: (notebookId: string) => void;
  onRenameSubmit: (name: string) => void;
  onRenameCancel: () => void;
  onNotebookClick: (notebookId: string, url: string) => void;
  children?: React.ReactNode;
}

export function FolderItem({
  id,
  name,
  color,
  depth,
  isCollapsed,
  isSelected,
  isRenaming,
  notebookCount,
  notebooks,
  onSelect,
  onToggleCollapse,
  onContextMenu,
  onDropNotebook,
  onRenameSubmit,
  onRenameCancel,
  onNotebookClick,
  children,
}: FolderItemProps) {
  const [renameValue, setRenameValue] = useState(name);
  const [isDragOver, setDragOver] = useState(false);
  const toggleSelection = useSelectionStore((state) => state.toggleSelection);
  const isNotebookSelected = useSelectionStore((state) => state.isSelected);

  useEffect(() => {
    if (isRenaming) {
      setRenameValue(name);
    }
  }, [isRenaming, name]);

  const indentation = useMemo(() => Math.max(0, depth - 1) * 12, [depth]);

  return (
    <div className={clsx('snlm-folder-item', { 'snlm-folder-item--selected': isSelected })}>
      <div
        className={clsx('snlm-folder-item__row', {
          'snlm-folder-item__row--drop': isDragOver,
        })}
        style={{ paddingLeft: 12 + indentation }}
        onClick={event => {
          event.stopPropagation();
          onSelect();
        }}
        onContextMenu={event => {
          event.preventDefault();
          event.stopPropagation();
          onContextMenu(event);
        }}
        draggable={false}
        onDragEnter={event => {
          if (event.dataTransfer.types.includes('application/snlm-notebook')) {
            setDragOver(true);
          }
        }}
        onDragOver={event => {
          if (event.dataTransfer.types.includes('application/snlm-notebook')) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={event => {
          const notebookId =
            event.dataTransfer.getData('application/snlm-notebook') ||
            event.dataTransfer.getData('text/plain');

          if (notebookId) {
            event.preventDefault();
            onDropNotebook(notebookId);
          }
          setDragOver(false);
        }}
      >
        <button
          type="button"
          className={clsx('snlm-folder-item__toggle', { 'snlm-folder-item__toggle--collapsed': isCollapsed })}
          aria-label={isCollapsed ? 'Expand folder' : 'Collapse folder'}
          onClick={event => {
            event.stopPropagation();
            onToggleCollapse();
          }}
        >
          <ChevronDown aria-hidden="true" />
        </button>
        <span
          className="snlm-folder-item__icon"
          style={{ backgroundColor: color || '#6b7280' }}
          aria-hidden="true"
        >
          <FolderIcon size={14} />
        </span>
        {isRenaming ? (
          <form
            className="snlm-folder-item__rename"
            onSubmit={event => {
              event.preventDefault();
              const trimmed = renameValue.trim();
              if (trimmed) {
                onRenameSubmit(trimmed);
              }
            }}
          >
            <input
              autoFocus
              className="snlm-folder-item__rename-input"
              value={renameValue}
              onChange={event => setRenameValue(event.target.value)}
              onClick={event => event.stopPropagation()}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  onRenameCancel();
                }
              }}
            />
            <div className="snlm-folder-item__rename-actions">
              <button type="submit" className="snlm-folder-item__rename-save">
                Save
              </button>
              <button
                type="button"
                className="snlm-folder-item__rename-cancel"
                onClick={event => {
                  event.preventDefault();
                  onRenameCancel();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="snlm-folder-item__meta">
            <span className="snlm-folder-item__name" title={name}>
              {name}
            </span>
            <span className="snlm-folder-item__count">{notebookCount}</span>
          </div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key={`${id}-content`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="snlm-folder-item__body"
          >
            {notebooks.length > 0 ? (
              <ul className="snlm-folder-item__notebooks">
                {notebooks.map(notebook => (
                  <li
                    key={notebook.id}
                    className="snlm-folder-item__notebook"
                    draggable="true"
                    onDragStart={event => {
                      event.stopPropagation();
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('application/snlm-notebook', notebook.id);
                      event.dataTransfer.setData('text/plain', notebook.id);
                      
                      // Add visual feedback
                      event.currentTarget.style.opacity = '0.5';
                      
                      // Create drag ghost
                      const ghost = document.createElement('div');
                      ghost.textContent = `📓 ${notebook.name}`;
                      ghost.style.cssText = `
                        position: fixed;
                        top: -1000px;
                        padding: 8px 12px;
                        border-radius: 8px;
                        background: rgba(79, 70, 229, 0.9);
                        color: #f8fafc;
                        font-size: 13px;
                        font-weight: 600;
                        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.35);
                        pointer-events: none;
                        max-width: 250px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      `;
                      document.body.appendChild(ghost);
                      event.dataTransfer.setDragImage(ghost, 20, 20);
                      requestAnimationFrame(() => ghost.remove());
                    }}
                    onDragEnd={event => {
                      event.currentTarget.style.opacity = '1';
                    }}
                    style={{ cursor: 'grab' }}
                  >
                    <span className="snlm-folder-item__notebook-dot" />
                    <button
                      type="button"
                      className="snlm-folder-item__notebook-name"
                      title={notebook.name}
                      onClick={() => onNotebookClick(notebook.id, notebook.url)}
                      style={{ pointerEvents: 'auto' }}
                    >
                      {notebook.name}
                    </button>
                    <div 
                      className={`snlm-folder-item__notebook-checkbox ${isNotebookSelected(notebook.id) ? 'checked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(notebook.id);
                      }}
                      role="checkbox"
                      aria-checked={isNotebookSelected(notebook.id)}
                      aria-label={`Select ${notebook.name}`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSelection(notebook.id);
                        }
                      }}
                    >
                      {isNotebookSelected(notebook.id) && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="snlm-folder-item__empty">No notebooks yet</p>
            )}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
