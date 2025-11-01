import type Dexie from 'dexie';
import type { Table } from 'dexie';
import type { ChatEntry } from '../../types/search';
import type { Folder, NotebookMetadata } from '../../types/folder';
import { DEFAULT_FOLDER_ID, DEFAULT_FOLDER_NAME } from '../../types/folder';

const DEFAULT_FOLDER_COLOR = '#6b7280';

interface MigrationReport {
  scannedChats: number;
  uniqueNotebooks: number;
  metadataCreated: number;
  metadataUpdated: number;
}

export async function runFolderMigration(transaction: Dexie.Transaction): Promise<void> {
  const foldersTable = transaction.table('folders') as Table<Folder, string>;
  const metadataTable = transaction.table('notebookMetadata') as Table<NotebookMetadata, string>;
  const chatsTable = transaction.table('chats') as Table<ChatEntry, string>;

  const report: MigrationReport = {
    scannedChats: 0,
    uniqueNotebooks: 0,
    metadataCreated: 0,
    metadataUpdated: 0,
  };

  try {
    const chats = await chatsTable.toArray();
    report.scannedChats = chats.length;

    const notebookIds = new Set<string>();
    for (const chat of chats) {
      if (chat.notebookId) {
        notebookIds.add(chat.notebookId);
      }
    }

    report.uniqueNotebooks = notebookIds.size;

    const now = Date.now();
    const defaultFolder: Folder = {
      id: DEFAULT_FOLDER_ID,
      name: DEFAULT_FOLDER_NAME,
      parentId: null,
      notebookIds: [...notebookIds],
      createdAt: now,
      color: DEFAULT_FOLDER_COLOR,
    };

    await foldersTable.put(defaultFolder);

    const metadataToWrite: NotebookMetadata[] = [];

    for (const notebookId of notebookIds) {
      const existing = await metadataTable.get(notebookId);
      if (existing) {
        if (!existing.folderIds.includes(DEFAULT_FOLDER_ID)) {
          existing.folderIds = [...existing.folderIds, DEFAULT_FOLDER_ID];
          existing.lastUpdatedAt = now;
          await metadataTable.put(existing);
          report.metadataUpdated += 1;
        }
        continue;
      }

      metadataToWrite.push({
        notebookId,
        folderIds: [DEFAULT_FOLDER_ID],
        tagIds: [],
        customName: null,
        lastUpdatedAt: now,
      });
    }

    if (metadataToWrite.length > 0) {
      await metadataTable.bulkPut(metadataToWrite);
      report.metadataCreated = metadataToWrite.length;
    }

    console.info('[Migration] Folder migration completed', report);
  } catch (error) {
    console.error('[Migration] Folder migration failed', error);
    throw error;
  }
}
