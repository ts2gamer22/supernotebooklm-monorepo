/**
 * YouTube Content Script
 * Injects "Add Transcript to NotebookLM" button and handles transcript export
 */

import { formatYouTubeTranscript, type VideoMetadata } from '../src/lib/formatConversation';
import { youtubeTranscriptService } from '../src/services/YouTubeTranscriptService';

export default defineContentScript({
  matches: ['https://www.youtube.com/watch*'],
  main() {
    console.log('SuperNotebookLM: YouTube transcript import enabled');

    // Versioned selectors for DOM scraping resilience
    const SELECTORS = {
      // Video title
      videoTitle: {
        v3: 'h1.ytd-watch-metadata yt-formatted-string',
        v2: 'h1.title yt-formatted-string',
        v1: 'h1',
      },
      // Channel name
      channelName: {
        v3: 'ytd-channel-name a',
        v2: '#channel-name a',
        v1: '.ytd-video-owner-renderer a',
      },
      // Video duration
      duration: {
        v3: '.ytp-time-duration',
        v2: 'span.ytp-time-duration',
        v1: '.video-time',
      },
      // Upload date
      uploadDate: {
        v3: '#info-strings yt-formatted-string',
        v2: '#date yt-formatted-string',
        v1: '.date',
      },
      // Header buttons container (top-right, before Create button)
      headerButtons: {
        v3: 'ytd-masthead #end #buttons',
        v2: '#masthead #buttons',
        v1: 'ytd-masthead #buttons',
      },
      // Create button (anchor for placement)
      createButton: {
        v3: 'ytd-masthead #end #buttons ytd-button-renderer:first-child',
        v2: '#buttons ytd-button-renderer',
        v1: 'ytd-button-renderer',
      },
    };

    const CAPTURE_SETTINGS_KEY = 'captureSettings';
    let isExporting = false;
    let currentVideoId: string | null = null;

    // Listen for YouTube's navigation events
    window.addEventListener('yt-navigate-finish', handleNavigation);
    
    // Also check on initial load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleNavigation);
    } else {
      handleNavigation();
    }

    function handleNavigation() {
      const videoId = extractVideoId();
      
      // Only re-inject if video changed
      if (videoId && videoId !== currentVideoId) {
        currentVideoId = videoId;
        checkAndInjectButton();
      }
    }

    async function checkAndInjectButton() {
      const videoId = currentVideoId;
      if (!videoId) return;

      // Check settings
      const result = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
      const captureSettings = result[CAPTURE_SETTINGS_KEY] || {};
      
      if (captureSettings.youtube === false) {
        return;
      }

      // Check if transcript available
      const hasTranscript = await youtubeTranscriptService.hasTranscript(videoId);
      
      injectTranscriptButton(hasTranscript);
    }

    function extractVideoId(): string | null {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('v');
    }

    function injectTranscriptButton(enabled: boolean) {
      // Remove existing button first
      const existingButton = document.querySelector('.snlm-transcript-btn-header');
      if (existingButton) {
        existingButton.remove();
      }

      // Wait for header buttons container
      let retryCount = 0;
      const maxRetries = 10;

      const tryInject = () => {
        const headerContainer =
          document.querySelector(SELECTORS.headerButtons.v3) ||
          document.querySelector(SELECTORS.headerButtons.v2) ||
          document.querySelector(SELECTORS.headerButtons.v1);

        const createButton =
          document.querySelector(SELECTORS.createButton.v3) ||
          document.querySelector(SELECTORS.createButton.v2) ||
          document.querySelector(SELECTORS.createButton.v1);

        if (headerContainer && createButton) {
          doInject(headerContainer, createButton, enabled);
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(tryInject, 500);
        } else {
          console.warn('[YouTube] Failed to inject button - header container not found');
        }
      };

      tryInject();
    }

    function doInject(container: Element, createButton: Element, enabled: boolean) {
      // Create simple container (avoid YouTube's custom elements that get auto-upgraded)
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'snlm-transcript-btn-header style-scope ytd-masthead';
      buttonContainer.style.cssText = 'position: relative; margin-right: 8px; display: inline-flex; align-items: center;';

      // Main button (styled to match YouTube's header Create button)
      const button = document.createElement('button');
      button.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--overlay yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment';
      button.disabled = !enabled;
      button.title = enabled ? 'SuperNotebookLM - Export transcript' : 'This video has no captions available';
      button.setAttribute('aria-label', enabled ? 'SuperNotebookLM' : 'No captions available');
      
      button.innerHTML = `
        <div aria-hidden="true" class="yt-spec-button-shape-next__icon">
          <span class="ytIconWrapperHost" style="width: 24px; height: 24px;">
            <span class="yt-icon-shape ytSpecIconShapeHost">
              <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 3L12 15M12 3L15 6M12 3L9 6M3 15L3 21L21 21L21 15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </span>
          </span>
        </div>
        <div class="yt-spec-button-shape-next__button-text-content">
          <span class="yt-core-attributed-string yt-core-attributed-string--white-space-no-wrap" role="text">${enabled ? 'SuperNotebook' : 'No Captions'}</span>
        </div>
        <yt-touch-feedback-shape aria-hidden="true" class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--overlay-touch-response">
          <div class="yt-spec-touch-feedback-shape__stroke"></div>
          <div class="yt-spec-touch-feedback-shape__fill"></div>
        </yt-touch-feedback-shape>
      `;

      // Click handler for main button
      if (enabled) {
        button.addEventListener('click', () => handleYouTubeExport());
      }

      // Assemble button structure - directly append to container (no wrapper)
      buttonContainer.appendChild(button);

      // Insert button BEFORE the Create button
      container.insertBefore(buttonContainer, createButton);
      
      console.log('[YouTube] SuperNotebook button injected successfully');
    }

    async function handleYouTubeExport() {
      // Find the main button to update status
      const mainButton = document.querySelector('.snlm-transcript-btn-header button.yt-spec-button-shape-next') as HTMLButtonElement;
      if (!mainButton || isExporting) return;

      isExporting = true;
      const originalContent = mainButton.innerHTML;
      mainButton.disabled = true;
      
      // Show loading state
      mainButton.innerHTML = `
        <div aria-hidden="true" class="yt-spec-button-shape-next__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke-width="2" stroke-dasharray="15 5"/>
          </svg>
        </div>
        <div class="yt-spec-button-shape-next__button-text-content">
          <span class="yt-core-attributed-string" role="text">Opening...</span>
        </div>
      `;
      
      // Add spin animation if not exists
      if (!document.getElementById('snlm-spin')) {
        const style = document.createElement('style');
        style.id = 'snlm-spin';
        style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
      }

      try {
        // Get current video URL
        const videoUrl = window.location.href;
        const metadata = extractVideoMetadata();

        console.log('[YouTube] Exporting YouTube URL to NotebookLM:', videoUrl);

        // Send YouTube URL to background script (NotebookLM has native YouTube support)
        const response = await chrome.runtime.sendMessage({
          type: 'EXPORT_YOUTUBE_URL',
          data: {
            youtubeUrl: videoUrl,
            title: metadata.title,
          },
        });

        if (response?.success) {
          showSuccessState(mainButton, '✓ Exported!', originalContent);
        } else {
          throw new Error(response?.error || 'Export failed');
        }
      } catch (error: any) {
        console.error('[YouTube] YouTube export failed:', error);
        
        // Show error state
        mainButton.innerHTML = `
          <div aria-hidden="true" class="yt-spec-button-shape-next__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f44336">
              <circle cx="12" cy="12" r="10" stroke-width="2"/>
              <path d="M12 8v4m0 4h.01" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="yt-spec-button-shape-next__button-text-content">
            <span class="yt-core-attributed-string" role="text">Failed</span>
          </div>
        `;

        // Show error toast
        chrome.runtime.sendMessage({
          type: 'SHOW_TOAST',
          data: {
            variant: 'error',
            message: error.message || 'Failed to export YouTube URL',
          },
        });

        setTimeout(() => {
          mainButton.innerHTML = originalContent;
          mainButton.disabled = false;
          isExporting = false;
        }, 3000);
        return;
      }

      isExporting = false;
    }

    function showSuccessState(button: HTMLButtonElement, message: string, originalContent: string) {
      button.innerHTML = `
        <div aria-hidden="true" class="yt-spec-button-shape-next__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4caf50">
            <path d="M5 13l4 4L19 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="yt-spec-button-shape-next__button-text-content">
          <span class="yt-core-attributed-string" role="text">${message}</span>
        </div>
      `;
      
      setTimeout(() => {
        button.innerHTML = originalContent;
        button.disabled = false;
        isExporting = false;
      }, 3000);
    }

    function sanitizeFilename(filename: string): string {
      // Remove invalid filename characters
      return filename
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 200); // Limit length
    }

    function extractVideoMetadata(): VideoMetadata {
      const title =
        document.querySelector(SELECTORS.videoTitle.v3)?.textContent?.trim() ||
        document.querySelector(SELECTORS.videoTitle.v2)?.textContent?.trim() ||
        document.querySelector(SELECTORS.videoTitle.v1)?.textContent?.trim() ||
        'YouTube Video';

      const channel =
        document.querySelector(SELECTORS.channelName.v3)?.textContent?.trim() ||
        document.querySelector(SELECTORS.channelName.v2)?.textContent?.trim() ||
        document.querySelector(SELECTORS.channelName.v1)?.textContent?.trim() ||
        'Unknown Channel';

      const duration =
        document.querySelector(SELECTORS.duration.v3)?.textContent?.trim() ||
        document.querySelector(SELECTORS.duration.v2)?.textContent?.trim() ||
        'Unknown';

      // Try to extract upload date
      const dateElement =
        document.querySelector(SELECTORS.uploadDate.v3) ||
        document.querySelector(SELECTORS.uploadDate.v2);
      
      let uploadDate = 'Unknown';
      if (dateElement) {
        const dateText = dateElement.textContent?.trim() || '';
        // YouTube typically shows dates like "Jan 15, 2024" or "3 days ago"
        uploadDate = dateText;
      }

      return {
        title,
        channel,
        duration,
        uploadDate,
        url: window.location.href,
      };
    }

    async function summarizeTranscript(transcript: string): Promise<string> {
      // Use Chrome AI Summarizer API if available
      if ('ai' in window && 'summarizer' in (window as any).ai) {
        try {
          const summarizer = await (window as any).ai.summarizer.create();
          const summary = await summarizer.summarize(transcript);
          console.log('[YouTube] Summarization successful');
          return summary;
        } catch (error) {
          console.warn('[YouTube] Summarizer failed, using full transcript:', error);
          return transcript;
        }
      }

      console.log('[YouTube] Summarizer API not available, using full transcript');
      return transcript; // Fallback: return full transcript
    }

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[CAPTURE_SETTINGS_KEY]) {
        const captureSettings = changes[CAPTURE_SETTINGS_KEY].newValue || {};
        const button = document.querySelector('.snlm-transcript-btn-header');
        
        if (captureSettings.youtube === false && button) {
          button.remove();
        } else if (captureSettings.youtube !== false && !button) {
          checkAndInjectButton();
        }
      }
    });
  },
});
