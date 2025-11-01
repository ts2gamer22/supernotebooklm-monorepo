/**
 * TypeScript type definitions for Chrome Built-in AI Rewriter API
 * Based on Chrome 128+ AI API specifications
 */

/**
 * Availability status of the Rewriter API
 * - 'available': API is ready to use
 * - 'downloading': Model is still downloading
 * - 'unavailable': API not available in this browser/version
 */
export type RewriterAvailability = 'available' | 'downloading' | 'unavailable';

/**
 * Tone option for rewriting
 * - 'as-is': Keep the same tone
 * - 'more-formal': Make the text more formal
 * - 'more-casual': Make the text more casual
 */
export type RewriterTone = 'as-is' | 'more-formal' | 'more-casual';

/**
 * Format option for rewriting
 * - 'as-is': Keep the same format
 * - 'plain-text': Output as plain text
 * - 'markdown': Output in markdown format
 */
export type RewriterFormat = 'as-is' | 'plain-text' | 'markdown';

/**
 * Length option for rewriting
 * - 'as-is': Keep approximately the same length
 * - 'shorter': Make the text shorter
 * - 'longer': Make the text longer/more detailed
 */
export type RewriterLength = 'as-is' | 'shorter' | 'longer';

/**
 * Options for creating a rewriter session
 * 
 * @example
 * ```typescript
 * const options: RewriterOptions = {
 *   tone: 'more-formal',
 *   format: 'as-is',
 *   length: 'as-is'
 * };
 * ```
 */
export interface RewriterOptions {
  /**
   * The tone to apply when rewriting
   * @default 'as-is'
   */
  tone?: RewriterTone;

  /**
   * The format to use for output
   * @default 'as-is'
   */
  format?: RewriterFormat;

  /**
   * The desired length of the rewritten text
   * @default 'as-is'
   */
  length?: RewriterLength;
}

/**
 * Rewriter session interface for rewriting text
 * 
 * Sessions must be destroyed when no longer needed to free resources.
 * Always call destroy() when done to prevent memory leaks.
 */
export interface RewriterSession {
  /**
   * Rewrite the provided text
   * 
   * @param text - The text to rewrite
   * @param options - Optional rewrite options including context
   * @returns Promise resolving to the rewritten text
   * 
   * @example
   * ```typescript
   * const enhanced = await session.rewrite('tell me about quantum stuff', {
   *   context: 'Rewrite this as a clear question for an AI assistant'
   * });
   * // Result: "Can you explain the fundamental concepts of quantum physics?"
   * ```
   */
  rewrite(text: string, options?: { context?: string }): Promise<string>;

  /**
   * Rewrite text with streaming output (for future enhancement)
   * 
   * @param text - The text to rewrite
   * @returns Async iterable of rewrite chunks
   * 
   * @example
   * ```typescript
   * const stream = session.rewriteStreaming('tell me about quantum stuff');
   * for await (const chunk of stream) {
   *   console.log(chunk); // Process each chunk as it arrives
   * }
   * ```
   */
  rewriteStreaming(text: string): AsyncIterable<string>;

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
 * Result type for rewriter availability checks
 */
export interface RewriterAvailabilityResult {
  /**
   * The availability status
   */
  status: RewriterAvailability;

  /**
   * Error message if unavailable
   */
  error?: string;
}

/**
 * Result type for rewriter session operations
 */
export interface RewriterSessionResult {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * The created session (if successful)
   */
  session?: RewriterSession;

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
 * Result type for rewrite operations
 */
export interface RewriteResult {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * The rewritten text (if successful)
   */
  rewrittenText?: string;

  /**
   * Error code if operation failed
   */
  error?: 'invalid_input' | 'rewrite_error' | 'session_destroyed';

  /**
   * Human-readable error message
   */
  message?: string;
}
