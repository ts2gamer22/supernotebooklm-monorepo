/**
 * TypeScript type definitions for Chrome Built-in AI APIs
 * Based on @types/dom-chromium-ai and Chrome 138+ API
 */

/**
 * Availability status of the Prompt API
 */
export type AIAvailability = 'available' | 'downloading' | 'unavailable';

/**
 * Supported output languages for Gemini Nano
 */
export type OutputLanguage = 'en' | 'es' | 'ja';

/**
 * Options for creating an AI session
 */
export interface AISessionOptions {
  /**
   * System prompt to set the AI's behavior and context
   * @example "You are a helpful research assistant for academic work."
   */
  systemPrompt?: string;

  /**
   * Temperature controls randomness (0.0 to 2.0)
   * Higher = more creative, Lower = more focused
   * @default 1
   */
  temperature?: number;

  /**
   * Top-K sampling parameter
   * Number of highest probability tokens to consider
   * @default 3
   */
  topK?: number;

  /**
   * Output language code for responses
   * Ensures optimal output quality and safety attestation
   * @default 'en'
   */
  outputLanguage?: OutputLanguage;
}

/**
 * AI session interface for interacting with Gemini Nano
 */
export interface AISession {
  /**
   * Send a text prompt and get a response
   * @param prompt - The text prompt to send to the AI
   * @returns Promise resolving to the AI's text response
   */
  prompt(prompt: string): Promise<string>;

  /**
   * Send a prompt and receive streaming response
   * @param prompt - The text prompt to send to the AI
   * @returns Async iterable of response chunks
   */
  promptStreaming(prompt: string): AsyncIterable<string>;

  /**
   * Destroy the session and free resources
   * Always call this when done to prevent memory leaks
   */
  destroy(): void;

  /**
   * Add event listener for session events
   * @param event - Event name (e.g., 'quotaoverflow')
   * @param callback - Callback function
   */
  addEventListener(event: string, callback: () => void): void;

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: () => void): void;

  /**
   * Current context token usage
   */
  inputUsage: number;

  /**
   * Maximum context token quota (typically 6144)
   */
  inputQuota: number;

  /**
   * Current temperature setting
   */
  temperature: number;

  /**
   * Current top-K setting
   */
  topK: number;
}

/**
 * Message in a conversation
 */
export interface AIMessage {
  /**
   * Unique message ID
   */
  id: string;

  /**
   * Role of the message sender
   */
  role: 'user' | 'assistant';

  /**
   * Message content (may be translated if auto-translate is enabled)
   */
  content: string;

  /**
   * Original untranslated content (English)
   * Stored when auto-translate is enabled so globe button can toggle between languages
   */
  originalContent?: string;

  /**
   * Timestamp when message was created
   */
  timestamp: number;

  /**
   * Whether this message resulted in an error
   */
  error?: boolean;

  /**
   * Extracted follow-up question suggestions
   * Displayed as clickable chips below message
   */
  suggestions?: string[];
}

/**
 * Error states for AI operations
 */
export type AIError = 
  | 'unavailable'          // API not available in this browser
  | 'downloading'          // Model still downloading
  | 'quota_exceeded'       // Context window exceeded
  | 'network_error'        // Network/API call failed
  | 'invalid_input'        // Invalid prompt or parameters
  | 'session_error'        // Session creation or management failed
  | 'unknown';             // Unknown error occurred

/**
 * Result type for availability checks
 */
export interface AvailabilityResult {
  status: AIAvailability;
  error?: string;
}

/**
 * Result type for session operations
 */
export interface SessionResult {
  success: boolean;
  session?: AISession;
  error?: AIError;
  message?: string;
}

/**
 * Result type for prompt operations
 */
export interface PromptResult {
  success: boolean;
  response?: string;
  error?: AIError;
  message?: string;
}
