/**
 * NotebookLM Integration Utilities
 * Handles opening NotebookLM tabs and auto-populating paste dialogs
 */

/// <reference types="chrome"/>

/**
 * Opens NotebookLM in a new tab or focuses existing tab
 * @param focusTab - Whether to focus the NotebookLM tab (default: true)
 */
export async function openNotebookLM(focusTab: boolean = true): Promise<chrome.tabs.Tab> {
  // Check if NotebookLM tab already open
  const tabs = await chrome.tabs.query({
    url: 'https://notebooklm.google.com/*',
  });

  if (tabs.length > 0 && tabs[0].id) {
    if (focusTab) {
      // Focus existing tab
      await chrome.tabs.update(tabs[0].id, { active: true });
      if (tabs[0].windowId) {
        await chrome.windows.update(tabs[0].windowId, { focused: true });
      }
      console.log('[NotebookLM Integration] Focused existing tab');
    } else {
      console.log('[NotebookLM Integration] Using existing tab (in background)');
    }
    return tabs[0];
  } else {
    // Open new tab
    const newTab = await chrome.tabs.create({
      url: 'https://notebooklm.google.com',
      active: focusTab,
    });
    console.log(`[NotebookLM Integration] Opened new tab (${focusTab ? 'focused' : 'background'})`);
    return newTab;
  }
}

/**
 * Waits for a tab to finish loading
 */
export function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    function checkStatus() {
      chrome.tabs.get(tabId, (tab: chrome.tabs.Tab) => {
        if (chrome.runtime.lastError) {
          console.warn('[NotebookLM Integration] Tab no longer exists');
          resolve();
          return;
        }
        
        if (tab.status === 'complete') {
          resolve();
        } else {
          setTimeout(checkStatus, 500);
        }
      });
    }
    checkStatus();
  });
}

/**
 * Populates NotebookLM paste dialog (executed in NotebookLM context)
 * NOTE: This function will be injected into NotebookLM page via chrome.scripting.executeScript
 * It must be self-contained and cannot reference external variables
 */
export function populatePasteDialog(formattedText: string, title: string) {
  console.log('[NotebookLM] 🚀 Starting paste dialog population...');
  console.log('[NotebookLM] Title:', title);
  console.log('[NotebookLM] Text length:', formattedText.length, 'characters');

  let attempts = 0;
  const maxAttempts = 30; // 15 seconds total (increased for reliability)
  
  // State tracking: Ensure we click "Copied text" chip BEFORE looking for textarea
  let hasClickedCreateNotebook = false;
  let hasClickedCopiedTextChip = false;

  const intervalId = setInterval(() => {
    attempts++;
    
    if (attempts % 4 === 0) {
      console.log(`[NotebookLM] ⏱️ Attempt ${attempts}/${maxAttempts}...`);
    }

    // CRITICAL FIX: Only look for textarea AFTER we've clicked the "Copied text" chip
    // This prevents finding wrong/hidden textareas on the "Add sources" page
    if (hasClickedCopiedTextChip) {
      // NEW SELECTORS: Look for NotebookLM's new chip-based interface textarea
      const textarea = 
        document.querySelector('textarea[formcontrolname="text"]') ||
        document.querySelector('textarea.text-area') ||
        document.querySelector('textarea[matinput]') as HTMLTextAreaElement | null;

      if (textarea) {
      clearInterval(intervalId);
      
      console.log('[NotebookLM] ✅ Found paste dialog textarea!');

      // Populate textarea with multiple event triggers for Angular forms
      const textareaElement = textarea as HTMLTextAreaElement;
      
      // Focus first to ensure Angular form is ready
      textareaElement.focus();
      
      // Set value
      textareaElement.value = formattedText;
      
      // Trigger all possible events for Angular reactive forms
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));
      textareaElement.dispatchEvent(new Event('change', { bubbles: true }));
      textareaElement.dispatchEvent(new Event('blur', { bubbles: true }));
      textareaElement.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
      
      // Set cursor to end
      textareaElement.setSelectionRange(formattedText.length, formattedText.length);
      
      // Re-focus to trigger validation
      textareaElement.focus();

      console.log('[NotebookLM] 📝 Textarea populated with', formattedText.length, 'characters');
        console.log('[NotebookLM] ✅ Dialog ready! Click "Insert" button or modal will appear in 15 seconds.');
        
        // Store success flag
        try {
          sessionStorage.setItem('snlm_export_backup', formattedText);
          sessionStorage.setItem('snlm_export_title', title);
          sessionStorage.setItem('snlm_export_success', 'true');
        } catch (e) {
          console.warn('[NotebookLM] Could not save to sessionStorage:', e);
        }
        
        return;
      }
    }

    // STAGE 1: Check if we're on notebook list page and need to create new notebook
    if (attempts === 2 && !hasClickedCreateNotebook) {
      console.log('[NotebookLM] 🔍 Checking if "Create new notebook" button exists...');
      
      // Look for "Create new notebook" button (notebook list page)
      const createNotebookButton = 
        document.querySelector('mat-card[jslog="269415"]') ||
        document.querySelector('mat-card.create-new-action-button') ||
        Array.from(document.querySelectorAll('mat-card')).find(card => 
          card.textContent?.includes('Create new notebook')
        );

      if (createNotebookButton) {
        console.log('[NotebookLM] 🆕 Found "Create new notebook" button, clicking to open sources page...');
        (createNotebookButton as HTMLElement).click();
        hasClickedCreateNotebook = true;
        
        // Wait for "Add sources" page to load
        setTimeout(() => {
          const sourcesPageCheck = document.querySelector('mat-chip[jslog="230543"]') || 
                                    document.querySelector('upload-main-screen');
          if (sourcesPageCheck) {
            console.log('[NotebookLM] ✅ "Add sources" page loaded successfully!');
          } else {
            console.warn('[NotebookLM] ⚠️ "Add sources" page may not have loaded');
          }
        }, 1500);
      } else {
        console.log('[NotebookLM] ℹ️ Not on notebook list page (or button already clicked)');
        hasClickedCreateNotebook = true; // Mark as done even if not found (might already be on sources page)
      }
    }

    // STAGE 2: If dialog not found, try to open it by clicking "Copied text" chip
    if (attempts === 6 && !hasClickedCopiedTextChip) {
      console.log('[NotebookLM] 🔍 Looking for "Copied text" chip to click...');
      
      // NEW: Look for "Copied text" chip button (NotebookLM's new UI)
      const copiedTextChip = 
        document.querySelector('mat-chip[jslog="230543"]') ||
        Array.from(document.querySelectorAll('mat-chip')).find(chip => 
          chip.textContent?.includes('Copied text')
        );

      if (copiedTextChip) {
        console.log('[NotebookLM] 🖱️ Found "Copied text" chip, clicking to open paste dialog...');
        (copiedTextChip as HTMLElement).click();
        hasClickedCopiedTextChip = true;
        
        // Dialog should appear within 1 second
        setTimeout(() => {
          const dialogCheck = document.querySelector('textarea[formcontrolname="text"]');
          if (dialogCheck) {
            console.log('[NotebookLM] ✅ Paste dialog opened successfully!');
          } else {
            console.warn('[NotebookLM] ⚠️ Dialog did not open after clicking chip');
          }
        }, 1000);
      } else {
        console.warn('[NotebookLM] ⚠️ "Copied text" chip not found');
        console.log('[NotebookLM] 💡 Trying to click "Create new notebook" if on notebook list...');
        
        // Fallback: Try clicking "Create new notebook" again in case we missed it
        const createNotebookButtonFallback = 
          document.querySelector('mat-card[jslog="269415"]') ||
          document.querySelector('mat-card.create-new-action-button');
        
        if (createNotebookButtonFallback) {
          console.log('[NotebookLM] 🆕 Found "Create new notebook" button (fallback), clicking...');
          (createNotebookButtonFallback as HTMLElement).click();
        } else {
          console.log('[NotebookLM] 💡 Make sure you are on the NotebookLM "Add sources" page');
        }
      }
    }

    if (attempts >= maxAttempts) {
      clearInterval(intervalId);
      console.error('[NotebookLM] ❌ Paste dialog not found after', maxAttempts / 2, 'seconds');
      console.log('[NotebookLM] 💡 Opening manual export instructions...');
      
      // Store data for manual fallback
      try {
        sessionStorage.setItem('snlm_export_backup', formattedText);
        sessionStorage.setItem('snlm_export_title', title);
        sessionStorage.setItem('snlm_export_failed', 'true');
        console.log('[NotebookLM] 💾 Data stored in sessionStorage');
        
        // Show manual export modal
        showManualExportModal(formattedText, title);
      } catch (e) {
        console.warn('[NotebookLM] Could not save to sessionStorage:', e);
      }
    }
  }, 500);
}

/**
 * Shows a modal with manual export instructions and copy button
 */
function showManualExportModal(formattedText: string, title: string) {
  // Check if modal already exists
  if (document.getElementById('snlm-manual-export-modal')) {
    return;
  }

  // Create modal overlay
  const modal = document.createElement('div');
  modal.id = 'snlm-manual-export-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  // Create modal content
  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 12px;
      padding: 32px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    ">
      <h2 style="
        margin: 0 0 16px 0;
        font-size: 24px;
        font-weight: 600;
        color: #202124;
      ">
        📋 Manual Import Required
      </h2>
      
      <p style="
        margin: 0 0 24px 0;
        font-size: 14px;
        color: #5f6368;
        line-height: 1.5;
      ">
        Automatic paste failed. Follow these steps to import your ChatGPT conversation:
      </p>

      <div style="
        background: #f8f9fa;
        border-left: 4px solid #1a73e8;
        padding: 16px;
        margin-bottom: 24px;
        border-radius: 4px;
      ">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: #202124; font-size: 14px;">
          📌 Title: <span style="font-weight: 400;">${title}</span>
        </p>
        <p style="margin: 0; font-weight: 600; color: #202124; font-size: 14px;">
          📊 Length: <span style="font-weight: 400;">${formattedText.length} characters</span>
        </p>
      </div>

      <div style="
        background: #e8f0fe;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 24px;
      ">
        <p style="
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #1967d2;
        ">
          📝 Steps to Import:
        </p>
        <ol style="
          margin: 0;
          padding-left: 20px;
          font-size: 14px;
          color: #202124;
          line-height: 1.8;
        ">
          <li>Click the <strong>"Copy Text"</strong> button below</li>
          <li>In NotebookLM, click <strong>"+ Add source"</strong></li>
          <li>Select <strong>"Paste text"</strong> from the menu</li>
          <li>Press <strong>Ctrl+V</strong> (or Cmd+V) to paste</li>
          <li>Enter title: <strong>"${title}"</strong></li>
          <li>Click <strong>"Insert"</strong> or <strong>"Add"</strong></li>
        </ol>
      </div>

      <div style="display: flex; gap: 12px;">
        <button id="snlm-copy-btn" style="
          flex: 1;
          padding: 12px 24px;
          background: #1a73e8;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        ">
          📋 Copy Text
        </button>
        <button id="snlm-close-modal-btn" style="
          padding: 12px 24px;
          background: #f1f3f4;
          color: #202124;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        ">
          Close
        </button>
      </div>

      <p style="
        margin: 16px 0 0 0;
        font-size: 12px;
        color: #5f6368;
        text-align: center;
      ">
        Text is also saved in browser memory. You can retrieve it anytime from the console.
      </p>
    </div>
  `;

  document.body.appendChild(modal);

  // Add hover effects
  const copyBtn = document.getElementById('snlm-copy-btn');
  const closeBtn = document.getElementById('snlm-close-modal-btn');

  if (copyBtn) {
    copyBtn.addEventListener('mouseenter', () => {
      copyBtn.style.background = '#1557b0';
    });
    copyBtn.addEventListener('mouseleave', () => {
      copyBtn.style.background = '#1a73e8';
    });
    
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(formattedText);
        copyBtn.innerHTML = '✅ Copied!';
        copyBtn.style.background = '#0d652d';
        
        setTimeout(() => {
          copyBtn.innerHTML = '📋 Copy Text';
          copyBtn.style.background = '#1a73e8';
        }, 2000);
        
        console.log('[NotebookLM] ✅ Text copied to clipboard!');
      } catch (err) {
        console.error('[NotebookLM] Failed to copy:', err);
        copyBtn.innerHTML = '❌ Copy failed';
        copyBtn.style.background = '#d93025';
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = '#e8eaed';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = '#f1f3f4';
    });
    
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
  }

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Check if paste dialog auto-population was successful
 */
export function checkPopulationSuccess(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const failed = sessionStorage.getItem('snlm_export_failed');
        resolve(failed !== 'true');
      } catch {
        resolve(true); // Assume success if we can't check
      }
    }, 11000); // Wait for population attempt to complete
  });
}

/**
 * Interface for NotebookLM notebook data
 */
export interface NotebookEntry {
  id: string;
  title: string;
  sourceCount: number;
  lastModified: string;
}

/**
 * Scrape notebooks from NotebookLM homepage
 * This function is injected into NotebookLM page context
 */
export function scrapeNotebooks(): NotebookEntry[] {
  console.log('[NotebookLM] 📚 Starting notebook scraping...');

  const notebooks: NotebookEntry[] = [];

  // Find all notebook cards using the selector pattern
  const notebookCards = document.querySelectorAll('project-button');

  console.log('[NotebookLM] Found', notebookCards.length, 'notebook cards');

  notebookCards.forEach((card, index) => {
    try {
      // Extract notebook ID from the title span's id attribute
      // Format: "9788beae-6a3a-462b-ae65-c3428d8104e4-title"
      const titleSpan = card.querySelector('span.project-button-title') as HTMLSpanElement;

      if (!titleSpan) {
        console.warn('[NotebookLM] ⚠️ Card', index, 'missing title span');
        return;
      }

      const titleId = titleSpan.id;
      const notebookId = titleId.replace('-title', '');
      const title = titleSpan.textContent?.trim() || 'Untitled notebook';

      // Extract source count
      const sourceSpan = card.querySelector('span.project-button-subtitle-part-sources') as HTMLSpanElement;
      const sourceText = sourceSpan?.textContent?.trim() || '0 sources';
      const sourceCount = parseInt(sourceText.match(/\d+/)?.[0] || '0', 10);

      // Extract last modified date
      const dateSpan = card.querySelector('span.project-button-subtitle-part[title]') as HTMLSpanElement;
      const lastModified = dateSpan?.textContent?.trim() || 'Unknown';

      notebooks.push({
        id: notebookId,
        title,
        sourceCount,
        lastModified,
      });

      console.log('[NotebookLM] ✅ Scraped notebook:', { id: notebookId, title, sourceCount });
    } catch (error) {
      console.error('[NotebookLM] ❌ Error scraping card', index, error);
    }
  });

  console.log('[NotebookLM] 📊 Total notebooks scraped:', notebooks.length);
  return notebooks;
}

/**
 * Click Add button and add source to existing notebook
 * This function is injected AFTER the notebook page has already loaded
 * NO NAVIGATION - just clicks the Add button and adds the source
 */
export function clickAddButtonAndAddSource(formattedText: string, title: string) {
  console.log('[NotebookLM] 🎯 Starting Add button automation...');
  console.log('[NotebookLM] Current URL:', window.location.href);
  console.log('[NotebookLM] Text length:', formattedText.length, 'characters');

  let attempts = 0;
  const maxAttempts = 60; // 60 seconds total

  const checkInterval = setInterval(() => {
    attempts++;

    // Log progress every 5 seconds
    if (attempts % 5 === 0) {
      console.log(`[NotebookLM] ⏱️ Waiting for Add button... (${attempts}s)`);
    }

    if (attempts === 1) {
      console.log('[NotebookLM] 🔍 Looking for "Add" button...');
    }

    // STEP 1: Look for the "Add" button with comprehensive selectors
    const addButton =
      // Try specific class first
      document.querySelector('button.add-source-button') ||
      // Try jslog attribute (most unique)
      document.querySelector('button[jslog="189032;track:generic_click,impression"]') ||
      // Try mattooltip
      document.querySelector('button[mattooltip="Add source"]') ||
      // Try aria-label
      document.querySelector('button[aria-label="Add source"]') ||
      // Try mat-stroked-button with Add text
      Array.from(document.querySelectorAll('button[mat-stroked-button]')).find(btn => {
        const text = btn.textContent?.trim();
        return text === 'Add' && btn.querySelector('mat-icon');
      }) ||
      // Generic fallback: button with "Add" text and mat-icon
      Array.from(document.querySelectorAll('button')).find(btn => {
        const hasAddClass = btn.classList.contains('add-source-button');
        const hasMatIcon = btn.querySelector('mat-icon');
        const hasAddText = btn.textContent?.trim() === 'Add';
        return (hasAddClass || (hasMatIcon && hasAddText));
      });

    if (addButton) {
      console.log('[NotebookLM] 🎉 Found "Add" button!');
      console.log('[NotebookLM] Button classes:', (addButton as HTMLElement).className);
      console.log('[NotebookLM] 🖱️ Clicking "Add" button...');

      (addButton as HTMLElement).click();

      clearInterval(checkInterval);

      // STEP 2: Wait for source type menu to appear, then click "Copied text"
      setTimeout(() => {
        console.log('[NotebookLM] 🔍 Looking for "Copied text" chip...');

        const copiedTextChip =
          document.querySelector('mat-chip[jslog="230543"]') ||
          Array.from(document.querySelectorAll('mat-chip')).find(chip =>
            chip.textContent?.includes('Copied text')
          );

        if (copiedTextChip) {
          console.log('[NotebookLM] 📋 Found "Copied text" chip, clicking...');
          (copiedTextChip as HTMLElement).click();

          // STEP 3: Now populate the dialog (reuse existing logic)
          setTimeout(() => {
            console.log('[NotebookLM] 🔍 Looking for textarea...');

            const textarea = document.querySelector('textarea[formcontrolname="text"]') as HTMLTextAreaElement;

            if (textarea) {
              console.log('[NotebookLM] ✅ Found textarea, populating...');
              textarea.focus();
              textarea.value = formattedText;
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              textarea.dispatchEvent(new Event('change', { bubbles: true }));
              textarea.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));

              // Store in sessionStorage for manual fallback
              try {
                sessionStorage.setItem('snlm_export_backup', formattedText);
                sessionStorage.setItem('snlm_export_title', title);
                sessionStorage.setItem('snlm_export_success', 'true');
              } catch (e) {
                console.warn('[NotebookLM] Could not save to sessionStorage:', e);
              }

              console.log('[NotebookLM] ✅ Successfully populated textarea!');
            } else {
              console.error('[NotebookLM] ❌ Textarea not found');
              console.log('[NotebookLM] Available textareas:', document.querySelectorAll('textarea'));
              showManualExportModal(formattedText, title);
            }
          }, 1500);
        } else {
          console.error('[NotebookLM] ❌ "Copied text" chip not found');
          console.log('[NotebookLM] Available mat-chips:', document.querySelectorAll('mat-chip'));
          showManualExportModal(formattedText, title);
        }
      }, 1500);
    } else {
      // Log what buttons we CAN find for debugging
      if (attempts === 10) {
        console.log('[NotebookLM] 🔍 Debug: Searching for buttons...');
        const allButtons = document.querySelectorAll('button');
        console.log('[NotebookLM] Total buttons found:', allButtons.length);

        const buttonsWithAdd = Array.from(allButtons).filter(btn =>
          btn.textContent?.toLowerCase().includes('add')
        );
        console.log('[NotebookLM] Buttons with "add" text:', buttonsWithAdd.length);

        if (buttonsWithAdd.length > 0) {
          console.log('[NotebookLM] First "add" button:', {
            text: buttonsWithAdd[0].textContent,
            classes: buttonsWithAdd[0].className,
            ariaLabel: buttonsWithAdd[0].getAttribute('aria-label'),
          });
        }
      }
    }

    // Timeout
    if (attempts >= maxAttempts) {
      clearInterval(checkInterval);
      console.error('[NotebookLM] ❌ Timeout: Could not find "Add" button after', maxAttempts, 'seconds');
      console.log('[NotebookLM] 💡 Opening manual export modal...');
      showManualExportModal(formattedText, title);
    }
  }, 1000);
}
