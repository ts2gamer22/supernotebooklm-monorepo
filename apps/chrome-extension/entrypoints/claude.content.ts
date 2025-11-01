/**
 * Claude Content Script
 * Injects "Add to NotebookLM" button and handles conversation export
 */

import { formatClaudeConversation, type Message } from '../src/lib/formatConversation';

export default defineContentScript({
  matches: ['https://claude.ai/*'],
  main() {
    console.log('[Claude] SuperNotebookLM: Claude import enabled');

    // Real selectors from Claude.ai DOM (as of Oct 2025)
    const SELECTORS = {
      // Button injection location - Share button container
      shareButtonContainer: {
        v3: 'div[data-testid="wiggle-controls-actions"]',
        v2: 'div[class*="md:absolute"][class*="md:right-0"]',
        v1: 'header div[class*="absolute"][class*="right-"]',
      },
      shareButton: {
        v3: 'button[data-testid="wiggle-controls-actions-share"]',
        v2: 'button',
        v1: null,
      },
      // Conversation container
      conversationContainer: {
        v3: 'main',
        v2: 'div[class*="conversation"]',
        v1: 'body',
      },
      // User messages
      userMessage: {
        v3: 'div[data-testid="user-message"]',
        v2: 'div[class*="font-user-message"]',
        v1: 'div.font-large',
      },
      // Claude/Assistant messages
      claudeMessage: {
        v3: 'div.standard-markdown',
        v2: 'div[class*="grid-cols-1"][class*="grid"]',
        v1: 'div[class*="prose"]',
      },
      // Message content text
      messageContent: {
        v3: 'p.whitespace-pre-wrap',
        v2: 'p[class*="whitespace"]',
        v1: 'p',
      },
      // Conversation title
      title: {
        v3: 'title',
        v2: 'h1',
        v1: 'head title',
      },
    };

    let isExporting = false;
    let currentChatId: string | null = null;
    let injectionRetries = 0;
    const MAX_RETRIES = 10;

    // Wait for page to load before starting
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    function init() {
      console.log('[Claude] Initializing content script');
      
      // Check if button injection enabled
      chrome.storage.local.get(CAPTURE_SETTINGS_KEY).then((result) => {
        const captureSettings = result[CAPTURE_SETTINGS_KEY] || {};
        if (captureSettings.claude !== false) {
          // Initial injection attempt
          checkAndInject();
          
          // Watch for URL changes (Claude is a SPA)
          watchForNavigation();
        }
      });

      // Listen for settings changes to show/hide button
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[CAPTURE_SETTINGS_KEY]) {
          const captureSettings = changes[CAPTURE_SETTINGS_KEY].newValue || {};
          const button = document.querySelector('.snlm-export-btn-claude');
          
          if (captureSettings.claude !== false && !button) {
            checkAndInject();
          } else if (captureSettings.claude === false && button) {
            button.remove();
          }
        }
      });
    }

    function watchForNavigation() {
      // Watch for URL changes in SPA
      let lastUrl = window.location.href;
      
      const observer = new MutationObserver(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          console.log('[Claude] Navigation detected:', currentUrl);
          lastUrl = currentUrl;
          
          // Extract chat ID from URL
          const chatIdMatch = currentUrl.match(/\/chat\/([a-f0-9-]+)/);
          const newChatId = chatIdMatch ? chatIdMatch[1] : null;
          
          // Only re-inject if we're in a different chat
          if (newChatId && newChatId !== currentChatId) {
            console.log('[Claude] New chat detected:', newChatId);
            currentChatId = newChatId;
            
            // Remove old button and inject new one
            const oldButton = document.querySelector('.snlm-export-btn-claude');
            if (oldButton) {
              oldButton.remove();
            }
            
            // Reset retries and inject
            injectionRetries = 0;
            checkAndInject();
          }
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      console.log('[Claude] Navigation watcher started');
    }

    function checkAndInject() {
      // Only inject if we're in a chat URL
      const isChatUrl = window.location.pathname.startsWith('/chat/');
      
      if (!isChatUrl) {
        console.log('[Claude] Not in chat URL, skipping injection');
        return;
      }
      
      console.log('[Claude] In chat URL, attempting injection');
      injectExportButton();
    }

    function injectExportButton() {
      // Check if button already exists first
      if (document.querySelector('.snlm-export-btn-claude')) {
        console.log('[Claude] Button already exists, skipping injection');
        return;
      }

      // Find share button container (appears when chatting)
      const shareContainer =
        document.querySelector(SELECTORS.shareButtonContainer.v3) ||
        document.querySelector(SELECTORS.shareButtonContainer.v2) ||
        document.querySelector(SELECTORS.shareButtonContainer.v1);

      if (!shareContainer) {
        injectionRetries++;
        if (injectionRetries < MAX_RETRIES) {
          console.warn(`[Claude] Share button container not found. Retry ${injectionRetries}/${MAX_RETRIES} in 1s...`);
          setTimeout(injectExportButton, 1000);
        } else {
          console.error('[Claude] Share button container not found after max retries');
        }
        return;
      }
      
      // Reset retries on success
      injectionRetries = 0;

      console.log('[Claude] Share container found:', shareContainer);

      // Find the share button to insert before it
      let shareButton = shareContainer.querySelector(SELECTORS.shareButton.v3);
      
      // Fallback: find button with "Share" text
      if (!shareButton) {
        const buttons = Array.from(shareContainer.querySelectorAll('button'));
        shareButton = buttons.find(btn => btn.textContent?.trim() === 'Share') || null;
      }

      if (shareButton) {
        console.log('[Claude] Share button found:', shareButton);
      } else {
        console.warn('[Claude] Share button not found inside container, will prepend to container');
      }

      // Create button container with dropdown
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'snlm-export-btn-claude relative';
      buttonContainer.style.cssText = 'margin-right: 8px;';
      
      // Main button styled to match Claude's Share button
      const button = document.createElement('button');
      button.className = 'snlm-main-btn inline-flex items-center justify-center relative shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none font-base-bold border-0.5 relative overflow-hidden transition duration-100 backface-hidden h-8 rounded-md px-3 min-w-[4rem] active:scale-[0.985] whitespace-nowrap !text-xs Button_secondary__x7x_y';
      button.type = 'button';
      button.setAttribute('aria-label', 'SuperNotebookLM export options');
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="display: inline-block; margin-right: 6px;">
          <path d="M8 1L8 11M8 1L11 4M8 1L5 4M2 11L2 14L14 14L14 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>NotebookLM</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" style="margin-left: 4px;">
          <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      `;

      // Dropdown menu with three options like ChatGPT (with Claude's dark theme styling)
      const dropdown = document.createElement('div');
      dropdown.className = 'snlm-dropdown';
      dropdown.style.cssText = `
        position: absolute;
        right: 0;
        top: calc(100% + 4px);
        min-width: 240px;
        background: #2f1f1f;
        color: #f0e6dc;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
        overflow: hidden;
        z-index: 10000;
        display: none;
      `;
      dropdown.innerHTML = `
        <div style="padding: 4px 0;">
          <button class="snlm-dropdown-item" data-action="notebooklm" style="
            width: 100%;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            background: none;
            border: none;
            color: #f0e6dc;
            cursor: pointer;
            text-align: left;
            transition: background 0.15s ease;
          ">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style="flex-shrink: 0;">
              <path d="M8 1L8 11M8 1L11 4M8 1L5 4M2 11L2 14L14 14L14 11" stroke="#f0e6dc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 500; margin-bottom: 2px;">Export to NotebookLM</div>
              <div style="font-size: 11px; color: #c9b5a0;">Open in new tab</div>
            </div>
          </button>
          <button class="snlm-dropdown-item" data-action="markdown" style="
            width: 100%;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            background: none;
            border: none;
            color: #f0e6dc;
            cursor: pointer;
            text-align: left;
            transition: background 0.15s ease;
          ">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#f0e6dc" style="flex-shrink: 0;">
              <path d="M6 2L6 5M14 2L14 5M3 8H17M4 4H16C16.5523 4 17 4.44772 17 5V17C17 17.5523 16.5523 18 16 18H4C3.44772 18 3 17.5523 3 17V5C3 4.44772 3.44772 4 4 4Z" stroke-width="1.5" stroke-linecap="round"/>
              <text x="10" y="14" font-size="5" fill="#f0e6dc" text-anchor="middle" font-weight="bold">MD</text>
            </svg>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 500; margin-bottom: 2px;">Download Markdown</div>
              <div style="font-size: 11px; color: #c9b5a0;">Save as .md file</div>
            </div>
          </button>
          <button class="snlm-dropdown-item" data-action="pdf" style="
            width: 100%;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            background: none;
            border: none;
            color: #f0e6dc;
            cursor: pointer;
            text-align: left;
            transition: background 0.15s ease;
          ">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#f0e6dc" style="flex-shrink: 0;">
              <path d="M6 2L6 18M6 2H10L14 6V18H6M10 2V6H14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 500; margin-bottom: 2px;">Download PDF</div>
              <div style="font-size: 11px; color: #c9b5a0;">Save as .pdf file</div>
            </div>
          </button>
        </div>
      `;

      buttonContainer.appendChild(button);
      buttonContainer.appendChild(dropdown);

      // Toggle dropdown on button click
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = dropdown.style.display === 'none';
        dropdown.style.display = isHidden ? 'block' : 'none';
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        dropdown.style.display = 'none';
      });

      // Handle dropdown item clicks with hover effects
      const dropdownItems = dropdown.querySelectorAll('.snlm-dropdown-item');
      dropdownItems.forEach(item => {
        const itemEl = item as HTMLElement;
        
        // Add hover effect
        itemEl.addEventListener('mouseenter', () => {
          itemEl.style.background = '#4a3730';
        });
        itemEl.addEventListener('mouseleave', () => {
          itemEl.style.background = 'none';
        });
        
        // Handle click
        itemEl.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = 'none';
          const action = itemEl.getAttribute('data-action');
          
          if (action === 'notebooklm') {
            showNotebookSelectionModal();
          } else if (action === 'markdown' || action === 'pdf') {
            handleExportClick(action as 'markdown' | 'pdf');
          }
        });
      });

      // Insert before share button, or prepend if share button not found
      try {
        if (shareButton) {
          shareContainer.insertBefore(buttonContainer, shareButton);
          console.log('[Claude] Button inserted before Share button');
        } else {
          // Prepend as first child
          shareContainer.insertBefore(buttonContainer, shareContainer.firstChild);
          console.log('[Claude] Button prepended to container');
        }
        
        console.log('[Claude] Export button injected successfully');
      } catch (error) {
        console.error('[Claude] Failed to inject button:', error);
      }
    }

    async function showNotebookSelectionModal() {
      // Close dropdown
      const dropdown = document.querySelector('.snlm-dropdown') as HTMLElement;
      if (dropdown) {
        dropdown.style.display = 'none';
      }

      // Scrape conversation first to check if there's content
      const messages = scrapeConversation();
      if (messages.length === 0) {
        alert('No conversation found to export');
        return;
      }

      // Extract title for later use
      const title = extractConversationTitle();

      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'snlm-modal-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
      `;

      // Create modal
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: #2f1f1f;
        color: #f0e6dc;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      `;

      modal.innerHTML = `
        <div style="padding: 24px; border-bottom: 1px solid #4a3a32;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px 0; color: #f0e6dc;">
            Export to NotebookLM
          </h2>
          <p style="font-size: 14px; color: #c9b5a0; margin: 0;">
            Choose where to add this conversation
          </p>
        </div>

        <div style="padding: 24px; flex: 1; overflow-y: auto;">
          <button class="snlm-modal-option" data-action="new" style="
            width: 100%;
            padding: 16px;
            border: 1.5px solid #6d5a4d;
            border-radius: 8px;
            background: #3d2d25;
            cursor: pointer;
            text-align: left;
            margin-bottom: 12px;
            transition: all 0.2s;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f0e6dc" style="flex-shrink: 0;">
                <path d="M12 5V19M5 12H19" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <div>
                <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #f0e6dc;">
                  Create New Notebook
                </div>
                <div style="font-size: 13px; color: #c9b5a0;">
                  Start a fresh notebook with this conversation
                </div>
              </div>
            </div>
          </button>

          <button class="snlm-modal-option" data-action="existing" style="
            width: 100%;
            padding: 16px;
            border: 1.5px solid #6d5a4d;
            border-radius: 8px;
            background: #3d2d25;
            cursor: pointer;
            text-align: left;
            transition: all 0.2s;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f0e6dc" style="flex-shrink: 0;">
                <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <div>
                <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #f0e6dc;">
                  Add to Existing Notebook
                </div>
                <div style="font-size: 13px; color: #c9b5a0;">
                  Choose from your notebooks
                </div>
              </div>
            </div>
          </button>
        </div>

        <div style="padding: 16px 24px; border-top: 1px solid #4a3a32; display: flex; justify-content: flex-end;">
          <button class="snlm-modal-cancel" style="
            padding: 10px 20px;
            background: transparent;
            border: none;
            color: #c9b5a0;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            border-radius: 6px;
            transition: background 0.2s;
          ">
            Cancel
          </button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Add hover effects
      const options = modal.querySelectorAll('.snlm-modal-option');
      options.forEach(option => {
        option.addEventListener('mouseenter', () => {
          (option as HTMLElement).style.borderColor = '#cc785c';
          (option as HTMLElement).style.background = '#4a3730';
        });
        option.addEventListener('mouseleave', () => {
          (option as HTMLElement).style.borderColor = '#6d5a4d';
          (option as HTMLElement).style.background = '#3d2d25';
        });
      });

      // Handle clicks
      const newNotebookBtn = modal.querySelector('[data-action="new"]') as HTMLElement;
      const existingNotebookBtn = modal.querySelector('[data-action="existing"]') as HTMLElement;
      const cancelBtn = modal.querySelector('.snlm-modal-cancel') as HTMLElement;

      newNotebookBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        handleExportClick('notebooklm');
      });

      existingNotebookBtn.addEventListener('click', async () => {
        document.body.removeChild(overlay);
        await showNotebookListModal(messages, title);
      });

      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });
    }

    async function showNotebookListModal(messages: Message[], conversationTitle: string) {
      // Add spin animation style if not already added
      if (!document.getElementById('snlm-spin-animation')) {
        const style = document.createElement('style');
        style.id = 'snlm-spin-animation';
        style.textContent = `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }

      // Create loading overlay
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'snlm-modal-overlay';
      loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
      `;

      const loadingModal = document.createElement('div');
      loadingModal.style.cssText = `
        background: #2f1f1f;
        color: #f0e6dc;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      `;
      loadingModal.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style="animation: spin 1s linear infinite;">
            <circle cx="20" cy="20" r="16" stroke="#cc785c" stroke-width="4" stroke-dasharray="25 15" fill="none"/>
          </svg>
          <p style="font-size: 16px; margin: 0; color: #f0e6dc;">Loading notebooks...</p>
        </div>
      `;

      loadingOverlay.appendChild(loadingModal);
      document.body.appendChild(loadingOverlay);

      try {
        console.log('[Claude] Requesting notebooks from background...');

        // Request notebooks from background script
        const response = await chrome.runtime.sendMessage({ type: 'GET_NOTEBOOKS' });

        console.log('[Claude] Received response:', response);

        // Remove loading overlay
        if (document.body.contains(loadingOverlay)) {
          document.body.removeChild(loadingOverlay);
        }

        if (!response) {
          throw new Error('No response from background script. Please refresh and try again.');
        }

        if (!response.success) {
          throw new Error(response.error || 'Failed to load notebooks');
        }

        if (!response.notebooks) {
          throw new Error('No notebooks data received');
        }

        const notebooks = response.notebooks;
        console.log('[Claude] Got', notebooks.length, 'notebooks');

        if (notebooks.length === 0) {
          alert('No notebooks found. Please create a notebook first in NotebookLM.');
          return;
        }

        // Show notebook selection modal
        showNotebookSelectionUI(notebooks, messages, conversationTitle);
      } catch (error) {
        console.error('[Claude] Failed to load notebooks:', error);

        // Make sure loading overlay is removed
        if (document.body.contains(loadingOverlay)) {
          document.body.removeChild(loadingOverlay);
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Failed to load notebooks: ${errorMessage}\n\nPlease check:\n1. NotebookLM is accessible\n2. Extension has proper permissions\n3. Try refreshing the page`);
      }
    }

    function showNotebookSelectionUI(
      notebooks: Array<{ id: string; title: string; sourceCount: number; lastModified: string }>,
      messages: Message[],
      conversationTitle: string
    ) {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'snlm-modal-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
      `;

      // Create modal
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: #2f1f1f;
        color: #f0e6dc;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      `;

      // Build notebook list HTML
      const notebookListHTML = notebooks.map((notebook, index) => `
        <button class="snlm-notebook-item" data-notebook-id="${notebook.id}" data-index="${index}" style="
          width: 100%;
          padding: 16px;
          border: 1.5px solid #6d5a4d;
          border-radius: 8px;
          background: #3d2d25;
          cursor: pointer;
          text-align: left;
          margin-bottom: 12px;
          transition: all 0.2s;
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px; flex-shrink: 0;">📔</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #f0e6dc;">
                ${notebook.title}
              </div>
              <div style="font-size: 13px; color: #c9b5a0;">
                ${notebook.sourceCount} sources · ${notebook.lastModified}
              </div>
            </div>
          </div>
        </button>
      `).join('');

      modal.innerHTML = `
        <div style="padding: 24px; border-bottom: 1px solid #4a3a32;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px 0; color: #f0e6dc;">
            Select Notebook
          </h2>
          <p style="font-size: 14px; color: #c9b5a0; margin: 0;">
            Choose a notebook to add this conversation
          </p>
        </div>

        <div style="padding: 16px 24px; border-bottom: 1px solid #4a3a32;">
          <input type="text" id="notebook-search" placeholder="Search notebooks..." style="
            width: 100%;
            padding: 10px 12px;
            background: #3d2d25;
            border: 1.5px solid #6d5a4d;
            border-radius: 8px;
            color: #f0e6dc;
            font-size: 14px;
            outline: none;
          ">
        </div>

        <div style="padding: 24px; flex: 1; overflow-y: auto; max-height: 400px;">
          ${notebookListHTML}
        </div>

        <div style="padding: 16px 24px; border-top: 1px solid #4a3a32; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; color: #c9b5a0;">
            ${notebooks.length} notebook${notebooks.length !== 1 ? 's' : ''} found
          </span>
          <button class="snlm-modal-cancel" style="
            padding: 10px 20px;
            background: transparent;
            border: none;
            color: #c9b5a0;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            border-radius: 6px;
            transition: background 0.2s;
          ">
            Cancel
          </button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Add hover effects for notebook items
      const notebookItems = modal.querySelectorAll('.snlm-notebook-item');
      notebookItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
          (item as HTMLElement).style.borderColor = '#cc785c';
          (item as HTMLElement).style.background = '#4a3730';
        });
        item.addEventListener('mouseleave', () => {
          (item as HTMLElement).style.borderColor = '#6d5a4d';
          (item as HTMLElement).style.background = '#3d2d25';
        });

        // Handle notebook selection
        item.addEventListener('click', async () => {
          const notebookId = (item as HTMLElement).getAttribute('data-notebook-id');
          const notebookTitle = notebooks.find(n => n.id === notebookId)?.title || 'Unknown';

          document.body.removeChild(overlay);

          // Format conversation and send to background
          const formatted = formatClaudeConversation(messages, conversationTitle, window.location.href);

          try {
            const response = await chrome.runtime.sendMessage({
              type: 'ADD_TO_EXISTING_NOTEBOOK',
              data: {
                notebookId,
                formattedText: formatted,
                title: conversationTitle,
                sourceUrl: window.location.href,
              },
            });

            if (response.success) {
              console.log('[Claude] Successfully initiated add to existing notebook');
            } else {
              throw new Error(response.error);
            }
          } catch (error) {
            console.error('[Claude] Failed to add to existing notebook:', error);
            alert('Failed to add to notebook. Please try again.');
          }
        });
      });

      // Search functionality
      const searchInput = modal.querySelector('#notebook-search') as HTMLInputElement;
      searchInput.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value.toLowerCase();

        notebookItems.forEach((item, index) => {
          const notebook = notebooks[index];
          const matches = notebook.title.toLowerCase().includes(query);
          (item as HTMLElement).style.display = matches ? 'block' : 'none';
        });

        // Update count
        const visibleCount = Array.from(notebookItems).filter(
          item => (item as HTMLElement).style.display !== 'none'
        ).length;
        const countSpan = modal.querySelector('span[style*="font-size: 13px"]') as HTMLElement;
        countSpan.textContent = `${visibleCount} notebook${visibleCount !== 1 ? 's' : ''} found`;
      });

      // Cancel button
      const cancelBtn = modal.querySelector('.snlm-modal-cancel') as HTMLElement;
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });

      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });
    }

    async function handleExportClick(exportType: 'notebooklm' | 'markdown' | 'pdf') {
      const buttonContainer = document.querySelector('.snlm-export-btn-claude') as HTMLElement;
      const button = buttonContainer?.querySelector('.snlm-main-btn') as HTMLButtonElement;
      
      if (!button || isExporting) return;

      isExporting = true;
      button.disabled = true;
      button.style.opacity = '0.8';
      
      // Show loading state with single spinner icon
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="display: inline-block; margin-right: 6px; animation: spin 1s linear infinite;">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="8 4" fill="none"/>
        </svg>
        <span>Exporting...</span>
      `;

      // Add spin animation if not already added
      if (!document.getElementById('snlm-spin-animation')) {
        const style = document.createElement('style');
        style.id = 'snlm-spin-animation';
        style.textContent = `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }

      try {
        // Scrape conversation
        const messages = scrapeConversation();
        if (messages.length === 0) {
          throw new Error('No conversation found to export');
        }

        const title = extractConversationTitle();
        const formatted = formatClaudeConversation(messages, title, window.location.href);

        console.log('[Claude] Export request:', {
          type: exportType,
          title,
          messageCount: messages.length,
          textLength: formatted.length,
        });

        let exportSuccess = false;
        let fileName: string | undefined;

        if (exportType === 'markdown') {
          fileName = downloadAsMarkdown(formatted, title);
          exportSuccess = true;
          showSuccessState(button, 'Downloaded!');
        } else if (exportType === 'pdf') {
          await downloadAsPDF(formatted, title);
          exportSuccess = true;
          showSuccessState(button, 'Downloaded!');
        } else if (exportType === 'notebooklm') {
          // Send to background script
          const response = await chrome.runtime.sendMessage({
            type: 'EXPORT_TO_NOTEBOOKLM',
            data: {
              formattedText: formatted,
              title: title,
              sourceUrl: window.location.href,
            },
          });

          if (response?.success) {
            exportSuccess = true;
            showSuccessState(button, 'Exported!');
          } else {
            throw new Error(response?.error || 'Export failed');
          }
        }
      } catch (error) {
        console.error('[Claude] Export failed:', error);
        showErrorState(button);
      }
    }

    function showSuccessState(button: HTMLButtonElement, message: string) {
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="display: inline-block; margin-right: 6px;">
          <path d="M3 8L6 11L13 4" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="color: #22c55e;">${message}</span>
      `;

      setTimeout(() => {
        resetButton(button);
      }, 3000);
    }

    function showErrorState(button: HTMLButtonElement) {
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="display: inline-block; margin-right: 6px;">
          <path d="M8 5V9M8 11V11.5M8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15Z" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span style="color: #ef4444;">Failed</span>
      `;

      setTimeout(() => {
        resetButton(button);
      }, 3000);
    }

    function resetButton(button: HTMLButtonElement) {
      isExporting = false;
      button.disabled = false;
      button.style.opacity = '1';
      // Remove any inline background styles to revert to Claude's default button style
      button.style.background = '';
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="display: inline-block; margin-right: 6px;">
          <path d="M8 1L8 11M8 1L11 4M8 1L5 4M2 11L2 14L14 14L14 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>NotebookLM</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" style="margin-left: 4px;">
          <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      `;
    }

    function downloadAsMarkdown(content: string, title: string): string {
      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${sanitizedTitle}.md`;
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('[Claude] Downloaded as Markdown:', fileName);
      return fileName;
    }

    async function downloadAsPDF(content: string, title: string) {
      // Simple PDF generation using browser print
      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      // Create a temporary iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position: absolute; width: 0; height: 0; border: none;';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Could not access iframe document');
      }
      
      // Convert markdown to HTML with basic styling
      const htmlContent = convertMarkdownToHTML(content);
      
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                line-height: 1.6;
                max-width: 800px;
                margin: 40px auto;
                padding: 20px;
                color: #333;
              }
              h1 { font-size: 28px; margin-bottom: 10px; color: #111; }
              h2 { font-size: 24px; margin-top: 30px; margin-bottom: 10px; color: #333; }
              h3 { font-size: 20px; margin-top: 20px; margin-bottom: 8px; color: #555; }
              p { margin: 12px 0; }
              strong { color: #2563eb; font-weight: 600; }
              em { font-style: italic; color: #666; }
              code {
                background: #f5f5f5;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
              }
              pre {
                background: #f5f5f5;
                padding: 16px;
                border-radius: 6px;
                overflow-x: auto;
                margin: 16px 0;
              }
              pre code {
                background: none;
                padding: 0;
              }
              blockquote {
                border-left: 3px solid #2563eb;
                padding-left: 16px;
                margin: 16px 0;
                color: #666;
                font-style: italic;
              }
              ul, ol { padding-left: 24px; margin: 12px 0; }
              li { margin: 6px 0; }
              hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
              a { color: #2563eb; text-decoration: none; }
              @media print {
                body { margin: 0; padding: 20px; }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      iframeDoc.close();
      
      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Trigger print dialog
      iframe.contentWindow?.print();
      
      // Clean up after print dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
      
      console.log('[Claude] Opened PDF print dialog');
    }

    function convertMarkdownToHTML(markdown: string): string {
      return markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Blockquotes
        .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
        // Horizontal rule
        .replace(/^---$/gim, '<hr>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        // Wrap in paragraphs
        .replace(/^(.+)$/gim, '<p>$1</p>')
        // Clean up nested paragraphs in headers
        .replace(/<h([123])><p>(.*?)<\/p><\/h\1>/g, '<h$1>$2</h$1>')
        .replace(/<blockquote><p>(.*?)<\/p><\/blockquote>/g, '<blockquote>$1</blockquote>');
    }

    function scrapeConversation(): Message[] {
      const messages: Message[] = [];

      // Find conversation container
      const container =
        document.querySelector(SELECTORS.conversationContainer.v3) ||
        document.querySelector(SELECTORS.conversationContainer.v2) ||
        document.querySelector(SELECTORS.conversationContainer.v1);

      if (!container) {
        console.warn('[Claude] Conversation container not found');
        throw new Error('Conversation container not found');
      }

      // Find user messages (data-testid="user-message")
      const userMessages = Array.from(
        container.querySelectorAll(SELECTORS.userMessage.v3) ||
        container.querySelectorAll(SELECTORS.userMessage.v2) ||
        []
      );

      // Find Claude messages (standard-markdown)
      const claudeMessages = Array.from(
        container.querySelectorAll(SELECTORS.claudeMessage.v3) ||
        container.querySelectorAll(SELECTORS.claudeMessage.v2) ||
        []
      );

      console.log('[Claude] Found', userMessages.length, 'user messages and', claudeMessages.length, 'Claude messages');

      // Interleave messages based on their order in the DOM
      const allMessageElements = [
        ...userMessages.map(el => ({ el, role: 'user' as const })),
        ...claudeMessages.map(el => ({ el, role: 'assistant' as const }))
      ].sort((a, b) => {
        const posA = a.el.compareDocumentPosition(b.el);
        return posA & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });

      for (const { el, role } of allMessageElements) {
        try {
          let content = '';
          
          if (role === 'user') {
            // User messages have paragraph with whitespace-pre-wrap
            const para = el.querySelector(SELECTORS.messageContent.v3) ||
                        el.querySelector(SELECTORS.messageContent.v2) ||
                        el.querySelector('p');
            content = para?.textContent?.trim() || el.textContent?.trim() || '';
          } else {
            // Claude messages - get all text content, preserving structure
            // Skip images, just get text
            content = el.textContent?.trim() || '';
          }

          if (content && content.length > 0) {
            messages.push({ role, content });
          }
        } catch (error) {
          console.warn('[Claude] Failed to parse message:', error);
        }
      }

      console.log('[Claude] Scraped', messages.length, 'messages');
      return messages;
    }

    function extractConversationTitle(): string {
      // Try to get title from document title
      const documentTitle = document.title;
      
      // Remove "Claude" prefix
      let cleanTitle = documentTitle
        .replace(/^Claude\s*[-–—]\s*/i, '')
        .replace(/\s*[-–—]\s*Claude$/i, '')
        .trim();

      // If title is generic or empty, use first user message
      if (!cleanTitle || cleanTitle.toLowerCase() === 'claude' || cleanTitle.toLowerCase() === 'new chat') {
        const container =
          document.querySelector(SELECTORS.conversationContainer.v3) ||
          document.querySelector(SELECTORS.conversationContainer.v2);
        
        if (container) {
          const firstUserMessage = container.querySelector('[data-is-user-message="true"]');
          if (firstUserMessage) {
            const text = firstUserMessage.textContent?.trim() || '';
            cleanTitle = text.substring(0, 80) + (text.length > 80 ? '...' : '');
          }
        }
      }

      // Final fallback
      if (!cleanTitle) {
        cleanTitle = `Claude Conversation - ${new Date().toLocaleDateString()}`;
      }

      // Sanitize title: remove special characters, limit length
      cleanTitle = cleanTitle
        .replace(/[<>:"/\\|?*]/g, '')
        .substring(0, 100);

      return cleanTitle;
    }
  },
});

const CAPTURE_SETTINGS_KEY = 'captureSettings';
