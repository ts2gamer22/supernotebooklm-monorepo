/**
 * ChatGPT Content Script
 * Injects "Add to NotebookLM" button and handles conversation export
 */

export default defineContentScript({
  matches: ['https://chat.openai.com/*', 'https://chatgpt.com/*'],
  main() {
    console.log('SuperNotebookLM: ChatGPT import enabled');

    // Versioned selectors for DOM scraping resilience
    const SELECTORS = {
      // Header where button will be injected
      header: {
        v3: 'header#page-header',
        v2: 'header.sticky',
        v1: 'header',
      },
      // Share button (anchor for button placement)
      shareButton: {
        v3: 'button[data-testid="share-chat-button"]',
        v2: 'button[aria-label="Share"]',
        v1: 'button.btn-ghost',
      },
      // Conversation container
      conversationContainer: {
        v3: 'main',
        v2: 'main [role="presentation"]',
        v1: 'main > div',
      },
      // User messages (NEW SELECTORS)
      userMessages: {
        v3: 'div.user-message-bubble-color',
        v2: 'div[class*="user-message"]',
        v1: 'div.whitespace-pre-wrap',
      },
      // Assistant messages (NEW SELECTORS)
      assistantMessages: {
        v3: 'article.text-token-text-primary',
        v2: 'article[class*="text-token"]',
        v1: 'article',
      },
      // Conversation title
      title: {
        v3: 'title',
        v2: 'head title',
        v1: 'title',
      },
    };

    let isExporting = false;
    let buttonObserver: MutationObserver | null = null;
    let reinjectionAttempts = 0;
    const MAX_REINJECTION_ATTEMPTS = 10;

    // Wait for page to load before injecting button
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    function init() {
      // Check if button injection enabled
      chrome.storage.local.get(CAPTURE_SETTINGS_KEY).then((result) => {
        const captureSettings = result[CAPTURE_SETTINGS_KEY] || {};
        if (captureSettings.chatgpt !== false) {
          // CRITICAL FIX: Wait for React hydration to complete before injecting
          // React Error #418 (hydration mismatch) occurs when we inject during hydration
          // Waiting 3 seconds ensures React has fully loaded and stabilized
          console.log('[ChatGPT] Waiting for React hydration to complete...');
          
          setTimeout(() => {
            console.log('[ChatGPT] React should be stable now, injecting button...');
            injectExportButton();
            setupButtonPersistence();
            
            // Backup: Also check periodically if button exists
            setupPeriodicButtonCheck();
          }, 3000); // Wait 3 seconds for React to stabilize
        }
      });

      // Listen for settings changes to show/hide button
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[CAPTURE_SETTINGS_KEY]) {
          const captureSettings = changes[CAPTURE_SETTINGS_KEY].newValue || {};
          const button = document.querySelector('.snlm-export-btn');
          
          if (captureSettings.chatgpt !== false && !button) {
            // Use same delayed injection pattern when toggling on
            setTimeout(() => {
              injectExportButton();
              setupButtonPersistence();
              setupPeriodicButtonCheck();
            }, 1000); // Shorter delay since page already loaded
          } else if (captureSettings.chatgpt === false && button) {
            button.remove();
            if (buttonObserver) {
              buttonObserver.disconnect();
              buttonObserver = null;
            }
          }
        }
      });
    }

    /**
     * Setup MutationObserver to keep button persistent even when React re-renders
     */
    function setupButtonPersistence() {
      // Disconnect existing observer if any
      if (buttonObserver) {
        buttonObserver.disconnect();
      }

      // Watch for button removal and re-inject
      buttonObserver = new MutationObserver((mutations) => {
        const buttonExists = document.querySelector('.snlm-export-btn');
        
        if (!buttonExists && reinjectionAttempts < MAX_REINJECTION_ATTEMPTS) {
          reinjectionAttempts++;
          console.log(`[ChatGPT] 🔄 Button removed by React, re-injecting... (attempt ${reinjectionAttempts})`);
          
          // Wait a bit before re-injecting to avoid fight with React
          setTimeout(() => {
            injectExportButton();
          }, 100);
        }
      });

      // Observe the entire document body (not just header) to catch any DOM changes
      const observeTarget = document.body || document.documentElement;
      if (observeTarget) {
        buttonObserver.observe(observeTarget, {
          childList: true,
          subtree: true,
        });
        console.log('[ChatGPT] 👁️ MutationObserver watching for button removal');
      }

      // Reset reinjection counter after React stabilizes
      setTimeout(() => {
        reinjectionAttempts = 0;
      }, 5000);
    }

    /**
     * Backup mechanism: Periodically check if button exists and reinject if needed
     * This runs independently of MutationObserver as a failsafe
     */
    function setupPeriodicButtonCheck() {
      let checkCount = 0;
      const maxChecks = 20; // Check for 10 seconds (20 x 500ms)

      const checkInterval = setInterval(() => {
        checkCount++;
        const buttonExists = document.querySelector('.snlm-export-btn');

        if (!buttonExists && reinjectionAttempts < MAX_REINJECTION_ATTEMPTS) {
          console.log(`[ChatGPT] 🔍 Periodic check: Button missing, re-injecting...`);
          reinjectionAttempts++;
          injectExportButton();
        } else if (buttonExists) {
          console.log(`[ChatGPT] ✅ Button stable and visible`);
          clearInterval(checkInterval);
        }

        // Stop checking after 10 seconds
        if (checkCount >= maxChecks) {
          if (buttonExists) {
            console.log('[ChatGPT] ✅ Button successfully stabilized after 10 seconds');
          } else {
            console.error('[ChatGPT] ❌ Button failed to stabilize after 10 seconds and 10 reinjection attempts');
          }
          clearInterval(checkInterval);
        }
      }, 500); // Check every 500ms
    }

    function injectExportButton() {
      // Find header using versioned selectors
      const header =
        document.querySelector(SELECTORS.header.v3) ||
        document.querySelector(SELECTORS.header.v2) ||
        document.querySelector(SELECTORS.header.v1);

      if (!header) {
        console.warn('[ChatGPT] Header not found. Retrying in 2s...');
        setTimeout(injectExportButton, 2000);
        return;
      }

      // Check if button already exists
      if (document.querySelector('.snlm-export-btn')) {
        return;
      }

      // Find share button as anchor point (or fallback to append to header)
      const shareButton =
        document.querySelector(SELECTORS.shareButton.v3) ||
        document.querySelector(SELECTORS.shareButton.v2) ||
        document.querySelector(SELECTORS.shareButton.v1);

      // Create button container with dropdown (styled to match ChatGPT UI)
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'snlm-export-btn relative';
      
      // Main button
      const button = document.createElement('button');
      button.className = 'btn relative btn-ghost text-token-text-primary';
      button.setAttribute('aria-label', 'SuperNotebookLM export options');
      button.setAttribute('data-testid', 'snlm-export-button');
      button.innerHTML = `
        <div class="flex w-full items-center justify-center gap-1.5">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
            <path d="M10 3L10 13M10 3L13 6M10 3L7 6M3 13L3 17L17 17L17 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          SuperNotebookLM
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="ml-1">
            <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>
      `;

      // Dropdown menu
      const dropdown = document.createElement('div');
      dropdown.className = 'snlm-dropdown absolute right-0 top-full mt-1 hidden bg-token-main-surface-primary rounded-lg shadow-lg border border-token-border-medium overflow-hidden z-50';
      dropdown.style.cssText = 'min-width: 200px;';
      dropdown.innerHTML = `
        <div class="py-1">
          <button class="snlm-dropdown-item flex items-center gap-2 w-full px-3 py-2 text-left text-token-text-primary hover:bg-token-main-surface-secondary transition-colors">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="flex-shrink: 0;">
              <path d="M10 3L10 13M10 3L13 6M10 3L7 6M3 13L3 17L17 17L17 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
            <div>
              <div class="text-sm font-medium">Export to NotebookLM</div>
              <div style="font-size: 11px;" class="text-token-text-secondary">Open in new tab</div>
            </div>
          </button>
          <button class="snlm-dropdown-item flex items-center gap-2 w-full px-3 py-2 text-left text-token-text-primary hover:bg-token-main-surface-secondary transition-colors">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" style="flex-shrink: 0;">
              <path d="M6 2L6 5M14 2L14 5M3 8H17M4 4H16C16.5523 4 17 4.44772 17 5V17C17 17.5523 16.5523 18 16 18H4C3.44772 18 3 17.5523 3 17V5C3 4.44772 3.44772 4 4 4Z" stroke-width="1.5" stroke-linecap="round"/>
              <text x="10" y="14" font-size="5" fill="currentColor" text-anchor="middle" font-weight="bold">MD</text>
            </svg>
            <div>
              <div class="text-sm font-medium">Download Markdown</div>
              <div style="font-size: 11px;" class="text-token-text-secondary">Save as .md file</div>
            </div>
          </button>
          <button class="snlm-dropdown-item flex items-center gap-2 w-full px-3 py-2 text-left text-token-text-primary hover:bg-token-main-surface-secondary transition-colors">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" style="flex-shrink: 0;">
              <path d="M6 2L6 18M6 2H10L14 6V18H6M10 2V6H14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div>
              <div class="text-sm font-medium">Download PDF</div>
              <div style="font-size: 11px;" class="text-token-text-secondary">Save as .pdf file</div>
            </div>
          </button>
        </div>
      `;

      buttonContainer.appendChild(button);
      buttonContainer.appendChild(dropdown);

      // Toggle dropdown on button click
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = dropdown.classList.contains('hidden');
        dropdown.classList.toggle('hidden', !isHidden);
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        dropdown.classList.add('hidden');
      });

      // Handle dropdown item clicks
      const dropdownItems = dropdown.querySelectorAll('.snlm-dropdown-item');
      dropdownItems[0].addEventListener('click', () => showNotebookSelectionModal());
      dropdownItems[1].addEventListener('click', () => handleExportClick('markdown'));
      dropdownItems[2].addEventListener('click', () => handleExportClick('pdf'));
      
      // Try to insert before share button, or fallback to append to header actions
      if (shareButton && shareButton.parentElement) {
        shareButton.parentElement.insertBefore(buttonContainer, shareButton);
        console.log('[ChatGPT] Export button injected before Share button');
      } else {
        // Fallback: look for conversation-header-actions and append
        const headerActions = document.getElementById('conversation-header-actions');
        if (headerActions) {
          headerActions.insertBefore(buttonContainer, headerActions.firstChild);
          console.log('[ChatGPT] Export button injected into header actions (fallback)');
        } else {
          // Last resort: append to header
          const headerRightSection = header.querySelector('.flex.items-center:last-child');
          if (headerRightSection) {
            headerRightSection.insertBefore(buttonContainer, headerRightSection.firstChild);
            console.log('[ChatGPT] Export button injected into header (last resort)');
          } else {
            console.warn('[ChatGPT] Could not find insertion point. Retrying in 2s...');
            setTimeout(injectExportButton, 2000);
            return;
          }
        }
      }
    }

    async function showNotebookListModal(messages: Array<{ role: 'user' | 'assistant'; content: string }>, conversationTitle: string) {
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
        background: #212121;
        color: #ececf1;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      `;
      loadingModal.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style="animation: spin 1s linear infinite;">
            <circle cx="20" cy="20" r="16" stroke="#10a37f" stroke-width="4" stroke-dasharray="25 15" fill="none"/>
          </svg>
          <p style="font-size: 16px; margin: 0; color: #ececf1;">Loading notebooks...</p>
        </div>
      `;

      loadingOverlay.appendChild(loadingModal);
      document.body.appendChild(loadingOverlay);

      try {
        console.log('[ChatGPT] Requesting notebooks from background...');

        // Request notebooks from background script
        const response = await chrome.runtime.sendMessage({ type: 'GET_NOTEBOOKS' });

        console.log('[ChatGPT] Received response:', response);

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
        console.log('[ChatGPT] Got', notebooks.length, 'notebooks');

        if (notebooks.length === 0) {
          alert('No notebooks found. Please create a notebook first in NotebookLM.');
          return;
        }

        // Show notebook selection modal
        showNotebookSelectionUI(notebooks, messages, conversationTitle);
      } catch (error) {
        console.error('[ChatGPT] Failed to load notebooks:', error);

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
      messages: Array<{ role: 'user' | 'assistant'; content: string }>,
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
        background: #212121;
        color: #ececf1;
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
          border: 1.5px solid #565869;
          border-radius: 8px;
          background: #2f2f2f;
          cursor: pointer;
          text-align: left;
          margin-bottom: 12px;
          transition: all 0.2s;
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px; flex-shrink: 0;">📔</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #ececf1;">
                ${notebook.title}
              </div>
              <div style="font-size: 13px; color: #c5c5d2;">
                ${notebook.sourceCount} sources · ${notebook.lastModified}
              </div>
            </div>
          </div>
        </button>
      `).join('');

      modal.innerHTML = `
        <div style="padding: 24px; border-bottom: 1px solid #4d4d4f;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px 0; color: #ececf1;">
            Select Notebook
          </h2>
          <p style="font-size: 14px; color: #c5c5d2; margin: 0;">
            Choose a notebook to add this conversation
          </p>
        </div>

        <div style="padding: 16px 24px; border-bottom: 1px solid #4d4d4f;">
          <input type="text" id="notebook-search" placeholder="Search notebooks..." style="
            width: 100%;
            padding: 10px 12px;
            background: #2f2f2f;
            border: 1.5px solid #565869;
            border-radius: 8px;
            color: #ececf1;
            font-size: 14px;
            outline: none;
          ">
        </div>

        <div style="padding: 24px; flex: 1; overflow-y: auto; max-height: 400px;">
          ${notebookListHTML}
        </div>

        <div style="padding: 16px 24px; border-top: 1px solid #4d4d4f; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; color: #c5c5d2;">
            ${notebooks.length} notebook${notebooks.length !== 1 ? 's' : ''} found
          </span>
          <button class="snlm-modal-cancel" style="
            padding: 10px 20px;
            background: transparent;
            border: none;
            color: #c5c5d2;
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
          (item as HTMLElement).style.borderColor = '#10a37f';
          (item as HTMLElement).style.background = '#3c3c3c';
        });
        item.addEventListener('mouseleave', () => {
          (item as HTMLElement).style.borderColor = '#565869';
          (item as HTMLElement).style.background = '#2f2f2f';
        });

        // Handle notebook selection
        item.addEventListener('click', async () => {
          const notebookId = (item as HTMLElement).getAttribute('data-notebook-id');
          const notebookTitle = notebooks.find(n => n.id === notebookId)?.title || 'Unknown';

          document.body.removeChild(overlay);

          // Format conversation and send to background
          const formatted = formatConversation(messages, conversationTitle, window.location.href);

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
              console.log('[ChatGPT] Successfully initiated add to existing notebook');
            } else {
              throw new Error(response.error);
            }
          } catch (error) {
            console.error('[ChatGPT] Failed to add to existing notebook:', error);
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

    async function showNotebookSelectionModal() {
      // Close dropdown
      const dropdown = document.querySelector('.snlm-dropdown') as HTMLElement;
      if (dropdown) {
        dropdown.classList.add('hidden');
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
        background: #212121;
        color: #ececf1;
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
        <div style="padding: 24px; border-bottom: 1px solid #4d4d4f;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px 0; color: #ececf1;">
            Export to NotebookLM
          </h2>
          <p style="font-size: 14px; color: #c5c5d2; margin: 0;">
            Choose where to add this conversation
          </p>
        </div>

        <div style="padding: 24px; flex: 1; overflow-y: auto;">
          <button class="snlm-modal-option" data-action="new" style="
            width: 100%;
            padding: 16px;
            border: 1.5px solid #565869;
            border-radius: 8px;
            background: #2f2f2f;
            cursor: pointer;
            text-align: left;
            margin-bottom: 12px;
            transition: all 0.2s;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ececf1" style="flex-shrink: 0;">
                <path d="M12 5V19M5 12H19" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <div>
                <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #ececf1;">
                  Create New Notebook
                </div>
                <div style="font-size: 13px; color: #c5c5d2;">
                  Start a fresh notebook with this conversation
                </div>
              </div>
            </div>
          </button>

          <button class="snlm-modal-option" data-action="existing" style="
            width: 100%;
            padding: 16px;
            border: 1.5px solid #565869;
            border-radius: 8px;
            background: #2f2f2f;
            cursor: pointer;
            text-align: left;
            transition: all 0.2s;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ececf1" style="flex-shrink: 0;">
                <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <div>
                <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #ececf1;">
                  Add to Existing Notebook
                </div>
                <div style="font-size: 13px; color: #c5c5d2;">
                  Choose from your notebooks
                </div>
              </div>
            </div>
          </button>
        </div>

        <div style="padding: 16px 24px; border-top: 1px solid #4d4d4f; display: flex; justify-content: flex-end;">
          <button class="snlm-modal-cancel" style="
            padding: 10px 20px;
            background: transparent;
            border: none;
            color: #c5c5d2;
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
          (option as HTMLElement).style.borderColor = '#10a37f';
          (option as HTMLElement).style.background = '#3c3c3c';
        });
        option.addEventListener('mouseleave', () => {
          (option as HTMLElement).style.borderColor = '#565869';
          (option as HTMLElement).style.background = '#2f2f2f';
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

    async function handleExportClick(exportType: 'notebooklm' | 'markdown' | 'pdf') {
      const buttonContainer = document.querySelector('.snlm-export-btn') as HTMLElement;
      const button = buttonContainer?.querySelector('button') as HTMLButtonElement;
      
      // Close dropdown
      const dropdown = buttonContainer?.querySelector('.snlm-dropdown');
      dropdown?.classList.add('hidden');
      if (isExporting) return;

      isExporting = true;
      button.disabled = true;
      button.style.opacity = '0.8';
      button.innerHTML = `
        <div class="flex w-full items-center justify-center gap-1.5">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="animation: spin 1s linear infinite;" class="icon">
            <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" stroke-dasharray="10 5" fill="none"/>
          </svg>
          Exporting...
        </div>
      `;

      // Add spin animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);

      try {
        // Scrape conversation
        const messages = scrapeConversation();
        if (messages.length === 0) {
          throw new Error('No conversation found to export');
        }

        const title = extractConversationTitle();
        const formatted = formatConversation(messages, title, window.location.href);

        console.log('[ChatGPT] Export request:', {
          type: exportType,
          title,
          messageCount: messages.length,
          textLength: formatted.length,
        });

        // Handle different export types
        let exportSuccess = false;
        let errorMessage: string | undefined;
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
          try {
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
              exportSuccess = false;
              errorMessage = response?.error || 'Export failed';
              throw new Error(errorMessage);
            }
          } catch (err) {
            if (err instanceof Error && err.message.includes('Extension context invalidated')) {
              throw err; // Re-throw to be caught by outer catch
            }
            exportSuccess = false;
            errorMessage = err instanceof Error ? err.message : 'Export failed';
            throw new Error(errorMessage);
          }
        }

        // Save to IndexedDB via background script
        try {
          chrome.runtime.sendMessage({
            type: 'SAVE_EXPORT_HISTORY',
            data: {
              title,
              exportType,
              sourceUrl: window.location.href,
              timestamp: Date.now(),
              messageCount: messages.length,
              contentLength: formatted.length,
              success: exportSuccess,
              errorMessage,
              metadata: {
                fileName: fileName || `${title}.${exportType === 'markdown' ? 'md' : 'pdf'}`,
              },
            },
          }).catch((err) => {
            console.error('[ChatGPT] Failed to send export history to background:', err);
          });
        } catch (dbError) {
          console.error('[ChatGPT] Failed to save export history:', dbError);
          // Don't fail the export if IndexedDB fails
        }
      } catch (error) {
        console.error('[ChatGPT] Export failed:', error);
        
        // Check if extension context was invalidated (extension reload)
        if (error instanceof Error && error.message.includes('Extension context invalidated')) {
          showExtensionReloadError(button);
          return;
        }
        
        showErrorState(button);

        // Save failed export to IndexedDB via background script
        try {
          const messages = scrapeConversation();
          const title = extractConversationTitle();
          const formatted = formatConversation(messages, title, window.location.href);

          chrome.runtime.sendMessage({
            type: 'SAVE_EXPORT_HISTORY',
            data: {
              title,
              exportType,
              sourceUrl: window.location.href,
              timestamp: Date.now(),
              messageCount: messages.length,
              contentLength: formatted.length,
              success: false,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          }).catch((err) => {
            console.error('[ChatGPT] Failed to send failed export to background:', err);
          });
        } catch (dbError) {
          console.error('[ChatGPT] Failed to save failed export to history:', dbError);
        }
      }
    }

    function showSuccessState(button: HTMLButtonElement, message: string) {
      button.innerHTML = `
        <div class="flex w-full items-center justify-center gap-1.5" style="color: #22c55e;">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="icon">
            <path d="M4 10L8 14L16 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          ${message}
        </div>
      `;

      setTimeout(() => {
        resetButton(button);
      }, 3000);
    }

    function showErrorState(button: HTMLButtonElement) {
      button.innerHTML = `
        <div class="flex w-full items-center justify-center gap-1.5" style="color: #ef4444;">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="icon">
            <path d="M10 6V11M10 13V13.5M10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10C18 14.4183 14.4183 18 10 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Failed
        </div>
      `;

      setTimeout(() => {
        resetButton(button);
      }, 3000);
    }

    function showExtensionReloadError(button: HTMLButtonElement) {
      button.innerHTML = `
        <div class="flex w-full items-center justify-center gap-1.5" style="color: #f59e0b;">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="icon">
            <path d="M4 10C4 6.68629 6.68629 4 10 4C13.3137 4 16 6.68629 16 10C16 13.3137 13.3137 16 10 16M4 10L2 8M4 10L6 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Reload Page
        </div>
      `;

      // Show alert to user
      button.title = 'Extension was reloaded. Please refresh this page (Ctrl+R) to use the button again.';
      
      // Make button clickable to reload page
      button.onclick = () => {
        window.location.reload();
      };
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
      console.log('[ChatGPT] Downloaded as Markdown:', fileName);
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
      
      console.log('[ChatGPT] Opened PDF print dialog');
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

    function resetButton(button: HTMLButtonElement) {
      isExporting = false;
      button.disabled = false;
      button.style.opacity = '1';
      button.className = 'btn relative btn-ghost text-token-text-primary';
      button.innerHTML = `
        <div class="flex w-full items-center justify-center gap-1.5">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
            <path d="M10 3L10 13M10 3L13 6M10 3L7 6M3 13L3 17L17 17L17 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          SuperNotebookLM
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="ml-1">
            <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>
      `;
    }

    function scrapeConversation(): Array<{ role: 'user' | 'assistant'; content: string }> {
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      // Find conversation container
      const container =
        document.querySelector(SELECTORS.conversationContainer.v3) ||
        document.querySelector(SELECTORS.conversationContainer.v2) ||
        document.querySelector(SELECTORS.conversationContainer.v1);

      if (!container) {
        console.warn('[ChatGPT] Conversation container not found');
        throw new Error('Conversation container not found');
      }

      // Find all user messages
      const userMessages = Array.from(
        container.querySelectorAll(
          `${SELECTORS.userMessages.v3}, ${SELECTORS.userMessages.v2}`
        )
      );

      // Find all assistant messages
      const assistantMessages = Array.from(
        container.querySelectorAll(
          `${SELECTORS.assistantMessages.v3}, ${SELECTORS.assistantMessages.v2}`
        )
      );

      console.log('[ChatGPT] Found', userMessages.length, 'user messages and', assistantMessages.length, 'assistant messages');

      // Create a map of all messages with their DOM order
      const allMessages: Array<{ element: Element; role: 'user' | 'assistant' }> = [];
      
      userMessages.forEach(el => allMessages.push({ element: el, role: 'user' }));
      assistantMessages.forEach(el => allMessages.push({ element: el, role: 'assistant' }));

      // Sort by DOM order
      allMessages.sort((a, b) => {
        const position = a.element.compareDocumentPosition(b.element);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
          return -1;
        } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
          return 1;
        }
        return 0;
      });

      // Extract content from sorted messages
      for (const { element, role } of allMessages) {
        try {
          // For user messages, look inside the bubble
          let content = '';
          if (role === 'user') {
            const textElement = element.querySelector('.whitespace-pre-wrap') || element;
            content = textElement.textContent?.trim() || '';
          } else {
            // For assistant messages, get all text content
            content = element.textContent?.trim() || '';
          }

          if (content) {
            messages.push({ role, content });
          }
        } catch (error) {
          console.warn('[ChatGPT] Failed to parse message:', error);
        }
      }

      console.log('[ChatGPT] Scraped', messages.length, 'messages');
      return messages;
    }

    function extractConversationTitle(): string {
      // Try to get title from document title
      const documentTitle = document.title;
      
      // Remove "ChatGPT" or "New chat" prefix
      let cleanTitle = documentTitle
        .replace(/^ChatGPT\s*[-–—]\s*/i, '')
        .replace(/^New chat\s*[-–—]\s*/i, '')
        .replace(/\s*[-–—]\s*ChatGPT$/i, '')
        .trim();

      // If title is generic or empty, use first user message
      if (!cleanTitle || cleanTitle.toLowerCase() === 'new chat' || cleanTitle.toLowerCase() === 'chatgpt') {
        const container =
          document.querySelector(SELECTORS.conversationContainer.v3) ||
          document.querySelector(SELECTORS.conversationContainer.v2);
        
        if (container) {
          const firstUserMessage = 
            container.querySelector(SELECTORS.userMessages.v3) ||
            container.querySelector(SELECTORS.userMessages.v2);
          if (firstUserMessage) {
            const text = firstUserMessage.textContent?.trim() || '';
            cleanTitle = text.substring(0, 80) + (text.length > 80 ? '...' : '');
          }
        }
      }

      // Final fallback
      if (!cleanTitle) {
        cleanTitle = `ChatGPT Conversation - ${new Date().toLocaleDateString()}`;
      }

      // Sanitize title: remove special characters, limit length
      cleanTitle = cleanTitle
        .replace(/[<>:"/\\|?*]/g, '')
        .substring(0, 100);

      return cleanTitle;
    }

    function formatConversation(
      messages: Array<{ role: 'user' | 'assistant'; content: string }>,
      title: string,
      url: string
    ): string {
      let formatted = `# ${title}\n\n`;
      formatted += `**Source:** ${url}\n`;
      formatted += `**Exported:** ${new Date().toLocaleString()}\n`;
      formatted += `**Platform:** ChatGPT\n\n`;
      formatted += `---\n\n`;

      for (const msg of messages) {
        const label = msg.role === 'user' ? '**User:**' : '**Assistant:**';
        formatted += `${label}\n${msg.content}\n\n`;
      }

      return formatted;
    }
  },
});

const CAPTURE_SETTINGS_KEY = 'captureSettings';
