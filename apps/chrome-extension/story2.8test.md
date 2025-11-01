# Manual Testing Guide - Story 2.8: Storage Quota Management

## Overview
This guide provides step-by-step instructions for manually testing the storage quota management features.

---

## Prerequisites

1. **Chrome Browser** with extension development enabled
2. **Extension loaded** in `chrome://extensions/` (Developer mode)
3. **Chrome DevTools** open (F12) to monitor console logs

---

## Test Setup: How to Simulate Storage Quota

Since filling IndexedDB to specific percentages takes time, here are three approaches:

### Option A: Mock the Quota (Recommended for Quick Testing)

1. Open Chrome DevTools → Console
2. Override `navigator.storage.estimate()` to return fake values:

```javascript
// Simulate 70% quota
const originalEstimate = navigator.storage.estimate;
navigator.storage.estimate = async () => ({
  usage: 350_000_000,  // 350MB
  quota: 500_000_000   // 500MB (70%)
});

// Then trigger a save operation or refresh the sidebar
```

3. Change the `usage` value to test different thresholds:
   - **70%**: `usage: 350_000_000` (350MB / 500MB)
   - **80%**: `usage: 400_000_000` (400MB / 500MB)
   - **90%**: `usage: 450_000_000` (450MB / 500MB)
   - **95%**: `usage: 475_000_000` (475MB / 500MB)
   - **98%**: `usage: 490_000_000` (490MB / 500MB)

### Option B: Fill IndexedDB with Test Data (Realistic Testing)

1. Open Chrome DevTools → Console
2. Run this script to add test chats:

```javascript
// Import the db module
import { addChatEntry } from './src/lib/db.js';

// Add 1000 test chats (approx 50MB)
async function fillStorage() {
  const largeText = 'Lorem ipsum '.repeat(1000); // ~10KB per chat

  for (let i = 0; i < 1000; i++) {
    await addChatEntry({
      question: `Test question ${i}: ${largeText}`,
      answer: `Test answer ${i}: ${largeText}`,
      timestamp: Date.now() - (i * 1000),
      notebookId: `notebook-${i % 10}`,
      source: 'test'
    });

    if (i % 100 === 0) {
      console.log(`Added ${i} chats...`);
    }
  }

  console.log('Done! Check storage quota.');
}

fillStorage();
```

### Option C: Use Chrome DevTools Storage Override

1. Open DevTools → Application → Storage
2. Right-click on IndexedDB → "Clear storage"
3. Use the Storage quota section to see current usage
4. Manually add large items until you reach desired threshold

---

## Test Cases

### 🟡 Test 1: Yellow Banner at 70% Quota

**Expected Behavior:**
- Yellow/gold banner appears at top of sidebar
- Message: "Storage: 350MB / 500MB used. Manage storage"
- "Manage Storage" button is visible
- Banner is **dismissible** (X button appears)

**Steps:**
1. Set quota to 70% using Option A or B above
2. Trigger a save operation (add a chat via NotebookLM)
3. Open extension sidebar

**Verify:**
- [ ] Yellow banner displays with correct message
- [ ] "Manage Storage" button works (opens settings)
- [ ] Dismiss (X) button works
- [ ] Banner reappears on next session if still at 70%
- [ ] Console shows: `[StorageService] Threshold crossed: 70%`

---

### 🟠 Test 2: Orange Banner at 80% Quota

**Expected Behavior:**
- Orange banner appears (replaces yellow if it was showing)
- Message: "Storage filling up (400MB / 500MB). Action recommended."
- Banner is **NOT dismissible** (no X button)

**Steps:**
1. Set quota to 80%
2. Trigger a save operation
3. Check sidebar

**Verify:**
- [ ] Orange banner displays
- [ ] No dismiss button visible
- [ ] "Manage Storage" button works
- [ ] Banner persists across refreshes
- [ ] Console shows: `[StorageService] Threshold crossed: 80%`

---

### 🔴 Test 3: Red Banner at 90% Quota with Pro CTA

**Expected Behavior:**
- Red banner appears
- Message: "Storage almost full! Delete old content or upgrade."
- "Upgrade to Pro" button appears alongside "Manage Storage"
- Banner is **NOT dismissible**

**Steps:**
1. Set quota to 90%
2. Trigger a save operation
3. Check sidebar

**Verify:**
- [ ] Red banner displays
- [ ] "Upgrade to Pro" button is visible and styled blue
- [ ] Clicking "Upgrade to Pro" shows placeholder message (toast or alert)
- [ ] "Manage Storage" button works
- [ ] Console shows: `[StorageService] Threshold crossed: 90%`

---

### 🚨 Test 4: Modal at 95% Quota (Audio Disabled)

**Expected Behavior:**
- Modal overlays entire sidebar
- Title: "Storage Critical"
- Message: "475 MB / 500 MB used. Audio downloads disabled. Free up space to continue."
- Modal is **dismissible**
- Audio saves are **blocked**

**Steps:**
1. Set quota to 95%
2. Trigger a save operation
3. Try to save an audio file (if Story 2.4 is implemented)

**Verify:**
- [ ] Modal appears blocking UI
- [ ] Progress bar shows 95%
- [ ] "Manage Storage" button opens settings
- [ ] "Upgrade to Pro" button shows placeholder
- [ ] "Dismiss" button closes modal
- [ ] Red banner persists after modal dismissed
- [ ] Audio save blocked with error notification
- [ ] Chat saves still work
- [ ] Console shows: `[StorageService] Audio save blocked: quota at 95%`

---

### ⛔ Test 5: Persistent Modal at 98% Quota (All Saves Blocked)

**Expected Behavior:**
- Modal appears and **CANNOT be dismissed**
- Title: "Storage Full"
- Message: "Cannot save new content. Storage: 490 MB / 500 MB used."
- No X button, no Escape key to close
- All save operations blocked

**Steps:**
1. Set quota to 98%
2. Trigger a save operation
3. Try to dismiss modal (X button, Escape, clicking outside)
4. Try to save a chat

**Verify:**
- [ ] Modal cannot be dismissed
- [ ] No X button or close action works
- [ ] Three action buttons: "Delete Content", "Export & Delete", "Upgrade to Pro"
- [ ] Chat save blocked with error notification
- [ ] Error shows: "Save failed. Storage quota exceeded. Manage storage to continue."
- [ ] Console shows: `[StorageService] Save blocked: quota at 98%`
- [ ] Modal persists until user takes action

---

### 📊 Test 6: Storage Breakdown Pie Chart

**Location:** Settings Tab → Storage Management section

**Expected Behavior:**
- Pie chart shows breakdown by type
- Colors: Chats (blue), Audio (purple), Captures (green), Other (gray)
- Percentages add up to 100%

**Steps:**
1. Open extension sidebar
2. Navigate to Settings tab
3. Scroll to "Storage Management" section

**Verify:**
- [ ] Pie chart renders correctly
- [ ] Legend shows all 4 categories
- [ ] Hovering shows tooltip with bytes
- [ ] Chart updates after deleting items
- [ ] If no data, chart shows "0 B" for all categories

---

### 📋 Test 7: Storage Item List - Sorting

**Location:** Settings Tab → Storage Management → Item List

**Expected Behavior:**
- List displays all stored items (chats, captures)
- Virtual scrolling works for 1000+ items
- Sorting dropdown changes order

**Steps:**
1. Open Settings → Storage Management
2. Add at least 20 test items with varying sizes/dates
3. Test each sort option

**Verify:**
- [ ] "Size (largest first)" - largest items at top
- [ ] "Size (smallest first)" - smallest items at top
- [ ] "Date (newest first)" - recent items at top
- [ ] "Date (oldest first)" - old items at top
- [ ] "Type" - grouped by chat/audio/capture
- [ ] Virtual scrolling works (only ~20 items rendered at once)
- [ ] Scroll performance is smooth

---

### 🔍 Test 8: Filtering and Quick Filters

**Expected Behavior:**
- Type filter toggles between All/Chats/Audio/Captures
- Quick filters apply date-based rules
- Multiple filters combine with AND logic

**Steps:**
1. Add test data with varying dates (use script from Option B)
2. Test type filter buttons
3. Test quick filter dropdown

**Verify:**
- [ ] "All" shows everything
- [ ] "Chats" shows only chats
- [ ] "Captures" shows only captures
- [ ] "Audio" shows only audio (if any)
- [ ] "Chats >90 days" filters to old chats
- [ ] "Audio >30 days" filters to old audio
- [ ] "Large items (>10MB)" filters by size
- [ ] Combining type + quick filter works correctly
- [ ] Item count updates: "X items (Y MB)"

---

### ☑️ Test 9: Bulk Selection

**Expected Behavior:**
- Individual checkboxes select items
- "Select All" selects all visible items
- Selected count displays correctly

**Steps:**
1. Open Storage Management
2. Click individual checkboxes
3. Click "Select All"

**Verify:**
- [ ] Individual item selection works
- [ ] "Select All" selects all visible items (respects filters)
- [ ] Deselecting "Select All" clears all selections
- [ ] Selected count shows: "X items selected (Y MB)"
- [ ] Selected items highlighted visually
- [ ] Selection persists when scrolling

---

### 🗑️ Test 10: Bulk Delete

**Expected Behavior:**
- Delete button enabled when items selected
- Confirmation dialog shows count and size
- Items deleted from IndexedDB
- Storage quota updates

**Steps:**
1. Select 10 items
2. Click "Delete Selected"
3. Confirm deletion

**Verify:**
- [ ] Confirmation dialog shows: "Delete 10 selected items (X MB)? This cannot be undone."
- [ ] Clicking "Cancel" aborts deletion
- [ ] Clicking "Confirm" deletes items
- [ ] Success notification: "10 items deleted. X MB freed."
- [ ] Items removed from list
- [ ] Storage quota decreases
- [ ] Pie chart updates
- [ ] Progress indicator shows for >10 items

---

### 📦 Test 11: Bulk Export

**Expected Behavior:**
- Export button creates ZIP file
- ZIP contains Markdown files for chats/captures
- File downloads automatically

**Steps:**
1. Select 5 chats and 5 captures
2. Click "Export Selected"
3. Check downloaded ZIP file

**Verify:**
- [ ] Export progress indicator appears
- [ ] ZIP file downloads: `supernotebooklm-export-2025-10-22.zip`
- [ ] ZIP contains .md files for each item
- [ ] Chat MD format includes question, answer, metadata
- [ ] Capture MD format includes URL, platform, content
- [ ] Success notification: "10 items exported (X MB)"
- [ ] Original items still in database (not deleted)

---

### 📦🗑️ Test 12: Export & Delete Workflow

**Expected Behavior:**
- Exports items to ZIP, then deletes from database
- Two-step process with confirmation
- Safe failure (if export fails, no deletion)

**Steps:**
1. Select 10 items
2. Click "Export & Delete"
3. Confirm action
4. Check ZIP and database

**Verify:**
- [ ] Confirmation: "Export and delete 10 items (X MB)? Items will be removed after export."
- [ ] Step 1: Export progress shows
- [ ] Step 2: Delete progress shows
- [ ] ZIP file downloaded successfully
- [ ] Items deleted from database
- [ ] Storage quota decreases
- [ ] Success notification: "10 items exported and deleted. X MB freed."
- [ ] If export fails, deletion skipped and error shown

---

### 🚫 Test 13: Quota Enforcement - Audio Block at 95%

**Expected Behavior:**
- Audio downloads blocked at 95%
- Error notification shown
- Chat saves still work

**Steps:**
1. Set quota to 95%
2. Try to save an audio file (Story 2.4 required)
3. Try to save a chat

**Verify:**
- [ ] Audio save blocked
- [ ] Error notification: "Audio download blocked. Storage at 95%. Manage storage to continue."
- [ ] Chat save succeeds normally
- [ ] Console shows: `[StorageService] Audio save blocked: quota at 95%`

---

### 🚫 Test 14: Quota Enforcement - All Saves Blocked at 98%

**Expected Behavior:**
- All saves (chats, audio, captures) blocked
- Error notification shown
- User must take action

**Steps:**
1. Set quota to 98%
2. Try to save a chat via NotebookLM
3. Try to save a capture

**Verify:**
- [ ] Chat save blocked
- [ ] Capture save blocked
- [ ] Error notification: "Save failed. Storage full (98%). Delete content or upgrade."
- [ ] Persistent modal displays (Test 5)
- [ ] Console shows: `[StorageService] Save blocked: quota at 98%`
- [ ] Background script shows: "Storage quota exceeded" error

---

## Regression Testing

### Ensure Existing Features Still Work

After completing all tests above, verify these existing features:

- [ ] Extension loads without errors
- [ ] Sidebar opens correctly
- [ ] AI Assistant tab works
- [ ] Settings tab displays
- [ ] Chat history saves normally (when quota < 95%)
- [ ] IndexedDB queries work
- [ ] Authentication still functions
- [ ] No console errors unrelated to storage

---

## Console Logs to Monitor

Watch for these console messages during testing:

**Success Messages:**
```
[StorageService] Quota checked: { used: "350.00MB", total: "500.00MB", percentage: "70.00%" }
[StorageService] Threshold crossed: 70%
[StorageService] Deleted 10 items
[ExportService] Exported 10 items to supernotebooklm-export-2025-10-22.zip
```

**Error Messages:**
```
[StorageService] Save blocked: quota at 98%
[StorageService] Audio save blocked: quota at 95%
[Background] Save chat error: Storage quota exceeded
```

---

## Known Limitations

1. **Audio Testing**: Story 2.4 (Audio Overview) not yet implemented, so audio-specific tests may not be fully testable
2. **Settings Tab Integration**: Warning banners/modals need to be integrated into the main sidebar layout (not yet wired up)
3. **Chrome Quota Limits**: Actual quota varies by device (usually 500MB-1GB), adjust test percentages accordingly

---

## Reporting Issues

If you find bugs, report with:
1. **Steps to reproduce**
2. **Expected vs actual behavior**
3. **Console logs** (errors/warnings)
4. **Screenshots** of UI issues
5. **Browser version** and OS

---

## Quick Test Checklist

Use this for rapid smoke testing:

- [ ] 70% banner appears (yellow, dismissible)
- [ ] 80% banner appears (orange, not dismissible)
- [ ] 90% banner appears (red, with Pro CTA)
- [ ] 95% modal appears (dismissible, audio blocked)
- [ ] 98% modal appears (not dismissible, all blocked)
- [ ] Pie chart renders in Settings
- [ ] Item list displays with sorting/filtering
- [ ] Bulk delete works
- [ ] Bulk export works
- [ ] Export & Delete workflow works
- [ ] Quota enforcement blocks saves at thresholds
- [ ] Build completes without errors
- [ ] No console errors during normal operation

---

**Testing Duration:** ~30-45 minutes for full test suite
**Last Updated:** 2025-10-22
**Story:** 2.8 - Storage Quota Management & Enforcement
