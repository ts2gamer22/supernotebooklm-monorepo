import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { forwardRef, type HTMLProps, type ReactNode } from 'react';
import { FolderTree } from './FolderTree';
import type { FolderStoreState } from '../../stores/useFolderStore';
import { folderService } from '../../services/FolderService';
import type { FolderTreeNode } from '../../services/FolderService';

vi.mock('framer-motion', () => {
  const Div = forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>((props, ref) => (
    <div ref={ref} {...props} />
  ));
  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    motion: { div: Div },
  };
});

let mockStoreState: FolderStoreState;

function createFolderNode(overrides?: Partial<FolderTreeNode>): FolderTreeNode {
  return {
    id: 'folder-root',
    name: 'Research',
    parentId: null,
    notebookIds: ['nb-1'],
    createdAt: 1,
    color: '#60a5fa',
    depth: 1,
    children: [
      {
        id: 'folder-child',
        name: 'Drafts',
        parentId: 'folder-root',
        notebookIds: [],
        createdAt: 2,
        color: '#a855f7',
        depth: 2,
        children: [],
      },
    ],
    ...overrides,
  };
}

function createMockStoreState(overrides?: Partial<FolderStoreState>): FolderStoreState {
  const folders: FolderTreeNode[] =
    overrides?.folders && overrides.folders.length > 0 ? (overrides.folders as FolderTreeNode[]) : [createFolderNode()];
  const folder = folders[0];

  const defaultMetadata = {
    notebookId: 'nb-1',
    folderIds: [folder.id],
    tagIds: [],
    customName: 'Notebook nb-1',
    lastUpdatedAt: Date.now(),
  };

  return {
    folders,
    tags: [],
    selectedFolderId: folder.id,
    isLoading: overrides?.isLoading ?? false,
    error: overrides?.error ?? null,
    collapsedFolderIds: overrides?.collapsedFolderIds ?? { [folder.id]: true, 'folder-child': true },
    storageMode: overrides?.storageMode ?? 'sync',
    isSyncFallback: overrides?.isSyncFallback ?? false,
    loadFolders: overrides?.loadFolders ?? vi.fn().mockResolvedValue(undefined),
    refreshFromService: overrides?.refreshFromService ?? vi.fn().mockResolvedValue(undefined),
    selectFolder: overrides?.selectFolder ?? vi.fn(),
    createFolder:
      overrides?.createFolder ??
      vi.fn().mockResolvedValue({
        id: 'folder-new',
        name: 'New Folder',
        parentId: null,
        notebookIds: [],
        createdAt: Date.now(),
        color: '#60a5fa',
      }),
    updateFolder:
      overrides?.updateFolder ??
      vi.fn().mockResolvedValue({
        id: 'folder-root',
        name: 'Updated',
        parentId: null,
        notebookIds: ['nb-1'],
        createdAt: 1,
        color: '#60a5fa',
      }),
    deleteFolder: overrides?.deleteFolder ?? vi.fn().mockResolvedValue(undefined),
    createTag: overrides?.createTag ?? vi.fn(),
    updateTag: overrides?.updateTag ?? vi.fn(),
    deleteTag: overrides?.deleteTag ?? vi.fn(),
    moveNotebook:
      overrides?.moveNotebook ??
      vi.fn().mockResolvedValue({
        notebookId: defaultMetadata.notebookId,
        folderIds: [folder.id],
        tagIds: [],
        customName: defaultMetadata.customName,
        lastUpdatedAt: defaultMetadata.lastUpdatedAt,
      }),
    bulkMoveNotebooks: overrides?.bulkMoveNotebooks ?? vi.fn().mockResolvedValue(undefined),
    assignTag:
      overrides?.assignTag ??
      vi.fn().mockResolvedValue({
        notebookId: defaultMetadata.notebookId,
        folderIds: [folder.id],
        tagIds: [],
        customName: defaultMetadata.customName,
        lastUpdatedAt: defaultMetadata.lastUpdatedAt,
      }),
    removeTag:
      overrides?.removeTag ??
      vi.fn().mockResolvedValue({
        notebookId: defaultMetadata.notebookId,
        folderIds: [folder.id],
        tagIds: [],
        customName: defaultMetadata.customName,
        lastUpdatedAt: defaultMetadata.lastUpdatedAt,
      }),
    isFolderCollapsed: overrides?.isFolderCollapsed ?? (() => false),
    setFolderCollapsed: overrides?.setFolderCollapsed ?? vi.fn(),
    toggleFolderCollapsed: overrides?.toggleFolderCollapsed ?? vi.fn(),
  };
}

vi.mock('../../stores/useFolderStore', () => {
  const useFolderStoreMock = ((selector?: (state: FolderStoreState) => unknown) => {
    if (!mockStoreState) {
      mockStoreState = createMockStoreState();
    }
    return selector ? selector(mockStoreState) : mockStoreState;
  }) as unknown as typeof import('../../stores/useFolderStore').useFolderStore;

  (useFolderStoreMock as unknown as { getState: () => FolderStoreState }).getState = () => mockStoreState;
  (useFolderStoreMock as unknown as { setState: (partial: Partial<FolderStoreState>) => void }).setState = partial => {
    mockStoreState = { ...mockStoreState, ...partial };
  };
  (useFolderStoreMock as unknown as { subscribe: ReturnType<typeof vi.fn> }).subscribe = vi.fn();

  return { useFolderStore: useFolderStoreMock };
});

describe('FolderTree', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const createStorageArea = () => {
      const store = new Map<string, unknown>();
      return {
        async get(keys?: string | string[] | Record<string, unknown>) {
          if (!keys) {
            return Object.fromEntries(store.entries());
          }
          if (typeof keys === 'string') {
            return { [keys]: store.get(keys) };
          }
          if (Array.isArray(keys)) {
            const result: Record<string, unknown> = {};
            for (const key of keys) {
              result[key] = store.get(key);
            }
            return result;
          }
          return keys;
        },
        async set(items: Record<string, unknown>) {
          Object.entries(items).forEach(([key, value]) => store.set(key, value));
        },
        async remove(keys: string | string[]) {
          const list = Array.isArray(keys) ? keys : [keys];
          list.forEach(key => store.delete(key));
        },
        async clear() {
          store.clear();
        },
      };
    };

    (globalThis as unknown as { chrome?: unknown }).chrome = {
      storage: {
        sync: createStorageArea(),
        local: createStorageArea(),
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
          hasListeners: vi.fn().mockReturnValue(false),
        },
      },
    };
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(folderService, 'addListener').mockReturnValue(() => {});
    mockStoreState = createMockStoreState();
    vi.spyOn(folderService, 'getNotebookMetadata').mockImplementation(async notebookId => ({
      notebookId,
      folderIds: ['folder-root'],
      tagIds: [],
      customName: `Notebook ${notebookId}`,
      lastUpdatedAt: Date.now(),
    }));
  });

  it('renders folder structure and notebook list', async () => {
    mockStoreState.collapsedFolderIds['folder-root'] = false;

    render(<FolderTree />);

    expect(await screen.findByText('Research')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Notebook nb-1' })).toBeInTheDocument();
  });

  it('toggles collapse state when chevron is clicked', async () => {
    const toggleFolderCollapsed = vi.fn();
    mockStoreState.toggleFolderCollapsed = toggleFolderCollapsed;

    render(<FolderTree />);

    const toggleButtons = await screen.findAllByRole('button', { name: /expand folder/i });
    fireEvent.click(toggleButtons[0]);

    expect(toggleFolderCollapsed).toHaveBeenCalledWith('folder-root');
  });

  it('moves notebook when dropped on folder', async () => {
    const moveNotebook = vi.fn().mockResolvedValue({
      notebookId: 'nb-2',
      folderIds: ['folder-root'],
      tagIds: [],
      customName: 'Notebook nb-2',
      lastUpdatedAt: Date.now(),
    });
    const refreshFromService = vi.fn().mockResolvedValue(undefined);

    mockStoreState.moveNotebook = moveNotebook as FolderStoreState['moveNotebook'];
    mockStoreState.refreshFromService = refreshFromService;

    const metadataSpy = vi.spyOn(folderService, 'getNotebookMetadata').mockResolvedValue({
      notebookId: 'nb-2',
      folderIds: ['folder-child'],
      tagIds: [],
      customName: 'Notebook nb-2',
      lastUpdatedAt: Date.now(),
    });

    render(<FolderTree />);

    const row = document.querySelector('.snlm-folder-item__row') as HTMLElement;

    const dataTransfer = createDataTransferMock('nb-2');
    fireEvent.dragEnter(row, { dataTransfer });
    fireEvent.dragOver(row, { dataTransfer });
    fireEvent.drop(row, { dataTransfer });

    await waitFor(() => {
      expect(metadataSpy).toHaveBeenCalledWith('nb-2');
      expect(moveNotebook).toHaveBeenCalledWith('nb-2', 'folder-root');
      expect(refreshFromService).toHaveBeenCalled();
    });
  });

  it('opens rename input after context menu action', async () => {
    render(<FolderTree />);

    const folderName = await screen.findByText('Research');
    fireEvent.contextMenu(folderName);

    const renameButton = await screen.findByRole('button', { name: /rename/i });
    fireEvent.click(renameButton);

    expect(screen.getByDisplayValue('Research')).toBeInTheDocument();
  });

  it('opens notebook when notebook pill is clicked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    mockStoreState.collapsedFolderIds['folder-root'] = false;

    render(<FolderTree />);

    const notebookButton = await screen.findByRole('button', { name: 'Notebook nb-1' });
    fireEvent.click(notebookButton);

    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('notebook/nb-1'), '_blank', 'noopener,noreferrer');

    openSpy.mockRestore();
  });
});

function createDataTransferMock(notebookId: string): DataTransfer {
  let dropEffect = 'move';

  return {
    types: ['application/snlm-notebook'],
    getData: (type: string) => (type === 'application/snlm-notebook' ? notebookId : ''),
    setData: vi.fn(),
    clearData: vi.fn(),
    effectAllowed: 'move',
    get dropEffect() {
      return dropEffect;
    },
    set dropEffect(value: string) {
      dropEffect = value;
    },
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    addElement: vi.fn(),
    setDragImage: vi.fn(),
  } as unknown as DataTransfer;
}
