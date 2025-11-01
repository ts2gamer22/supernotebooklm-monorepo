/**
 * Reddit Content Script
 * Injects "Add Thread to NotebookLM" button and handles Reddit thread export
 */

import { redditOAuthService } from '../src/services/RedditOAuthService';
import { redditAPIService, RedditAPIService } from '../src/services/RedditAPIService';
import { formatRedditThread } from '../src/lib/formatConversation';

const CAPTURE_SETTINGS_KEY = 'captureSettings';

export default defineContentScript({
  matches: ['https://www.reddit.com/r/*/comments/*'],
  main() {
    console.log('SuperNotebookLM: Reddit import enabled');

    // Versioned selectors for DOM scraping resilience
    const SELECTORS = {
      // Action bar where button will be injected (near share/save)
      actionBar: {
        v3: '[slot="actionRow"]',
        v2: 'shreddit-post [slot="actionRow"]',
        v1: '[data-testid="post-action-bar"]',
      },
      // Share button (used as injection point reference)
      shareButton: {
        v3: 'shreddit-share-button',
        v2: 'button[aria-label*="Share"]',
        v1: 'button[id*="share"]',
      },
    };

    let isExporting = false;

    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    function init() {
      // Check if Reddit capture is enabled
      chrome.storage.local.get(CAPTURE_SETTINGS_KEY).then((result) => {
        const captureSettings = result[CAPTURE_SETTINGS_KEY] || {};
        if (captureSettings.reddit !== false) {
          injectExportButton();
        }
      });

      // Listen for settings changes
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[CAPTURE_SETTINGS_KEY]) {
          const captureSettings = changes[CAPTURE_SETTINGS_KEY].newValue || {};
          const button = document.querySelector('.snlm-reddit-export-btn');

          if (captureSettings.reddit !== false && !button) {
            injectExportButton();
          } else if (captureSettings.reddit === false && button) {
            button.remove();
          }
        }
      });
    }

    function injectExportButton() {
      // Find action bar using versioned selectors
      const actionBar =
        document.querySelector(SELECTORS.actionBar.v3) ||
        document.querySelector(SELECTORS.actionBar.v2) ||
        document.querySelector(SELECTORS.actionBar.v1);

      if (!actionBar) {
        console.warn('[Reddit] Action bar not found. Retrying in 2s...');
        setTimeout(injectExportButton, 2000);
        return;
      }

      // Check if button already exists
      if (document.querySelector('.snlm-reddit-export-btn')) {
        return;
      }

      console.log('[Reddit] Injecting export button...');

      // Create button
      const button = document.createElement('button');
      button.className = 'snlm-reddit-export-btn';
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
          <polyline points="16 6 12 2 8 6"></polyline>
          <line x1="12" y1="2" x2="12" y2="15"></line>
        </svg>
        <span>Add to NotebookLM</span>
      `;

      // Style button to match Reddit theme
      Object.assign(button.style, {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#0079D3',
        backgroundColor: 'transparent',
        border: '1px solid #0079D3',
        borderRadius: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginLeft: '8px',
      });

      // Hover effects
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#0079D3';
        button.style.color = 'white';
      });

      button.addEventListener('mouseleave', () => {
        if (!isExporting) {
          button.style.backgroundColor = 'transparent';
          button.style.color = '#0079D3';
        }
      });

      // Click handler
      button.addEventListener('click', async () => {
        if (isExporting) return;
        await handleExport();
      });

      // Inject button into action bar
      actionBar.appendChild(button);
      console.log('[Reddit] Export button injected successfully');
    }

    async function handleExport() {
      const button = document.querySelector('.snlm-reddit-export-btn') as HTMLButtonElement;
      if (!button) return;

      isExporting = true;
      button.disabled = true;
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
        <span>Loading...</span>
      `;
      button.style.opacity = '0.6';

      try {
        console.log('[Reddit] Starting export...');

        // Parse URL to get post ID and subreddit
        const urlData = RedditAPIService.parseRedditUrl(window.location.href);

        if (!urlData) {
          throw new Error('Could not parse Reddit URL');
        }

        console.log('[Reddit] URL parsed:', urlData);

        // Check if authenticated
        const isAuthenticated = await redditOAuthService.isAuthenticated();

        if (!isAuthenticated) {
          console.log('[Reddit] Not authenticated, initiating OAuth...');

          // Show OAuth modal
          button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            <span>Authorize Reddit...</span>
          `;

          // Initiate OAuth flow
          const code = await redditOAuthService.initiateOAuth();
          await redditOAuthService.exchangeCodeForToken(code);

          console.log('[Reddit] OAuth successful');
        }

        // Fetch thread data
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Fetching thread...</span>
        `;

        const thread = await redditAPIService.getThread(urlData.postId, urlData.subreddit);

        console.log('[Reddit] Thread fetched:', {
          title: thread.post.title,
          comments: thread.comments.length,
        });

        // Format thread
        const formattedText = formatRedditThread(thread.post, thread.comments);

        // Export to NotebookLM via background script
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
          <span>Exporting...</span>
        `;

        await chrome.runtime.sendMessage({
          type: 'EXPORT_TO_NOTEBOOKLM',
          data: {
            formattedText,
            title: `Reddit: ${thread.post.title}`,
            sourceUrl: thread.post.url,
          },
        });

        console.log('[Reddit] Export successful');

        // Success state
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Exported ✓</span>
        `;
        button.style.backgroundColor = '#46D160';
        button.style.borderColor = '#46D160';
        button.style.color = 'white';

        // Reset after 3 seconds
        setTimeout(() => {
          button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            <span>Add to NotebookLM</span>
          `;
          button.style.backgroundColor = 'transparent';
          button.style.borderColor = '#0079D3';
          button.style.color = '#0079D3';
          button.style.opacity = '1';
          button.disabled = false;
          isExporting = false;
        }, 3000);
      } catch (error) {
        console.error('[Reddit] Export failed:', error);

        // Error state
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <span>Failed - ${error instanceof Error ? error.message.substring(0, 30) : 'Unknown error'}</span>
        `;
        button.style.backgroundColor = '#FF4500';
        button.style.borderColor = '#FF4500';
        button.style.color = 'white';

        // Reset after 5 seconds
        setTimeout(() => {
          button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            <span>Add to NotebookLM</span>
          `;
          button.style.backgroundColor = 'transparent';
          button.style.borderColor = '#0079D3';
          button.style.color = '#0079D3';
          button.style.opacity = '1';
          button.disabled = false;
          isExporting = false;
        }, 5000);
      }
    }
  },
});
