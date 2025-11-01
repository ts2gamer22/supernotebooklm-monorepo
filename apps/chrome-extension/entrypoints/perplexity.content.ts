/**
 * Perplexity Content Script
 * Injects "Add to NotebookLM" button and handles search export with cited sources
 */

import { formatPerplexityConversation, type Source } from '../src/lib/formatConversation';

export default defineContentScript({
  matches: ['https://www.perplexity.ai/*'],
  main() {
    console.log('SuperNotebookLM: Perplexity import enabled');

    // Real selectors from Perplexity.ai DOM (as of Oct 2025)
    const SELECTORS = {
      // Button injection location - between export and share buttons
      headerControls: {
        v3: 'div.gap-x-sm.pointer-events-auto.relative.flex.items-center.justify-end',
        v2: 'div[class*="pointer-events-auto"][class*="justify-end"]',
        v1: 'header div',
      },
      shareButton: {
        v3: 'button[data-testid="share-button"]',
        v2: 'button:has-text("Share")',
        v1: 'button',
      },
      // Query text
      query: {
        v3: 'span[data-lexical-text="true"]',
        v2: 'p[dir="auto"] span',
        v1: 'textarea[placeholder*="Ask"]',
      },
      // Answer container with markdown content
      answer: {
        v3: 'div[data-cplx-component="message-block-answer"]',
        v2: 'div[id^="markdown-content"]',
        v3_fallback: 'div.prose',
      },
      // Full answer structure
      answerWrapper: {
        v3: 'div.gap-y-lg.flex.flex-col.first\\:mt-0',
        v2: 'div[class*="gap-y-lg"]',
        v1: 'main > div',
      },
      // Citation badges/sources
      citations: {
        v3: 'span.citation',
        v2: 'a[class*="citation"]',
        v1: 'sup a',
      },
      // Source links
      sourceLinks: {
        v3: 'a[rel="noopener"][target="_blank"]',
        v2: 'a[href^="http"]',
        v1: 'cite a',
      },
    };

    let isExporting = false;

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
        if (captureSettings.perplexity !== false) {
          injectExportButton();
        }
      });

      // Listen for settings changes to show/hide button
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[CAPTURE_SETTINGS_KEY]) {
          const captureSettings = changes[CAPTURE_SETTINGS_KEY].newValue || {};
          const button = document.querySelector('.snlm-export-btn-perplexity');
          
          if (captureSettings.perplexity !== false && !button) {
            injectExportButton();
          } else if (captureSettings.perplexity === false && button) {
            button.remove();
          }
        }
      });
    }

    function injectExportButton() {
      // Find header controls container (with share button)
      const headerControls =
        document.querySelector(SELECTORS.headerControls.v3) ||
        document.querySelector(SELECTORS.headerControls.v2) ||
        document.querySelector(SELECTORS.headerControls.v1);

      if (!headerControls) {
        console.warn('[Perplexity] Header controls not found. Retrying in 2s...');
        setTimeout(injectExportButton, 2000);
        return;
      }

      // Check if button already exists
      if (document.querySelector('.snlm-export-btn-perplexity')) {
        return;
      }

      // Find share button to insert before it
      const shareButton = headerControls.querySelector(SELECTORS.shareButton.v3) ||
                          headerControls.querySelector(SELECTORS.shareButton.v2);

      // Create button container with dropdown
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'snlm-export-btn-perplexity';
      buttonContainer.style.cssText = 'position: relative; margin-right: 8px;';
      
      // Main button styled to match Perplexity's design
      const button = document.createElement('button');
      button.className = 'snlm-main-btn';
      button.type = 'button';
      button.setAttribute('aria-label', 'SuperNotebookLM export options');
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="display: inline-block; margin-right: 6px;">
          <path d="M8 1L8 11M8 1L11 4M8 1L5 4M2 11L2 14L14 14L14 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="text-box-trim-both" style="margin-right: 4px;">NotebookLM</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
          <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      `;
      
      // Match Perplexity's button styling (subtle gray button)
      button.style.cssText = `
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        padding: 0 12px;
        height: 32px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.05);
        color: inherit;
        border: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        transition: all 0.2s ease;
      `;

      // Dropdown menu with Perplexity's dark theme
      const dropdown = document.createElement('div');
      dropdown.className = 'snlm-dropdown';
      dropdown.style.cssText = `
        position: absolute;
        right: 0;
        top: calc(100% + 4px);
        min-width: 240px;
        background: #202222;
        color: #ececf1;
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
            color: #ececf1;
            cursor: pointer;
            text-align: left;
            transition: background 0.15s ease;
          ">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style="flex-shrink: 0;">
              <path d="M8 1L8 11M8 1L11 4M8 1L5 4M2 11L2 14L14 14L14 11" stroke="#ececf1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 500; margin-bottom: 2px;">Export to NotebookLM</div>
              <div style="font-size: 11px; color: #a0a0a0;">Open in new tab</div>
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
            color: #ececf1;
            cursor: pointer;
            text-align: left;
            transition: background 0.15s ease;
          ">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#ececf1" style="flex-shrink: 0;">
              <path d="M6 2L6 5M14 2L14 5M3 8H17M4 4H16C16.5523 4 17 4.44772 17 5V17C17 17.5523 16.5523 18 16 18H4C3.44772 18 3 17.5523 3 17V5C3 4.44772 3.44772 4 4 4Z" stroke-width="1.5" stroke-linecap="round"/>
              <text x="10" y="14" font-size="5" fill="#ececf1" text-anchor="middle" font-weight="bold">MD</text>
            </svg>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 500; margin-bottom: 2px;">Download Markdown</div>
              <div style="font-size: 11px; color: #a0a0a0;">Save as .md file</div>
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
            color: #ececf1;
            cursor: pointer;
            text-align: left;
            transition: background 0.15s ease;
          ">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#ececf1" style="flex-shrink: 0;">
              <path d="M6 2L6 18M6 2H10L14 6V18H6M10 2V6H14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 500; margin-bottom: 2px;">Download PDF</div>
              <div style="font-size: 11px; color: #a0a0a0;">Save as .pdf file</div>
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
        
        // Add hover effect (dark theme)
        itemEl.addEventListener('mouseenter', () => {
          itemEl.style.background = '#2d2f2f';
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

      // Insert before share button container
      if (shareButton && shareButton.parentElement) {
        shareButton.parentElement.parentElement?.insertBefore(buttonContainer, shareButton.parentElement);
      } else {
        headerControls.appendChild(buttonContainer);
      }

      console.log('[Perplexity] Export button injected successfully');
    }

    async function showNotebookSelectionModal() {
      // Close dropdown
      const dropdown = document.querySelector('.snlm-dropdown') as HTMLElement;
      if (dropdown) {
        dropdown.style.display = 'none';
      }

      // Scrape search first to check if there's content
      const { query, answer } = scrapeSearch();
      if (!query || !answer) {
        alert('No search results found to export');
        return;
      }

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

      // Create modal with Perplexity dark theme
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: #202222;
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
        <div style="padding: 24px; border-bottom: 1px solid #3d3d3d;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px 0; color: #ececf1;">
            Export to NotebookLM
          </h2>
          <p style="font-size: 14px; color: #a0a0a0; margin: 0;">
            Choose where to add this search
          </p>
        </div>

        <div style="padding: 24px; flex: 1; overflow-y: auto;">
          <button class="snlm-modal-option" data-action="new" style="
            width: 100%;
            padding: 16px;
            border: 1.5px solid #3d3d3d;
            border-radius: 8px;
            background: #2d2f2f;
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
                <div style="font-size: 13px; color: #a0a0a0;">
                  Start a fresh notebook with this search
                </div>
              </div>
            </div>
          </button>

          <button class="snlm-modal-option" data-action="existing" style="
            width: 100%;
            padding: 16px;
            border: 1.5px solid #3d3d3d;
            border-radius: 8px;
            background: #2d2f2f;
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
                <div style="font-size: 13px; color: #a0a0a0;">
                  Choose from your notebooks
                </div>
              </div>
            </div>
          </button>
        </div>

        <div style="padding: 16px 24px; border-top: 1px solid #3d3d3d; display: flex; justify-content: flex-end;">
          <button class="snlm-modal-cancel" style="
            padding: 10px 20px;
            background: transparent;
            border: none;
            color: #a0a0a0;
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
          (option as HTMLElement).style.borderColor = '#20b8cd';
          (option as HTMLElement).style.background = '#3a3c3c';
        });
        option.addEventListener('mouseleave', () => {
          (option as HTMLElement).style.borderColor = '#3d3d3d';
          (option as HTMLElement).style.background = '#2d2f2f';
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
        const { query, answer, sources } = scrapeSearch();
        const title = `Perplexity: ${query.substring(0, 60)}${query.length > 60 ? '...' : ''}`;
        const formatted = formatPerplexityConversation(query, answer, sources, window.location.href);
        await showNotebookListModal(formatted, title);
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

    async function showNotebookListModal(formattedText: string, title: string) {
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
        background: #202222;
        color: #ececf1;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      `;
      loadingModal.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style="animation: spin 1s linear infinite;">
            <circle cx="20" cy="20" r="16" stroke="#20b8cd" stroke-width="4" stroke-dasharray="25 15" fill="none"/>
          </svg>
          <p style="font-size: 16px; margin: 0; color: #ececf1;">Loading notebooks...</p>
        </div>
      `;

      loadingOverlay.appendChild(loadingModal);
      document.body.appendChild(loadingOverlay);

      try {
        console.log('[Perplexity] Requesting notebooks from background...');

        // Request notebooks from background script
        const response = await chrome.runtime.sendMessage({ type: 'GET_NOTEBOOKS' });

        console.log('[Perplexity] Received response:', response);

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
        console.log('[Perplexity] Got', notebooks.length, 'notebooks');

        if (notebooks.length === 0) {
          alert('No notebooks found. Please create a notebook first in NotebookLM.');
          return;
        }

        // Show notebook selection modal
        showNotebookSelectionUI(notebooks, formattedText, title);
      } catch (error) {
        console.error('[Perplexity] Failed to load notebooks:', error);

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
      formattedText: string,
      title: string
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
        background: #202222;
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
          border: 1.5px solid #3d3d3d;
          border-radius: 8px;
          background: #2d2f2f;
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
              <div style="font-size: 13px; color: #a0a0a0;">
                ${notebook.sourceCount} sources · ${notebook.lastModified}
              </div>
            </div>
          </div>
        </button>
      `).join('');

      modal.innerHTML = `
        <div style="padding: 24px; border-bottom: 1px solid #3d3d3d;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px 0; color: #ececf1;">
            Select Notebook
          </h2>
          <p style="font-size: 14px; color: #a0a0a0; margin: 0;">
            Choose a notebook to add this search
          </p>
        </div>

        <div style="padding: 16px 24px; border-bottom: 1px solid #3d3d3d;">
          <input type="text" id="notebook-search" placeholder="Search notebooks..." style="
            width: 100%;
            padding: 10px 12px;
            background: #2d2f2f;
            border: 1.5px solid #3d3d3d;
            border-radius: 8px;
            color: #ececf1;
            font-size: 14px;
            outline: none;
          ">
        </div>

        <div style="padding: 24px; flex: 1; overflow-y: auto; max-height: 400px;">
          ${notebookListHTML}
        </div>

        <div style="padding: 16px 24px; border-top: 1px solid #3d3d3d; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; color: #a0a0a0;">
            ${notebooks.length} notebook${notebooks.length !== 1 ? 's' : ''} found
          </span>
          <button class="snlm-modal-cancel" style="
            padding: 10px 20px;
            background: transparent;
            border: none;
            color: #a0a0a0;
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
          (item as HTMLElement).style.borderColor = '#20b8cd';
          (item as HTMLElement).style.background = '#3a3c3c';
        });
        item.addEventListener('mouseleave', () => {
          (item as HTMLElement).style.borderColor = '#3d3d3d';
          (item as HTMLElement).style.background = '#2d2f2f';
        });

        // Handle notebook selection
        item.addEventListener('click', async () => {
          const notebookId = (item as HTMLElement).getAttribute('data-notebook-id');
          const notebookTitle = notebooks.find(n => n.id === notebookId)?.title || 'Unknown';

          document.body.removeChild(overlay);

          try {
            const response = await chrome.runtime.sendMessage({
              type: 'ADD_TO_EXISTING_NOTEBOOK',
              data: {
                notebookId,
                formattedText,
                title,
                sourceUrl: window.location.href,
              },
            });

            if (response.success) {
              console.log('[Perplexity] Successfully initiated add to existing notebook');
            } else {
              throw new Error(response.error);
            }
          } catch (error) {
            console.error('[Perplexity] Failed to add to existing notebook:', error);
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
      const buttonContainer = document.querySelector('.snlm-export-btn-perplexity') as HTMLElement;
      const button = buttonContainer?.querySelector('.snlm-main-btn') as HTMLButtonElement;
      
      if (!button || isExporting) return;

      isExporting = true;
      button.disabled = true;
      button.style.opacity = '0.8';
      
      // Show loading state
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="display: inline-block; margin-right: 6px; animation: spin 1s linear infinite;">
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
        // Scrape search data
        const { query, answer, sources } = scrapeSearch();
        
        if (!query || !answer) {
          throw new Error('No search results found to export');
        }

        const title = `Perplexity: ${query.substring(0, 60)}${query.length > 60 ? '...' : ''}`;
        const formatted = formatPerplexityConversation(query, answer, sources, window.location.href);

        console.log('[Perplexity] Export request:', {
          type: exportType,
          query,
          answerLength: answer.length,
          sourcesCount: sources.length,
        });

        let exportSuccess = false;

        if (exportType === 'markdown') {
          downloadAsMarkdown(formatted, title);
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
              title,
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
        console.error('[Perplexity] Export failed:', error);
        showErrorState(button);
      }
    }

    function showSuccessState(button: HTMLButtonElement, message: string) {
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="display: inline-block; margin-right: 6px;">
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
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="display: inline-block; margin-right: 6px;">
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
      // Remove any inline background styles to revert to default Perplexity button style
      button.style.background = '';
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="display: inline-block; margin-right: 6px;">
          <path d="M8 1L8 11M8 1L11 4M8 1L5 4M2 11L2 14L14 14L14 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="text-box-trim-both" style="margin-right: 4px;">NotebookLM</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
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
      console.log('[Perplexity] Downloaded as Markdown:', fileName);
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
      
      console.log('[Perplexity] Opened PDF print dialog');
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

    function scrapeSearch(): { query: string; answer: string; sources: Source[] } {
      let query = '';
      let answer = '';
      const sources: Source[] = [];

      // Extract query - look for span with data-lexical-text="true"
      const queryElement =
        document.querySelector(SELECTORS.query.v3) ||
        document.querySelector(SELECTORS.query.v2);

      if (queryElement) {
        query = queryElement.textContent?.trim() || '';
      }

      // Fallback: check textarea or page title
      if (!query) {
        const textarea = document.querySelector(SELECTORS.query.v1) as HTMLTextAreaElement;
        if (textarea) {
          query = textarea.value || textarea.placeholder || '';
        }
      }

      // Fallback: extract from document title
      if (!query) {
        const title = document.title;
        if (title && title !== 'Perplexity') {
          query = title.replace(/\s*-\s*Perplexity$/, '').trim();
        }
      }

      // Extract answer from markdown content container
      const answerContainer =
        document.querySelector(SELECTORS.answer.v3) ||
        document.querySelector(SELECTORS.answer.v2) ||
        document.querySelector(SELECTORS.answer.v3_fallback);

      if (answerContainer) {
        // Get text content, preserving structure
        // Remove citation badges but keep the text
        const clonedContainer = answerContainer.cloneNode(true) as Element;
        
        // Remove citation badge elements (small superscript numbers)
        const citationBadges = clonedContainer.querySelectorAll('span.citation, span[class*="citation"]');
        citationBadges.forEach(badge => {
          // Keep the citation number in brackets
          const text = badge.textContent?.trim() || '';
          if (text) {
            badge.replaceWith(document.createTextNode(` [${text}]`));
          } else {
            badge.remove();
          }
        });
        
        answer = clonedContainer.textContent?.trim() || '';
      }

      // Fallback: try answer wrapper
      if (!answer || answer.length < 50) {
        const answerWrapper = document.querySelector(SELECTORS.answerWrapper.v3) ||
                              document.querySelector(SELECTORS.answerWrapper.v2);
        if (answerWrapper) {
          answer = answerWrapper.textContent?.trim() || '';
        }
      }

      // Extract sources from citation links
      const sourceLinks = Array.from(
        document.querySelectorAll(SELECTORS.sourceLinks.v3) ||
        document.querySelectorAll(SELECTORS.sourceLinks.v2) ||
        []
      );

      // Deduplicate sources by URL
      const seenUrls = new Set<string>();
      
      for (const link of sourceLinks) {
        try {
          const href = link.getAttribute('href');
          const title = link.textContent?.trim() || link.getAttribute('aria-label') || '';
          
          if (href && href.startsWith('http') && !seenUrls.has(href)) {
            // Skip internal Perplexity links
            if (!href.includes('perplexity.ai')) {
              seenUrls.add(href);
              sources.push({
                title: title || new URL(href).hostname,
                url: href,
                snippet: '',
              });
            }
          }
        } catch (error) {
          // Skip invalid URLs
        }
      }

      console.log('[Perplexity] Scraped:', {
        query: query.substring(0, 50),
        answerLength: answer.length,
        sourcesCount: sources.length,
      });

      return { query, answer, sources };
    }
  },
});

const CAPTURE_SETTINGS_KEY = 'captureSettings';
