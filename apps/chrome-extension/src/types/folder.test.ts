import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FOLDER_ID,
  DEFAULT_FOLDER_NAME,
  MAX_FOLDER_DEPTH,
  type Folder,
  type NotebookMetadata,
  type Tag,
  isFolderValid,
  isNotebookMetadataValid,
  isTagValid,
} from './folder';

const baseFolder: Folder = {
  id: DEFAULT_FOLDER_ID,
  name: DEFAULT_FOLDER_NAME,
  parentId: null,
  notebookIds: [],
  createdAt: Date.now(),
  color: '#6b7280',
};

const baseTag: Tag = {
  id: 'tag-1',
  name: 'Important',
  color: '#ff0000',
  count: 0,
};

const baseMetadata: NotebookMetadata = {
  notebookId: 'nb-1',
  folderIds: [DEFAULT_FOLDER_ID],
  tagIds: [],
  customName: null,
  lastUpdatedAt: Date.now(),
};

describe('folder type validation', () => {
  it('validates folder structure', () => {
    expect(isFolderValid(baseFolder)).toBe(true);

    expect(
      isFolderValid({
        ...baseFolder,
        id: '',
      })
    ).toBe(false);

    expect(
      isFolderValid({
        ...baseFolder,
        parentId: baseFolder.id,
      })
    ).toBe(false);
  });

  it('validates tag structure', () => {
    expect(isTagValid(baseTag)).toBe(true);

    expect(
      isTagValid({
        ...baseTag,
        id: '',
      })
    ).toBe(false);

    expect(
      isTagValid({
        ...baseTag,
        count: -1,
      })
    ).toBe(false);
  });

  it('validates notebook metadata structure', () => {
    expect(isNotebookMetadataValid(baseMetadata)).toBe(true);

    expect(
      isNotebookMetadataValid({
        ...baseMetadata,
        notebookId: '',
      })
    ).toBe(false);

    expect(
      isNotebookMetadataValid({
        ...baseMetadata,
        lastUpdatedAt: Number.NaN,
      })
    ).toBe(false);
  });

  it('exposes maximum folder depth constant', () => {
    expect(MAX_FOLDER_DEPTH).toBeGreaterThanOrEqual(1);
  });
});
