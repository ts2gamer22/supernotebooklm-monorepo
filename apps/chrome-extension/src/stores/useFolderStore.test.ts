import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FolderTreeNode } from '../services/FolderService';
import type { NotebookMetadata, Tag } from '../types/folder';
import { DEFAULT_FOLDER_ID } from '../types/folder';

let folderCounter = 0;
let folderTree: FolderTreeNode[] = [];
let tags: Tag[] = [];
const metadataMap = new Map<string, NotebookMetadata>();

type FolderListener = (payload: { folders: FolderTreeNode[]; tags: Tag[] }) => void;

var listeners: Set<FolderListener> | undefined;

function getListeners(): Set<FolderListener> {
  if (!listeners) {
    listeners = new Set<FolderListener>();
  }
  return listeners;
}

const cloneTree = (): FolderTreeNode[] =>
  folderTree.map(node => ({
    ...node,
    children: node.children.map(child => ({ ...child, children: [...child.children] })),
  }));

const cloneTags = (): Tag[] => tags.map(tag => ({ ...tag }));

const notify = () => {
  const payload = { folders: cloneTree(), tags: cloneTags() };
  getListeners().forEach(listener => listener(payload));
};

const ensureMetadata = (notebookId: string): NotebookMetadata => {
  const existing = metadataMap.get(notebookId);
  if (existing) {
    return existing;
  }
  const created: NotebookMetadata = {
    notebookId,
    folderIds: [DEFAULT_FOLDER_ID],
    tagIds: [],
    customName: null,
    lastUpdatedAt: Date.now(),
  };
  metadataMap.set(notebookId, created);
  return created;
};

async function moveNotebookInternal(notebookId: string, folderId: string | null) {
  const metadata = ensureMetadata(notebookId);
  metadata.folderIds = [folderId ?? DEFAULT_FOLDER_ID];
  metadata.lastUpdatedAt = Date.now();
  metadataMap.set(notebookId, { ...metadata });
  notify();
  return { ...metadata };
}

async function assignTagInternal(notebookId: string, tagId: string) {
  const metadata = ensureMetadata(notebookId);
  if (!metadata.tagIds.includes(tagId)) {
    metadata.tagIds.push(tagId);
  }
  metadata.lastUpdatedAt = Date.now();
  metadataMap.set(notebookId, { ...metadata });
  tags = tags.map(tag =>
    tag.id === tagId ? { ...tag, count: tag.count + 1 } : tag
  );
  notify();
  return { ...metadata };
}

async function removeTagInternal(notebookId: string, tagId: string) {
  const metadata = ensureMetadata(notebookId);
  metadata.tagIds = metadata.tagIds.filter(id => id !== tagId);
  metadata.lastUpdatedAt = Date.now();
  metadataMap.set(notebookId, { ...metadata });
  tags = tags.map(tag =>
    tag.id === tagId ? { ...tag, count: Math.max(0, tag.count - 1) } : tag
  );
  notify();
  return { ...metadata };
}

function createMockFolderService() {
  return {
    initialize: vi.fn(async () => {}),
    addListener: vi.fn((listener: FolderListener) => {
      const registry = getListeners();
      registry.add(listener);
      return () => registry.delete(listener);
    }),
    getFolders: vi.fn(async () => cloneTree()),
    getTags: vi.fn(async () => cloneTags()),
    createFolder: vi.fn(async (name: string, parentId: string | null = null, color?: string) => {
    const folder = {
      id: `folder-${++folderCounter}`,
      name,
      parentId,
      notebookIds: [] as string[],
      createdAt: Date.now(),
      color: color ?? '#4f46e5',
    };
    const node: FolderTreeNode = { ...folder, children: [], depth: 1 };
    folderTree.push(node);
    notify();
    return folder;
  }),
  updateFolder: vi.fn(
    async (
      id: string,
      updates: Partial<Record<'name' | 'color' | 'parentId', string | null>>
    ) => {
      const idx = folderTree.findIndex(folder => folder.id === id);
      if (idx === -1) {
        throw new Error('Folder not found');
      }
      const updatedNode: FolderTreeNode = {
        ...folderTree[idx],
        ...updates,
      };
      folderTree[idx] = updatedNode;
      notify();
      return {
        id: updatedNode.id,
        name: updatedNode.name,
        parentId: updatedNode.parentId ?? null,
        notebookIds: [...updatedNode.notebookIds],
        createdAt: updatedNode.createdAt,
        color: updatedNode.color,
      };
    }
  ),
  deleteFolder: vi.fn(async (id: string) => {
    folderTree = folderTree.filter(folder => folder.id !== id);
    metadataMap.forEach(metadata => {
      if (metadata.folderIds.includes(id)) {
        metadata.folderIds = [DEFAULT_FOLDER_ID];
      }
    });
    notify();
  }),
  createTag: vi.fn(async (name: string, color?: string) => {
    const tag: Tag = {
      id: `tag-${tags.length + 1}`,
      name,
      color: color ?? '#4f46e5',
      count: 0,
    };
    tags.push(tag);
    notify();
    return tag;
  }),
  updateTag: vi.fn(async (id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => {
    const tagIndex = tags.findIndex(tag => tag.id === id);
    if (tagIndex === -1) {
      throw new Error('Tag not found');
    }
    tags[tagIndex] = { ...tags[tagIndex], ...updates };
    notify();
    return { ...tags[tagIndex] };
  }),
  deleteTag: vi.fn(async (id: string) => {
    tags = tags.filter(tag => tag.id !== id);
    metadataMap.forEach(metadata => {
      metadata.tagIds = metadata.tagIds.filter(tagId => tagId !== id);
    });
    notify();
  }),
  moveNotebook: vi.fn(moveNotebookInternal),
  bulkMoveNotebooks: vi.fn(async (notebookIds: string[], folderId: string | null) => {
    for (const notebookId of notebookIds) {
      await moveNotebookInternal(notebookId, folderId);
    }
  }),
  assignTag: vi.fn(assignTagInternal),
  removeTag: vi.fn(removeTagInternal),
  };
}

var mockFolderService: ReturnType<typeof createMockFolderService>;

vi.mock('../services/FolderService', async () => {
  const actual = await vi.importActual<typeof import('../services/FolderService')>(
    '../services/FolderService'
  );
  mockFolderService = createMockFolderService();
  return {
    ...actual,
    folderService: mockFolderService,
  };
});

// eslint-disable-next-line import/first
import { useFolderStore } from './useFolderStore';

const resetStore = () => {
  useFolderStore.setState({
    folders: [],
    tags: [],
    selectedFolderId: DEFAULT_FOLDER_ID,
    isLoading: false,
    error: null,
  });
};

beforeEach(() => {
  folderCounter = 0;
  folderTree = [
    {
      id: DEFAULT_FOLDER_ID,
      name: 'Unorganized',
      parentId: null,
      notebookIds: [],
      createdAt: Date.now(),
      color: '#6b7280',
      children: [],
      depth: 1,
    },
  ];
  tags = [];
  metadataMap.clear();
  getListeners().clear();
  vi.clearAllMocks();
  if (mockFolderService) {
    Object.assign(mockFolderService, createMockFolderService());
  }
  resetStore();
});

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});

describe('useFolderStore', () => {
  it('loads folders from service', async () => {
    await useFolderStore.getState().loadFolders();
    const state = useFolderStore.getState();
    expect(state.folders).toHaveLength(1);
    expect(mockFolderService.initialize).toHaveBeenCalled();
  });

  it('creates folder and updates selected folder id', async () => {
    await useFolderStore.getState().loadFolders();
    const folder = await useFolderStore.getState().createFolder('Projects');
    await useFolderStore.getState().refreshFromService();
    const state = useFolderStore.getState();
    expect(folder.name).toBe('Projects');
    expect(state.selectedFolderId).toBe(folder.id);
    expect(state.folders.find(f => f.id === folder.id)).toBeTruthy();
  });

  it('resets selection when deleting currently selected folder', async () => {
    await useFolderStore.getState().loadFolders();
    const folder = await useFolderStore.getState().createFolder('Temp');
    useFolderStore.getState().selectFolder(folder.id);
    await useFolderStore.getState().deleteFolder(folder.id);

    const state = useFolderStore.getState();
    expect(state.selectedFolderId).toBe(DEFAULT_FOLDER_ID);
  });
});
