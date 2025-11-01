/**
 * TypeScript type definitions for Chrome Built-in AI Summarizer API
 * Based on Chrome 128+ AI API specifications
 */

/**
 * Availability status of the Summarizer API
 * - 'ready': API is ready to use immediately
 * - 'downloadable': Model needs to be downloaded first
 * - 'downloading': Model is currently being downloaded
 * - 'unavailable': API not available in this browser/version
 */
export type SummarizerAvailability = 'ready' | 'downloadable' | 'downloading' | 'unavailable';

/**
 * Type option for summarization
 * - 'key-points': Extract important points as bulleted list (default)
 * - 'tldr': Short and to the point, quick overview
 * - 'teaser': Most interesting/intriguing parts to draw reader in
 * - 'headline': Main point in single sentence, article headline format
 */
export type SummarizerType = 'key-points' | 'tldr' | 'teaser' | 'headline';

/**
 * Format option for summary output
 * - 'plain-text': Output as plain text
 * - 'markdown': Output in markdown format
 */
export type SummarizerFormat = 'plain-text' | 'markdown';

/**
 * Length option for summary
 * - 'short': Brief summary (1-2 sentences or 3-5 bullet points)
 * - 'medium': Moderate summary (3-5 sentences or 6-10 bullet points)
 * - 'long': Detailed summary (6+ sentences or 10+ bullet points)
 */
export type SummarizerLength = 'short' | 'medium' | 'long';

/**
 * Download progress event for model download monitoring
 */
export interface SummarizerDownloadProgressEvent extends Event {
  loaded: number; // Progress as a decimal (0.0 to 1.0)
}

/**
 * Monitor callback for tracking model download progress
 */
export interface SummarizerMonitor {
  addEventListener(event: 'downloadprogress', callback: (e: SummarizerDownloadProgressEvent) => void): void;
}

/**
 * Options for creating a summarizer session
 * 
 * @example
 * ```typescript
 * const options: SummarizerOptions = {
 *   sharedContext: 'This is a scientific article',
 *   type: 'key-points',
 *   format: 'markdown',
 *   length: 'medium',
 *   monitor(m) {
 *     m.addEventListener('downloadprogress', (e) => {
 *       console.log(`Downloaded ${e.loaded * 100}%`);
 *     });
 *   }
 * };
 * ```
 */
export interface SummarizerOptions {
  /**
   * Additional shared context that can help the summarizer
   * @example 'This is a scientific article'
   */
  sharedContext?: string;

  /**
   * The type of summary to generate
   * @default 'key-points'
   */
  type?: SummarizerType;

  /**
   * The format to use for output
   * @default 'markdown'
   */
  format?: SummarizerFormat;

  /**
   * The desired length of the summary
   * @default 'medium'
   */
  length?: SummarizerLength;

  /**
   * Callback to monitor model download progress
   */
  monitor?: (monitor: SummarizerMonitor) => void;
}

/**
 * Summarizer session interface for summarizing text
 * 
 * Sessions must be destroyed when no longer needed to free resources.
 * Always call destroy() when done to prevent memory leaks.
 */
export interface SummarizerSession {
  /**
   * Summarize the provided text (batch mode)
   * 
   * @param text - The text to summarize
   * @param options - Optional context for better summarization
   * @returns Promise resolving to the summarized text
   * 
   * @example
   * ```typescript
   * const summary = await session.summarize(longText, {
   *   context: 'This article is intended for a tech-savvy audience.'
   * });
   * console.log(summary); // Condensed version
   * ```
   */
  summarize(text: string, options?: { context?: string }): Promise<string>;

  /**
   * Summarize text with streaming output
   * 
   * @param text - The text to summarize
   * @param options - Optional context for better summarization
   * @returns Async iterable of summary chunks
   * 
   * @example
   * ```typescript
   * const stream = session.summarizeStreaming(longText, {
   *   context: 'This article is intended for junior developers.'
   * });
   * for await (const chunk of stream) {
   *   console.log(chunk); // Process each chunk as it arrives
   * }
   * ```
   */
  summarizeStreaming(text: string, options?: { context?: string }): AsyncIterable<string>;

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
 * Result type for summarizer availability checks
 */
export interface SummarizerAvailabilityResult {
  /**
   * The availability status
   */
  status: SummarizerAvailability;

  /**
   * Error message if unavailable
   */
  error?: string;
}

/**
 * Result type for summarizer session operations
 */
export interface SummarizerSessionResult {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * The created session (if successful)
   */
  session?: SummarizerSession;

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
 * Result type for summarize operations
 */
export interface SummaryResult {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * The summarized text (if successful)
   */
  summary?: string;

  /**
   * Error code if operation failed
   */
  error?: 'invalid_input' | 'summarize_error' | 'session_destroyed';

  /**
   * Human-readable error message
   */
  message?: string;
}
