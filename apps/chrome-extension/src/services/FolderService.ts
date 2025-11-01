import { db } from '../lib/db';
import type { Folder, NotebookMetadata, Tag } from '../types/folder';
import { DEFAULT_FOLDER_ID, DEFAULT_FOLDER_NAME, MAX_FOLDER_DEPTH } from '../types/folder';

export type StorageMode = 'sync' | 'local';

interface FolderStorageSnapshot {
  version: number;
  folders: Folder[];
  tags: Tag[];
  metadata: NotebookMetadata[];
  lastUpdatedAt: number;
  storageMode: StorageMode;
}

interface ChromeStorageArea {
  get: (keys?: string | string[] | Record<string, unknown>) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
}

type StorageChange = {
  newValue?: unknown;
  oldValue?: unknown;
};

interface StorageEvents {
  addListener: (
    callback: (changes: Record<string, StorageChange>, areaName: string) => void
  ) => void;
  removeListener: (
    callback: (changes: Record<string, StorageChange>, areaName: string) => void
  ) => void;
}

export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
  depth: number;
}

export interface FolderServiceOptions {
  syncStorage?: ChromeStorageArea;
  localStorage?: ChromeStorageArea;
  storageEvents?: StorageEvents;
}

type ChangeListener = (payload: { folders: FolderTreeNode[]; tags: Tag[]; storageMode: StorageMode }) => void;

const STORAGE_KEY = 'snlm-folder-storage';
const STORAGE_MODE_KEY = 'snlm-folder-storage-mode';
const SNAPSHOT_VERSION = 1;
const DEFAULT_FOLDER_COLOR = '#6b7280';
const DEFAULT_TAG_COLOR = '#4f46e5';

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const cloneFolder = (folder: Folder): Folder => ({
  ...folder,
  notebookIds: [...folder.notebookIds],
});

const cloneMetadata = (metadata: NotebookMetadata): NotebookMetadata => ({
  ...metadata,
  folderIds: [...metadata.folderIds],
  tagIds: [...metadata.tagIds],
});

const cloneTag = (tag: Tag): Tag => ({ ...tag });

export class FolderService {
  private readonly syncArea?: ChromeStorageArea;
  private readonly localArea?: ChromeStorageArea;
  private readonly storageEvents?: StorageEvents;
  private readonly database: typeof db;

  private storageMode: StorageMode = 'sync';
  private initialized = false;
  private suppressStorageEvent = false;

  private folders = new Map<string, Folder>();
  private tags = new Map<string, Tag>();
  private metadata = new Map<string, NotebookMetadata>();

  private listeners = new Set<ChangeListener>();

  constructor(options: FolderServiceOptions = {}, database: typeof db = db) {
    this.database = database;
    this.syncArea =
      options.syncStorage ??
      (typeof chrome !== 'undefined' && chrome.storage?.sync
        ? (chrome.storage.sync as unknown as ChromeStorageArea)
        : undefined);
    this.localArea =
      options.localStorage ??
      (typeof chrome !== 'undefined' && chrome.storage?.local
        ? (chrome.storage.local as unknown as ChromeStorageArea)
        : undefined);
    this.storageEvents =
      options.storageEvents ??
      (typeof chrome !== 'undefined' && chrome.storage?.onChanged
        ? (chrome.storage.onChanged as unknown as StorageEvents)
        : undefined);

    if (this.storageEvents) {
      this.storageEvents.addListener(this.handleStorageChange);
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.loadFromPersistence();
    this.initialized = true;
  }

  addListener(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStorageMode(): StorageMode {
    return this.storageMode;
  }

  async getFolders(): Promise<FolderTreeNode[]> {
    await this.ensureInitialized();
    return buildFolderTree([...this.folders.values()]);
  }

  async getFlatFolders(): Promise<Folder[]> {
    await this.ensureInitialized();
    return [...this.folders.values()].map(cloneFolder);
  }

  async getTags(): Promise<Tag[]> {
    await this.ensureInitialized();
    return [...this.tags.values()].map(cloneTag).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createFolder(name: string, parentId: string | null = null, color?: string): Promise<Folder> {
    await this.ensureInitialized();

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Folder name is required');
    }

    if (parentId && !this.folders.has(parentId)) {
      throw new Error('Parent folder does not exist');
    }

    const depth = parentId ? this.calculateDepth(parentId) + 1 : 1;
    if (depth > MAX_FOLDER_DEPTH) {
      throw new Error(`Folders cannot exceed depth of ${MAX_FOLDER_DEPTH}`);
    }

    const now = Date.now();
    const folder: Folder = {
      id: generateId('folder'),
      name: trimmedName,
      parentId,
      notebookIds: [],
      createdAt: now,
      color: color ?? DEFAULT_TAG_COLOR,
    };

    await this.database.folders.add(folder);
    this.folders.set(folder.id, folder);

    await this.persistSnapshotSafe();
    this.emitChange();

    return cloneFolder(folder);
  }

  async updateFolder(id: string, updates: Partial<Pick<Folder, 'name' | 'color' | 'parentId'>>): Promise<Folder> {
    await this.ensureInitialized();

    const existing = this.folders.get(id);
    if (!existing) {
      throw new Error('Folder not found');
    }

    if (id === DEFAULT_FOLDER_ID && updates.parentId) {
      throw new Error('Default folder cannot have a parent');
    }

    if (updates.parentId === id) {
      throw new Error('Folder cannot be its own parent');
    }

    if (updates.parentId && !this.folders.has(updates.parentId)) {
      throw new Error('Parent folder does not exist');
    }

    if (updates.parentId) {
      const newDepth = this.calculateDepth(updates.parentId) + 1;
      if (newDepth > MAX_FOLDER_DEPTH) {
        throw new Error(`Folders cannot exceed depth of ${MAX_FOLDER_DEPTH}`);
      }
      if (this.isDescendant(updates.parentId, id)) {
        throw new Error('Cannot set a descendant as the parent');
      }
    }

    const updated: Folder = {
      ...existing,
      ...('name' in updates && updates.name !== undefined
        ? { name: updates.name.trim() || existing.name }
        : {}),
      ...('color' in updates && updates.color ? { color: updates.color } : {}),
      ...('parentId' in updates ? { parentId: updates.parentId ?? null } : {}),
    };

    await this.database.folders.put(updated);
    this.folders.set(id, updated);

    await this.persistSnapshotSafe();
    this.emitChange();

    return cloneFolder(updated);
  }

  async deleteFolder(id: string): Promise<void> {
    await this.ensureInitialized();

    if (id === DEFAULT_FOLDER_ID) {
      throw new Error('Cannot delete the default folder');
    }

    if (!this.folders.has(id)) {
      return;
    }

    const idsToDelete = this.collectDescendants(id);
    idsToDelete.add(id);

    const targetFolderIds = [...idsToDelete];
    const affectedNotebookIds = new Set<string>();

    for (const folderId of targetFolderIds) {
      const folder = this.folders.get(folderId);
      if (folder) {
        folder.notebookIds.forEach(notebookId => affectedNotebookIds.add(notebookId));
      }
    }

    await this.database.transaction('rw', this.database.folders, this.database.notebookMetadata, async () => {
      for (const folderId of targetFolderIds) {
        await this.database.folders.delete(folderId);
      }

      const metadataEntries = await this.database.notebookMetadata
        .where('notebookId')
        .anyOf([...affectedNotebookIds])
        .toArray();

      for (const entry of metadataEntries) {
        const filteredFolderIds = entry.folderIds.filter(folderId => !idsToDelete.has(folderId));
        entry.folderIds = filteredFolderIds.length > 0 ? filteredFolderIds : [DEFAULT_FOLDER_ID];
        entry.lastUpdatedAt = Date.now();
        await this.database.notebookMetadata.put(entry);
        this.metadata.set(entry.notebookId, cloneMetadata(entry));
      }
    });

    for (const folderId of targetFolderIds) {
      this.folders.delete(folderId);
    }

    this.ensureDefaultFolder();
    this.rebuildNotebookAssignments();

    await this.persistSnapshotSafe();
    this.emitChange();
  }

  async createTag(name: string, color?: string): Promise<Tag> {
    await this.ensureInitialized();

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Tag name is required');
    }

    const existingWithName = [...this.tags.values()].find(
      tag => tag.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingWithName) {
      throw new Error('Tag name must be unique');
    }

    const tag: Tag = {
      id: generateId('tag'),
      name: trimmedName,
      color: color ?? DEFAULT_TAG_COLOR,
      count: 0,
    };

    this.tags.set(tag.id, tag);

    await this.persistSnapshotSafe();
    this.emitChange();

    return cloneTag(tag);
  }

  async updateTag(id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>): Promise<Tag> {
    await this.ensureInitialized();

    const existing = this.tags.get(id);
    if (!existing) {
      throw new Error('Tag not found');
    }

    const updated: Tag = {
      ...existing,
      ...('name' in updates && updates.name !== undefined
        ? { name: updates.name.trim() || existing.name }
        : {}),
      ...('color' in updates && updates.color ? { color: updates.color } : {}),
    };

    this.tags.set(id, updated);

    await this.persistSnapshotSafe();
    this.emitChange();

    return cloneTag(updated);
  }

  async deleteTag(id: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.tags.has(id)) {
      return;
    }

    this.tags.delete(id);

    await this.database.transaction('rw', this.database.notebookMetadata, async () => {
      const metadataEntries = await this.database.notebookMetadata
        .filter(entry => entry.tagIds.includes(id))
        .toArray();

      for (const entry of metadataEntries) {
        entry.tagIds = entry.tagIds.filter(tagId => tagId !== id);
        entry.lastUpdatedAt = Date.now();
        await this.database.notebookMetadata.put(entry);
        this.metadata.set(entry.notebookId, cloneMetadata(entry));
      }
    });

    this.recalculateTagCounts();

    await this.persistSnapshotSafe();
    this.emitChange();
  }

  async moveNotebook(notebookId: string, targetFolderId: string | null): Promise<NotebookMetadata> {
    await this.ensureInitialized();

    const folderId = targetFolderId ?? DEFAULT_FOLDER_ID;

    if (!this.folders.has(folderId)) {
      throw new Error('Target folder not found');
    }

    let resultMetadata: NotebookMetadata | undefined;

    await this.database.transaction('rw', this.database.folders, this.database.notebookMetadata, async () => {
      const metadata =
        (await this.database.notebookMetadata.get(notebookId)) ??
        ({
          notebookId,
          folderIds: [DEFAULT_FOLDER_ID],
          tagIds: [],
          title: null,
          customName: null,
          lastUpdatedAt: Date.now(),
        } as NotebookMetadata);

      const previousFolderIds = [...metadata.folderIds];
      metadata.folderIds = [folderId];
      metadata.lastUpdatedAt = Date.now();

      await this.database.notebookMetadata.put(metadata);
      this.metadata.set(notebookId, cloneMetadata(metadata));

      for (const previousFolderId of previousFolderIds) {
        const folder = this.folders.get(previousFolderId);
        if (folder) {
          folder.notebookIds = folder.notebookIds.filter(id => id !== notebookId);
          await this.database.folders.put(folder);
          this.folders.set(folder.id, { ...folder, notebookIds: [...folder.notebookIds] });
        }
      }

      const targetFolder = this.folders.get(folderId);
      if (targetFolder && !targetFolder.notebookIds.includes(notebookId)) {
        targetFolder.notebookIds = [...targetFolder.notebookIds, notebookId];
        await this.database.folders.put(targetFolder);
        this.folders.set(targetFolder.id, { ...targetFolder, notebookIds: [...targetFolder.notebookIds] });
      }

      resultMetadata = cloneMetadata(metadata);
    });

    if (!resultMetadata) {
      throw new Error('Failed to move notebook');
    }

    await this.persistSnapshotSafe();
    this.emitChange();

    return resultMetadata;
  }

  async bulkMoveNotebooks(notebookIds: string[], folderId: string | null): Promise<void> {
    for (const notebookId of notebookIds) {
      await this.moveNotebook(notebookId, folderId);
    }
  }

  async assignTag(notebookId: string, tagId: string): Promise<NotebookMetadata> {
    await this.ensureInitialized();

    const tag = this.tags.get(tagId);
    if (!tag) {
      throw new Error('Tag not found');
    }

    let resultMetadata: NotebookMetadata | undefined;

    await this.database.transaction('rw', this.database.notebookMetadata, async () => {
      const metadata =
        (await this.database.notebookMetadata.get(notebookId)) ??
        ({
          notebookId,
          folderIds: [DEFAULT_FOLDER_ID],
          tagIds: [],
          title: null,
          customName: null,
          lastUpdatedAt: Date.now(),
        } as NotebookMetadata);

      if (!metadata.tagIds.includes(tagId)) {
        metadata.tagIds = [...metadata.tagIds, tagId];
      }

      metadata.lastUpdatedAt = Date.now();

      await this.database.notebookMetadata.put(metadata);
      this.metadata.set(notebookId, cloneMetadata(metadata));
      resultMetadata = cloneMetadata(metadata);
    });

    this.recalculateTagCounts();

    await this.persistSnapshotSafe();
    this.emitChange();

    if (!resultMetadata) {
      throw new Error('Failed to assign tag');
    }

    return resultMetadata;
  }

  async removeTag(notebookId: string, tagId: string): Promise<NotebookMetadata> {
    await this.ensureInitialized();

    const metadata = this.metadata.get(notebookId);
    if (!metadata || !metadata.tagIds.includes(tagId)) {
      return metadata ? cloneMetadata(metadata) : await this.getNotebookMetadata(notebookId);
    }

    let resultMetadata: NotebookMetadata | undefined;

    await this.database.transaction('rw', this.database.notebookMetadata, async () => {
      const entry = await this.database.notebookMetadata.get(notebookId);
      if (!entry) {
        return;
      }

      entry.tagIds = entry.tagIds.filter(id => id !== tagId);
      entry.lastUpdatedAt = Date.now();
      await this.database.notebookMetadata.put(entry);

      this.metadata.set(notebookId, cloneMetadata(entry));
      resultMetadata = cloneMetadata(entry);
    });

    this.recalculateTagCounts();

    await this.persistSnapshotSafe();
    this.emitChange();

    if (!resultMetadata) {
      return await this.getNotebookMetadata(notebookId);
    }

    return resultMetadata;
  }

  async getNotebookMetadata(notebookId: string): Promise<NotebookMetadata> {
    await this.ensureInitialized();

    const metadata =
      this.metadata.get(notebookId) ||
      (await this.database.notebookMetadata.get(notebookId)) ||
      ({
        notebookId,
        folderIds: [DEFAULT_FOLDER_ID],
        tagIds: [],
        title: null,
        customName: null,
        lastUpdatedAt: Date.now(),
      } as NotebookMetadata);

    return cloneMetadata(metadata);
  }

  async updateNotebookMetadata(
    notebookId: string,
    updates: Partial<Pick<NotebookMetadata, 'title' | 'customName' | 'folderIds' | 'tagIds'>>
  ): Promise<NotebookMetadata> {
    await this.ensureInitialized();

    let resultMetadata: NotebookMetadata | undefined;

    await this.database.transaction('rw', this.database.notebookMetadata, async () => {
      const metadata =
        (await this.database.notebookMetadata.get(notebookId)) ??
        ({
          notebookId,
          folderIds: [DEFAULT_FOLDER_ID],
          tagIds: [],
          title: null,
          customName: null,
          lastUpdatedAt: Date.now(),
        } as NotebookMetadata);

      // Apply updates
      if ('title' in updates && updates.title !== undefined) {
        metadata.title = updates.title;
      }
      if ('customName' in updates && updates.customName !== undefined) {
        metadata.customName = updates.customName;
      }
      if ('folderIds' in updates && updates.folderIds !== undefined) {
        metadata.folderIds = updates.folderIds;
      }
      if ('tagIds' in updates && updates.tagIds !== undefined) {
        metadata.tagIds = updates.tagIds;
      }

      metadata.lastUpdatedAt = Date.now();

      await this.database.notebookMetadata.put(metadata);
      this.metadata.set(notebookId, cloneMetadata(metadata));
      resultMetadata = cloneMetadata(metadata);
    });

    await this.persistSnapshotSafe();
    this.emitChange();

    if (!resultMetadata) {
      throw new Error('Failed to update notebook metadata');
    }

    return resultMetadata;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async loadFromPersistence(): Promise<void> {
    await this.readStorageMode();

    const snapshot =
      (await this.readSnapshot(this.storageMode === 'sync' ? this.syncArea : undefined)) ??
      (await this.readSnapshot(this.localArea));

    if (snapshot) {
      await this.applySnapshot(snapshot);
      return;
    }

    await this.loadFromDatabase();
    await this.persistSnapshotSafe();
  }

  private async readStorageMode(): Promise<void> {
    if (!this.localArea) {
      this.storageMode = 'local';
      return;
    }

    try {
      const result = await this.localArea.get(STORAGE_MODE_KEY);
      const value = result?.[STORAGE_MODE_KEY];
      if (value === 'sync' || value === 'local') {
        this.storageMode = value;
      }
    } catch (error) {
      console.warn('[FolderService] Unable to read storage mode, defaulting to sync:', error);
    }
  }

  private async loadFromDatabase(): Promise<void> {
    const [folders, metadata] = await Promise.all([
      this.database.folders.toArray(),
      this.database.notebookMetadata.toArray(),
    ]);

    this.folders = new Map(folders.map(folder => [folder.id, cloneFolder(folder)]));
    this.metadata = new Map(metadata.map(entry => [entry.notebookId, cloneMetadata(entry)]));

    this.ensureDefaultFolder();
    this.rebuildNotebookAssignments();
    this.recalculateTagCounts();
  }

  private async applySnapshot(snapshot: FolderStorageSnapshot): Promise<void> {
    this.storageMode = snapshot.storageMode;

    this.folders = new Map(snapshot.folders.map(folder => [folder.id, cloneFolder(folder)]));
    this.tags = new Map(snapshot.tags.map(tag => [tag.id, cloneTag(tag)]));
    this.metadata = new Map(snapshot.metadata.map(entry => [entry.notebookId, cloneMetadata(entry)]));

    await this.database.transaction('rw', this.database.folders, this.database.notebookMetadata, async () => {
      await this.database.folders.clear();
      if (snapshot.folders.length > 0) {
        await this.database.folders.bulkPut(snapshot.folders);
      }

      await this.database.notebookMetadata.clear();
      if (snapshot.metadata.length > 0) {
        await this.database.notebookMetadata.bulkPut(snapshot.metadata);
      }
    });

    this.ensureDefaultFolder();
    this.rebuildNotebookAssignments();
    this.recalculateTagCounts();

    this.emitChange();
  }

  private async readSnapshot(area?: ChromeStorageArea): Promise<FolderStorageSnapshot | null> {
    if (!area) {
      return null;
    }

    try {
      const result = await area.get(STORAGE_KEY);
      const snapshot = result?.[STORAGE_KEY] as FolderStorageSnapshot | undefined;
      if (snapshot && snapshot.version === SNAPSHOT_VERSION) {
        return snapshot;
      }
    } catch (error) {
      console.warn('[FolderService] Failed to read snapshot:', error);
    }

    return null;
  }

  private async persistSnapshotSafe(): Promise<void> {
    try {
      await this.persistSnapshot();
    } catch (error) {
      console.error('[FolderService] Failed to persist snapshot:', error);
    }
  }

  private async persistSnapshot(): Promise<void> {
    if (!this.syncArea && !this.localArea) {
      return;
    }

    const snapshot: FolderStorageSnapshot = {
      version: SNAPSHOT_VERSION,
      folders: [...this.folders.values()].map(cloneFolder),
      tags: [...this.tags.values()].map(cloneTag),
      metadata: [...this.metadata.values()].map(cloneMetadata),
      lastUpdatedAt: Date.now(),
      storageMode: this.storageMode,
    };

    if (this.storageMode === 'sync' && this.syncArea) {
      try {
        this.suppressStorageEvent = true;
        await this.syncArea.set({ [STORAGE_KEY]: snapshot });
        if (this.localArea) {
          await this.localArea.set({
            [STORAGE_KEY]: snapshot,
            [STORAGE_MODE_KEY]: 'sync',
          });
        }
      } catch (error) {
        if (this.isQuotaError(error)) {
          console.warn('[FolderService] Sync quota exceeded, falling back to local storage');
          this.storageMode = 'local';
          await this.persistSnapshotToLocal(snapshot);
        } else {
          throw error;
        }
      } finally {
        setTimeout(() => {
          this.suppressStorageEvent = false;
        }, 0);
      }
    } else {
      await this.persistSnapshotToLocal(snapshot);
    }
  }

  private async persistSnapshotToLocal(snapshot: FolderStorageSnapshot): Promise<void> {
    if (!this.localArea) {
      return;
    }

    await this.localArea.set({
      [STORAGE_KEY]: snapshot,
      [STORAGE_MODE_KEY]: 'local',
    });
  }

  private isQuotaError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('quota') || message.includes('bytes');
    }
    return false;
  }

  private ensureDefaultFolder(): Folder {
    let folder = this.folders.get(DEFAULT_FOLDER_ID);
    if (!folder) {
      folder = {
        id: DEFAULT_FOLDER_ID,
        name: DEFAULT_FOLDER_NAME,
        parentId: null,
        notebookIds: [],
        createdAt: Date.now(),
        color: DEFAULT_FOLDER_COLOR,
      };
      this.folders.set(folder.id, folder);
      void this.database.folders.put(folder);
    }
    return folder;
  }

  private rebuildNotebookAssignments(): void {
    for (const folder of this.folders.values()) {
      folder.notebookIds = [];
    }
    for (const metadata of this.metadata.values()) {
      for (const folderId of metadata.folderIds) {
        const folder = this.folders.get(folderId);
        if (folder && !folder.notebookIds.includes(metadata.notebookId)) {
          folder.notebookIds.push(metadata.notebookId);
        }
      }
    }
  }

  private recalculateTagCounts(): void {
    const counts = new Map<string, number>();
    for (const metadata of this.metadata.values()) {
      for (const tagId of metadata.tagIds) {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
      }
    }

    for (const [tagId, tag] of this.tags.entries()) {
      this.tags.set(tagId, { ...tag, count: counts.get(tagId) ?? 0 });
    }
  }

  private calculateDepth(folderId: string): number {
    let depth = 1;
    let currentId = folderId;
    const visited = new Set<string>();

    while (true) {
      if (visited.has(currentId)) {
        return depth;
      }
      visited.add(currentId);

      const folder = this.folders.get(currentId);
      if (!folder || folder.parentId === null) {
        break;
      }

      depth += 1;
      currentId = folder.parentId;
    }

    return depth;
  }

  private isDescendant(candidateId: string, ancestorId: string): boolean {
    let currentId: string | null = candidateId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        return false;
      }
      visited.add(currentId);

      if (currentId === ancestorId) {
        return true;
      }

      const folder = this.folders.get(currentId);
      currentId = folder?.parentId ?? null;
    }

    return false;
  }

  private collectDescendants(folderId: string): Set<string> {
    const result = new Set<string>();
    const queue = [folderId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      for (const folder of this.folders.values()) {
        if (folder.parentId === current && !result.has(folder.id)) {
          result.add(folder.id);
          queue.push(folder.id);
        }
      }
    }

    return result;
  }

  private handleStorageChange = async (
    changes: Record<string, StorageChange>,
    areaName: string
  ): Promise<void> => {
    if (areaName !== 'sync') {
      return;
    }

    if (this.suppressStorageEvent) {
      return;
    }

    const change = changes[STORAGE_KEY];
    if (!change || !change.newValue) {
      return;
    }

    const snapshot = change.newValue as FolderStorageSnapshot;
    if (snapshot.version !== SNAPSHOT_VERSION) {
      return;
    }

    await this.applySnapshot(snapshot);
  };

  private emitChange(): void {
    if (this.listeners.size === 0) {
      return;
    }

    console.log('[FolderService] emitChange');
    const payload = {
      folders: buildFolderTree([...this.folders.values()]),
      tags: [...this.tags.values()].map(cloneTag).sort((a, b) => a.name.localeCompare(b.name)),
      storageMode: this.storageMode,
    };

    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (error) {
        console.error('[FolderService] Listener error:', error);
      }
    }
  }
}

export const folderService = new FolderService();

function buildFolderTree(folders: Folder[]): FolderTreeNode[] {
  const nodes = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  const sorted = [...folders].sort((a, b) => a.createdAt - b.createdAt);

  for (const folder of sorted) {
    nodes.set(folder.id, {
      ...cloneFolder(folder),
      children: [],
      depth: 1,
    });
  }

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      const parent = nodes.get(node.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      node.depth = 1;
      roots.push(node);
    }
  }

  for (const node of nodes.values()) {
    node.children.sort((a, b) => a.createdAt - b.createdAt);
  }

  roots.sort((a, b) => a.createdAt - b.createdAt);
  return roots;
}
