import { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { Bot, Send, AlertCircle, RefreshCw, Trash2, Square, Loader2, Sparkles, RotateCcw, Search } from 'lucide-react';
import { ThinkingDots } from '../ui/ThinkingDots';
import { checkAvailability, createSession, destroySession, promptTextStreaming } from '../../../../src/lib/promptApi';
import { checkRewriterAvailability, createRewriterSession, rewriteText, destroyRewriterSession } from '../../../../src/lib/rewriterApi';
import { checkTranslatorAvailability, createTranslatorSession, translateText, destroyTranslatorSession } from '../../../../src/lib/translatorApi';
import { extractSuggestions } from '../../../../src/lib/suggestionExtractor';
import type { AIAvailability, AISession, AIMessage } from '../../../../src/types/ai';
import type { RewriterAvailability, RewriterSession } from '../../../../src/types/rewriter';
import type { TranslatorAvailability, TranslatorSession, LanguageCode } from '../../../../src/types/translator';
import { ChatMessage } from './ChatMessage';
import { useChatStore } from '../../store/chatStore';
import { SearchResults } from '../search/SearchResults';
import { QueryHistory } from '../search/QueryHistory';
import { ChatLearningSuggestions } from '../search/ChatLearningSuggestions';
import { searchAllSources, askNotebookLMWithContext, debounce } from '../../../../src/services/SearchService';
import type { SearchResult } from '../../../../src/types/search';

/**
 * AI Assistant Tab Component
 * 
 * Provides an interface for users to interact with Chrome's built-in Gemini Nano
 * model via the Prompt API. Handles session management, availability checking,
 * and graceful degradation.
 */
export function AIAssistantTab() {
  // Mode: 'chat' or 'search'
  const [mode, setMode] = useState<'chat' | 'search'>('chat');
  
  // State management
  const [availability, setAvailability] = useState<AIAvailability>('unavailable');
  const [session, setSession] = useState<AISession | null>(null);
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const setMessages = useChatStore((s) => s.setMessages);
  const clearChat = useChatStore((s) => s.clearChat);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true);
  
  // Rewriter state
  const [rewriterAvailability, setRewriterAvailability] = useState<RewriterAvailability>('unavailable');
  const [rewriterSession, setRewriterSession] = useState<RewriterSession | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState<string>('');
  const [isEnhanced, setIsEnhanced] = useState(false);
  
  // Translator state
  const [translatorAvailability, setTranslatorAvailability] = useState<TranslatorAvailability>('unavailable');
  const [translatorSession, setTranslatorSession] = useState<TranslatorSession | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Streaming state
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'streaming' | 'stopping'>('idle');
  
  // AbortController ref for cancellation (AsyncIterable doesn't have .cancel())
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Auto-scroll management
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Follow-up suggestions state (opt-in)
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Ref for auto-scrolling to latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Check AI availability on component mount
   */
  useEffect(() => {
    async function checkAI() {
      setIsCheckingAvailability(true);
      const result = await checkAvailability();
      setAvailability(result.status);
      
      if (result.status === 'unavailable') {
        setError(result.error || 'AI features are not available');
      } else if (result.status === 'downloading') {
        setError('AI model is downloading. This may take 30 minutes to 4 hours.');
      }
      
      setIsCheckingAvailability(false);
    }

    checkAI();
  }, []);

  /**
   * Check Rewriter availability on component mount
   */
  useEffect(() => {
    async function checkRewriter() {
      const result = await checkRewriterAvailability();
      setRewriterAvailability(result.status);
      
      // Only log if available, don't show errors for optional feature
      if (result.status === 'available') {
        console.log('[Rewriter] Enhancement feature available');
      }
    }

    checkRewriter();
  }, []);
  
  /**
   * Check Translator availability and load language preference
   */
  useEffect(() => {
    async function checkTranslator() {
      const result = await checkTranslatorAvailability();
      setTranslatorAvailability(result.status);
      
      if (result.status === 'available') {
        console.log('[Translator] Translation feature available');
      }
    }

    async function loadLanguagePreference() {
      try {
        const stored = await chrome.storage.local.get('selectedLanguage');
        if (stored.selectedLanguage) {
          setSelectedLanguage(stored.selectedLanguage as LanguageCode);
        }
      } catch (error) {
        console.error('[Translator] Failed to load language preference:', error);
      }
    }

    checkTranslator();
    loadLanguagePreference();
    
    // Listen for language preference changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local' && changes.selectedLanguage) {
        setSelectedLanguage(changes.selectedLanguage.newValue as LanguageCode);
      }
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  /**
   * Create rewriter session when availability is 'available'
   * Note: When status is 'downloading', we need user gesture, so session
   * creation happens on first Enhance button click instead
   */
  useEffect(() => {
    if (rewriterAvailability === 'available' && !rewriterSession) {
      async function initRewriterSession() {
        console.log('[Rewriter] Creating session automatically (status: available)');
        const result = await createRewriterSession({
          tone: 'as-is',
          format: 'as-is',
          length: 'as-is',
        });

        if (result.success && result.session) {
          setRewriterSession(result.session);
          console.log('[Rewriter] Session created successfully!');
        } else {
          console.log('[Rewriter] Session creation failed:', result.message);
        }
      }

      initRewriterSession();
    }
  }, [rewriterAvailability, rewriterSession]);

  /**
   * Create session when availability is confirmed
   */
  useEffect(() => {
    if (availability === 'available' && !session) {
      async function initSession() {
        const result = await createSession({
          systemPrompt: `You are a helpful AI research assistant. Follow these guidelines strictly:

## Response Format:
1. Provide clear, well-structured answers
2. Use markdown formatting (bold, italic, lists, code blocks)
3. Keep responses concise but comprehensive
4. Use proper paragraphs with line breaks

## Code Formatting:
- Use code blocks with language tags: \`\`\`javascript, \`\`\`python, etc.
- Use inline code for short snippets: \`variable\`

## Follow-up Questions:
ALWAYS end your response with exactly this format:

Follow-up questions:
- [Question about deeper details]?
- [Question about related concepts]?
- [Question about practical applications]?

IMPORTANT: 
- The "Follow-up questions:" section must be at the very end
- Use exactly this format with bullet points (-)
- Each question must end with (?)
- Provide 2-3 relevant follow-up questions
- Questions should help users explore the topic further`,
          outputLanguage: 'en',
        });

        if (result.success && result.session) {
          setSession(result.session);
          setError(null);
        } else {
          setError(result.message || 'Failed to create AI session');
        }
      }

      initSession();
    }
  }, [availability, session]);

  /**
   * Create translator session when availability is confirmed and language changes
   */
  useEffect(() => {
    // Only create session if translator available, language is not English, and no existing session
    if (translatorAvailability === 'available' && selectedLanguage !== 'en') {
      async function initTranslatorSession() {
        // Destroy existing session if any
        if (translatorSession) {
          await destroyTranslatorSession(translatorSession);
          setTranslatorSession(null);
        }
        
        const result = await createTranslatorSession('en', selectedLanguage);
        
        if (result.success && result.session) {
          setTranslatorSession(result.session);
          console.log('[Translator] Session created for en →', selectedLanguage);
        }
      }

      initTranslatorSession();
    } else if (translatorSession && selectedLanguage === 'en') {
      // Destroy session if switching back to English
      destroyTranslatorSession(translatorSession);
      setTranslatorSession(null);
    }
  }, [translatorAvailability, selectedLanguage]);

  /**
   * Cleanup sessions on unmount (prevents memory leaks)
   * IMPORTANT: Empty dependency array ensures cleanup ONLY runs on unmount,
   * not when session state variables change
   */
  useEffect(() => {
    return () => {
      // Use refs to access latest session values without causing re-renders
      if (session) {
        destroySession(session);
      }
      if (rewriterSession) {
        destroyRewriterSession(rewriterSession);
      }
      if (translatorSession) {
        destroyTranslatorSession(translatorSession);
      }
    };
  }, []); // Empty array = cleanup only on unmount

  /**
   * Auto-scroll to latest message (including streaming content)
   * Only scrolls if autoScroll is enabled
   */
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, autoScroll]);

  /**
   * Handle scroll to detect user scrolling up
   * Disables auto-scroll when user scrolls up manually
   */
  function handleScroll() {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    
    // Re-enable auto-scroll when user scrolls back to bottom
    // Disable when scrolling up
    setAutoScroll(isAtBottom);
  }

  /**
   * Helper function to translate message content if translator is available AND auto-translate is on
   */
  async function translateMessageContent(content: string): Promise<string> {
    // Read the autoTranslate setting directly from storage to get the latest value
    const stored = await chrome.storage.local.get('autoTranslate');
    const autoTranslate = stored.autoTranslate ?? false;

    // Only translate if auto-translate is enabled, a session exists, and language is not English
    if (!autoTranslate || selectedLanguage === 'en' || !translatorSession) {
      return content;
    }
    
    setIsTranslating(true);
    
    try {
      const result = await translateText(translatorSession, content);
      
      if (result.success && result.translatedText) {
        console.log('[Translator] Message auto-translated to', selectedLanguage);
        return result.translatedText;
      } else {
        console.error('[Translator] Auto-translation failed:', result.message);
        return content; // Return original if translation fails
      }
    } catch (error) {
      console.error('[Translator] Auto-translation error:', error);
      return content; // Return original on error
    } finally {
      setIsTranslating(false);
    }
  }

  /**
   * Stop the current streaming generation
   */
  function handleStop() {
    if (abortControllerRef.current && status === 'streaming') {
      console.log('[AIAssistantTab] Stop button clicked - aborting stream');
      setStatus('stopping');
      abortControllerRef.current.abort();
    }
  }

  /**
   * Handle form submission with streaming
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!inputText.trim() || !session || isLoading || streamingMessageId) {
      return;
    }

    const userMessage: AIMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now(),
    };

addMessage(userMessage);
    setInputText('');
    setIsLoading(true);
    setError(null);
    setStatus('streaming');
    setAutoScroll(true); // Re-enable auto-scroll when sending new message
    setShowSuggestions(false); // Hide suggestions when user sends new message

    // Generate unique ID for streaming message
    const assistantMessageId = `${Date.now()}-assistant`;
    setStreamingMessageId(assistantMessageId);
    setStreamingContent('');

    let fullContent = '';
    let wasStopped = false;

    // Create AbortController for this stream
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Use streaming API
      const stream = await promptTextStreaming(session, userMessage.content);
      
      // Process stream chunks using for-await-of loop
      try {
        for await (const chunk of stream) {
          // Check if aborted
          if (abortController.signal.aborted) {
            console.log('[AIAssistantTab] Stream aborted by user');
            wasStopped = true;
            break;
          }
          
          fullContent += chunk;
          setStreamingContent(fullContent);
        }
      } catch (iterationError) {
        // Check if it was a user-initiated stop
        if (abortController.signal.aborted || status === 'stopping') {
          console.log('[AIAssistantTab] Stream stopped by user');
          wasStopped = true;
        } else {
          throw iterationError;
        }
      } finally {
        abortControllerRef.current = null;
      }

      // Extract suggestions from AI response
      const suggestions = extractSuggestions(fullContent);
      
      // Translate content if language is not English and auto-translate is enabled
      let finalContent = fullContent || (wasStopped ? '(Response stopped by user)' : 'No response generated.');
      let originalEnglishContent: string | undefined = undefined;
      
      if (!wasStopped && fullContent) {
        const translatedContent = await translateMessageContent(fullContent);
        // If translation occurred (content changed), store the original
        if (translatedContent !== fullContent) {
          originalEnglishContent = fullContent;
          finalContent = translatedContent;
        }
      }
      
      // Finalize message after stream completes or is stopped
      const assistantMessage: AIMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: finalContent,
        originalContent: originalEnglishContent,
        timestamp: Date.now(),
        suggestions: !wasStopped && suggestions.length > 0 ? suggestions : undefined,
      };
addMessage(assistantMessage);
      if (!wasStopped) {
        setError(null);
      }
    } catch (err) {
      // Handle streaming error - show partial content if any
      const errorMessage: AIMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: fullContent || 'An unexpected error occurred while generating response.',
        timestamp: Date.now(),
        error: true,
      };
addMessage(errorMessage);
      setError(err instanceof Error ? err.message : 'Stream failed unexpectedly');
    } finally {
      setStreamingMessageId(null);
      setStreamingContent('');
      setIsLoading(false);
      setStatus('idle');
      abortControllerRef.current = null;
    }
  }

  /**
   * Handle search with debouncing
   */
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const results = await searchAllSources({
        query: query.trim(),
        limit: 20,
        minRelevanceScore: 0,
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('[AIAssistantTab] Search failed:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => performSearch(query), 300),
    [performSearch]
  );
  
  /**
   * Handle search input change
   */
  function handleSearchInputChange(value: string) {
    setSearchQuery(value);
    debouncedSearch(value);
  }
  
  /**
   * Handle clicking "Ask NotebookLM with Context" button
   */
  async function handleAskNotebookLM(result: SearchResult) {
    try {
      await askNotebookLMWithContext(result, searchQuery);
    } catch (error) {
      console.error('[AIAssistantTab] Ask NotebookLM failed:', error);
      setSearchError('Failed to open NotebookLM. Please try again.');
    }
  }
  
  /**
   * Handle re-running a query from history
   */
  function handleRerunQuery(query: string) {
    setSearchQuery(query);
    performSearch(query);
  }
  
  /**
   * Handle clicking a learning suggestion
   */
  function handleLearningSuggestionClick(suggestion: string) {
    setSearchQuery(suggestion);
    performSearch(suggestion);
  }

  /**
   * Clear conversation history
   */
function handleClearConversation() {
    clearChat();
    setError(null);
  }

  /**
   * Handle prompt enhancement using Rewriter API
   * If session doesn't exist yet (status was 'downloading'), create it now with user gesture
   */
  async function handleEnhancePrompt() {
    if (!inputText.trim() || isEnhancing) {
      return;
    }

    setIsEnhancing(true);

    try {
      // If we don't have a session yet (because status was 'downloading'),
      // create it now with this user gesture
      let session = rewriterSession;
      if (!session && rewriterAvailability === 'downloading') {
        console.log('[Rewriter] Creating session on user gesture (status: downloading)');
        const result = await createRewriterSession({
          tone: 'as-is',
          format: 'as-is',
          length: 'as-is',
        });

        if (result.success && result.session) {
          session = result.session;
          setRewriterSession(session);
          setRewriterAvailability('available'); // Update status
          console.log('[Rewriter] Session created successfully with user gesture!');
        } else {
          console.error('[Rewriter] Session creation failed:', result.message);
          setIsEnhancing(false);
          return;
        }
      }

      if (!session) {
        console.error('[Rewriter] No session available');
        setIsEnhancing(false);
        return;
      }

      setOriginalPrompt(inputText); // Save original

      // Call rewriteText with context to guide the model
      const result = await rewriteText(
        session, 
        inputText.trim(),
        'Enhance this user prompt to be clearer, more specific, and better structured for asking an AI assistant. Keep it concise and maintain the original intent. Output only the improved prompt, not an answer.'
      );
      
      if (result.success && result.rewrittenText) {
        setInputText(result.rewrittenText);
        setIsEnhanced(true);
      } else {
        // If enhancement fails, just show error but keep original text
        console.error('[Rewriter] Enhancement failed:', result.message);
      }
    } catch (error) {
      console.error('[Rewriter] Enhancement error:', error);
    } finally {
      setIsEnhancing(false);
    }
  }

  /**
   * Toggle between original and enhanced prompt
   */
  function handleToggleEnhanced() {
    if (isEnhanced && originalPrompt) {
      // Switch back to original
      const temp = inputText;
      setInputText(originalPrompt);
      setOriginalPrompt(temp);
      setIsEnhanced(false);
    } else if (!isEnhanced && originalPrompt) {
      // Switch back to enhanced
      const temp = inputText;
      setInputText(originalPrompt);
      setOriginalPrompt(temp);
      setIsEnhanced(true);
    }
  }

  /**
   * Handle clicking on a suggestion chip
   * Immediately submits the suggestion as a message
   */
  async function handleSuggestionClick(suggestion: string) {
    if (!session || isLoading || streamingMessageId) return;

    const userMessage: AIMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: suggestion,
      timestamp: Date.now(),
    };

addMessage(userMessage);
    setInputText('');
    setIsLoading(true);
    setError(null);
    setStatus('streaming');
    setAutoScroll(true);
    setShowSuggestions(false); // Hide suggestions when user clicks suggestion

    const assistantMessageId = `${Date.now()}-assistant`;
    setStreamingMessageId(assistantMessageId);
    setStreamingContent('');

    let fullContent = '';
    let wasStopped = false;

    // Create AbortController for this stream
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const stream = await promptTextStreaming(session, suggestion);
      
      // Process stream chunks using for-await-of loop
      try {
        for await (const chunk of stream) {
          // Check if aborted
          if (abortController.signal.aborted) {
            console.log('[AIAssistantTab] Stream aborted by user (suggestion)');
            wasStopped = true;
            break;
          }
          
          fullContent += chunk;
          setStreamingContent(fullContent);
        }
      } catch (iterationError) {
        // Check if it was a user-initiated stop
        if (abortController.signal.aborted || status === 'stopping') {
          console.log('[AIAssistantTab] Stream stopped by user (suggestion)');
          wasStopped = true;
        } else {
          throw iterationError;
        }
      } finally {
        abortControllerRef.current = null;
      }

      // Extract suggestions from AI response
      const suggestions = extractSuggestions(fullContent);
      
      // Translate content if language is not English and auto-translate is enabled
      let finalContent = fullContent || (wasStopped ? '(Response stopped by user)' : 'No response generated.');
      let originalEnglishContent: string | undefined = undefined;
      
      if (!wasStopped && fullContent) {
        const translatedContent = await translateMessageContent(fullContent);
        // If translation occurred (content changed), store the original
        if (translatedContent !== fullContent) {
          originalEnglishContent = fullContent;
          finalContent = translatedContent;
        }
      }
      
      const assistantMessage: AIMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: finalContent,
        originalContent: originalEnglishContent,
        timestamp: Date.now(),
        suggestions: !wasStopped && suggestions.length > 0 ? suggestions : undefined,
      };
addMessage(assistantMessage);
      if (!wasStopped) {
        setError(null);
      }
    } catch (err) {
      const errorMessage: AIMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: fullContent || 'An unexpected error occurred while generating response.',
        timestamp: Date.now(),
        error: true,
      };
addMessage(errorMessage);
      setError(err instanceof Error ? err.message : 'Stream failed unexpectedly');
    } finally {
      setStreamingMessageId(null);
      setStreamingContent('');
      setIsLoading(false);
      setStatus('idle');
      abortControllerRef.current = null;
    }
  }

  /**
   * Retry availability check
   */
  async function handleRetryAvailability() {
    setIsCheckingAvailability(true);
    setError(null);
    const result = await checkAvailability();
    setAvailability(result.status);
    
    if (result.status === 'unavailable') {
      setError(result.error || 'AI features are not available');
    } else if (result.status === 'downloading') {
      setError('AI model is downloading. Please wait.');
    }
    
    setIsCheckingAvailability(false);
  }

  /**
   * Render availability checking state
   */
  if (isCheckingAvailability) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Loader2 size={48} className="text-nb-blue mb-4 animate-spin" />
        <h2 className="text-xl font-semibold text-nb-text mb-2">Checking AI Availability</h2>
        <p className="text-nb-text-dim text-sm">Detecting Gemini Nano model...</p>
      </div>
    );
  }

  /**
   * Render unavailable state
   */
  if (availability === 'unavailable') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-nb-text mb-2">AI Not Available</h2>
        <p className="text-nb-text-dim text-sm mb-4">
          {error || 'Chrome AI features require Chrome 138+ Canary with Gemini Nano enabled.'}
        </p>
        <div className="bg-nb-dark-200 rounded-lg p-4 text-left text-sm text-nb-text-dim mb-4 max-w-md">
          <p className="font-semibold text-nb-text mb-2">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Install Chrome Canary (138+)</li>
            <li>Enable: chrome://flags/#optimization-guide-on-device-model</li>
            <li>Enable: chrome://flags/#prompt-api-for-gemini-nano</li>
            <li>Restart Chrome and wait for model download (~22GB)</li>
          </ol>
        </div>
        <button
          onClick={handleRetryAvailability}
          className="flex items-center gap-2 px-4 py-2 bg-nb-blue hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Retry Check
        </button>
      </div>
    );
  }

  /**
   * Render downloading state
   */
  if (availability === 'downloading') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Loader2 size={48} className="text-nb-purple mb-4 animate-spin" />
        <h2 className="text-xl font-semibold text-nb-text mb-2">Model Downloading</h2>
        <p className="text-nb-text-dim text-sm mb-4">
          Gemini Nano is downloading. This may take 30 minutes to 4 hours depending on your connection.
        </p>
        <p className="text-nb-text-dim text-xs">Please keep Chrome open and check back later.</p>
        <button
          onClick={handleRetryAvailability}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-nb-dark-200 hover:bg-nb-dark-300 text-nb-text rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Check Again
        </button>
      </div>
    );
  }

  /**
   * Render main AI Assistant interface
   */
  return (
    <div className="flex flex-col h-full bg-nb-dark-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-nb-dark-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-nb-blue" />
            <h3 className="text-sm font-semibold text-nb-text">AI Assistant</h3>
          </div>
          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-nb-dark-200 rounded-lg p-0.5">
            <button
              onClick={() => setMode('chat')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                mode === 'chat'
                  ? 'bg-nb-blue text-white'
                  : 'text-nb-text-dim hover:text-nb-text'
              }`}
            >
              <Bot size={12} className="inline mr-1" />
              Chat
            </button>
            <button
              onClick={() => setMode('search')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                mode === 'search'
                  ? 'bg-nb-purple text-white'
                  : 'text-nb-text-dim hover:text-nb-text'
              }`}
            >
              <Search size={12} className="inline mr-1" />
              Search
            </button>
          </div>
        </div>
        {mode === 'chat' && messages.length > 0 && (
          <button
            onClick={handleClearConversation}
            className="flex items-center gap-1 px-2 py-1 text-xs text-nb-text-dim hover:text-nb-text hover:bg-nb-dark-200 rounded transition-colors"
            title="Clear conversation"
          >
            <Trash2 size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Main content area - Chat or Search */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {mode === 'search' ? (
          /* Search Mode */
          <div className="space-y-4">
            {/* Search input */}
            <div className="sticky top-0 bg-nb-dark-100 pb-3 z-10">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                placeholder="Search your knowledge base..."
                className="w-full bg-nb-dark-200 text-nb-text placeholder-nb-text-dim rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nb-purple"
              />
              {searchQuery && !isSearching && (
                <p className="text-xs text-nb-text-dim mt-2">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
            
            {/* Search error */}
            {searchError && (
              <div className="px-4 py-2 bg-red-900/20 rounded-lg border border-red-800">
                <p className="text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle size={14} />
                  {searchError}
                </p>
              </div>
            )}
            
            {/* Search results */}
            <SearchResults
              results={searchResults}
              query={searchQuery}
              isLoading={isSearching}
              onAskNotebookLM={handleAskNotebookLM}
            />
            
            {/* Query history */}
            <QueryHistory onRerunQuery={handleRerunQuery} />
          </div>
        ) : (
          /* Chat Mode */
          <>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="mb-4">
              <div className="w-12 h-12 rounded-full bg-nb-blue/20 flex items-center justify-center">
                <Bot size={24} className="text-nb-blue" />
              </div>
            </div>
            <p className="text-nb-text text-base font-medium mb-2">AI Assistant</p>
            <p className="text-nb-text-dim text-sm mb-4">Powered by Gemini Nano</p>
            <div className="space-y-2 text-xs text-nb-text-dim">
              <p>Try asking:</p>
              <p>• "Explain quantum computing"</p>
              <p>• "Write a React component"</p>
              <p>• "Summarize machine learning"</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onSuggestionClick={handleSuggestionClick}
              onRegenerate={async () => {
                // Auto-regenerate: find user message and resubmit
                if (message.role === 'assistant') {
                  const messageIndex = messages.findIndex(m => m.id === message.id);
                  const userMsgIndex = messageIndex - 1;
                  
                  if (userMsgIndex >= 0 && messages[userMsgIndex].role === 'user') {
                    const userPrompt = messages[userMsgIndex].content;
                    
                    // Remove BOTH the user prompt and the old assistant response
setMessages(messages.filter((_, idx) => idx !== messageIndex && idx !== userMsgIndex));
                    
                    // Auto-submit with the same prompt
                    if (!session || isLoading || streamingMessageId) return;
                    
                    // Re-add the user message
                    const newUserMessage: AIMessage = {
                      id: `${Date.now()}-user-regen`,
                      role: 'user',
                      content: userPrompt,
                      timestamp: Date.now(),
                    };
addMessage(newUserMessage);
                    
                    setIsLoading(true);
                    setError(null);
                    setStatus('streaming');
                    setAutoScroll(true);
                    setShowSuggestions(false); // Hide suggestions when regenerating

                    const assistantMessageId = `${Date.now()}-assistant`;
                    setStreamingMessageId(assistantMessageId);
                    setStreamingContent('');

                    let fullContent = '';
                    let wasStopped = false;

                    // Create AbortController for this stream
                    const abortController = new AbortController();
                    abortControllerRef.current = abortController;

                    try {
                      const stream = await promptTextStreaming(session, userPrompt);
                      
                      // Process stream chunks using for-await-of loop
                      try {
                        for await (const chunk of stream) {
                          // Check if aborted
                          if (abortController.signal.aborted) {
                            console.log('[AIAssistantTab] Stream aborted by user (regenerate)');
                            wasStopped = true;
                            break;
                          }
                          
                          fullContent += chunk;
                          setStreamingContent(fullContent);
                        }
                      } catch (iterationError) {
                        // Check if it was a user-initiated stop
                        if (abortController.signal.aborted || status === 'stopping') {
                          console.log('[AIAssistantTab] Stream stopped by user (regenerate)');
                          wasStopped = true;
                        } else {
                          throw iterationError;
                        }
                      } finally {
                        abortControllerRef.current = null;
                      }

                      // Extract suggestions from AI response
                      const suggestions = extractSuggestions(fullContent);
                      
                      // Translate content if language is not English and auto-translate is enabled
                      let finalContent = fullContent || (wasStopped ? '(Response stopped by user)' : 'No response generated.');
                      let originalEnglishContent: string | undefined = undefined;
                      
                      if (!wasStopped && fullContent) {
                        const translatedContent = await translateMessageContent(fullContent);
                        // If translation occurred (content changed), store the original
                        if (translatedContent !== fullContent) {
                          originalEnglishContent = fullContent;
                          finalContent = translatedContent;
                        }
                      }
                      
                      const assistantMessage: AIMessage = {
                        id: assistantMessageId,
                        role: 'assistant',
                        content: finalContent,
                        originalContent: originalEnglishContent,
                        timestamp: Date.now(),
                        suggestions: !wasStopped && suggestions.length > 0 ? suggestions : undefined,
                      };
addMessage(assistantMessage);
                      if (!wasStopped) {
                        setError(null);
                      }
                    } catch (err) {
                      const errorMessage: AIMessage = {
                        id: assistantMessageId,
                        role: 'assistant',
                        content: fullContent || 'An unexpected error occurred while generating response.',
                        timestamp: Date.now(),
                        error: true,
                      };
addMessage(errorMessage);
                      setError(err instanceof Error ? err.message : 'Stream failed unexpectedly');
                    } finally {
                      setStreamingMessageId(null);
                      setStreamingContent('');
                      setIsLoading(false);
                      setStatus('idle');
                      abortControllerRef.current = null;
                    }
                  }
                }
              }}
            />
          ))
        )}
        {/* Streaming message with typing indicator - plain text during streaming */}
        {streamingMessageId && streamingContent && (
          <div className="flex gap-3 justify-start">
            <div className="max-w-[95%] rounded-lg px-4 py-3 bg-nb-dark-200 text-nb-text">
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {streamingContent}
                <span className="inline-block w-0.5 h-4 ml-0.5 bg-nb-blue animate-pulse align-middle" />
              </div>
            </div>
          </div>
        )}
        {/* Initial loading state (before streaming starts) - thinking dots */}
        {isLoading && !streamingMessageId && (
          <div className="flex gap-3 justify-start">
            <div className="bg-nb-dark-200 rounded-lg px-4 py-1">
              <ThinkingDots />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        
        {/* Toggle button for suggestions - only show for last assistant message when not loading */}
        {messages.length > 0 && 
         messages[messages.length - 1].role === 'assistant' && 
         !isLoading && 
         !streamingMessageId && (
          <div className="flex justify-center mt-2">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center gap-2 px-3 py-1.5 bg-nb-dark-200 hover:bg-nb-dark-300 text-nb-text-dim hover:text-nb-text rounded-lg transition-colors text-xs"
              title={showSuggestions ? "Hide follow-up questions" : "Show follow-up questions"}
            >
              <Sparkles size={14} className={showSuggestions ? 'text-nb-purple' : ''} />
              {showSuggestions ? 'Hide Questions' : 'Suggest Questions'}
            </button>
          </div>
        )}
        
        {/* Chat Learning Suggestions - only show when toggled on */}
        {showSuggestions && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (() => {
          const lastAssistantMsg = messages[messages.length - 1];
          const lastUserMsg = messages.length > 1 ? messages[messages.length - 2] : null;
          
          // Only show if we have both user and assistant messages
          if (lastUserMsg && lastUserMsg.role === 'user') {
            return (
              <ChatLearningSuggestions
                userMessage={lastUserMsg}
                assistantMessage={lastAssistantMsg}
                onSuggestionClick={handleSuggestionClick}
              />
            );
          }
          return null;
        })()}
          </>
        )}
      </div>

      {/* Error display */}
      {error && !isLoading && (
        <div className="px-4 py-2 bg-red-900/20 border-t border-red-800">
          <p className="text-xs text-red-200 flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </p>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-nb-dark-300">
        <div className="flex gap-2">
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              // Reset enhancement state when user manually edits
              if (isEnhanced) {
                setIsEnhanced(false);
                setOriginalPrompt('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask me anything... (Shift+Enter for new line)"
            className={`flex-1 bg-nb-dark-200 text-nb-text placeholder-nb-text-dim rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 ${
              isEnhanced ? 'ring-2 ring-nb-purple focus:ring-nb-purple' : 'focus:ring-nb-blue'
            }`}
            rows={3}
            disabled={isLoading || !!streamingMessageId || status === 'streaming'}
          />
          <div className="flex flex-col gap-2 self-end">
            {/* Enhance button - show if Rewriter API available or downloading (will create session on click) */}
            {(rewriterAvailability === 'available' || rewriterAvailability === 'downloading') && (
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={!inputText.trim() || isLoading || isEnhancing || !!streamingMessageId}
                className="flex items-center justify-center w-10 h-10 bg-nb-dark-200 hover:bg-nb-purple hover:text-white text-nb-text rounded-lg transition-colors disabled:bg-nb-dark-300 disabled:cursor-not-allowed"
                title="Enhance prompt with AI"
              >
                {isEnhancing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} className={isEnhanced ? 'text-nb-purple' : ''} />
                )}
              </button>
            )}
            {/* Send/Stop button */}
            <button
              type={status === 'streaming' ? 'button' : 'submit'}
              onClick={status === 'streaming' ? handleStop : undefined}
              disabled={status === 'streaming' ? false : (!inputText.trim() || isLoading)}
              className={`flex items-center justify-center w-10 h-10 text-white rounded-lg transition-colors ${
                status === 'streaming'
                  ? 'bg-nb-dark-300 hover:bg-nb-dark-400'
                  : 'bg-nb-blue hover:bg-blue-600 disabled:bg-nb-dark-300 disabled:cursor-not-allowed'
              }`}
              title={status === 'streaming' ? 'Stop Generation' : 'Send message (Enter)'}
            >
              {status === 'streaming' ? (
                <Square size={18} fill="currentColor" />
              ) : isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
        {/* Enhanced indicator and toggle */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <p className="text-xs text-nb-text-dim">Powered by Gemini Nano • Context: 6144 tokens</p>
            {/* DEBUG: Show rewriter status */}
            {rewriterAvailability !== 'unavailable' && (
              <span className="text-xs text-yellow-400">
                [Rewriter: {rewriterAvailability}]
              </span>
            )}
            {isEnhanced && (
              <span className="flex items-center gap-1 text-xs text-nb-purple">
                <Sparkles size={12} />
                Enhanced
              </span>
            )}
          </div>
          {isEnhanced && originalPrompt && (
            <button
              type="button"
              onClick={handleToggleEnhanced}
              className="flex items-center gap-1 text-xs text-nb-text-dim hover:text-nb-text transition-colors"
              title="Toggle between original and enhanced"
            >
              <RotateCcw size={12} />
              Show Original
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
