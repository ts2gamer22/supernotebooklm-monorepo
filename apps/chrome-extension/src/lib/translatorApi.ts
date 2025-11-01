/**
 * Chrome Built-in AI Translator API Utilities
 * 
 * Provides wrapper functions for interacting with Chrome's Translator API
 * (Chrome 130+) for multilingual text translation.
 * 
 * @module translatorApi
 */

import type {
  TranslatorAvailability,
  TranslatorAvailabilityResult,
  TranslatorSession,
  TranslatorSessionResult,
  TranslateResult,
  LanguageCode,
} from '../types/translator';

/**
 * Check if the browser supports the Translator API
 * 
 * According to docs: Check for 'Translator' in self (global namespace)
 * 
 * @returns true if Translator API is available
 * 
 * @example
 * ```typescript
 * if (isTranslatorApiSupported()) {
 *   const availability = await checkTranslatorAvailability();
 * }
 * ```
 */
export function isTranslatorApiSupported(): boolean {
  return 'Translator' in globalThis;
}

/**
 * Check the availability status of the Translator API
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
 * const result = await checkTranslatorAvailability();
 * if (result.status === 'available') {
 *   // Proceed with translator features
 * } else if (result.status === 'downloading') {
 *   // Show "model downloading" message
 * } else {
 *   // Hide language selector
 * }
 * ```
 */
/**
 * Check the availability status of the Translator API for a specific language pair
 * or general availability if no language pair is specified.
 * 
 * Note: According to the docs, Translator.availability() requires language pair parameters.
 * We'll use a default pair (en->es) for general availability check.
 */
export async function checkTranslatorAvailability(
  sourceLanguage: LanguageCode = 'en',
  targetLanguage: LanguageCode = 'es'
): Promise<TranslatorAvailabilityResult> {
  try {
    if (!isTranslatorApiSupported()) {
      return {
        status: 'unavailable',
        error: 'Translator API not supported in this browser. Requires Chrome 130+ with flag enabled.',
      };
    }

    const Translator = (globalThis as any).Translator;
    
    // Translator.availability() requires language pair parameters
    const availability = await Translator.availability({
      sourceLanguage,
      targetLanguage,
    });
    
    console.log('[Translator API] Raw availability response:', availability, `(${sourceLanguage}->${targetLanguage})`);
    
    // API returns various statuses, normalize them:
    // 'available' | 'readily' → 'available'
    // 'downloadable' | 'after-download' → 'downloading' (model needs download)
    // 'downloading' → 'downloading' (currently downloading)
    // 'no' | 'unavailable' → 'unavailable'
    let status: TranslatorAvailability;
    
    if (availability === 'readily' || availability === 'available') {
      status = 'available';
    } else if (availability === 'downloadable' || availability === 'after-download' || availability === 'downloading') {
      status = 'downloading';
    } else if (availability === 'no') {
      status = 'unavailable';
    } else {
      // Handle any other status
      status = availability as TranslatorAvailability;
    }

    return {
      status,
      error: status === 'unavailable'
        ? 'Translator API not available. Your device may not meet hardware requirements.'
        : status === 'downloading'
        ? 'Translation model is downloading. This may take some time.'
        : undefined,
    };
  } catch (error) {
    console.error('[Translator API] Availability check failed:', error);
    return {
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown error checking availability',
    };
  }
}

/**
 * Create a new Translator session for text translation
 * 
 * Sessions can be reused for multiple translation operations and must be destroyed
 * when no longer needed to prevent memory leaks. Always call destroyTranslatorSession()
 * or session.destroy() when done.
 * 
 * @param sourceLanguage - Source language code (ISO 639-1)
 * @param targetLanguage - Target language code (ISO 639-1)
 * @returns Promise resolving to session result with session object or error
 * 
 * @example
 * ```typescript
 * const result = await createTranslatorSession('en', 'es');
 * 
 * if (result.success && result.session) {
 *   const translated = await result.session.translate('Hello world');
 *   console.log(translated); // 'Hola mundo'
 *   result.session.destroy(); // Always cleanup!
 * }
 * ```
 */
export async function createTranslatorSession(
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode
): Promise<TranslatorSessionResult> {
  try {
    if (!isTranslatorApiSupported()) {
      return {
        success: false,
        error: 'unavailable',
        message: 'Translator API not supported in this browser',
      };
    }

    if (sourceLanguage === targetLanguage) {
      return {
        success: false,
        error: 'session_error',
        message: 'Source and target languages must be different',
      };
    }

    const Translator = (globalThis as any).Translator;
    
    // Check availability before creating session
    const availability = await Translator.availability({
      sourceLanguage,
      targetLanguage,
    });
    
    console.log('[Translator API] Language pair availability:', availability);
    
    if (availability === 'no' || availability === 'unavailable') {
      return {
        success: false,
        error: 'unavailable',
        message: 'Translator API not available for this language pair',
      };
    }

    if (availability === 'downloadable' || availability === 'after-download') {
      // Model needs to be downloaded - calling create() will trigger the download
      console.log('[Translator API] Model downloadable, calling create() to trigger download...');
      
      try {
        // Actually call create() to start the download
        const session: TranslatorSession = await Translator.create({
          sourceLanguage,
          targetLanguage,
        });
        
        console.log('[Translator API] Download triggered and session created successfully');
        
        return {
          success: true,
          session,
        };
      } catch (error) {
        // Download may have been triggered but not complete yet
        console.log('[Translator API] Download triggered, but model not ready yet:', error);
        return {
          success: false,
          error: 'downloading',
          message: 'Translation model is downloading in the background. Please try again in a moment.',
        };
      }
    }
    
    if (availability === 'downloading') {
      // Model is currently downloading
      console.log('[Translator API] Model is currently downloading...');
      return {
        success: false,
        error: 'downloading',
        message: 'Translation model is downloading. Please wait and try again.',
      };
    }

    // Create session with language pair
    const session: TranslatorSession = await Translator.create({
      sourceLanguage,
      targetLanguage,
    });

    console.log('[Translator API] Session created:', {
      sourceLanguage,
      targetLanguage,
    });

    return {
      success: true,
      session,
    };
  } catch (error) {
    console.error('[Translator API] Session creation failed:', error);
    return {
      success: false,
      error: 'session_error',
      message: error instanceof Error ? error.message : 'Failed to create Translator session',
    };
  }
}

/**
 * Translate text using an active Translator session
 * 
 * This function translates the input text from the source language to the target language
 * configured in the session. The session must be active and not destroyed.
 * 
 * @param session - Active Translator session
 * @param text - Text to translate
 * @returns Promise resolving to translate result with translated text or error
 * 
 * @example
 * ```typescript
 * const sessionResult = await createTranslatorSession('en', 'es');
 * if (sessionResult.success && sessionResult.session) {
 *   const translateResult = await translateText(
 *     sessionResult.session, 
 *     'Hello, how are you?'
 *   );
 *   if (translateResult.success) {
 *     console.log(translateResult.translatedText);
 *     // 'Hola, ¿cómo estás?'
 *   }
 *   await destroyTranslatorSession(sessionResult.session);
 * }
 * ```
 */
export async function translateText(
  session: TranslatorSession,
  text: string
): Promise<TranslateResult> {
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

    const translatedText = await session.translate(text);

    console.log('[Translator API] Text translated:', {
      originalLength: text.length,
      translatedLength: translatedText.length,
    });

    return {
      success: true,
      translatedText,
    };
  } catch (error) {
    console.error('[Translator API] Translation failed:', error);
    
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
      error: 'translate_error',
      message: error instanceof Error ? error.message : 'Unknown error during translation',
    };
  }
}

/**
 * Destroy a Translator session and free resources
 * 
 * This function safely destroys a session, handling errors and null/undefined values.
 * Always call this when done with a session to prevent memory leaks.
 * 
 * Note: Sessions are lightweight (<10MB) but should still be cleaned up properly.
 * Consider reusing sessions for multiple translations with the same language pair
 * rather than creating a new session for each translation.
 * 
 * @param session - The Translator session to destroy
 * 
 * @example
 * ```typescript
 * const result = await createTranslatorSession('en', 'es');
 * if (result.success && result.session) {
 *   // Use session for multiple translations...
 *   await translateText(result.session, 'Hello');
 *   await translateText(result.session, 'Goodbye');
 *   
 *   // Cleanup when done
 *   await destroyTranslatorSession(result.session);
 * }
 * ```
 */
export async function destroyTranslatorSession(
  session: TranslatorSession | null | undefined
): Promise<void> {
  if (!session) {
    return;
  }

  try {
    session.destroy();
    console.log('[Translator API] Session destroyed');
  } catch (error) {
    console.error('[Translator API] Error destroying session:', error);
  }
}
