/**
 * Summarizer Model Downloader
 * 
 * Triggers and monitors the Gemini Nano model download for the Summarizer API
 */

export interface DownloadProgress {
  loaded: number; // 0.0 to 1.0
  percentage: number; // 0 to 100
}

/**
 * Trigger Summarizer model download with progress monitoring
 * 
 * According to the docs, calling Summarizer.create() will trigger the download
 * if the model status is 'downloadable', and the monitor callback will receive
 * progress events.
 * 
 * @param onProgress - Callback for download progress updates
 * @returns Promise that resolves when download completes or rejects on error
 */
export async function triggerSummarizerDownload(
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ success: boolean; message: string }> {
  try {
    if (!('Summarizer' in globalThis)) {
      return {
        success: false,
        message: 'Summarizer API not available',
      };
    }

    const Summarizer = (globalThis as any).Summarizer;
    const availability = await Summarizer.availability();
    
    console.log('[Summarizer Downloader] Current status:', availability);
    
    if (availability === 'readily' || availability === 'ready') {
      return {
        success: true,
        message: 'Model is already downloaded and ready',
      };
    }
    
    if (availability === 'downloading') {
      return {
        success: false,
        message: 'Model is already downloading in the background. Please wait.',
      };
    }
    
    if (availability === 'no' || availability === 'unavailable') {
      return {
        success: false,
        message: 'Summarizer API is not available on this device',
      };
    }
    
    // Status is 'downloadable' or 'after-download' - trigger the download
    console.log('[Summarizer Downloader] Triggering download...');
    
    try {
      // Create a session with monitor to track download
      const summarizer = await Summarizer.create({
        type: 'tldr',
        format: 'plain-text',
        length: 'short',
        monitor(m: any) {
          m.addEventListener('downloadprogress', (e: any) => {
            const progress: DownloadProgress = {
              loaded: e.loaded,
              percentage: Math.round(e.loaded * 100),
            };
            
            console.log(`[Summarizer Downloader] Progress: ${progress.percentage}%`);
            
            if (onProgress) {
              onProgress(progress);
            }
          });
        },
      });
      
      // Download triggered successfully
      console.log('[Summarizer Downloader] Download triggered successfully');
      
      // Clean up the session
      summarizer.destroy();
      
      return {
        success: true,
        message: 'Model download started successfully',
      };
    } catch (error) {
      console.error('[Summarizer Downloader] Error creating session:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('user activation')) {
          return {
            success: false,
            message: 'User activation required. Please call this from a button click.',
          };
        }
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } catch (error) {
    console.error('[Summarizer Downloader] Unexpected error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unexpected error',
    };
  }
}

/**
 * Check if download can be triggered (requires user activation)
 */
export function canTriggerDownload(): boolean {
  return !!(navigator as any).userActivation?.isActive;
}
