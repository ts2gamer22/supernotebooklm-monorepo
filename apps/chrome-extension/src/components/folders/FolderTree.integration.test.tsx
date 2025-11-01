import 'fake-indexeddb/auto';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { FolderTree } from './FolderTree';
import { resetFolderStoreForTests, useFolderStore } from '../../stores/useFolderStore';

declare global {
  // eslint-disable-next-line no-var
  var chrome: typeof chrome | undefined;
}

function createStorageArea() {
  const store = new Map<string, unknown>();

  return {
    async get(key?: string | string[] | Record<string, unknown>) {
      if (!key) {
        return Object.fromEntries(store.entries());
      }

      if (typeof key === 'string') {
        return { [key]: store.get(key) };
      }

      if (Array.isArray(key)) {
        return key.reduce<Record<string, unknown>>((accumulator, current) => {
          accumulator[current] = store.get(current);
          return accumulator;
        }, {});
      }

      return Object.keys(key).reduce<Record<string, unknown>>((accumulator, current) => {
        accumulator[current] = store.get(current);
        return accumulator;
      }, {});
    },
    async set(items: Record<string, unknown>) {
      Object.entries(items).forEach(([key, value]) => {
        store.set(key, value);
      });
    },
    async remove(key: string | string[]) {
      if (Array.isArray(key)) {
        key.forEach(item => store.delete(item));
      } else {
        store.delete(key);
      }
    },
    get size() {
      return store.size;
    },
    clear() {
      store.clear();
    },
  };
}

function setupChromeMock() {
  const syncArea = createStorageArea();
  const localArea = createStorageArea();
  const listeners = new Set<
    (changes: Record<string, chrome.storage.StorageChange>, areaName: 'sync' | 'local') => void
  >();

  const notify = async (
    area: 'sync' | 'local',
    items: Record<string, unknown>,
    previous: Record<string, unknown>
  ) => {
    if (listeners.size === 0) {
      return;
    }

    const changes: Record<string, chrome.storage.StorageChange> = {};
    Object.entries(items).forEach(([key, value]) => {
      if (value !== previous[key]) {
        changes[key] = { oldValue: previous[key], newValue: value };
      }
    });

    if (Object.keys(changes).length > 0) {
      listeners.forEach(listener => {
        listener(changes, area);
      });
    }
  };

  const wrapArea = (
    areaName: 'sync' | 'local',
    area: ReturnType<typeof createStorageArea>
  ): chrome.storage.StorageArea => ({
    get: key => area.get(key),
    set: async items => {
      const snapshot = await area.get();
      await area.set(items);
      await notify(areaName, items, snapshot);
    },
    remove: key => area.remove(key),
    clear: () => area.clear(),
    getBytesInUse: async () => area.size,
  });

  global.chrome = {
    storage: {
      sync: wrapArea('sync', syncArea),
      local: wrapArea('local', localArea),
      onChanged: {
        addListener: (listener: typeof listeners extends Set<infer T> ? T : never) => {
          listeners.add(listener);
        },
        removeListener: (listener: typeof listeners extends Set<infer T> ? T : never) => {
          listeners.delete(listener);
        },
        hasListeners: () => listeners.size > 0,
      },
    },
  } as unknown as typeof chrome;
}

beforeAll(() => {
  setupChromeMock();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  resetFolderStoreForTests();
  (chrome.storage.sync as { clear: () => void }).clear();
  (chrome.storage.local as { clear: () => void }).clear();
  vi.clearAllMocks();
});

describe('FolderTree integration', () => {
  it('renders without throwing React invariant violations', async () => {
    const updates: Array<{ folders: number; isLoading: boolean }> = [];
    const unsubscribe = useFolderStore.subscribe(state => {
      updates.push({
        folders: state.folders.length,
        isLoading: state.isLoading,
      });
    });

    render(<FolderTree />);
    await screen.findByText('Notebook Folders');

    await waitFor(() => {
      const finalUpdate = updates.at(-1);
      expect(finalUpdate).toBeTruthy();
      expect(finalUpdate?.folders).toBeGreaterThan(0);
      expect(finalUpdate?.isLoading).toBe(false);
    });

    unsubscribe();
  });
});
