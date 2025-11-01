# How to Use Drag & Drop for Notebook Organization

## Understanding the System

The folder system works with **NotebookLM's existing dashboard**. It does NOT create a separate list of notebooks. Instead:

1. **Your notebooks are already on NotebookLM's dashboard** (the main page at https://notebooklm.google.com)
2. **Our extension makes those cards draggable**
3. **You drag cards from the dashboard INTO the folder tree on the left**

---

## Step-by-Step Guide

### 1. Go to NotebookLM Dashboard

Navigate to: **https://notebooklm.google.com**

You should see:
- Your notebook cards in the center/right area (NotebookLM's default layout)
- Our folder tree panel on the LEFT side (injected by our extension)

### 2. Check if Notebooks Are Visible

**If you see notebooks on the dashboard:**
- You should see cards/tiles for each notebook you've created
- They display notebook names and may show covers or previews

**If you DON'T see notebooks on the dashboard:**
- You may not have any notebooks created yet
- Create a test notebook first: Click "New notebook" in NotebookLM
- Or check if you're logged in to the correct Google account

### 3. Test if Drag-and-Drop Works

**Try this:**
1. Create a folder in the folder tree (click "+ New Folder")
2. Hover over a notebook card on the dashboard
3. Click and HOLD on the notebook card
4. Drag it over to a folder in the tree on the left
5. Release the mouse button

**Expected result:**
- The notebook should move into that folder
- The folder count badge should update: "My Folder (1)"
- The notebook name should appear under that folder (when expanded)

---

## Debugging: Is Drag-and-Drop Working?

### Check 1: Are Notebooks Being Detected?

Open DevTools Console (F12) and run:

```javascript
// Check how many draggable elements were found
document.querySelectorAll('[draggable="true"].snlm-notebook-draggable').length
```

**Expected:** Should return a number > 0 (the count of your notebooks)
**If it returns 0:** Notebooks aren't being detected (see Check 2)

### Check 2: Find Notebooks Manually

Run this in the console to see what notebook elements exist:

```javascript
// Try each selector
const selectors = [
  '[data-notebook-id]',
  '[data-nb-id]',
  '[data-item-id][href*="/notebook/"]',
  'a[href*="/notebook/"]'
];

selectors.forEach(sel => {
  const found = document.querySelectorAll(sel);
  console.log(`${sel}: ${found.length} found`, found);
});
```

**Expected:** At least ONE selector should find your notebooks
**If all return 0:** NotebookLM changed their HTML structure (see Fix below)

### Check 3: Console Logs

Look for these messages in the console:
- `[Folders] Host element created` → Folder tree was injected ✅
- `[Folders] Content script initialized` → Extension loaded ✅
- Errors about selectors or drag events → Something is broken ❌

---

## Common Issues & Fixes

### Issue 1: "I don't see any notebook cards on the dashboard"

**Causes:**
- You haven't created any notebooks yet
- You're on the wrong page (should be https://notebooklm.google.com, NOT inside a notebook)
- NotebookLM's UI layout changed

**Fix:**
1. Make sure you're on the main dashboard (not inside a notebook)
2. Create a test notebook if you have none
3. Try refreshing the page

### Issue 2: "Drag-and-drop doesn't work"

**Causes:**
- Notebooks aren't being detected by our selectors
- NotebookLM changed their HTML structure
- JavaScript errors in console

**Fix:**
1. Check console for errors
2. Run Check 2 above to see if notebooks are found
3. If not found, we need to update the selectors (report this as a bug)

### Issue 3: "I want to see ALL notebooks in one place"

**Current limitation:** The extension doesn't create a separate "All Notebooks" view. It relies on NotebookLM's existing dashboard.

**Workaround options:**
1. Use NotebookLM's default dashboard view (it shows all notebooks)
2. We could add an "All Notebooks" folder that lists everything (feature request)
3. Use the browser console to manually assign notebooks to folders (see below)

---

## Manual Assignment (Via Console)

If drag-and-drop isn't working, you can manually assign notebooks:

```javascript
// Open DevTools Console on notebooklm.google.com

// 1. Get notebook ID from URL
// Example: https://notebooklm.google.com/notebook/abc-123-xyz
// The ID is: abc-123-xyz

// 2. List all folders
import('@/src/services/FolderService').then(async ({ folderService }) => {
  const folders = await folderService.getFolders();
  console.log('Available folders:', folders);
});

// 3. Move notebook to folder (replace IDs)
import('@/src/services/FolderService').then(async ({ folderService }) => {
  const notebookId = 'YOUR_NOTEBOOK_ID';  // From step 1
  const folderId = 'FOLDER_ID';            // From step 2
  
  await folderService.moveNotebook(notebookId, folderId);
  console.log('✅ Notebook moved to folder!');
});
```

---

## Expected Workflow

Once everything is working:

1. **Browse** your notebooks on NotebookLM's dashboard (center area)
2. **Organize** by dragging cards into folders (left sidebar)
3. **Navigate** by clicking notebook names in folders to open them
4. **Manage** folders with right-click menu (rename, delete, add subfolders)

---

## What This Extension DOES:

✅ Adds a folder tree sidebar on the left  
✅ Makes existing notebook cards draggable  
✅ Stores notebook → folder mappings  
✅ Shows notebook names inside folders  
✅ Adds tag badges to notebook cards  
✅ Filters notebooks by tag when you click a badge  

## What This Extension DOES NOT Do:

❌ Create a new notebook list view  
❌ Replace NotebookLM's dashboard  
❌ Auto-populate folders with notebooks  
❌ Add right-click "Assign to Folder" on notebooks (yet)  

---

## Need Help?

If you're still having issues:
1. **Take a screenshot** of the NotebookLM dashboard showing:
   - Whether notebooks are visible
   - Whether the folder tree is visible
   - The browser console with any errors
2. **Check console output** with F12
3. **Report the issue** with details about what you see vs. what you expect
