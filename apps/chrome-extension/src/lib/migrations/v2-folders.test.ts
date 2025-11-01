import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Dexie from 'dexie';
import { runFolderMigration } from './v2-folders';
import type { Folder, NotebookMetadata } from '../../types/folder';
import { DEFAULT_FOLDER_ID } from '../../types/folder';
import type { ChatEntry } from '../../types/search';

class MemoryTable<T extends Record<string, unknown>> {
  constructor(private readonly primaryKey: keyof T) {}
  private readonly store = new Map<string, T>();

  async put(value: T): Promise<string> {
    const key = this.extractKey(value);
    this.store.set(key, this.clone(value));
    return key;
  }

  async bulkPut(values: T[]): Promise<void> {
    for (const value of values) {
      await this.put(value);
    }
  }

  async get(key: string): Promise<T | undefined> {
    const value = this.store.get(key);
    return value ? this.clone(value) : undefined;
  }

  async toArray(): Promise<T[]> {
    return [...this.store.values()].map(value => this.clone(value));
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

describe('runFolderMigration', () => {
  let foldersTable: MemoryTable<Folder>;
  let metadataTable: MemoryTable<NotebookMetadata>;
  let chatsTable: MemoryTable<ChatEntry>;

  const createTransaction = (): Dexie.Transaction =>
    ({
      table: (name: string) => {
        switch (name) {
          case 'folders':
            return foldersTable;
          case 'notebookMetadata':
            return metadataTable;
          case 'chats':
            return chatsTable;
          default:
            throw new Error(`Unknown table requested: ${name}`);
        }
      },
    }) as unknown as Dexie.Transaction;

  beforeEach(() => {
    foldersTable = new MemoryTable<Folder>('id');
    metadataTable = new MemoryTable<NotebookMetadata>('notebookId');
    chatsTable = new MemoryTable<ChatEntry>('id');
  });

  it('creates default folder and notebook metadata entries', async () => {
    const now = Date.now();
    await chatsTable.bulkPut([
      {
        id: 'chat-1',
        question: 'Q1',
        answer: 'A1',
        timestamp: now,
        notebookId: 'nb-1',
      },
      {
        id: 'chat-2',
        question: 'Q2',
        answer: 'A2',
        timestamp: now,
        notebookId: 'nb-2',
      },
      {
        id: 'chat-3',
        question: 'Q3',
        answer: 'A3',
        timestamp: now,
      },
    ]);

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await runFolderMigration(createTransaction());

    const defaultFolder = await foldersTable.get(DEFAULT_FOLDER_ID);
    expect(defaultFolder).toBeDefined();
    expect(defaultFolder?.notebookIds.sort()).toEqual(['nb-1', 'nb-2']);

    const metadata1 = await metadataTable.get('nb-1');
    const metadata2 = await metadataTable.get('nb-2');

    expect(metadata1?.folderIds).toEqual([DEFAULT_FOLDER_ID]);
    expect(metadata2?.folderIds).toEqual([DEFAULT_FOLDER_ID]);

    expect(infoSpy).toHaveBeenCalledWith(
      '[Migration] Folder migration completed',
      expect.objectContaining({
        uniqueNotebooks: 2,
        metadataCreated: 2,
      })
    );

    infoSpy.mockRestore();
  });
});
