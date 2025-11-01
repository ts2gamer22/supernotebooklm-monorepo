/**
 * NotebookLM Content Script
 * Auto-saves Q&A interactions from NotebookLM to IndexedDB
 */

export default defineContentScript({
  matches: ['https://notebooklm.google.com/*'],
  main() {
    console.log('SuperNotebookLM: Auto-save content script loaded for NotebookLM');

    // Versioned selectors for resilience against UI changes
    // These selectors target NotebookLM's chat UI elements
    // TESTED AND VERIFIED: January 2025
    const SELECTORS = {
      // User question element (separate from answer in DOM)
      question: {
        v3: 'div[role="heading"][aria-level="3"] p',  // Current (Jan 2025) - TESTED ✓
        v2: '[role="heading"][aria-level="3"]',       // Fallback 1 - attribute-based
        v1: 'div[role="heading"]',                     // Fallback 2 - generic
      },
      // AI answer element (appears as chat-message)
      answer: {
        v3: 'chat-message.individual-message .message-text-content',  // Current (Jan 2025) - TESTED ✓
        v2: 'chat-message .mat-body-medium',                          // Fallback 1 - class-based
        v1: 'chat-message',                                           // Fallback 2 - element only
      },
      // Notebook title input field
      notebookTitle: {
        v3: 'input.title-input.mat-title-large',      // Current (Jan 2025) - TESTED ✓
        v2: 'input.title-input',                       // Fallback 1
        v1: 'input[class*="title"]',                   // Fallback 2 - partial match
      },
      // Audio Overview player (NEEDS MANUAL TESTING)
      audioPlayer: {
        v3: 'audio-overview-player audio',             // Guess: custom element + audio
        v2: '[data-audio-overview] audio',             // Fallback: data attribute
        v1: 'audio[src*="notebooklm"]',                // Fallback: audio with notebooklm URL
        v0: 'audio[controls]',                         // Fallback: any audio element
      },
    };

    // Track processed chats to prevent duplicates across reloads
    const processedChats = new Set<string>();
    
    // Track pending captures to avoid multiple setTimeout calls for same chat
    const pendingCaptures = new Set<string>();

    // Track processed audio to prevent duplicate downloads
    const processedAudio = new Set<string>();

    // Load previously processed chats from storage
    chrome.storage.local.get('processedChats').then((result) => {
      if (result.processedChats && Array.isArray(result.processedChats)) {
        result.processedChats.forEach((hash: string) => processedChats.add(hash));
        console.log(`[SuperNotebookLM] Loaded ${processedChats.size} previously processed chats`);
      }
    });

    // MutationObserver to detect new AI answer elements (chat-message)
    // STRATEGY: Question and answer are SEPARATE in DOM (Option B)
    // We watch for new chat-message elements, then find the latest question
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            // Check if this is a chat-message element (AI answer)
            const isChatMessage =
              element.matches?.('chat-message') ||
              element.querySelector?.('chat-message');

            if (isChatMessage) {
              // New AI answer detected! 
              console.log('[SuperNotebookLM] New chat-message detected, waiting for answer to load...');
              
              // Generate a temporary ID for this chat-message element to track pending captures
              const chatElement = element.matches?.('chat-message') 
                ? element 
                : element.querySelector('chat-message');
              
              if (chatElement) {
                // Use element's position in DOM as temporary ID
                const chatId = `${chatElement.className}-${document.querySelectorAll('chat-message').length}`;
                
                // Skip if we're already waiting to capture this chat
                if (pendingCaptures.has(chatId)) {
                  console.log('[SuperNotebookLM] Already pending capture for this chat, skipping');
                  return;
                }

                pendingCaptures.add(chatId);

                // Smart polling: Check every 1 second for up to 10 seconds until answer is ready
                let attempts = 0;
                const maxAttempts = 10;
                const pollInterval = setInterval(() => {
                  attempts++;

                  // Try to find the answer
                  const answer = extractLatestAnswer();

                  if (answer && answer.length > 50) {
                    // Answer found and has substantial content (not just loading text)
                    clearInterval(pollInterval);
                    pendingCaptures.delete(chatId);
                    console.log(`[SuperNotebookLM] Answer ready after ${attempts} attempts (${attempts}s)`);
                    captureChat();
                  } else if (attempts >= maxAttempts) {
                    // Max attempts reached, try to capture anyway
                    clearInterval(pollInterval);
                    pendingCaptures.delete(chatId);
                    console.log(`[SuperNotebookLM] Max polling attempts reached (${maxAttempts}s), attempting capture`);
                    captureChat();
                  } else {
                    console.log(`[SuperNotebookLM] Polling attempt ${attempts}/${maxAttempts} - answer not ready yet`);
                  }
                }, 1000);
              }
            }

            // Check for audio player elements
            const isAudioPlayer =
              element.matches?.('audio') ||
              element.querySelector?.('audio');

            if (isAudioPlayer) {
              console.log('[SuperNotebookLM] Audio element detected, checking for Audio Overview...');
              detectAudioPlayer();
            }
          }
        }
      }
    });

    // Start observing the document body for chat messages
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log('SuperNotebookLM: MutationObserver started, watching for chat-message elements');

    /**
     * Extract the LATEST question from the DOM
     * Returns the most recent user question
     */
    function extractLatestQuestion(): string | null {
      const selectors = [
        SELECTORS.question.v3,
        SELECTORS.question.v2,
        SELECTORS.question.v1,
      ];

      for (const selector of selectors) {
        // Get ALL questions, then take the LAST one (most recent)
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const lastQuestion = elements[elements.length - 1];
          const text = lastQuestion.textContent?.trim();
          if (text) {
            console.log(`[SuperNotebookLM] Question found using selector: ${selector}`);
            return text;
          }
        }
      }

      console.warn('[SuperNotebookLM] Could not find question with any selector');
      return null;
    }

    /**
     * Extract the LATEST answer from the DOM
     * Returns the most recent AI response
     */
    function extractLatestAnswer(): string | null {
      const selectors = [
        SELECTORS.answer.v3,
        SELECTORS.answer.v2,
        SELECTORS.answer.v1,
      ];

      for (const selector of selectors) {
        // Get ALL answers, then take the LAST one (most recent)
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const lastAnswer = elements[elements.length - 1];
          const text = lastAnswer.textContent?.trim();
          if (text) {
            console.log(`[SuperNotebookLM] Answer found using selector: ${selector}`);
            return text;
          }
        }
      }

      console.warn('[SuperNotebookLM] Could not find answer with any selector');
      return null;
    }

    /**
     * Extract notebook title from input field
     */
    function extractNotebookTitle(): string | null {
      const selectors = [
        SELECTORS.notebookTitle.v3,
        SELECTORS.notebookTitle.v2,
        SELECTORS.notebookTitle.v1,
      ];

      for (const selector of selectors) {
        const input = document.querySelector(selector) as HTMLInputElement;
        if (input && input.value) {
          return input.value.trim();
        }
      }

      return null;
    }

    /**
     * Extract notebook ID from URL or page metadata
     */
    function extractNotebookId(): string {
      // Try URL first: notebooklm.google.com/notebook/abc123
      const match = window.location.pathname.match(/\/notebook\/([^/]+)/);
      if (match) {
        return match[1];
      }

      // Fallback: check for notebook ID in page metadata or DOM
      const metaElement = document.querySelector('[data-notebook-id]');
      if (metaElement) {
        const id = metaElement.getAttribute('data-notebook-id');
        if (id) return id;
      }

      // Last resort: use unknown
      return 'unknown-notebook';
    }

    /**
     * Create a unique hash for a Q&A pair
     */
    function createChatHash(question: string, answer: string): string {
      // Simple hash: combine first 100 chars of each + length
      const q = question.substring(0, 100);
      const a = answer.substring(0, 100);
      return `${q.length}-${a.length}-${q}-${a}`;
    }

    /**
     * Capture and save a chat Q&A pair
     * Extracts the latest question and answer from the DOM
     */
    async function captureChat(): Promise<void> {
      try {
        // Extract the latest question and answer from DOM
        const question = extractLatestQuestion();
        const answer = extractLatestAnswer();

        // Validate that both question and answer exist
        if (!question || !answer) {
          console.log('[SuperNotebookLM] Skipping save: Missing question or answer');
          return;
        }

        // Create hash for this Q&A pair
        const chatHash = createChatHash(question, answer);

        // Check if we've already processed this exact chat
        if (processedChats.has(chatHash)) {
          console.log('[SuperNotebookLM] Chat already processed (duplicate), skipping save');
          return;
        }

        // Check if auto-save is enabled in settings
        const settings = await chrome.storage.local.get('captureSettings');
        if (settings.captureSettings?.notebooklm === false) {
          console.log('[SuperNotebookLM] Auto-save disabled in settings');
          return;
        }

        // Extract notebook context
        const notebookId = extractNotebookId();
        const notebookTitle = extractNotebookTitle();

        // Create chat data object
        const chatData = {
          question,
          answer,
          source: 'notebooklm',
          timestamp: Date.now(),
          notebookId,
          notebookTitle: notebookTitle || 'Untitled Notebook',
        };

        console.log('[SuperNotebookLM] Capturing chat:', {
          question: question.substring(0, 50) + '...',
          answer: answer.substring(0, 50) + '...',
          notebookId,
          notebookTitle: notebookTitle || 'Untitled',
        });

        // Mark this chat as processed BEFORE saving
        // This prevents race conditions if multiple mutations fire
        processedChats.add(chatHash);

        // Persist processed chats to storage (keep last 1000 to prevent storage bloat)
        const processedArray = Array.from(processedChats).slice(-1000);
        await chrome.storage.local.set({ processedChats: processedArray });

        // Send to background script for saving
        chrome.runtime.sendMessage(
          {
            type: 'SAVE_CHAT',
            data: chatData,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('[SuperNotebookLM] Failed to send message:', chrome.runtime.lastError);
              // Remove from processed set if save failed
              processedChats.delete(chatHash);
              return;
            }

            if (response?.success) {
              console.log('[SuperNotebookLM] Chat saved successfully');
            } else {
              console.error('[SuperNotebookLM] Failed to save chat:', response?.error);
              // Remove from processed set if save failed
              processedChats.delete(chatHash);
            }
          }
        );
      } catch (error) {
        console.error('[SuperNotebookLM] Error capturing chat:', error);
      }
    }

    /**
     * Detect Audio Overview player and inject download button
     * NOTE: Selectors need manual verification with real NotebookLM Audio Overview
     */
    async function detectAudioPlayer() {
      // Try multiple selectors to find audio element
      let audioElement: HTMLAudioElement | null = null;

      for (const selector of [
        SELECTORS.audioPlayer.v3,
        SELECTORS.audioPlayer.v2,
        SELECTORS.audioPlayer.v1,
        SELECTORS.audioPlayer.v0,
      ]) {
        audioElement = document.querySelector(selector) as HTMLAudioElement;
        if (audioElement?.src) {
          console.log(`[SuperNotebookLM] Audio found using selector: ${selector}`);
          break;
        }
      }

      if (!audioElement || !audioElement.src) {
        console.warn('[SuperNotebookLM] No audio element with src found');
        return;
      }

      const audioUrl = audioElement.src;

      // Check if already processed
      if (processedAudio.has(audioUrl)) {
        console.log('[SuperNotebookLM] Audio already processed, skipping');
        return;
      }

      processedAudio.add(audioUrl);

      console.log('[SuperNotebookLM] New Audio Overview detected:', audioUrl.substring(0, 100));

      // Check auto-download setting
      const settings = await chrome.storage.local.get('captureSettings');
      const autoDownload = settings.captureSettings?.audioOverviews === true;

      if (autoDownload) {
        // Auto-download immediately
        console.log('[SuperNotebookLM] Auto-download enabled, downloading audio...');
        await downloadAudio(audioElement);
      } else {
        // Show manual download button
        injectDownloadButton(audioElement);
      }
    }

    /**
     * Inject download button next to audio player
     */
    function injectDownloadButton(audioElement: HTMLAudioElement) {
      // Check if button already injected
      const existingButton = audioElement.parentElement?.querySelector('.snlm-download-audio-btn');
      if (existingButton) {
        return;
      }

      const button = document.createElement('button');
      button.className = 'snlm-download-audio-btn';
      button.innerHTML = '💾 Download Audio';
      button.style.cssText = `
        margin-left: 12px;
        padding: 8px 16px;
        background: #1e88e5;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
      `;

      button.onmouseover = () => {
        button.style.background = '#1565c0';
      };
      button.onmouseout = () => {
        button.style.background = '#1e88e5';
      };

      button.addEventListener('click', async () => {
        button.disabled = true;
        button.innerHTML = '⏳ Downloading...';
        button.style.background = '#666';

        try {
          await downloadAudio(audioElement);
          button.innerHTML = '✓ Saved';
          button.style.background = '#4caf50';
          setTimeout(() => button.remove(), 3000);
        } catch (error) {
          console.error('[SuperNotebookLM] Audio download failed:', error);
          button.innerHTML = '❌ Failed (see console)';
          button.style.background = '#f44336';
          button.disabled = false;
        }
      });

      // Insert button after audio element
      audioElement.parentElement?.appendChild(button);
      console.log('[SuperNotebookLM] Download button injected');
    }

    /**
     * Download audio and send to background script
     */
    async function downloadAudio(audioElement: HTMLAudioElement) {
      const audioUrl = audioElement.src;
      const title = extractNotebookTitle() || 'Untitled Notebook';
      const notebookId = extractNotebookId();

      console.log('[SuperNotebookLM] Sending audio download request to background script');

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'DOWNLOAD_AUDIO',
            data: {
              url: audioUrl,
              title: `${title} - Audio Overview`,
              notebookId,
            },
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('[SuperNotebookLM] Failed to send message:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
              return;
            }

            if (response?.success) {
              console.log('[SuperNotebookLM] Audio download successful');
              resolve(response);
            } else {
              console.error('[SuperNotebookLM] Audio download failed:', response?.error);
              reject(new Error(response?.error || 'Unknown error'));
            }
          }
        );
      });
    }

    // =============================================================================
    // SHARE TO DIRECTORY BUTTON (Story 4.2)
    // =============================================================================

    /**
     * Inject "Share to Directory" button into NotebookLM header
     * Only shows when viewing a notebook (not on homepage)
     */
    function injectShareButton() {
      // Only inject on notebook pages
      const isNotebookPage = window.location.pathname.includes('/notebook/');
      if (!isNotebookPage) {
        console.log('[SuperNotebookLM] Not on notebook page, skipping share button injection');
        return;
      }

      // Check if button already exists
      if (document.getElementById('snlm-share-button')) {
        console.log('[SuperNotebookLM] Share button already exists');
        return;
      }

      // Selectors for header (where to inject button)
      const headerSelectors = [
        'header',                                  // Generic fallback
        '[role="banner"]',                         // Semantic header
        '.notebook-header',                        // Class-based
        'div[data-testid="notebook-header"]',      // Test ID based
      ];

      let headerElement = null;
      for (const selector of headerSelectors) {
        headerElement = document.querySelector(selector);
        if (headerElement) {
          console.log(`[SuperNotebookLM] Header found using selector: ${selector}`);
          break;
        }
      }

      if (!headerElement) {
        console.warn('[SuperNotebookLM] Could not find header element for share button');
        return;
      }

      // Create share button
      const button = document.createElement('button');
      button.id = 'snlm-share-button';
      button.className = 'snlm-share-btn';
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
        </svg>
        <span>Share to Directory</span>
      `;
      button.onclick = handleShareClick;

      // Inject button
      headerElement.appendChild(button);
      console.log('[SuperNotebookLM] Share button injected successfully');

      // Inject CSS for button styling
      injectShareButtonCSS();
    }

    /**
     * Inject CSS styles for share button
     */
    function injectShareButtonCSS() {
      if (document.getElementById('snlm-share-button-styles')) {
        return; // Already injected
      }

      const style = document.createElement('style');
      style.id = 'snlm-share-button-styles';
      style.textContent = `
        .snlm-share-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background-color: #4a9eff;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          font-family: 'Google Sans', 'Roboto', Arial, sans-serif;
        }

        .snlm-share-btn:hover {
          background-color: #3b82f6;
        }

        .snlm-share-btn:active {
          transform: scale(0.98);
        }

        .snlm-share-btn:disabled {
          background-color: #6b7280;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .snlm-share-btn svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
      `;
      document.head.appendChild(style);
    }

    /**
     * Extract full notebook content for sharing
     */
    function extractFullNotebookContent(): {
      title: string;
      content: string;
      notebookId: string;
    } | null {
      const title = extractNotebookTitle() || 'Untitled Notebook';
      const notebookId = extractNotebookId();

      // Extract all chat content
      const chatElements = document.querySelectorAll('chat-message');
      const chats: string[] = [];

      chatElements.forEach((element, index) => {
        const messageText = element.querySelector('.message-text-content')?.textContent?.trim();
        if (messageText && messageText.length > 20) {
          chats.push(`### Conversation ${index + 1}\n${messageText}\n`);
        }
      });

      // Extract questions if available
      const questionElements = document.querySelectorAll(SELECTORS.question.v3);
      const questions: string[] = [];
      questionElements.forEach((element, index) => {
        const questionText = element.textContent?.trim();
        if (questionText) {
          questions.push(`**Q${index + 1}:** ${questionText}\n`);
        }
      });

      // Combine content
      let content = '';

      if (questions.length > 0) {
        content += '## Questions Asked\n\n';
        content += questions.join('\n');
        content += '\n\n';
      }

      if (chats.length > 0) {
        content += '## Conversations\n\n';
        content += chats.join('\n\n');
      }

      // If no content found, try to extract any visible text
      if (content.length < 100) {
        const mainContent = document.querySelector('main')?.textContent?.trim();
        if (mainContent && mainContent.length > 100) {
          content = mainContent;
        }
      }

      if (content.length < 50) {
        console.warn('[SuperNotebookLM] Could not extract sufficient notebook content');
        return null;
      }

      return {
        title,
        content,
        notebookId,
      };
    }

    /**
     * Handle share button click
     * Extracts content and sends message to sidebar to open share modal
     */
    async function handleShareClick() {
      console.log('[SuperNotebookLM] Share button clicked');

      const button = document.getElementById('snlm-share-button') as HTMLButtonElement;
      if (button) {
        button.disabled = true;
        button.innerHTML = '<span>Extracting content...</span>';
      }

      try {
        // Extract notebook content
        const notebookData = extractFullNotebookContent();

        if (!notebookData) {
          alert('Could not extract notebook content. Please make sure you have content in your notebook.');
          return;
        }

        console.log('[SuperNotebookLM] Notebook content extracted, sending to sidebar');

        // Send message to sidebar to open share modal
        chrome.runtime.sendMessage({
          type: 'OPEN_SHARE_MODAL',
          data: notebookData,
        });

        console.log('[SuperNotebookLM] Message sent to open share modal');
      } catch (error) {
        console.error('[SuperNotebookLM] Failed to extract notebook content:', error);
        alert('Failed to extract notebook content. Please try again.');
      } finally {
        // Reset button
        if (button) {
          button.disabled = false;
          button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
            </svg>
            <span>Share to Directory</span>
          `;
        }
      }
    }

    // Initialize share button injection
    // Use MutationObserver to wait for header to load
    const shareButtonObserver = new MutationObserver(() => {
      if (window.location.pathname.includes('/notebook/')) {
        injectShareButton();
      }
    });

    shareButtonObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also try immediate injection
    setTimeout(() => {
      injectShareButton();
    }, 2000);

    console.log('[SuperNotebookLM] Share button injection initialized');

    // =============================================================================
    // NOTEBOOK DETECTION & DRAG-DROP (Fix for Story 3.5 sidebar migration)
    // =============================================================================

    /**
     * Track detected notebooks to prevent duplicate processing
     */
    const detectedNotebooks = new Map<string, { title: string; url: string; lastSeen: number }>();

    /**
     * Selectors for notebook cards on the dashboard
     * NotebookLM displays notebooks as clickable cards/buttons
     * The actual notebook ID and title are in a span with class "project-button-title"
     */
    const NOTEBOOK_CARD_SELECTORS = {
      // Try multiple selector strategies for resilience
      v4: 'span.project-button-title',                // Direct span selector (most reliable for current NotebookLM)
      v3: '[data-test-id="project-button"]',          // Test ID based
      v2: 'a[href*="/notebook/"]',                    // Link-based (href pattern)
      v1: 'button.project-button',                    // Class-based
      v0: '[class*="project"][class*="button"]',      // Partial class match
    };

    /**
     * Extract notebook data from a card element
     * Current NotebookLM structure (2025):
     * <span class="project-button-title" id="NOTEBOOK_ID-title">Title Text</span>
     */
    function extractNotebookFromCard(card: Element): { id: string; title: string; url: string } | null {
      try {
        let notebookId: string | null = null;
        let title: string = 'Untitled Notebook';

        // STRATEGY 1: Extract from span.project-button-title (Current NotebookLM format)
        // The span has id="NOTEBOOK_ID-title" and text content is the title
        if (card.classList.contains('project-button-title')) {
          // This IS the title span
          const spanId = card.getAttribute('id');
          if (spanId && spanId.endsWith('-title')) {
            notebookId = spanId.replace('-title', '');
            title = card.textContent?.trim() || 'Untitled Notebook';
          }
        } else {
          // This is a parent element, find the title span inside
          const titleSpan = card.querySelector('span.project-button-title');
          if (titleSpan) {
            const spanId = titleSpan.getAttribute('id');
            if (spanId && spanId.endsWith('-title')) {
              notebookId = spanId.replace('-title', '');
              title = titleSpan.textContent?.trim() || 'Untitled Notebook';
            }
          }
        }

        // STRATEGY 2: Fallback - Extract from href attribute (older format)
        if (!notebookId) {
          const href = card.getAttribute('href') || card.querySelector('a')?.getAttribute('href');
          if (href) {
            const match = href.match(/\/notebook\/([^/?]+)/);
            if (match) {
              notebookId = match[1];
              // Try to get title from any element
              const titleElement = card.querySelector('.project-button-title, [class*="title"], h1, h2, h3, strong');
              if (titleElement?.textContent?.trim()) {
                title = titleElement.textContent.trim();
              }
            }
          }
        }

        // STRATEGY 3: Fallback - Extract from data attributes
        if (!notebookId) {
          notebookId = 
            card.getAttribute('data-notebook-id') ||
            card.getAttribute('data-project-id') ||
            card.querySelector('[data-notebook-id]')?.getAttribute('data-notebook-id');
          
          if (notebookId) {
            const titleElement = card.querySelector('.project-button-title, [class*="title"]');
            if (titleElement?.textContent?.trim()) {
              title = titleElement.textContent.trim();
            }
          }
        }

        if (!notebookId) {
          return null;
        }

        // Build URL
        const url = `https://notebooklm.google.com/notebook/${notebookId}`;

        return { id: notebookId, title, url };
      } catch (error) {
        console.warn('[SuperNotebookLM] Failed to extract notebook from card:', error);
        return null;
      }
    }

    /**
     * Scan dashboard for notebook cards and extract data
     */
    function scanNotebooksOnDashboard(): void {
      console.log('[SuperNotebookLM] Scanning dashboard for notebooks...');

      const cards: Element[] = [];

      // Try all selector strategies
      for (const selector of Object.values(NOTEBOOK_CARD_SELECTORS)) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          console.log(`[SuperNotebookLM] Found ${found.length} notebook cards using selector: ${selector}`);
          cards.push(...Array.from(found));
          break; // Use first successful selector
        }
      }

      if (cards.length === 0) {
        console.log('[SuperNotebookLM] No notebook cards found on dashboard');
        return;
      }

      const notebooks: Array<{ id: string; title: string; url: string }> = [];
      const now = Date.now();

      for (const card of cards) {
        const notebook = extractNotebookFromCard(card);
        if (!notebook) continue;

        // Update detected notebooks map
        detectedNotebooks.set(notebook.id, {
          title: notebook.title,
          url: notebook.url,
          lastSeen: now,
        });

        notebooks.push(notebook);

        // Make card draggable
        makeNotebookCardDraggable(card, notebook);
      }

      if (notebooks.length > 0) {
        console.log(`[SuperNotebookLM] Detected ${notebooks.length} notebooks, sending to background...`);
        
        // Send to background script for storage
        chrome.runtime.sendMessage({
          type: 'NOTEBOOKS_DETECTED',
          data: notebooks,
        }).catch(error => {
          console.warn('[SuperNotebookLM] Failed to send notebooks to background:', error);
        });
      }

      // Clean up old entries (not seen in last 10 seconds)
      const staleThreshold = now - 10000;
      for (const [id, data] of detectedNotebooks.entries()) {
        if (data.lastSeen < staleThreshold) {
          detectedNotebooks.delete(id);
        }
      }
    }

    /**
     * Make a notebook card draggable for folder organization
     */
    function makeNotebookCardDraggable(card: Element, notebook: { id: string; title: string }): void {
      const element = card as HTMLElement;
      
      // Skip if already draggable
      if (element.getAttribute('draggable') === 'true') {
        return;
      }

      element.setAttribute('draggable', 'true');
      element.style.cursor = 'grab';

      element.addEventListener('dragstart', (e: DragEvent) => {
        if (!e.dataTransfer) return;

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/snlm-notebook', notebook.id);
        e.dataTransfer.setData('text/plain', notebook.id);

        // Visual feedback
        element.style.opacity = '0.5';
        element.style.cursor = 'grabbing';

        // Notify background and sidebar about drag start
        chrome.runtime.sendMessage({
          type: 'NOTEBOOK_DRAG_START',
          data: { notebookId: notebook.id, title: notebook.title },
        }).catch(() => {
          // Silent fail - sidebar might not be open
        });

        console.log('[SuperNotebookLM] Drag started for notebook:', notebook.title);
      });

      element.addEventListener('dragend', () => {
        element.style.opacity = '1';
        element.style.cursor = 'grab';
      });
    }

    /**
     * Observe DOM for new notebook cards being added
     */
    const notebookObserver = new MutationObserver((mutations) => {
      let shouldScan = false;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            // Check if this is a notebook card or contains notebook cards
            for (const selector of Object.values(NOTEBOOK_CARD_SELECTORS)) {
              if (element.matches?.(selector) || element.querySelector?.(selector)) {
                shouldScan = true;
                break;
              }
            }

            if (shouldScan) break;
          }
        }
        if (shouldScan) break;
      }

      if (shouldScan) {
        console.log('[SuperNotebookLM] New notebook cards detected, rescanning...');
        // Debounce scanning
        clearTimeout((window as any)._notebookScanTimeout);
        (window as any)._notebookScanTimeout = setTimeout(scanNotebooksOnDashboard, 500);
      }
    });

    // Start observing dashboard for notebook changes
    notebookObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial scan after page load
    setTimeout(() => {
      scanNotebooksOnDashboard();
    }, 2000);

    // Periodic rescan every 10 seconds (catch any missed updates)
    setInterval(() => {
      if (!window.location.pathname.includes('/notebook/')) {
        // Only scan on dashboard, not inside a notebook
        scanNotebooksOnDashboard();
      }
    }, 10000);

    console.log('[SuperNotebookLM] Notebook detection and drag-drop initialized');
  },
});
