import { useEffect, useReducer, useRef, useState } from 'react';
import { create } from 'zustand';
import type { FolderTreeNode, StorageMode } from '../services/FolderService';
import { folderService } from '../services/FolderService';
import type { Folder, NotebookMetadata, Tag } from '../types/folder';
import { DEFAULT_FOLDER_ID } from '../types/folder';

export interface FolderStoreState {
  folders: FolderTreeNode[];
  tags: Tag[];
  selectedFolderId: string;
  isLoading: boolean;
  error: string | null;
  collapsedFolderIds: Record<string, boolean>;
  storageMode: StorageMode;
  isSyncFallback: boolean;
  loadFolders: () => Promise<void>;
  refreshFromService: () => Promise<void>;
  selectFolder: (folderId: string | null) => void;
  createFolder: (name: string, parentId?: string | null, color?: string) => Promise<Folder>;
  updateFolder: (
    id: string,
    updates: Partial<Pick<Folder, 'name' | 'color' | 'parentId'>>
  ) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;
  createTag: (name: string, color?: string) => Promise<Tag>;
  updateTag: (id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  moveNotebook: (notebookId: string, folderId: string | null) => Promise<NotebookMetadata>;
  bulkMoveNotebooks: (notebookIds: string[], folderId: string | null) => Promise<void>;
  assignTag: (notebookId: string, tagId: string) => Promise<NotebookMetadata>;
  removeTag: (notebookId: string, tagId: string) => Promise<NotebookMetadata>;
  isFolderCollapsed: (folderId: string) => boolean;
  setFolderCollapsed: (folderId: string, collapsed: boolean) => void;
  toggleFolderCollapsed: (folderId: string) => void;
  registerServiceListener: () => void;
}

const createChromeSyncStorage = () =>
  createJSONStorage(() => ({
    getItem: async (name: string) => {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const result = await chrome.storage.sync.get(name);
        const value = result?.[name];
        return value ? JSON.stringify(value) : null;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
      }
      return null;
    },
    setItem: async (name: string, value: string) => {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        await chrome.storage.sync.set({ [name]: JSON.parse(value) });
        return;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
      }
    },
    removeItem: async (name: string) => {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        await chrome.storage.sync.remove(name);
        return;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
      }
    },
  }));

// Listener cleanup function (will be set by component)
let unsubscribeListener: (() => void) | null = null;

// CRITICAL: Don't use persist() in content scripts - causes React #185
// State is managed by FolderService which handles chrome.storage directly
const folderStore = create<FolderStoreState>()((set, get) => {
  const hydrateFromService = async () => {
    const [folders, tags] = await Promise.all([
      folderService.getFolders(),
      folderService.getTags(),
    ]);
    const storageMode = folderService.getStorageMode();

    set(state => ({
      folders,
      tags,
      isLoading: false,
      storageMode,
      isSyncFallback: storageMode === 'local',
      collapsedFolderIds: ensureCollapseState(state.collapsedFolderIds, folders),
    }));

    return { folders, tags, storageMode };
  };

  return {
        folders: [],
        tags: [],
        selectedFolderId: DEFAULT_FOLDER_ID,
        isLoading: false,
        error: null,
        collapsedFolderIds: {},
        storageMode: 'sync',
        isSyncFallback: false,

        loadFolders: async () => {
          console.log('[useFolderStore] loadFolders start');
          set({ isLoading: true, error: null });

          try {
            await folderService.initialize();
            const { folders } = await hydrateFromService();
            console.log('[useFolderStore] loadFolders success', { folders: folders.length });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load folders';
            set({ error: message, isLoading: false });
            console.log('[useFolderStore] loadFolders error', error);
          }
        },

        refreshFromService: async () => {
          console.log('[useFolderStore] refreshFromService');
          try {
            const { folders } = await hydrateFromService();
            console.log('[useFolderStore] refreshFromService applied', { folders: folders.length });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to refresh folders';
            set({ error: message });
            console.log('[useFolderStore] refreshFromService error', error);
          }
        },

        selectFolder: (folderId: string | null) => {
          set({ selectedFolderId: folderId ?? DEFAULT_FOLDER_ID });
        },

        createFolder: async (name, parentId = null, color) => {
          set({ isLoading: true, error: null });
          try {
            const folder = await folderService.createFolder(name, parentId, color);
            set({ selectedFolderId: folder.id, isLoading: false });
            return folder;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create folder';
            set({ error: message, isLoading: false });
            throw error;
          }
        },

        updateFolder: async (id, updates) => {
          set({ error: null });
          try {
            const folder = await folderService.updateFolder(id, updates);
            return folder;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update folder';
            set({ error: message });
            throw error;
          }
        },

        deleteFolder: async (id) => {
          set({ error: null });
          try {
            await folderService.deleteFolder(id);
            if (get().selectedFolderId === id) {
              set({ selectedFolderId: DEFAULT_FOLDER_ID });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete folder';
            set({ error: message });
            throw error;
          }
        },

        createTag: async (name, color) => {
          set({ error: null });
          try {
            return await folderService.createTag(name, color);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create tag';
            set({ error: message });
            throw error;
          }
        },

        updateTag: async (id, updates) => {
          set({ error: null });
          try {
            return await folderService.updateTag(id, updates);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update tag';
            set({ error: message });
            throw error;
          }
        },

        deleteTag: async (id) => {
          set({ error: null });
          try {
            await folderService.deleteTag(id);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete tag';
            set({ error: message });
            throw error;
          }
        },

        moveNotebook: async (notebookId, folderId) => {
          set({ error: null });
          try {
            return await folderService.moveNotebook(notebookId, folderId);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to move notebook';
            set({ error: message });
            throw error;
          }
        },

        bulkMoveNotebooks: async (notebookIds, folderId) => {
          set({ error: null });
          try {
            await folderService.bulkMoveNotebooks(notebookIds, folderId);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to move notebooks';
            set({ error: message });
            throw error;
          }
        },

        assignTag: async (notebookId, tagId) => {
          set({ error: null });
          try {
            return await folderService.assignTag(notebookId, tagId);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to assign tag';
            set({ error: message });
            throw error;
          }
        },

        removeTag: async (notebookId, tagId) => {
          set({ error: null });
          try {
            return await folderService.removeTag(notebookId, tagId);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove tag';
            set({ error: message });
            throw error;
          }
        },
        isFolderCollapsed: folderId => get().collapsedFolderIds[folderId] ?? false,
        setFolderCollapsed: (folderId, collapsed) => {
          set(state => ({
            collapsedFolderIds: {
              ...state.collapsedFolderIds,
              [folderId]: collapsed,
            },
          }));
        },
        toggleFolderCollapsed: folderId => {
          set(state => {
            const current = state.collapsedFolderIds[folderId] ?? false;
            return {
              collapsedFolderIds: {
                ...state.collapsedFolderIds,
                [folderId]: !current,
              },
            };
          });
        },
        registerServiceListener: () => {
          // Only register once
          if (unsubscribeListener) {
            return;
          }

          console.log('[useFolderStore] Registering service listener');
          unsubscribeListener = folderService.addListener(({ folders, tags, storageMode }) => {
            console.log('[useFolderStore] service listener', {
              folders: folders.length,
              storageMode,
            });

            set(state => ({
              folders,
              tags,
              isLoading: false,
              storageMode,
              isSyncFallback: storageMode === 'local',
              collapsedFolderIds: ensureCollapseState(state.collapsedFolderIds, folders),
            }));
          });
        },
      };
});

type EqualityFn<T> = (a: T, b: T) => boolean;

interface UseFolderStoreHook {
  <T>(selector: (state: FolderStoreState) => T, equalityFn?: EqualityFn<T>): T;
  getState: typeof folderStore.getState;
  setState: typeof folderStore.setState;
  subscribe: typeof folderStore.subscribe;
  destroy: typeof folderStore.destroy;
}

const useFolderStoreInternal = <T>(
  selector: (state: FolderStoreState) => T,
  equalityFn: EqualityFn<T> = Object.is
): T => {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const equalityRef = useRef(equalityFn);
  equalityRef.current = equalityFn;

  const [, forceUpdate] = useReducer((index: number) => index + 1, 0);
  const selectedRef = useRef<T>(selector(folderStore.getState()));

  useEffect(() => {
    let current = selectedRef.current;

    const listener = (state: FolderStoreState) => {
      const next = selectorRef.current(state);
      if (!equalityRef.current(current, next)) {
        current = next;
        selectedRef.current = next;
        forceUpdate();
      }
    };

    const unsubscribe = folderStore.subscribe(listener);
    listener(folderStore.getState());

    return unsubscribe;
  }, []);

  useEffect(() => {
    const next = selector(folderStore.getState());
    if (!equalityFn(selectedRef.current, next)) {
      selectedRef.current = next;
      forceUpdate();
    }
  }, [selector, equalityFn]);

  return selectedRef.current;
};

export const useFolderStore = useFolderStoreInternal as UseFolderStoreHook;

useFolderStore.getState = folderStore.getState;
useFolderStore.setState = folderStore.setState;
useFolderStore.subscribe = folderStore.subscribe;
useFolderStore.destroy = folderStore.destroy;

function ensureCollapseState(
  collapsed: Record<string, boolean>,
  folders: FolderTreeNode[]
): Record<string, boolean> {
  const next: Record<string, boolean> = { ...collapsed };

  const queue = [...folders];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) {
      continue;
    }

    if (!(node.id in next)) {
      next[node.id] = true;
    }

    queue.push(...node.children);
  }

  return next;
}

let bootstrapPromise: Promise<void> | null = null;

export const bootstrapFolderStore = async (): Promise<void> => {
  if (!bootstrapPromise) {
    bootstrapPromise = Promise.resolve();
  }

  await bootstrapPromise;
};

export const resetFolderStoreForTests = (): void => {
  if (unsubscribeListener) {
    unsubscribeListener();
    unsubscribeListener = null;
  }

  bootstrapPromise = null;

  folderStore.setState({
    folders: [],
    tags: [],
    selectedFolderId: DEFAULT_FOLDER_ID,
    isLoading: false,
    error: null,
    collapsedFolderIds: {},
    storageMode: 'sync',
    isSyncFallback: false,
  });
};
