# Testing Guide: Stories 3.1, 3.2, 3.3 - Folder & Tag System

## Current Status

Stories 3.1, 3.2, and 3.3 are implemented. Here's how to test the folder organization system.

---

## How Notebooks Are Added to Folders

**IMPORTANT:** Notebooks do NOT automatically appear in folders. You must manually organize them.

### Method 1: Drag and Drop (Primary Method)

1. **Go to NotebookLM dashboard:** `https://notebooklm.google.com`
2. **You should see:**
   - Your notebook cards in the main dashboard area
   - Folder tree on the left side
3. **Drag a notebook card** from the dashboard **into a folder** in the tree
4. **The notebook will move** to that folder
5. **The folder will show** "Notebook Name" underneath with a count badge

**If drag-and-drop isn't working:**
- Check browser console for errors
- Verify notebook cards have `draggable="true"` attribute
- Check if `enhanceNotebookCards()` is being called

### Method 2: Using the Browser Console (For Testing)

If the UI drag-and-drop isn't detecting notebooks, you can manually assign them:

```javascript
// Open DevTools Console on notebooklm.google.com

// 1. Import the folder service
import('@/src/services/FolderService').then(async ({ folderService }) => {
  
  // 2. Create a test folder
  const folder = await folderService.createFolder('My Test Folder', null, '#3b82f6');
  console.log('Created folder:', folder);
  
  // 3. Move a notebook to that folder (replace NOTEBOOK_ID with real ID)
  const notebookId = 'YOUR_NOTEBOOK_ID_HERE'; // Get from notebook URL
  await folderService.moveNotebook(notebookId, folder.id);
  console.log('Moved notebook to folder');
  
  // 4. Verify - get all folders
  const folders = await folderService.getFolders();
  console.log('All folders:', folders);
});
```

**To find a real notebook ID:**
1. Open a notebook in NotebookLM
2. Look at the URL: `https://notebooklm.google.com/notebook/abc-123-xyz`
3. The ID is: `abc-123-xyz`

---

## Testing Each Story Feature

### Story 3.1: Data Model (Backend - Invisible to Users)

This is the foundation. You can test it via console:

```javascript
import('@/src/services/FolderService').then(async ({ folderService }) => {
  // Create folder
  const folder = await folderService.createFolder('Test', null, '#3b82f6');
  
  // Create tag  
  const tag = await folderService.createTag('Python', '#f59e0b');
  
  // Assign tag to notebook
  await folderService.assignTag('notebook-id', tag.id);
  
  // Get all data
  console.log('Folders:', await folderService.getFolders());
  console.log('Tags:', await folderService.getTags());
});
```

### Story 3.2: Folder Tree UI

**What to test:**

1. **Folder Creation:**
   - Click "+ New Folder" at bottom of tree
   - Enter name, press Enter
   - Folder appears in tree

2. **Folder Operations (Right-click menu):**
   - Right-click a folder
   - Test: Rename, Change Color, Add Subfolder, Delete

3. **Folder Hierarchy:**
   - Create nested folders (max 3 levels)
   - Collapse/expand folders by clicking chevron

4. **Drag and Drop:**
   - Drag a notebook card from dashboard
   - Drop it on a folder
   - Check if notebook appears under that folder

5. **Notebook Display:**
   - Once notebooks are in folders, they should show:
     - Notebook name
     - Count badge: "Folder Name (3)"
     - Click notebook name opens it

### Story 3.3: Tag System

**What to test:**

1. **Tag Creation:**
   - Scroll to "Tags" section below folders
   - Click "+ New Tag"
   - Enter name, pick color, click checkmark
   - Tag appears in list with (0) count

2. **Tag Management (Right-click):**
   - Right-click a tag
   - Test: Rename, Change Color, Delete

3. **Tag Badges on Notebooks:**
   - Assign tags to notebooks (need to implement assignment UI or use console)
   - Tag badges should appear below notebook title on cards
   - Shows up to 3 tags, "+X more" if more

4. **Tag Filtering:**
   - Click a tag badge on any notebook card
   - Filter banner appears at top
   - Only notebooks with that tag are visible
   - Click "Clear Filter" to show all

---

## Known Issues & Limitations

### Issue 1: Notebook Cards Not Detected

**Problem:** The content script may not be detecting NotebookLM's notebook cards correctly.

**Selectors used:**
```typescript
const idSelectors = [
  '[data-notebook-id]',
  '[data-nb-id]',
  '[data-item-id][href*="/notebook/"]',
  'a[href*="/notebook/"]',
];
```

**If notebooks aren't draggable:**
1. Open DevTools
2. Inspect a notebook card on dashboard
3. Check if it has ANY of the above attributes
4. If not, NotebookLM's DOM structure may have changed

**Fix:** Update `extractNotebookId()` function in content script to match new selectors.

### Issue 2: No UI for Tag Assignment

**Current limitation:** There's no "right-click notebook → Assign Tags" UI yet.

**Workaround:** Use console to assign tags:
```javascript
import('@/src/services/FolderService').then(async ({ folderService }) => {
  const tags = await folderService.getTags();
  console.log('Available tags:', tags);
  
  // Assign tag to notebook
  await folderService.assignTag('your-notebook-id', tags[0].id);
});
```

### Issue 3: Empty Folders

**Expected behavior:** Folders start empty. You must manually drag notebooks into them.

**This is NOT a bug** - it's by design. Users organize their existing notebooks by dragging them.

---

## Debugging Checklist

If things aren't working:

### 1. Check Extension Loaded
```
chrome://extensions/
- Is "SuperNotebookLM" enabled?
- Click "Reload" button
```

### 2. Check Console Logs
```
F12 → Console tab
Look for:
- [Folders] messages (from content script)
- [FolderTree] messages (from React components)
- Any error messages
```

### 3. Check Storage
```javascript
// Check chrome storage
chrome.storage.sync.get(null, (data) => console.log('Sync storage:', data));
chrome.storage.local.get(null, (data) => console.log('Local storage:', data));

// Check IndexedDB
import('@/src/lib/db').then(({ db }) => {
  db.folders.toArray().then(f => console.log('Folders in DB:', f));
  db.notebookMetadata.toArray().then(m => console.log('Metadata in DB:', m));
});
```

### 4. Check if Content Script Injected
```javascript
// Should see folder tree on left side of dashboard
document.getElementById('snlm-folder-tree-host') !== null
// Should return true
```

---

## What Comes Next (Future Stories)

These are NOT implemented yet:

- **Story 3.4:** Search bar above folder tree
- **Story 3.5:** Bulk operations (select multiple notebooks)
- **Story 3.6:** Smart collections ("Recent", "Unread", etc.)
- **Story 3.7:** Mini folder panel in extension sidebar

---

## Summary

**Current Implementation:**
- ✅ Folders work (create, rename, delete, nest)
- ✅ Tags work (create, rename, delete, filter)
- ✅ Drag-and-drop SHOULD work (if notebook cards detected)
- ✅ Notebooks SHOULD appear in folders (after dragging them there)

**Missing:**
- ❌ Right-click notebook → Assign Tags UI
- ❌ Automatic notebook detection (may need DOM selector updates)
- ❌ Visual list of "all notebooks" to drag from

**The core issue:** Notebooks must be manually organized. They don't auto-populate folders. You need to drag them from the dashboard into folders.
