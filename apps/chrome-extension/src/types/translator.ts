/**
 * TypeScript type definitions for Chrome Built-in AI Translator API
 * Based on Chrome 130+ AI API specifications
 */

/**
 * Availability status of the Translator API
 * - 'available': API is ready to use
 * - 'downloading': Model is still downloading
 * - 'unavailable': API not available in this browser/version
 */
export type TranslatorAvailability = 'available' | 'downloading' | 'unavailable';

/**
 * ISO 639-1 language codes supported by the Translator API
 * 
 * Supported languages:
 * - en: English
 * - es: Spanish
 * - fr: French
 * - de: German
 * - it: Italian
 * - pt: Portuguese
 * - ja: Japanese
 * - zh: Chinese
 * - ko: Korean
 * - ar: Arabic
 */
export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja' | 'zh' | 'ko' | 'ar';

/**
 * Language display names for UI
 */
export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

/**
 * Supported languages with display names
 */
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

/**
 * Options for creating a translator session
 * 
 * @example
 * ```typescript
 * const options: TranslatorOptions = {
 *   sourceLanguage: 'en',
 *   targetLanguage: 'es'
 * };
 * ```
 */
export interface TranslatorOptions {
  /**
   * Source language code (ISO 639-1)
   * @default 'en'
   */
  sourceLanguage: LanguageCode;

  /**
   * Target language code (ISO 639-1)
   */
  targetLanguage: LanguageCode;
}

/**
 * Translator session interface for translating text
 * 
 * Sessions must be destroyed when no longer needed to free resources.
 * Always call destroy() when done to prevent memory leaks.
 */
export interface TranslatorSession {
  /**
   * Translate the provided text
   * 
   * @param text - The text to translate
   * @returns Promise resolving to the translated text
   * 
   * @example
   * ```typescript
   * const translated = await session.translate('Hello world');
   * console.log(translated); // 'Hola mundo' (if target is 'es')
   * ```
   */
  translate(text: string): Promise<string>;

  /**
   * Translate text with streaming output (for future enhancement)
   * 
   * @param text - The text to translate
   * @returns Async iterable of translation chunks
   * 
   * @example
   * ```typescript
   * const stream = session.translateStreaming('Hello world');
   * for await (const chunk of stream) {
   *   console.log(chunk); // Process each chunk as it arrives
   * }
   * ```
   */
  translateStreaming(text: string): AsyncIterable<string>;

  /**
   * Destroy the session and free resources
   * 
   * Always call this when done with the session to prevent memory leaks.
   * 
   * @example
   * ```typescript
   * session.destroy();
   * ```
   */
  destroy(): void;
}

/**
 * Result type for translator availability checks
 */
export interface TranslatorAvailabilityResult {
  /**
   * The availability status
   */
  status: TranslatorAvailability;

  /**
   * Error message if unavailable
   */
  error?: string;
}

/**
 * Result type for translator session operations
 */
export interface TranslatorSessionResult {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * The created session (if successful)
   */
  session?: TranslatorSession;

  /**
   * Error code if operation failed
   */
  error?: 'unavailable' | 'downloading' | 'session_error';

  /**
   * Human-readable error message
   */
  message?: string;
}

/**
 * Result type for translate operations
 */
export interface TranslateResult {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * The translated text (if successful)
   */
  translatedText?: string;

  /**
   * Error code if operation failed
   */
  error?: 'invalid_input' | 'translate_error' | 'session_destroyed';

  /**
   * Human-readable error message
   */
  message?: string;
}
