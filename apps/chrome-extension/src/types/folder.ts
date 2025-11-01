export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  notebookIds: string[];
  createdAt: number;
  color: string;
}

export const DEFAULT_FOLDER_ID = 'folder-unorganized';
export const DEFAULT_FOLDER_NAME = 'Unorganized';

export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}

export interface NotebookMetadata {
  notebookId: string;
  folderIds: string[];
  tagIds: string[];
  title?: string | null; // Actual notebook title from NotebookLM
  customName?: string | null; // User-provided custom name (overrides title)
  lastUpdatedAt: number;
}

export type FolderUpdate = Partial<Pick<Folder, 'name' | 'color' | 'parentId'>> & {
  notebookIds?: string[];
};

export type TagUpdate = Partial<Pick<Tag, 'name' | 'color'>>;

export type NotebookMetadataUpdate = Partial<
  Pick<NotebookMetadata, 'folderIds' | 'tagIds' | 'customName' | 'lastUpdatedAt'>
>;

export const MAX_FOLDER_DEPTH = 3;

export function isFolderValid(folder: Folder): boolean {
  if (!folder.id || !folder.name.trim()) {
    return false;
  }

  if (folder.parentId === folder.id) {
    return false;
  }

  if (!Array.isArray(folder.notebookIds)) {
    return false;
  }

  if (typeof folder.createdAt !== 'number' || Number.isNaN(folder.createdAt)) {
    return false;
  }

  return typeof folder.color === 'string';
}

export function isTagValid(tag: Tag): boolean {
  if (!tag.id || !tag.name.trim()) {
    return false;
  }

  if (typeof tag.count !== 'number' || tag.count < 0) {
    return false;
  }

  return typeof tag.color === 'string';
}

export function isNotebookMetadataValid(metadata: NotebookMetadata): boolean {
  if (!metadata.notebookId) {
    return false;
  }

  if (!Array.isArray(metadata.folderIds) || !Array.isArray(metadata.tagIds)) {
    return false;
  }

  if (typeof metadata.lastUpdatedAt !== 'number' || Number.isNaN(metadata.lastUpdatedAt)) {
    return false;
  }

  return true;
}
