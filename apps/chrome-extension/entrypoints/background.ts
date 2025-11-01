import { addChatEntry, addExportHistory } from '../src/lib/db';
import { storageService } from '../src/services/StorageService';
import { audioService } from '../src/services/AudioService';
import { openNotebookLM, waitForTabLoad, populatePasteDialog, scrapeNotebooks, clickAddButtonAndAddSource, type NotebookEntry } from '../src/lib/notebooklmIntegration';
import type { ExportHistoryEntry } from '../src/types/search';
import { folderService } from '../src/services/FolderService';
import { DEFAULT_FOLDER_ID } from '../src/types/folder';
import { convex } from '../src/lib/convex';
import { initializeSyncService, getSyncService } from '../src/services/SyncService';

interface SaveChatData {
  question: string;
  answer: string;
  source: string;
  timestamp: number;
  notebookId: string;
}

interface SaveChatMessage {
  type: 'SAVE_CHAT';
  data: SaveChatData;
}

interface ExportToNotebookLMData {
  formattedText: string;
  title: string;
  sourceUrl: string;
}

interface ExportToNotebookLMMessage {
  type: 'EXPORT_TO_NOTEBOOKLM';
  data: ExportToNotebookLMData;
}

interface ShowToastMessage {
  type: 'SHOW_TOAST';
  data: {
    variant: 'success' | 'warning' | 'error';
    message: string;
  };
}

interface DownloadAudioData {
  url: string;
  title: string;
  notebookId: string;
}

interface DownloadAudioMessage {
  type: 'DOWNLOAD_AUDIO';
  data: DownloadAudioData;
}

interface SaveExportHistoryMessage {
  type: 'SAVE_EXPORT_HISTORY';
  data: Omit<ExportHistoryEntry, 'id'>;
}

interface GetNotebooksMessage {
  type: 'GET_NOTEBOOKS';
}

interface AddToExistingNotebookData {
  notebookId: string;
  formattedText: string;
  title: string;
  sourceUrl: string;
}

interface AddToExistingNotebookMessage {
  type: 'ADD_TO_EXISTING_NOTEBOOK';
  data: AddToExistingNotebookData;
}

interface NotebooksDetectedMessage {
  type: 'NOTEBOOKS_DETECTED';
  data: Array<{ id: string; title: string; url: string }>;
}

interface NotebookDragStartMessage {
  type: 'NOTEBOOK_DRAG_START';
  data: { notebookId: string; title: string };
}

interface ExportYouTubeURLData {
  youtubeUrl: string;
  title: string;
}

interface ExportYouTubeURLMessage {
  type: 'EXPORT_YOUTUBE_URL';
  data: ExportYouTubeURLData;
}

interface TriggerSyncMessage {
  type: 'TRIGGER_SYNC';
}

interface UserAuthMessage {
  type: 'USER_LOGGED_IN' | 'USER_LOGGED_OUT';
}

type BackgroundMessage = 
  | SaveChatMessage 
  | ExportToNotebookLMMessage 
  | ShowToastMessage 
  | DownloadAudioMessage 
  | SaveExportHistoryMessage 
  | GetNotebooksMessage 
  | AddToExistingNotebookMessage
  | NotebooksDetectedMessage
  | NotebookDragStartMessage
  | ExportYouTubeURLMessage
  | TriggerSyncMessage
  | UserAuthMessage;

export default defineBackground(() => {
  console.log('SuperNotebookLM background script loaded');

  // Initialize Sync Service
  const syncService = initializeSyncService(convex, {
    syncInterval: 5 * 60 * 1000, // 5 minutes
    batchSize: 50,
    maxRetries: 3,
  });
  
  // Start background sync immediately
  console.log('[Background] Starting sync service...');
  syncService.start();

  // Notebook cache (5 minutes)
  let notebookCache: { notebooks: NotebookEntry[]; timestamp: number } | null = null;
  const NOTEBOOK_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Open sidebar when extension icon clicked
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
      chrome.sidePanel.open({ tabId: tab.id });
    }
  });

  // Create context menu for universal text capture
  chrome.runtime.onInstalled.addListener((details) => {
    chrome.contextMenus.create({
      id: 'send-to-notebooklm',
      title: '📤 Send to NotebookLM',
      contexts: ['selection'], // Only show when text is selected
    });
    
    // Start sync on install/update
    if (details.reason === 'install') {
      console.log('[Background] Extension installed, starting initial sync...');
      syncService.syncAll();
    } else if (details.reason === 'update') {
      console.log('[Background] Extension updated, starting sync...');
      syncService.syncAll();
    }
  });

  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'send-to-notebooklm' && tab) {
      await handleTextCapture(info, tab);
    }
  });

  // Handle keyboard shortcut for text capture
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'capture-text') {
      try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.id) {
          await sendToastToSidebar({
            variant: 'error',
            message: 'No active tab found',
          });
          return;
        }

        // Execute content script to get selected text
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.getSelection()?.toString() || '',
        });

        const selectedText = result[0]?.result;

        if (selectedText && selectedText.trim()) {
          // Use handleTextCapture with the selected text
          await handleTextCapture(
            { selectionText: selectedText } as chrome.contextMenus.OnClickData,
            tab
          );
        } else {
          // Show toast: no text selected
          await sendToastToSidebar({
            variant: 'warning',
            message: 'Please select text first',
          });
        }
      } catch (error) {
        console.error('[Background] Keyboard shortcut failed:', error);
        await sendToastToSidebar({
          variant: 'error',
          message: 'Failed to capture text',
        });
      }
    }
  });

  // Message handler for content scripts
  chrome.runtime.onMessage.addListener((message: BackgroundMessage, sender, sendResponse) => {
    if (message.type === 'SAVE_CHAT') {
      handleSaveChat(message.data)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('[Background] Save chat error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (message.type === 'EXPORT_TO_NOTEBOOKLM') {
      handleExportToNotebookLM(message.data)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('[Background] Export error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (message.type === 'DOWNLOAD_AUDIO') {
      handleDownloadAudio(message.data)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('[Background] Download audio error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (message.type === 'SAVE_EXPORT_HISTORY') {
      handleSaveExportHistory(message.data)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('[Background] Save export history error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (message.type === 'GET_NOTEBOOKS') {
      handleGetNotebooks(sender.tab?.id)
        .then((notebooks) => sendResponse({ success: true, notebooks }))
        .catch((error) => {
          console.error('[Background] Get notebooks error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (message.type === 'ADD_TO_EXISTING_NOTEBOOK') {
      handleAddToExistingNotebook(message.data)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('[Background] Add to existing notebook error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (message.type === 'NOTEBOOKS_DETECTED') {
      handleNotebooksDetected(message.data)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('[Background] Notebooks detected error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (message.type === 'NOTEBOOK_DRAG_START') {
      // Broadcast to all extension views (sidebar, popup, etc.)
      broadcastToExtension(message);
      sendResponse({ success: true });
      return false; // Synchronous response
    }

    if (message.type === 'EXPORT_YOUTUBE_URL') {
      handleExportYouTubeURL(message.data)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('[Background] Export YouTube URL error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    // Sync service messages
    if (message.type === 'TRIGGER_SYNC') {
      console.log('[Background] Manual sync triggered');
      syncService.syncAll()
        .then(async () => {
          const status = await syncService.getSyncStatus();
          sendResponse({ success: true, status });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (message.type === 'USER_LOGGED_IN') {
      console.log('[Background] User logged in, starting full sync...');
      syncService.syncAll()
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
    }

    if (message.type === 'USER_LOGGED_OUT') {
      console.log('[Background] User logged out, stopping sync...');
      syncService.stop();
      sendResponse({ success: true });
      return false; // Synchronous response
    }
  });

  /**
   * Handle universal text capture from context menu
   */
  async function handleTextCapture(
    info: chrome.contextMenus.OnClickData,
    tab: chrome.tabs.Tab
  ): Promise<void> {
    const selectedText = info.selectionText || '';
    const pageUrl = tab.url || '';
    const pageTitle = tab.title || 'Web Page';

    if (!selectedText.trim()) {
      await sendToastToSidebar({
        variant: 'warning',
        message: 'No text selected',
      });
      return;
    }

    console.log('[Background] Text capture:', {
      title: pageTitle,
      url: pageUrl,
      textLength: selectedText.length,
    });

    // Format captured text with metadata
    const formatted = `# ${pageTitle}\n\n${selectedText}\n\n---\nSource: ${pageUrl}\nCaptured: ${new Date().toISOString()}`;

    try {
      // Export to NotebookLM using existing handler
      await handleExportToNotebookLM({
        formattedText: formatted,
        title: pageTitle,
        sourceUrl: pageUrl,
      });

      // Success toast
      await sendToastToSidebar({
        variant: 'success',
        message: 'Content sent to NotebookLM ✓',
      });
    } catch (error) {
      console.error('[Background] Text capture failed:', error);

      // Error toast
      await sendToastToSidebar({
        variant: 'error',
        message: 'Failed to send content',
      });
    }
  }

  /**
   * Handle saving a chat to IndexedDB with retry logic and quota checking
   */
  async function handleSaveChat(data: SaveChatData): Promise<void> {
    // Check quota before attempting save
    const estimatedSize = new Blob([JSON.stringify(data)]).size;
    const canSave = await storageService.canSave(estimatedSize, 'chat');

    if (!canSave) {
      // Show storage error notification
      await sendToastToSidebar({
        variant: 'error',
        message: 'Save failed. Storage quota exceeded. Manage storage to continue.',
      });

      throw new Error('Storage quota exceeded');
    }

    let attempts = 0;
    const maxAttempts = 3;
    const delays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

    while (attempts < maxAttempts) {
      try {
        console.log(`[Background] Save attempt ${attempts + 1}/${maxAttempts}`, data);

        // Save chat to IndexedDB
        await addChatEntry({
          question: data.question,
          answer: data.answer,
          timestamp: data.timestamp,
          notebookId: data.notebookId,
          source: data.source,
        });

        console.log('[Background] Chat saved successfully');

        // Check quota after save
        await storageService.checkQuota();

        // Show success toast in sidebar
        await sendToastToSidebar({
          variant: 'success',
          message: 'Chat saved ✓',
        });

        // Notify sidebar to refresh chat list
        chrome.runtime.sendMessage({
          type: 'CHAT_SAVED',
        }).catch(() => {
          // Ignore errors if sidebar isn't open
        });

        return; // Success, exit retry loop
      } catch (error) {
        attempts++;
        console.error(`[Background] Save attempt ${attempts}/${maxAttempts} failed:`, error);

        if (attempts < maxAttempts) {
          // Show retry toast
          await sendToastToSidebar({
            variant: 'warning',
            message: `Saving chat... (Retry ${attempts}/${maxAttempts})`,
          });

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, delays[attempts - 1]));
        } else {
          // Final failure, show error toast
          await sendToastToSidebar({
            variant: 'error',
            message: 'Could not save chat. Storage quota may be full.',
          });

          throw error; // Re-throw to trigger sendResponse with error
        }
      }
    }
  }

  /**
   * Send toast notification to sidebar
   */
  async function sendToastToSidebar(data: {
    variant: 'success' | 'warning' | 'error';
    message: string;
  }): Promise<void> {
    try {
      // Get all tabs and send message to sidebar
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          chrome.runtime.sendMessage({
            type: 'SHOW_TOAST',
            data,
          });
        }
      }
    } catch (error) {
      console.error('[Background] Failed to send toast:', error);
    }
  }

  /**
   * Handle exporting conversation to NotebookLM
   */
  async function handleExportToNotebookLM(data: ExportToNotebookLMData): Promise<void> {
    console.log('[Background] Handling export to NotebookLM:', {
      title: data.title,
      sourceUrl: data.sourceUrl,
      textLength: data.formattedText.length,
    });

    try {
      // 1. Open NotebookLM (new tab or focus existing)
      const tab = await openNotebookLM();

      if (!tab.id) {
        throw new Error('Failed to open NotebookLM tab');
      }

      // 2. Wait for page to load
      console.log('[Background] Waiting for NotebookLM to load...');
      await waitForTabLoad(tab.id);

      // 3. Wait additional time for React to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. Inject script to populate paste dialog
      console.log('[Background] Injecting population script...');
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: populatePasteDialog,
        args: [data.formattedText, data.title],
      });

      // 5. Success toast
      console.log('[Background] Export successful');
      await sendToastToSidebar({
        variant: 'success',
        message: 'Exported to NotebookLM ✓',
      });
    } catch (error) {
      console.error('[Background] Export to NotebookLM failed:', error);

      // Error toast with manual fallback hint
      await sendToastToSidebar({
        variant: 'error',
        message: 'Auto-export failed. Check NotebookLM tab for manual options.',
      });

      throw error;
    }
  }

  /**
   * Handle exporting YouTube URL to NotebookLM
   * Uses NotebookLM's native YouTube URL import feature
   */
  async function handleExportYouTubeURL(data: ExportYouTubeURLData): Promise<void> {
    console.log('[Background] Handling YouTube URL export to NotebookLM:', {
      title: data.title,
      url: data.youtubeUrl,
    });

    try {
      // 1. Open NotebookLM (new tab or focus existing)
      const tab = await openNotebookLM();

      if (!tab.id) {
        throw new Error('Failed to open NotebookLM tab');
      }

      // 2. Wait for page to load
      console.log('[Background] Waiting for NotebookLM to load...');
      await waitForTabLoad(tab.id);

      // 3. Wait additional time for React to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. Inject script to click Create New button, then YouTube button, then populate URL
      console.log('[Background] Injecting YouTube URL population script...');
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (youtubeUrl: string) => {
          // STEP 1: Click "Create new" button on main page
          console.log('[NotebookLM] Step 1: Looking for Create new button...');
          const createNewBtn = document.querySelector('.create-new-button') as HTMLElement;
          if (!createNewBtn) {
            throw new Error('Create new button not found');
          }
          console.log('[NotebookLM] Step 1: Clicking Create new button');
          createNewBtn.click();

          // Wait for source picker dialog to appear (longer wait)
          console.log('[NotebookLM] Waiting for source picker dialog...');
          await new Promise(resolve => setTimeout(resolve, 2000));

          // STEP 2: Click YouTube button in source picker
          console.log('[NotebookLM] Step 2: Looking for YouTube button...');
          
          // Debug: Log what we can find
          const matIconCount = document.querySelectorAll('mat-icon[matchipavatar]').length;
          const chipActionCount = document.querySelectorAll('.mat-mdc-chip-action').length;
          const textLabelCount = document.querySelectorAll('.mdc-evolution-chip__text-label').length;
          console.log('[NotebookLM] Available elements:', {
            matIconsWithAvatar: matIconCount,
            chipActions: chipActionCount,
            textLabels: textLabelCount,
          });
          
          // Try multiple selectors for YouTube button
          let youtubeBtn: HTMLElement | null = null;
          
          // Strategy 1: Find mat-icon with matchipavatar attribute
          youtubeBtn = document.querySelector('mat-icon[matchipavatar]')?.closest('.mat-mdc-chip-action') as HTMLElement;
          if (youtubeBtn) {
            console.log('[NotebookLM] Found via Strategy 1: mat-icon[matchipavatar]');
          }
          
          if (!youtubeBtn) {
            // Strategy 2: Find by icon content
            const icons = Array.from(document.querySelectorAll('mat-icon'));
            console.log('[NotebookLM] Strategy 2: Found', icons.length, 'mat-icon elements');
            const youtubeIcon = icons.find(icon => {
              const text = icon.textContent?.trim();
              console.log('[NotebookLM] Checking icon:', text);
              return text === 'video_youtube';
            });
            if (youtubeIcon) {
              console.log('[NotebookLM] Found YouTube icon with text:', youtubeIcon.textContent);
              youtubeBtn = youtubeIcon.closest('.mat-mdc-chip-action') as HTMLElement;
              if (youtubeBtn) {
                console.log('[NotebookLM] Found via Strategy 2: icon content');
              }
            }
          }
          
          if (!youtubeBtn) {
            // Strategy 3: Find span with YouTube text
            const spans = Array.from(document.querySelectorAll('.mdc-evolution-chip__text-label'));
            console.log('[NotebookLM] Strategy 3: Found', spans.length, 'text label elements');
            const youtubeSpan = spans.find(span => {
              const text = span.textContent?.trim();
              console.log('[NotebookLM] Checking span:', text);
              return text === 'YouTube';
            });
            if (youtubeSpan) {
              console.log('[NotebookLM] Found YouTube span with text:', youtubeSpan.textContent);
              youtubeBtn = youtubeSpan.closest('.mat-mdc-chip-action') as HTMLElement;
              if (youtubeBtn) {
                console.log('[NotebookLM] Found via Strategy 3: text label');
              }
            }
          }
          
          if (!youtubeBtn) {
            console.error('[NotebookLM] All YouTube button selectors failed!');
            console.error('[NotebookLM] Dialog HTML:', document.body.innerHTML.substring(0, 5000));
            throw new Error('YouTube button not found in source picker');
          }
          
          console.log('[NotebookLM] Step 2: Found YouTube button, clicking...');
          youtubeBtn.click();

          // Wait for URL input to appear
          await new Promise(resolve => setTimeout(resolve, 500));

          // STEP 3: Find and populate YouTube URL input
          console.log('[NotebookLM] Step 3: Looking for URL input...');
          const input = document.querySelector('input[formcontrolname="newUrl"]') as HTMLInputElement;
          if (!input) {
            throw new Error('YouTube URL input not found');
          }

          // Set value and trigger events
          console.log('[NotebookLM] Step 3: Populating URL:', youtubeUrl);
          input.value = youtubeUrl;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));

          // Wait a bit for validation
          await new Promise(resolve => setTimeout(resolve, 500));

          // STEP 4: Click Insert button
          console.log('[NotebookLM] Step 4: Looking for Insert button...');
          const insertBtn = document.querySelector('button[type="submit"]') as HTMLElement;
          if (!insertBtn) {
            throw new Error('Insert button not found');
          }
          console.log('[NotebookLM] Step 4: Clicking Insert button');
          insertBtn.click();

          console.log('[NotebookLM] YouTube URL export completed successfully!');
        },
        args: [data.youtubeUrl],
      });

      // 5. Success toast
      console.log('[Background] YouTube URL export successful');
      await sendToastToSidebar({
        variant: 'success',
        message: 'YouTube video added to NotebookLM ✓',
      });
    } catch (error) {
      console.error('[Background] Export YouTube URL to NotebookLM failed:', error);

      // Error toast with manual fallback hint
      await sendToastToSidebar({
        variant: 'error',
        message: 'Auto-export failed. Check NotebookLM tab for manual options.',
      });

      throw error;
    }
  }

  /**
   * Handle downloading audio from NotebookLM
   * NOTE: Audio download may fail due to CORS, authentication, or DRM restrictions
   */
  async function handleDownloadAudio(data: DownloadAudioData): Promise<void> {
    console.log('[Background] Handling audio download:', {
      title: data.title,
      notebookId: data.notebookId,
      url: data.url.substring(0, 100) + '...', // Log partial URL for privacy
    });

    try {
      // 1. Fetch audio as blob (may fail due to CORS/auth)
      console.log('[Background] Fetching audio from URL...');
      const response = await fetch(data.url);

      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const fileSize = audioBlob.size;

      console.log('[Background] Audio fetched successfully:', {
        size: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
        type: audioBlob.type,
      });

      // 2. Check quota before saving
      const canSave = await storageService.canSave(fileSize, 'audio');

      if (!canSave) {
        await sendToastToSidebar({
          variant: 'error',
          message: 'Storage full. Delete old audio to save new ones.',
        });
        throw new Error('Storage quota exceeded');
      }

      // 3. Get audio duration
      const duration = await getAudioDuration(audioBlob);

      // 4. Save to IndexedDB
      await audioService.saveAudioOverview({
        audioBlob,
        title: data.title,
        notebookId: data.notebookId,
        duration,
        createdAt: Date.now(),
        fileSize,
      });

      console.log('[Background] Audio saved to IndexedDB');

      // 5. Check storage quota and show warnings
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 500_000_000; // 500MB default
      const percentage = (usage / quota) * 100;

      if (percentage >= 95) {
        await sendToastToSidebar({
          variant: 'error',
          message: `Storage critical: ${Math.round(percentage)}% used. Delete old audio.`,
        });
      } else if (percentage >= 90) {
        await sendToastToSidebar({
          variant: 'warning',
          message: `Storage warning: ${Math.round(percentage)}% used (${Math.round(usage / 1024 / 1024)}MB/${Math.round(quota / 1024 / 1024)}MB)`,
        });
      } else if (percentage >= 80) {
        await sendToastToSidebar({
          variant: 'warning',
          message: `Audio storage: ${Math.round(percentage)}% used`,
        });
      }

      // 6. Success toast
      await sendToastToSidebar({
        variant: 'success',
        message: `Audio saved (${(fileSize / 1024 / 1024).toFixed(1)}MB) ✓`,
      });
    } catch (error) {
      console.error('[Background] Audio download failed:', error);

      // Show error toast with helpful message
      const errorMessage =
        error instanceof Error && error.message.includes('CORS')
          ? 'Audio download blocked by CORS. Try manual download.'
          : error instanceof Error && error.message.includes('quota')
          ? 'Storage full. Delete old audio files.'
          : 'Audio download failed. Check console for details.';

      await sendToastToSidebar({
        variant: 'error',
        message: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Handle saving export history to IndexedDB
   */
  async function handleSaveExportHistory(data: Omit<ExportHistoryEntry, 'id'>): Promise<void> {
    console.log('[Background] Saving export history:', {
      title: data.title,
      type: data.exportType,
      success: data.success,
    });

    try {
      await addExportHistory(data);
      console.log('[Background] Export history saved successfully');
    } catch (error) {
      console.error('[Background] Failed to save export history:', error);
      throw error;
    }
  }

  /**
   * Get audio duration from blob
   */
  async function getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(blob);

      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        // If metadata fails, return 0 as fallback
        console.warn('[Background] Failed to load audio metadata, using 0 as duration');
        resolve(0);
      });

      audio.src = url;
    });
  }

  /**
   * Handle getting notebooks from NotebookLM with caching
   */
  async function handleGetNotebooks(senderTabId?: number): Promise<NotebookEntry[]> {
    console.log('[Background] Handling get notebooks request from tab:', senderTabId);

    try {
      // Check if we have valid cached notebooks
      const now = Date.now();
      if (notebookCache && (now - notebookCache.timestamp) < NOTEBOOK_CACHE_DURATION) {
        console.log('[Background] Returning cached notebooks:', notebookCache.notebooks.length);
        return notebookCache.notebooks;
      }

      console.log('[Background] Cache miss or expired, fetching notebooks from NotebookLM');

      // 1. Open NotebookLM (has to be active due to Chrome MV3 restrictions)
      const tab = await openNotebookLM(true);

      if (!tab.id) {
        throw new Error('Failed to open NotebookLM tab');
      }

      // 2. Wait for page to load (increased from 2s)
      console.log('[Background] Waiting for NotebookLM to load...');
      await waitForTabLoad(tab.id);

      // 3. Wait longer for React/Angular to initialize (increased from 2s to 4s)
      console.log('[Background] Waiting for React/Angular to initialize...');
      await new Promise(resolve => setTimeout(resolve, 4000));

      // 4. Inject script to scrape notebooks
      console.log('[Background] Injecting notebook scraping script...');
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeNotebooks,
      });

      const notebooks = result[0]?.result || [];
      console.log('[Background] Scraped', notebooks.length, 'notebooks');

      // 5. Cache the notebooks
      notebookCache = {
        notebooks,
        timestamp: now,
      };
      console.log('[Background] Notebooks cached for 5 minutes');

      // 6. Switch back to the sender tab (if we know which tab it was)
      if (senderTabId) {
        try {
          await chrome.tabs.update(senderTabId, { active: true });
          console.log('[Background] Switched back to sender tab');
        } catch (error) {
          console.warn('[Background] Could not switch back to sender tab:', error);
        }
      }

      return notebooks;
    } catch (error) {
      console.error('[Background] Get notebooks failed:', error);
      throw error;
    }
  }

  /**
   * Handle adding to existing notebook
   */
  async function handleAddToExistingNotebook(data: AddToExistingNotebookData): Promise<void> {
    console.log('[Background] Handling add to existing notebook:', {
      notebookId: data.notebookId,
      title: data.title,
      textLength: data.formattedText.length,
    });

    try {
      // 1. Open NotebookLM (or focus existing tab)
      const tab = await openNotebookLM();

      if (!tab.id) {
        throw new Error('Failed to open NotebookLM tab');
      }

      // 2. Wait for homepage to load first
      console.log('[Background] Waiting for NotebookLM homepage to load...');
      await waitForTabLoad(tab.id);

      // 3. Navigate directly to the specific notebook page
      const notebookUrl = `https://notebooklm.google.com/notebook/${data.notebookId}`;
      console.log('[Background] Navigating to notebook page:', notebookUrl);

      await chrome.tabs.update(tab.id, { url: notebookUrl });

      // 4. Wait for notebook page to load
      console.log('[Background] Waiting for notebook page to load...');
      await waitForTabLoad(tab.id);

      // 5. Wait for Angular to fully initialize on the notebook page
      console.log('[Background] Waiting for Angular to initialize on notebook page...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 6. Inject script to click Add button and add source
      console.log('[Background] Injecting script to add source...');
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: clickAddButtonAndAddSource,
        args: [data.formattedText, data.title],
      });

      // 7. Success toast
      console.log('[Background] Add to existing notebook script injected successfully');
      await sendToastToSidebar({
        variant: 'success',
        message: 'Adding to notebook...',
      });
    } catch (error) {
      console.error('[Background] Add to existing notebook failed:', error);

      // Error toast
      await sendToastToSidebar({
        variant: 'error',
        message: 'Failed to add to notebook. Check NotebookLM tab.',
      });

      throw error;
    }
  }

  /**
   * Handle notebooks detected from content script
   * Stores notebook metadata in IndexedDB so they appear in folders
   */
  async function handleNotebooksDetected(
    notebooks: Array<{ id: string; title: string; url: string }>
  ): Promise<void> {
    console.log(`[Background] Processing ${notebooks.length} detected notebooks`);

    try {
      // Initialize folder service if not already done
      await folderService.initialize();

      // Process each notebook
      for (const notebook of notebooks) {
        try {
          // Check if metadata already exists
          let metadata = await folderService.getNotebookMetadata(notebook.id);

          if (!metadata) {
            // Create new metadata entry in Unorganized folder
            console.log(`[Background] Creating metadata for new notebook: ${notebook.title}`);
            metadata = {
              notebookId: notebook.id,
              folderIds: [DEFAULT_FOLDER_ID], // Put in "Unorganized" folder
              tagIds: [],
              customName: null,
              title: notebook.title, // Store the detected title
              lastUpdatedAt: Date.now(),
            };

            await folderService.updateNotebookMetadata(notebook.id, metadata);
          } else if (metadata.title !== notebook.title) {
            // Update title if it changed
            console.log(`[Background] Updating title for notebook ${notebook.id}: "${metadata.title}" -> "${notebook.title}"`);
            metadata.title = notebook.title;
            metadata.lastUpdatedAt = Date.now();
            await folderService.updateNotebookMetadata(notebook.id, metadata);
          }
        } catch (notebookError) {
          console.error(`[Background] Failed to process notebook ${notebook.id}:`, notebookError);
          // Continue processing other notebooks
        }
      }

      // Broadcast update to all extension views (sidebar will refresh)
      broadcastToExtension({
        type: 'NOTEBOOKS_UPDATED',
        data: { count: notebooks.length },
      });

      console.log(`[Background] Successfully processed ${notebooks.length} notebooks`);
    } catch (error) {
      console.error('[Background] Failed to handle notebooks detected:', error);
      throw error;
    }
  }

  /**
   * Broadcast message to all extension views (sidebar, popup, etc.)
   */
  function broadcastToExtension(message: any): void {
    chrome.runtime.sendMessage(message).catch(error => {
      // Ignore errors if no listeners (e.g., sidebar closed)
      console.log('[Background] No active listeners for broadcast:', message.type);
    });
  }
});
