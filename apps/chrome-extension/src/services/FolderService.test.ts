import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FolderService } from './FolderService';
import type { Folder, NotebookMetadata, Tag } from '../types/folder';
import { DEFAULT_FOLDER_ID } from '../types/folder';

class MemoryTable<T extends Record<string, unknown>> {
  constructor(private readonly primaryKey: keyof T) {}

  private readonly store = new Map<string, T>();

  async add(value: T): Promise<string> {
    const key = this.extractKey(value);
    this.store.set(key, this.clone(value));
    return key;
  }

  async put(value: T): Promise<string> {
    const key = this.extractKey(value);
    this.store.set(key, this.clone(value));
    return key;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async get(key: string): Promise<T | undefined> {
    const value = this.store.get(key);
    return value ? this.clone(value) : undefined;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async bulkPut(values: T[]): Promise<void> {
    for (const value of values) {
      await this.put(value);
    }
  }

  async toArray(): Promise<T[]> {
    return [...this.store.values()].map(value => this.clone(value));
  }

  where(field: keyof T) {
    return {
      anyOf: (keys: string[]) => ({
        toArray: async () => {
          const keySet = new Set(keys);
          const results: T[] = [];
          for (const item of this.store.values()) {
            const value = String(item[field] ?? '');
            if (keySet.has(value)) {
              results.push(this.clone(item));
            }
          }
          return results;
        },
      }),
    };
  }

  filter(predicate: (value: T) => boolean) {
    return {
      toArray: async () => {
        const results: T[] = [];
        for (const item of this.store.values()) {
          const cloned = this.clone(item);
          if (predicate(cloned)) {
            results.push(cloned);
          }
        }
        return results;
      },
    };
  }

  values(): T[] {
    return [...this.store.values()].map(value => this.clone(value));
  }

  private extractKey(value: T): string {
    return String(value[this.primaryKey]);
  }

  private clone(value: T): T {
    return value === undefined || value === null
      ? value
      : (JSON.parse(JSON.stringify(value)) as T);
  }
}

class MemoryStorageArea {
  private readonly store = new Map<string, unknown>();

  async get(key?: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!key) {
      return Object.fromEntries(this.store);
    }

    if (typeof key === 'string') {
      return this.store.has(key) ? { [key]: this.clone(this.store.get(key)) } : {};
    }

    if (Array.isArray(key)) {
      const result: Record<string, unknown> = {};
      for (const entry of key) {
        if (this.store.has(entry)) {
          result[entry] = this.clone(this.store.get(entry));
        }
      }
      return result;
    }

    const keys = Object.keys(key);
    return this.get(keys);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async set(items: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      this.store.set(key, this.clone(value));
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async remove(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    keys.forEach(k => this.store.delete(k));
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  private clone<TValue>(value: TValue): TValue {
    if (value === undefined || value === null) {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }
}

class QuotaStorageArea extends MemoryStorageArea {
  override async set(): Promise<void> {
    throw new Error('QUOTA_BYTES_PER_ITEM quota exceeded');
  }
}

class MemoryStorageEvents {
  private listener: ((changes: Record<string, unknown>, areaName: string) => void) | null = null;

  addListener(listener: (changes: Record<string, unknown>, areaName: string) => void): void {
    this.listener = listener;
  }

  removeListener(listener: (changes: Record<string, unknown>, areaName: string) => void): void {
    if (this.listener === listener) {
      this.listener = null;
    }
  }

  dispatch(change: Record<string, unknown>): void {
    if (!this.listener) {
      return;
    }
    const wrapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(change)) {
      wrapped[key] = { newValue: value };
    }
    this.listener(wrapped, 'sync');
  }
}

class MemoryDb {
  folders = new MemoryTable<Folder>('id');
  notebookMetadata = new MemoryTable<NotebookMetadata>('notebookId');

  async transaction(_mode: string, ...args: unknown[]): Promise<void> {
    const scope = args.at(-1);
    if (typeof scope === 'function') {
      await (scope as () => Promise<void>)();
    }
  }
}

const STORAGE_KEY = 'snlm-folder-storage';
const STORAGE_MODE_KEY = 'snlm-folder-storage-mode';

describe('FolderService', () => {
  let syncStorage: MemoryStorageArea;
  let localStorage: MemoryStorageArea;
  let storageEvents: MemoryStorageEvents;
  let memoryDb: MemoryDb;
  let service: FolderService;

  const createService = () =>
    new FolderService(
      {
        syncStorage,
        localStorage,
        storageEvents,
      },
      memoryDb as unknown as typeof import('../lib/db').db
    );

  beforeEach(async () => {
    syncStorage = new MemoryStorageArea();
    localStorage = new MemoryStorageArea();
    storageEvents = new MemoryStorageEvents();
    memoryDb = new MemoryDb();
    service = createService();
    await service.initialize();
  });

  it('creates default folder during initialization', async () => {
    const defaultFolder = await memoryDb.folders.get(DEFAULT_FOLDER_ID);
    expect(defaultFolder?.name).toBeDefined();
    expect(defaultFolder?.parentId).toBeNull();
  });

  it('creates folders and enforces depth limits', async () => {
    const level1 = await service.createFolder('Level 1');
    const level2 = await service.createFolder('Level 2', level1.id);
    const level3 = await service.createFolder('Level 3', level2.id);

    await expect(service.createFolder('Too Deep', level3.id)).rejects.toThrow(
      /cannot exceed depth/i
    );

    const stored = await memoryDb.folders.get(level2.id);
    expect(stored?.parentId).toBe(level1.id);
  });

  it('moves notebooks and reassigns on folder deletion', async () => {
    const folder = await service.createFolder('Research');
    await service.moveNotebook('nb-1', folder.id);

    let metadata = await service.getNotebookMetadata('nb-1');
    expect(metadata.folderIds).toEqual([folder.id]);

    await service.deleteFolder(folder.id);

    metadata = await service.getNotebookMetadata('nb-1');
    expect(metadata.folderIds).toEqual([DEFAULT_FOLDER_ID]);
  });

  it('assigns and removes tags with accurate counts', async () => {
    const tag = await service.createTag('Urgent', '#ff0000');
    const metadata = await service.assignTag('nb-42', tag.id);
    expect(metadata.tagIds).toContain(tag.id);

    const tags = await service.getTags();
    const urgent = tags.find(t => t.id === tag.id);
    expect(urgent?.count).toBe(1);

    await service.removeTag('nb-42', tag.id);
    const updatedTags = await service.getTags();
    expect(updatedTags.find(t => t.id === tag.id)?.count).toBe(0);
  });

  it('falls back to local storage when sync quota exceeded', async () => {
    syncStorage = new QuotaStorageArea();
    localStorage = new MemoryStorageArea();
    memoryDb = new MemoryDb();
    service = createService();
    await service.initialize();

    await service.createFolder('Local Only');
    const storageMode = await localStorage.get(STORAGE_MODE_KEY);
    expect(storageMode[STORAGE_MODE_KEY]).toBe('local');
    const snapshot = await localStorage.get(STORAGE_KEY);
    expect(snapshot[STORAGE_KEY]).toBeDefined();
  });

  it('notifies listeners on changes', async () => {
    const listener = vi.fn();
    const unsubscribe = service.addListener(listener);

    await service.createFolder('Listener Test');
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    await service.createFolder('No Notification');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
