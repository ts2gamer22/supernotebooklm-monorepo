import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { shallow } from 'zustand/shallow';
import { FolderItem, type FolderNotebookNode } from './FolderItem';
import { FolderContextMenu } from './FolderContextMenu';
import { ColorPicker } from './ColorPicker';
import { NewFolderButton } from './NewFolderButton';
import type { FolderTreeNode } from '../../services/FolderService';
import { folderService } from '../../services/FolderService';
import { DEFAULT_FOLDER_ID, DEFAULT_FOLDER_NAME, type NotebookMetadata } from '../../types/folder';
import { useFolderStore, type FolderStoreState } from '../../stores/useFolderStore';
import { TagSection } from '../tags/TagSection';
import './styles.css';
import './styles-patch.css';
import './bulk-styles.css';
import '../tags/styles.css';

interface ContextMenuState {
  folder: FolderTreeNode;
  position: { x: number; y: number };
}

interface ColorMenuState {
  folder: FolderTreeNode;
  position: { x: number; y: number };
}

interface ConfirmDeleteState {
  folder: FolderTreeNode;
  notebookCount: number;
  childCount: number;
}

const storeSelector = (state: FolderStoreState) => ({
  folders: state.folders,
  loadFolders: state.loadFolders,
  refreshFromService: state.refreshFromService,
  selectFolder: state.selectFolder,
  selectedFolderId: state.selectedFolderId,
  moveNotebook: state.moveNotebook,
  createFolder: state.createFolder,
  updateFolder: state.updateFolder,
  deleteFolder: state.deleteFolder,
  isLoading: state.isLoading,
  error: state.error,
  collapsedFolderIds: state.collapsedFolderIds,
  toggleFolderCollapsed: state.toggleFolderCollapsed,
  isSyncFallback: state.isSyncFallback,
  registerServiceListener: state.registerServiceListener,
});

interface FolderTreeProps {
  filteredNotebookIds?: string[] | null;
  searchQuery?: string;
}

export function FolderTree({ filteredNotebookIds, searchQuery }: FolderTreeProps = {}): JSX.Element {
  const {
    folders,
    loadFolders,
    refreshFromService,
    selectFolder,
    selectedFolderId,
    moveNotebook,
    createFolder,
    updateFolder,
    deleteFolder,
    isLoading,
    error,
    collapsedFolderIds,
    toggleFolderCollapsed,
    isSyncFallback,
    registerServiceListener,
  } = useFolderStore(storeSelector, shallow);

  const hasLoadedRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [colorMenu, setColorMenu] = useState<ColorMenuState | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);
  const [creatingSubfolderFor, setCreatingSubfolderFor] = useState<string | null>(null);
  const [metadataMap, setMetadataMap] = useState<Record<string, NotebookMetadata>>({});
  const [pendingActionFolders, setPendingActionFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log('[FolderTree] Registering service listener on mount');
    registerServiceListener();
  }, [registerServiceListener]);

  // Listen for notebook updates from background script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'NOTEBOOKS_UPDATED') {
        console.log('[FolderTree] Notebooks updated, refreshing folder tree...');
        // Refresh folders to show newly detected notebooks
        void refreshFromService();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [refreshFromService]);

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;

    startTransition(() => {
      void loadFolders().catch(errorLoad => {
        console.error('[FolderTree] Failed to load folders', errorLoad);
      });
    });
  }, [loadFolders]);

  useEffect(() => {
    console.log('[FolderTree] state snapshot', { isLoading, folders: folders.length });
  }, [isLoading, folders]);

  useEffect(() => {
    const missingIds = collectNotebookIds(folders).filter(id => !(id in metadataMap));
    if (missingIds.length === 0) {
      return;
    }

    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        missingIds.map(async notebookId => {
          try {
            const metadata = await folderService.getNotebookMetadata(notebookId);
            return [notebookId, metadata] as const;
          } catch (metadataError) {
            console.warn(`[FolderTree] Missing metadata for notebook ${notebookId}`, metadataError);
            const fallback: NotebookMetadata = {
              notebookId,
              folderIds: [],
              tagIds: [],
              customName: null,
              lastUpdatedAt: Date.now(),
            };
            return [notebookId, fallback] as const;
          }
        })
      );

      if (cancelled) {
        return;
      }

      setMetadataMap(previous => {
        const next = { ...previous };
        for (const [notebookId, metadata] of results) {
          next[notebookId] = metadata;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [folders, metadataMap]);

  const handleNotebookDrop = useCallback(
    async (folderId: string, notebookId: string) => {
      setPendingActionFolders(previous => new Set(previous).add(folderId));

      try {
        const metadata = await folderService.getNotebookMetadata(notebookId);
        const currentFolder = metadata.folderIds[0] ?? DEFAULT_FOLDER_ID;

        if (currentFolder === folderId) {
          showToast('Notebook already in this folder', 'success');
          return;
        }

        await moveNotebook(notebookId, folderId);
        await refreshFromService();
        showToast('Notebook moved successfully', 'success');
      } catch (moveError) {
        console.error('[FolderTree] Failed to move notebook', moveError);
        showToast('Failed to move notebook', 'error');
      } finally {
        setPendingActionFolders(previous => {
          const next = new Set(previous);
          next.delete(folderId);
          return next;
        });
      }
    },
    [moveNotebook, refreshFromService]
  );

  const handleNotebookOpen = useCallback((notebookId: string, url: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (openError) {
      console.warn('[FolderTree] window.open failed, falling back to location change', openError);
      window.location.href = url;
    }
  }, []);

  const handleRenameSubmit = useCallback(
    async (folderId: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) {
        showToast('Folder name cannot be empty', 'error');
        return;
      }

      setPendingActionFolders(previous => new Set(previous).add(folderId));
      try {
        await updateFolder(folderId, { name: trimmed });
        await refreshFromService();
        showToast('Folder renamed', 'success');
      } catch (renameError) {
        console.error('[FolderTree] Rename failed', renameError);
        showToast('Failed to rename folder', 'error');
      } finally {
        setRenamingFolderId(null);
        setPendingActionFolders(previous => {
          const next = new Set(previous);
          next.delete(folderId);
          return next;
        });
      }
    },
    [updateFolder, refreshFromService]
  );

  const handleCreateRootFolder = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error('Folder name is required');
      }

      const folder = await createFolder(trimmed, null);
      await refreshFromService();
      selectFolder(folder.id);
      showToast('Folder created', 'success');
    },
    [createFolder, refreshFromService, selectFolder]
  );

  const handleCreateSubfolder = useCallback(
    async (parentId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error('Folder name is required');
      }

      setPendingActionFolders(previous => new Set(previous).add(parentId));
      try {
        const folder = await createFolder(trimmed, parentId);
        await refreshFromService();
        selectFolder(folder.id);
        showToast('Subfolder created', 'success');
      } finally {
        setCreatingSubfolderFor(null);
        setPendingActionFolders(previous => {
          const next = new Set(previous);
          next.delete(parentId);
          return next;
        });
      }
    },
    [createFolder, refreshFromService, selectFolder]
  );

  const handleDeleteFolder = useCallback(
    async (folder: FolderTreeNode) => {
      if (folder.id === DEFAULT_FOLDER_ID) {
        showToast('Default folder cannot be deleted', 'error');
        return;
      }

      setPendingActionFolders(previous => new Set(previous).add(folder.id));
      try {
        await deleteFolder(folder.id);
        await refreshFromService();
        selectFolder(DEFAULT_FOLDER_ID);
        showToast('Folder deleted', 'success');
      } catch (deleteError) {
        console.error('[FolderTree] Delete failed', deleteError);
        showToast('Failed to delete folder', 'error');
      } finally {
        setConfirmDelete(null);
        setPendingActionFolders(previous => {
          const next = new Set(previous);
          next.delete(folder.id);
          return next;
        });
      }
    },
    [deleteFolder, refreshFromService, selectFolder]
  );

  const handleChangeColor = useCallback(
    async (folder: FolderTreeNode, color: string) => {
      setPendingActionFolders(previous => new Set(previous).add(folder.id));
      try {
        await updateFolder(folder.id, { color });
        await refreshFromService();
        showToast('Folder color updated', 'success');
      } catch (colorError) {
        console.error('[FolderTree] Failed to update folder color', colorError);
        showToast('Failed to update color', 'error');
      } finally {
        setColorMenu(null);
        setPendingActionFolders(previous => {
          const next = new Set(previous);
          next.delete(folder.id);
          return next;
        });
      }
    },
    [updateFolder, refreshFromService]
  );

  const renderFolderNodes = useCallback(
    (nodes: FolderTreeNode[]): JSX.Element[] =>
      nodes.map(node => {
        const isCollapsed = collapsedFolderIds[node.id] ?? false;
        const isSelected = selectedFolderId === node.id;
        
        // Filter notebooks based on search results
        let filteredNotebookIdSet: Set<string> | null = null;
        if (filteredNotebookIds !== null && filteredNotebookIds !== undefined) {
          filteredNotebookIdSet = new Set(filteredNotebookIds);
        }
        
        const notebooks: FolderNotebookNode[] = node.notebookIds
          .filter(notebookId => {
            // If no filter is active, show all notebooks
            if (filteredNotebookIdSet === null) return true;
            // Otherwise only show notebooks in the filtered set
            return filteredNotebookIdSet.has(notebookId);
          })
          .map(notebookId => {
            const metadata = metadataMap[notebookId];
            const displayName =
              metadata?.customName?.trim() || // User custom name takes priority
              metadata?.title?.trim() ||       // Then stored title from NotebookLM
              extractNotebookNameFromDom(notebookId) || // Then try to extract from DOM
              `Notebook ${notebookId.slice(0, 6)}`; // Finally fallback to generic

            return {
              id: notebookId,
              name: displayName,
              lastUpdatedAt: metadata?.lastUpdatedAt,
              url: buildNotebookUrl(notebookId),
            };
          });

        const children = !isCollapsed && node.children.length > 0 ? renderFolderNodes(node.children) : null;

        return (
          <FolderItem
            key={node.id}
            id={node.id}
            name={node.name}
            color={node.color}
            depth={node.depth}
            isCollapsed={isCollapsed}
            isSelected={isSelected}
            isRenaming={renamingFolderId === node.id}
            notebookCount={node.notebookIds.length}
            notebooks={notebooks}
            onSelect={() => selectFolder(node.id)}
            onToggleCollapse={() => toggleFolderCollapsed(node.id)}
            onContextMenu={event => setContextMenu({ folder: node, position: { x: event.clientX, y: event.clientY } })}
            onDropNotebook={notebookId => handleNotebookDrop(node.id, notebookId)}
            onRenameSubmit={name => handleRenameSubmit(node.id, name)}
            onRenameCancel={() => setRenamingFolderId(null)}
            onNotebookClick={(notebookId, url) => handleNotebookOpen(notebookId, url)}
          >
            {creatingSubfolderFor === node.id ? (
              <InlineCreateFolder
                key={`${node.id}-create`}
                onSubmit={name => handleCreateSubfolder(node.id, name)}
                onCancel={() => setCreatingSubfolderFor(null)}
                disabled={pendingActionFolders.has(node.id)}
              />
            ) : null}
            {children}
          </FolderItem>
        );
      }),
    [
      collapsedFolderIds,
      selectedFolderId,
      metadataMap,
      renamingFolderId,
      selectFolder,
      toggleFolderCollapsed,
      handleNotebookDrop,
      handleRenameSubmit,
      creatingSubfolderFor,
      handleCreateSubfolder,
      pendingActionFolders,
      handleNotebookOpen,
      filteredNotebookIds,
    ]
  );

  const renderedFolders = useMemo(() => renderFolderNodes(folders), [folders, renderFolderNodes]);

  return (
    <div className="snlm-folder-tree">
      <header className="snlm-folder-tree__header">
        <div className="snlm-folder-tree__header-content">
          <div className="snlm-folder-tree__section-badge snlm-folder-tree__section-badge--folders">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span>FOLDERS</span>
          </div>
          <p className="snlm-folder-tree__subtitle">Organize notebooks into hierarchical groups</p>
        </div>
      </header>

      {error ? <div className="snlm-folder-error">{error}</div> : null}

      {isLoading ? (
        <div className="snlm-folder-loading">
          <span className="snlm-folder-loading__spinner" />
          <span>Loading folders...</span>
        </div>
      ) : null}

      <div className="snlm-folder-tree__scroll">
        <div className="snlm-folder-tree__list">
          {renderedFolders.length > 0 ? renderedFolders : (
            <div className="snlm-folder-tree__empty">
              No folders yet. Create your first folder to begin organizing notebooks.
            </div>
          )}
        </div>
      </div>

      <NewFolderButton onCreate={handleCreateRootFolder} disabled={isLoading} />

      <TagSection />

      <FolderContextMenu
        visible={Boolean(contextMenu)}
        position={contextMenu?.position ?? { x: 0, y: 0 }}
        folderName={contextMenu?.folder.name ?? ''}
        onClose={() => setContextMenu(null)}
        onRename={() => {
          if (!contextMenu) return;
          if (contextMenu.folder.id === DEFAULT_FOLDER_ID) {
            showToast('Default folder cannot be renamed', 'error');
            return;
          }
          setRenamingFolderId(contextMenu.folder.id);
        }}
        onDelete={() => {
          if (!contextMenu) return;
          if (contextMenu.folder.id === DEFAULT_FOLDER_ID) {
            showToast('Default folder cannot be deleted', 'error');
            return;
          }
          setConfirmDelete({
            folder: contextMenu.folder,
            notebookCount: contextMenu.folder.notebookIds.length,
            childCount: contextMenu.folder.children.length,
          });
        }}
        onAddSubfolder={() => {
          if (!contextMenu) return;
          if (contextMenu.folder.depth >= 3) {
            showToast('Maximum folder depth reached', 'error');
            return;
          }
          setCreatingSubfolderFor(contextMenu.folder.id);
        }}
        onChangeColor={() => {
          if (!contextMenu) return;
          setColorMenu({
            folder: contextMenu.folder,
            position: contextMenu.position,
          });
        }}
        canRename={contextMenu?.folder.id !== DEFAULT_FOLDER_ID}
        canDelete={contextMenu?.folder.id !== DEFAULT_FOLDER_ID}
        canAddSubfolder={(contextMenu?.folder.depth ?? 0) < 3}
      />

      <ColorMenu
        state={colorMenu}
        onClose={() => setColorMenu(null)}
        onSelectColor={color => {
          if (!colorMenu) return;
          void handleChangeColor(colorMenu.folder, color);
        }}
      />

      <ConfirmDeleteDialog
        state={confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={folder => void handleDeleteFolder(folder)}
      />
    </div>
  );
}

function collectNotebookIds(folders: FolderTreeNode[]): string[] {
  const ids = new Set<string>();
  const queue = [...folders];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;

    node.notebookIds.forEach(id => ids.add(id));
    queue.push(...node.children);
  }

  return Array.from(ids);
}

function buildNotebookUrl(notebookId: string): string {
  return `https://notebooklm.google.com/notebook/${notebookId}`;
}

function extractNotebookNameFromDom(notebookId: string): string | null {
  // Try to find by the title span ID first (most reliable)
  // Use attribute selector to avoid issues with IDs starting with numbers
  const titleSpan = document.querySelector<HTMLElement>(`[id="${notebookId}-title"].project-button-title`);
  if (titleSpan?.textContent?.trim()) {
    return titleSpan.textContent.trim();
  }

  // Fallback to other selectors
  const selectorCandidates = [
    `[data-notebook-id="${notebookId}"]`,
    `a[href*="/notebook/${notebookId}"]`,
    `[data-nb-id="${notebookId}"]`,
  ];

  for (const selector of selectorCandidates) {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) continue;

    // First try to find .project-button-title inside the element
    const projectTitle = element.querySelector<HTMLElement>('.project-button-title');
    if (projectTitle?.textContent?.trim()) {
      return projectTitle.textContent.trim();
    }

    // Then try other title selectors
    const titleElement =
      element.querySelector<HTMLElement>('[data-notebook-title]') ??
      element.querySelector<HTMLElement>('h3, h2, .title, .notebook-title');

    const text = titleElement?.textContent?.trim() ?? element.textContent?.trim();
    if (text) {
      return text;
    }
  }

  return null;
}

function showToast(message: string, variant: 'success' | 'error'): void {
  // Guard: Ensure document.body exists before DOM manipulation
  if (!document.body) {
    console.warn('[FolderTree] Cannot show toast: document.body not available');
    return;
  }

  const containerId = 'snlm-toast-container';
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'snlm-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = clsx('snlm-toast', {
    'snlm-toast--success': variant === 'success',
    'snlm-toast--error': variant === 'error',
  });
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-4px)';
  }, 2800);

  setTimeout(() => {
    toast.remove();
    if (container && container.childElementCount === 0) {
      container.remove();
    }
  }, 3400);
}

interface InlineCreateProps {
  onSubmit: (name: string) => Promise<void> | void;
  onCancel: () => void;
  disabled?: boolean;
}

function InlineCreateFolder({ onSubmit, onCancel, disabled = false }: InlineCreateProps) {
  const [value, setValue] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="snlm-inline-create"
      onSubmit={async event => {
        event.preventDefault();
        if (!value.trim()) {
          setError('Folder name is required');
          return;
        }

        setSubmitting(true);
        try {
          await onSubmit(value.trim());
          setValue('');
          setError(null);
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Failed to create folder');
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <input
        autoFocus
        className="snlm-inline-create__input"
        placeholder="New subfolder name"
        value={value}
        onChange={event => {
          setValue(event.target.value);
          setError(null);
        }}
        disabled={isSubmitting || disabled}
      />
      {error ? <p className="snlm-folder-button__error">{error}</p> : null}
      <div className="snlm-inline-create__actions">
        <button type="submit" disabled={isSubmitting || disabled}>
          Create
        </button>
        <button
          type="button"
          onClick={() => {
            setValue('');
            setError(null);
            onCancel();
          }}
          disabled={isSubmitting || disabled}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface ColorMenuProps {
  state: ColorMenuState | null;
  onClose: () => void;
  onSelectColor: (color: string) => void;
}

function ColorMenu({ state, onClose, onSelectColor }: ColorMenuProps) {
  useEffect(() => {
    if (!state) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.snlm-color-menu-popover')) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('keyup', handleEscape, true);

    return () => {
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('keyup', handleEscape, true);
    };
  }, [state, onClose]);

  if (!state) {
    return null;
  }

  const style: React.CSSProperties = {
    top: state.position.y,
    left: state.position.x,
  };

  return (
    <div className="snlm-color-menu-popover" style={style}>
      <ColorPicker
        selectedColor={state.folder.color}
        onSelect={color => {
          onSelectColor(color);
        }}
      />
    </div>
  );
}

interface ConfirmDeleteDialogProps {
  state: ConfirmDeleteState | null;
  onCancel: () => void;
  onConfirm: (folder: FolderTreeNode) => void;
}

function ConfirmDeleteDialog({ state, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  if (!state) {
    return null;
  }

  const description =
    state.childCount > 0 || state.notebookCount > 0
      ? `Deleting "${state.folder.name}" will also remove ${state.childCount} subfolder(s) and detach ${state.notebookCount} notebook(s) back to Unorganized.`
      : `Delete "${state.folder.name}"?`;

  return (
    <div className="snlm-confirm-dialog" role="dialog" aria-modal="true">
      <div className="snlm-confirm-dialog__content">
        <h3 className="snlm-confirm-dialog__title">Delete folder?</h3>
        <p className="snlm-confirm-dialog__body">{description}</p>
        <div className="snlm-confirm-dialog__actions">
          <button type="button" className="snlm-confirm-dialog__cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="snlm-confirm-dialog__danger"
            onClick={() => onConfirm(state.folder)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
