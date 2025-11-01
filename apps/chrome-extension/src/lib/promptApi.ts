/**
 * Chrome Built-in AI Prompt API Utilities
 * 
 * Provides wrapper functions for interacting with Chrome's Gemini Nano model
 * via the LanguageModel API (Chrome 138+).
 * 
 * @module promptApi
 */

import type {
  AIAvailability,
  AISession,
  AISessionOptions,
  AvailabilityResult,
  SessionResult,
  PromptResult,
} from '../types/ai';

/**
 * Check if the browser supports the Prompt API
 * 
 * @returns true if LanguageModel API is available in the global scope
 * 
 * @example
 * ```typescript
 * if (isPromptApiSupported()) {
 *   const availability = await checkAvailability();
 * }
 * ```
 */
export function isPromptApiSupported(): boolean {
  return typeof (globalThis as any).LanguageModel !== 'undefined';
}

/**
 * Check the availability status of the Prompt API and Gemini Nano model
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
 * const result = await checkAvailability();
 * if (result.status === 'available') {
 *   // Proceed with AI features
 * } else if (result.status === 'downloading') {
 *   // Show "model downloading" message
 * } else {
 *   // Gracefully disable AI features
 * }
 * ```
 */
export async function checkAvailability(): Promise<AvailabilityResult> {
  try {
    if (!isPromptApiSupported()) {
      return {
        status: 'unavailable',
        error: 'Prompt API not supported in this browser. Requires Chrome 138+ Canary.',
      };
    }

    const LanguageModel = (globalThis as any).LanguageModel;
    // IMPORTANT: outputLanguage must be specified for optimal output quality and safety
    // Supported languages: en, es, ja
    const availability = await LanguageModel.availability({ outputLanguage: 'en' });

    // API returns 'readily' in some versions, normalize to 'available'
    const normalizedStatus: AIAvailability = 
      availability === 'readily' ? 'available' : 
      availability === 'no' ? 'unavailable' :
      availability;

    return {
      status: normalizedStatus,
      error: normalizedStatus === 'unavailable' 
        ? 'Gemini Nano model not available. Check chrome://flags/#optimization-guide-on-device-model'
        : undefined,
    };
  } catch (error) {
    console.error('[Prompt API] Availability check failed:', error);
    return {
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown error checking availability',
    };
  }
}

/**
 * Create a new AI session for prompting
 * 
 * Sessions maintain conversation context and must be destroyed when no longer needed
 * to prevent memory leaks. Always call destroySession() or session.destroy() when done.
 * 
 * @param options - Optional session configuration (systemPrompt, temperature, topK)
 * @returns Promise resolving to session result with session object or error
 * 
 * @example
 * ```typescript
 * const result = await createSession({
 *   systemPrompt: 'You are a helpful research assistant.',
 *   temperature: 1,
 *   topK: 3
 * });
 * 
 * if (result.success && result.session) {
 *   const response = await result.session.prompt('Hello!');
 *   console.log(response);
 *   result.session.destroy(); // Always cleanup!
 * }
 * ```
 */
export async function createSession(
  options?: AISessionOptions
): Promise<SessionResult> {
  try {
    if (!isPromptApiSupported()) {
      return {
        success: false,
        error: 'unavailable',
        message: 'Prompt API not supported in this browser',
      };
    }

    const LanguageModel = (globalThis as any).LanguageModel;
    
    // Check availability before creating session
    const availability = await LanguageModel.availability({ outputLanguage: 'en' });
    if (availability === 'no') {
      return {
        success: false,
        error: 'unavailable',
        message: 'Gemini Nano model not available',
      };
    }

    if (availability === 'after-download') {
      return {
        success: false,
        error: 'downloading',
        message: 'Model still downloading. Please wait and try again.',
      };
    }

    // Create session with options
    // IMPORTANT: Always include outputLanguage for optimal quality and safety
    const sessionOptions = {
      outputLanguage: 'en',
      ...options,
    };
    const session: AISession = await LanguageModel.create(sessionOptions);

    console.log('[Prompt API] Session created:', {
      inputQuota: session.inputQuota,
      temperature: session.temperature,
      topK: session.topK,
    });

    return {
      success: true,
      session,
    };
  } catch (error) {
    console.error('[Prompt API] Session creation failed:', error);
    return {
      success: false,
      error: 'session_error',
      message: error instanceof Error ? error.message : 'Failed to create AI session',
    };
  }
}

/**
 * Destroy an AI session and free resources
 * 
 * This function safely destroys a session, handling errors and null/undefined values.
 * Always call this when done with a session to prevent memory leaks.
 * 
 * @param session - The AI session to destroy
 * 
 * @example
 * ```typescript
 * const result = await createSession();
 * if (result.success && result.session) {
 *   // Use session...
 *   await destroySession(result.session);
 * }
 * ```
 */
export async function destroySession(session: AISession | null | undefined): Promise<void> {
  if (!session) {
    return;
  }

  try {
    session.destroy();
    console.log('[Prompt API] Session destroyed');
  } catch (error) {
    console.error('[Prompt API] Error destroying session:', error);
  }
}

/**
 * Send a text prompt to an AI session and get a response
 * 
 * This is a convenience wrapper around session.prompt() with error handling.
 * 
 * @param session - Active AI session
 * @param prompt - Text prompt to send
 * @returns Promise resolving to prompt result with response or error
 * 
 * @example
 * ```typescript
 * const sessionResult = await createSession();
 * if (sessionResult.success && sessionResult.session) {
 *   const promptResult = await promptText(sessionResult.session, 'Explain quantum computing');
 *   if (promptResult.success) {
 *     console.log(promptResult.response);
 *   }
 *   await destroySession(sessionResult.session);
 * }
 * ```
 */
export async function promptText(
  session: AISession,
  prompt: string
): Promise<PromptResult> {
  try {
    if (!prompt || prompt.trim().length === 0) {
      return {
        success: false,
        error: 'invalid_input',
        message: 'Prompt cannot be empty',
      };
    }

    const response = await session.prompt(prompt);

    return {
      success: true,
      response,
    };
  } catch (error) {
    console.error('[Prompt API] Prompt failed:', error);

    // Check for specific error types
    if (error instanceof DOMException) {
      if (error.name === 'QuotaExceededError') {
        return {
          success: false,
          error: 'quota_exceeded',
          message: 'Context window exceeded (6144 tokens). Please start a new conversation.',
        };
      }
      if (error.name === 'NetworkError') {
        return {
          success: false,
          error: 'network_error',
          message: 'Network error. Please check your connection and try again.',
        };
      }
    }

    return {
      success: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send a text prompt and receive streaming response
 * 
 * Note: Streaming is useful for long responses to show progress.
 * This is a more advanced feature and can be implemented in future stories.
 * 
 * @param session - Active AI session
 * @param prompt - Text prompt to send
 * @returns Async iterable of response chunks
 * 
 * @example
 * ```typescript
 * const sessionResult = await createSession();
 * if (sessionResult.success && sessionResult.session) {
 *   const stream = await promptTextStreaming(sessionResult.session, 'Write a story');
 *   for await (const chunk of stream) {
 *     console.log(chunk); // Process each chunk as it arrives
 *   }
 *   await destroySession(sessionResult.session);
 * }
 * ```
 */
export async function promptTextStreaming(
  session: AISession,
  prompt: string
): Promise<AsyncIterable<string>> {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt cannot be empty');
  }

  return session.promptStreaming(prompt);
}
