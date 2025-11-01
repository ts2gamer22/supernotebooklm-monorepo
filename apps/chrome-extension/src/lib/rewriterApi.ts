/**
 * Chrome Built-in AI Rewriter API Utilities
 * 
 * Provides wrapper functions for interacting with Chrome's Rewriter API
 * (Chrome 128+) for text enhancement and prompt improvement.
 * 
 * @module rewriterApi
 */

import type {
  RewriterAvailability,
  RewriterAvailabilityResult,
  RewriterOptions,
  RewriterSession,
  RewriterSessionResult,
  RewriteResult,
} from '../types/rewriter';

/**
 * Check if the browser supports the Rewriter API
 * 
 * @returns true if Rewriter API is available in global scope
 * 
 * @example
 * ```typescript
 * if (isRewriterApiSupported()) {
 *   const availability = await checkRewriterAvailability();
 * }
 * ```
 */
export function isRewriterApiSupported(): boolean {
  return 'Rewriter' in self;
}

/**
 * Check the availability status of the Rewriter API
 * 
 * This function detects whether:
 * - The API is available and ready to use ('available')
 * - The model is still downloading ('downloading')
 * - The API is not available in this browser ('unavailable')
 * 
 * @returns Promise resolving to availability result with status and optional error
 * 
 * @example
 * ```typescript
 * const result = await checkRewriterAvailability();
 * if (result.status === 'available') {
 *   // Proceed with rewriter features
 * } else if (result.status === 'downloading') {
 *   // Show "model downloading" message
 * } else {
 *   // Hide enhancement button
 * }
 * ```
 */
export async function checkRewriterAvailability(): Promise<RewriterAvailabilityResult> {
  try {
    if (!isRewriterApiSupported()) {
      return {
        status: 'unavailable',
        error: 'Rewriter API not supported in this browser. Requires Chrome 137+ with flag enabled.',
      };
    }

    const Rewriter = (globalThis as any).Rewriter;
    const availability = await Rewriter.availability();
    
    // API returns: 'available' | 'downloadable' | 'unavailable'
    const normalizedStatus: RewriterAvailability = 
      availability === 'available' ? 'available' :
      availability === 'downloadable' ? 'downloading' :
      'unavailable';

    return {
      status: normalizedStatus,
      error: normalizedStatus === 'unavailable'
        ? 'Rewriter API not available. Check chrome://flags/#rewriter-api-for-gemini-nano'
        : normalizedStatus === 'downloading'
        ? 'Gemini Nano model needs to be downloaded. This may take time.'
        : undefined,
    };
  } catch (error) {
    console.error('[Rewriter API] Availability check failed:', error);
    return {
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown error checking availability',
    };
  }
}

/**
 * Create a new Rewriter session for text enhancement
 * 
 * Sessions can be reused for multiple rewrite operations and must be destroyed
 * when no longer needed to prevent memory leaks. Always call destroyRewriterSession()
 * or session.destroy() when done.
 * 
 * @param options - Optional rewriter configuration (tone, format, length)
 * @returns Promise resolving to session result with session object or error
 * 
 * @example
 * ```typescript
 * const result = await createRewriterSession({
 *   tone: 'more-formal',
 *   format: 'as-is',
 *   length: 'as-is'
 * });
 * 
 * if (result.success && result.session) {
 *   const enhanced = await result.session.rewrite('tell me about quantum stuff');
 *   console.log(enhanced);
 *   result.session.destroy(); // Always cleanup!
 * }
 * ```
 */
export async function createRewriterSession(
  options?: RewriterOptions
): Promise<RewriterSessionResult> {
  try {
    if (!isRewriterApiSupported()) {
      return {
        success: false,
        error: 'unavailable',
        message: 'Rewriter API not supported in this browser',
      };
    }

    const Rewriter = (globalThis as any).Rewriter;
    
    // Check availability before creating session
    const availability = await Rewriter.availability();
    if (availability === 'unavailable') {
      return {
        success: false,
        error: 'unavailable',
        message: 'Rewriter API not available',
      };
    }

    // Create session with default options
    const sessionOptions: any = {
      tone: 'as-is',
      format: 'as-is',
      length: 'as-is',
      ...options,
    };
    
    // If status is 'downloadable', add monitor for progress
    // According to docs: create() will complete initialization even when downloadable
    if (availability === 'downloadable') {
      console.log('[Rewriter API] Status is downloadable, adding progress monitor...');
      sessionOptions.monitor = (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          const progress = e.loaded ? Math.round(e.loaded * 100) : 0;
          console.log(`[Rewriter API] Initialization progress: ${progress}%`);
        });
      };
    }
    
    // Create session - this works for both 'available' and 'downloadable'
    // For 'downloadable', the create() itself completes initialization
    const session: RewriterSession = await Rewriter.create(sessionOptions);

    console.log('[Rewriter API] Session created successfully:', {
      availability,
      tone: sessionOptions.tone,
      format: sessionOptions.format,
      length: sessionOptions.length,
    });

    return {
      success: true,
      session,
    };
  } catch (error) {
    console.error('[Rewriter API] Session creation failed:', error);
    return {
      success: false,
      error: 'session_error',
      message: error instanceof Error ? error.message : 'Failed to create Rewriter session',
    };
  }
}

/**
 * Rewrite text using an active Rewriter session
 * 
 * This function enhances the input text according to the session's configuration
 * (tone, format, length). The session must be active and not destroyed.
 * 
 * @param session - Active Rewriter session
 * @param text - Text to rewrite/enhance
 * @param context - Optional context to guide the rewriting (e.g., 'Enhance this prompt for clarity')
 * @returns Promise resolving to rewrite result with enhanced text or error
 * 
 * @example
 * ```typescript
 * const sessionResult = await createRewriterSession();
 * if (sessionResult.success && sessionResult.session) {
 *   const rewriteResult = await rewriteText(
 *     sessionResult.session, 
 *     'tell me about quantum stuff',
 *     'Rewrite this as a clear, specific question for an AI assistant'
 *   );
 *   if (rewriteResult.success) {
 *     console.log(rewriteResult.rewrittenText);
 *     // "Can you explain the fundamental concepts of quantum physics?"
 *   }
 *   await destroyRewriterSession(sessionResult.session);
 * }
 * ```
 */
export async function rewriteText(
  session: RewriterSession,
  text: string,
  context?: string
): Promise<RewriteResult> {
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

    // Call rewrite with context if provided
    const rewrittenText = context 
      ? await session.rewrite(text, { context })
      : await session.rewrite(text);

    console.log('[Rewriter API] Text rewritten:', {
      originalLength: text.length,
      rewrittenLength: rewrittenText.length,
      context: context || 'none',
    });

    return {
      success: true,
      rewrittenText,
    };
  } catch (error) {
    console.error('[Rewriter API] Rewrite failed:', error);
    
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
      error: 'rewrite_error',
      message: error instanceof Error ? error.message : 'Unknown error during rewrite',
    };
  }
}

/**
 * Destroy a Rewriter session and free resources
 * 
 * This function safely destroys a session, handling errors and null/undefined values.
 * Always call this when done with a session to prevent memory leaks.
 * 
 * Note: Sessions are lightweight (<5MB) but should still be cleaned up properly.
 * Consider reusing sessions for multiple enhancement requests rather than creating
 * a new session for each rewrite.
 * 
 * @param session - The Rewriter session to destroy
 * 
 * @example
 * ```typescript
 * const result = await createRewriterSession();
 * if (result.success && result.session) {
 *   // Use session for multiple rewrites...
 *   await rewriteText(result.session, 'prompt 1');
 *   await rewriteText(result.session, 'prompt 2');
 *   
 *   // Cleanup when done
 *   await destroyRewriterSession(result.session);
 * }
 * ```
 */
export async function destroyRewriterSession(
  session: RewriterSession | null | undefined
): Promise<void> {
  if (!session) {
    return;
  }

  try {
    session.destroy();
    console.log('[Rewriter API] Session destroyed');
  } catch (error) {
    console.error('[Rewriter API] Error destroying session:', error);
  }
}
