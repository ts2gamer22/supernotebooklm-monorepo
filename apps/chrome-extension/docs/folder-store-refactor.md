# Folder Store Refactor & React 19 Fix

## Summary

This document explains the changes made to eliminate the React 19 “Maximum update depth exceeded” crash that occurred when rendering the `FolderTree` content script. The fix required restructuring the folder Zustand store, the `FolderTree` component, and associated integration tests to ensure state updates no longer fire recursively during React’s commit phase.

## Key Problems Identified

- **Recursive updates during mount:** `loadFolders` triggered `setState` calls while the initial passive effects were still running, causing React 19 to abort with invariant #185.
- **Listener registration order:** The content script registered the Chrome storage listener before the React tree had a chance to subscribe, leading to unobserved updates.
- **Test harness expectations:** Integration tests expected the old behaviour (throwing the React invariant), so they needed to be rewritten to validate the new flow.

## Implementation Details

### 1. Custom React Hook Wrapper for Zustand

A bespoke hook now wraps the underlying Zustand `folderStore`. It mirrors the public API (`useFolderStore(selector, equalityFn)`) but drives re-renders using internal refs and a `useReducer`, guaranteeing React only updates when the selected slice actually changes.

```ts
const useFolderStoreInternal = <T>(
  selector: (state: FolderStoreState) => T,
  equalityFn: EqualityFn<T> = Object.is
): T => {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const equalityRef = useRef(equalityFn);
  equalityRef.current = equalityFn;

  const [, forceUpdate] = useReducer(index => index + 1, 0);
  const selectedRef = useRef(selector(folderStore.getState()));

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
```

This avoids `useSyncExternalStore`, deferring updates until React is ready, which breaks the commit-loop cycle reported by React 19.

### 2. Store Bootstrap Simplification

The previous “bootstrap” helper preloaded the store from the background script. That initialised the store outside React and inevitably re-fired updates once the tree rendered. The helper is now reduced to a no-op stub for compatibility, and `FolderTree` is solely responsible for:

1. Registering the Chrome sync listener on mount.
2. Calling `loadFolders()` inside `startTransition` so queued updates run after the first paint.

### 3. `FolderTree` Mount Flow

- Added `loadFolders` and `registerServiceListener` to the selector used by the component.
- Leveraged `startTransition` to invoke `loadFolders`. React can now flush the initial render before the store pushes its first snapshot.
- Kept the metadata fetching effect but guarded the initial call with a ref so it only executes once the store has baseline data.

### 4. Revised Integration Test (`FolderTree.integration.test.tsx`)

- The test now renders the tree and awaits the final “Notebook Folders” render without expecting a thrown error.
- It also asserts that the observer captured both the intermediate `isLoading: true` state and the final populated state.
- Additional smoke tests that mocked the old hook behaviour were removed; they no longer apply after the hook refactor.

## Validation

- ✅ `npx vitest run src/components/folders/FolderTree.integration.test.tsx`
- ❌ `npm run build` was **not** executed during this iteration.
- ⚠️ Running the full suite (`npx vitest run`) still exposes unrelated failures (auth store isolation, auth-client module resolution). These pre-existing issues remain to be addressed separately.

## Next Steps

1. Decide whether we need a lightweight bootstrap helper (e.g., for preloading in service workers) given the new lifecycle.
2. Repair the failing auth-related tests uncovered during `npx vitest run`.
3. Once satisfied, execute `npm run build` to confirm the packaged extension compiles with the new wiring.

