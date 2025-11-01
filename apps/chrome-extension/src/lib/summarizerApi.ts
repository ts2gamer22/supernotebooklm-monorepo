/**
 * Chrome Built-in AI Summarizer API Utilities
 * 
 * Provides wrapper functions for interacting with Chrome's Summarizer API
 * (Chrome 128+) for text summarization and condensing long content.
 * 
 * @module summarizerApi
 */

import type {
  SummarizerAvailability,
  SummarizerAvailabilityResult,
  SummarizerOptions,
  SummarizerSession,
  SummarizerSessionResult,
  SummaryResult,
} from '../types/summarizer';

/**
 * Check if the browser supports the Summarizer API
 * 
 * @returns true if Summarizer API is available
 * 
 * @example
 * ```typescript
 * if (isSummarizerApiSupported()) {
 *   const availability = await checkSummarizerAvailability();
 * }
 * ```
 */
export function isSummarizerApiSupported(): boolean {
  return 'Summarizer' in globalThis;
}

/**
 * Check the availability status of the Summarizer API
 * 
 * This function detects whether:
 * - The API is ready to use immediately ('ready')
 * - The model needs to be downloaded first ('downloadable')
 * - The API is not available in this browser ('unavailable')
 * 
 * @returns Promise resolving to availability result with status and optional error
 * 
 * @example
 * ```typescript
 * const result = await checkSummarizerAvailability();
 * if (result.status === 'ready') {
 *   // Proceed with summarizer features
 * } else if (result.status === 'downloadable') {
 *   // Show "model download needed" message
 * } else {
 *   // Hide summarize button
 * }
 * ```
 */
export async function checkSummarizerAvailability(): Promise<SummarizerAvailabilityResult> {
  try {
    if (!isSummarizerApiSupported()) {
      return {
        status: 'unavailable',
        error: 'Summarizer API not supported in this browser. Requires Chrome 138+.',
      };
    }

    const Summarizer = (globalThis as any).Summarizer;
    const availability = await Summarizer.availability();
    
    console.log('[Summarizer API] Raw availability response:', availability);
    
    // API returns various statuses, normalize them:
    // 'available' | 'readily' → 'ready'
    // 'after-download' → 'downloadable'
    // 'downloading' → 'downloading'
    // 'no' | 'unavailable' → 'unavailable'
    let status: SummarizerAvailability;
    
    if (availability === 'readily' || availability === 'available') {
      status = 'ready';
    } else if (availability === 'after-download') {
      status = 'downloadable';
    } else if (availability === 'no') {
      status = 'unavailable';
    } else {
      // Handle any other status (like 'downloading') as the raw string
      status = availability as SummarizerAvailability;
    }

    return {
      status,
      error: status === 'unavailable'
        ? 'Summarizer API not available. Your device may not meet hardware requirements.'
        : status === 'downloadable'
        ? 'Gemini Nano model needs to be downloaded. This will happen automatically on first use.'
        : status === 'downloading'
        ? 'Gemini Nano model is currently downloading. Please wait...'
        : undefined,
    };
  } catch (error) {
    console.error('[Summarizer API] Availability check failed:', error);
    return {
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown error checking availability',
    };
  }
}

/**
 * Create a new Summarizer session for text summarization
 * 
 * IMPORTANT: This must be called within a user gesture (like a button click) due to
 * user activation requirements.
 * 
 * Sessions can be reused for multiple summarization operations and must be destroyed
 * when no longer needed to prevent memory leaks. Always call destroySummarizerSession()
 * or session.destroy() when done.
 * 
 * @param options - Optional summarizer configuration (sharedContext, type, format, length)
 * @returns Promise resolving to session result with session object or error
 * 
 * @example
 * ```typescript
 * const result = await createSummarizerSession({
 *   sharedContext: 'This is a scientific article',
 *   type: 'tldr',
 *   format: 'plain-text',
 *   length: 'short',
 *   monitor(m) {
 *     m.addEventListener('downloadprogress', (e) => {
 *       console.log(`Downloaded ${e.loaded * 100}%`);
 *     });
 *   }
 * });
 * 
 * if (result.success && result.session) {
 *   const summary = await result.session.summarize(longText);
 *   console.log(summary);
 *   result.session.destroy(); // Always cleanup!
 * }
 * ```
 */
export async function createSummarizerSession(
  options?: SummarizerOptions
): Promise<SummarizerSessionResult> {
  try {
    if (!isSummarizerApiSupported()) {
      return {
        success: false,
        error: 'unavailable',
        message: 'Summarizer API not supported in this browser',
      };
    }

    const Summarizer = (globalThis as any).Summarizer;
    
    // Check availability before creating session
    const availability = await Summarizer.availability();
    console.log('[Summarizer API] Availability before session creation:', availability);
    
    if (availability === 'no' || availability === 'unavailable') {
      return {
        success: false,
        error: 'unavailable',
        message: 'Summarizer API not available',
      };
    }
    
    // If model is downloading, we should wait or inform the user
    if (availability === 'downloading') {
      return {
        success: false,
        error: 'downloading',
        message: 'Model is currently downloading. Please wait and try again.',
      };
    }
    
    // API is ready - 'readily' or 'available' means we can proceed
    if (availability !== 'readily' && availability !== 'available' && availability !== 'after-download') {
      console.warn('[Summarizer API] Unexpected availability status:', availability);
    }

    // Check for user activation (required by the API)
    if (!navigator.userActivation?.isActive) {
      return {
        success: false,
        error: 'session_error',
        message: 'User activation required. This must be called from a user gesture (e.g., button click).',
      };
    }

    // Create session with default options
    const sessionOptions: SummarizerOptions = {
      type: 'tldr',
      format: 'plain-text',
      length: 'short',
      ...options,
    };
    
    const session: SummarizerSession = await Summarizer.create(sessionOptions);

    console.log('[Summarizer API] Session created:', {
      sharedContext: sessionOptions.sharedContext || 'none',
      type: sessionOptions.type,
      format: sessionOptions.format,
      length: sessionOptions.length,
    });

    return {
      success: true,
      session,
    };
  } catch (error) {
    console.error('[Summarizer API] Session creation failed:', error);
    return {
      success: false,
      error: 'session_error',
      message: error instanceof Error ? error.message : 'Failed to create Summarizer session',
    };
  }
}

/**
 * Summarize text using an active Summarizer session
 * 
 * This function condenses the input text according to the session's configuration
 * (type, format, length). The session must be active and not destroyed.
 * 
 * @param session - Active Summarizer session
 * @param text - Text to summarize
 * @param context - Optional additional context to improve summarization
 * @returns Promise resolving to summary result with condensed text or error
 * 
 * @example
 * ```typescript
 * const sessionResult = await createSummarizerSession();
 * if (sessionResult.success && sessionResult.session) {
 *   const summaryResult = await summarizeText(
 *     sessionResult.session, 
 *     longArticleText,
 *     'This article is intended for a tech-savvy audience.'
 *   );
 *   if (summaryResult.success) {
 *     console.log(summaryResult.summary);
 *   }
 *   await destroySummarizerSession(sessionResult.session);
 * }
 * ```
 */
export async function summarizeText(
  session: SummarizerSession,
  text: string,
  context?: string
): Promise<SummaryResult> {
  try {
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'invalid_input',
        message: 'Text cannot be empty',
      };
    }

    if (!session) {
      return {
        success: false,
        error: 'session_destroyed',
        message: 'Session is null or undefined',
      };
    }

    const summary = await session.summarize(text, context ? { context } : undefined);

    console.log('[Summarizer API] Text summarized:', {
      originalLength: text.length,
      summaryLength: summary.length,
      reductionPercent: Math.round((1 - summary.length / text.length) * 100),
      hadContext: !!context,
    });

    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.error('[Summarizer API] Summarization failed:', error);
    
    // Check for specific error types
    if (error instanceof DOMException) {
      if (error.name === 'InvalidStateError') {
        return {
          success: false,
          error: 'session_destroyed',
          message: 'Session has been destroyed. Please create a new session.',
        };
      }
    }

    return {
      success: false,
      error: 'summarize_error',
      message: error instanceof Error ? error.message : 'Unknown error during summarization',
    };
  }
}

/**
 * Destroy a Summarizer session and free resources
 * 
 * This function safely destroys a session, handling errors and null/undefined values.
 * Always call this when done with a session to prevent memory leaks.
 * 
 * Note: Sessions are lightweight (<5MB) but should still be cleaned up properly.
 * Consider reusing sessions for multiple summarization requests rather than creating
 * a new session for each operation.
 * 
 * @param session - The Summarizer session to destroy
 * 
 * @example
 * ```typescript
 * const result = await createSummarizerSession();
 * if (result.success && result.session) {
 *   // Use session for multiple summarizations...
 *   await summarizeText(result.session, 'text 1');
 *   await summarizeText(result.session, 'text 2');
 *   
 *   // Cleanup when done
 *   await destroySummarizerSession(result.session);
 * }
 * ```
 */
export async function destroySummarizerSession(
  session: SummarizerSession | null | undefined
): Promise<void> {
  if (!session) {
    return;
  }

  try {
    session.destroy();
    console.log('[Summarizer API] Session destroyed');
  } catch (error) {
    console.error('[Summarizer API] Error destroying session:', error);
  }
}
