import { Streamdown } from 'streamdown';
import { useState, useEffect } from 'react';
import type { AIMessage } from '../../../../src/types/ai';
import { MessageActions } from './MessageActions';
import { CodeBlock, CodeBlockCopyButton } from '../ui/CodeBlock';
import { Suggestion, Suggestions } from '../ui/Suggestion';
import { removeFollowUpSection } from '../../../../src/lib/suggestionExtractor';
import { checkSummarizerAvailability, createSummarizerSession, summarizeText, destroySummarizerSession } from '../../../../src/lib/summarizerApi';
import type { SummarizerSession } from '../../../../src/types/summarizer';
import { checkTranslatorAvailability, createTranslatorSession, translateText } from '../../../../src/lib/translatorApi';
import type { LanguageCode } from '../../../../src/types/translator';

interface ChatMessageProps {
  message: AIMessage;
  onSuggestionClick?: (suggestion: string) => void;
  onRegenerate?: () => void;
  isStreaming?: boolean;
}

/**
 * ChatMessage Component
 * 
 * Renders a single chat message with:
 * - Markdown formatting (bold, lists, code, links)
 * - Clickable suggestion chips for follow-up questions
 * - Timestamp display
 * - Error state styling
 */
export function ChatMessage({ message, onSuggestionClick, onRegenerate, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isError = message.error;
  
  // Summarizer state
  const [summarizerAvailable, setSummarizerAvailable] = useState(false);
  const [summarizerStatus, setSummarizerStatus] = useState<'ready' | 'downloading' | 'downloadable' | 'unavailable'>('unavailable');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  
  // Translator state
  const [translatorAvailable, setTranslatorAvailable] = useState(false);
  const [translatorStatus, setTranslatorStatus] = useState<'available' | 'downloading' | 'unavailable'>('unavailable');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  // Initialize showTranslation to true if message has originalContent (was auto-translated)
  const [showTranslation, setShowTranslation] = useState(!!message.originalContent);
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('en');
  const [autoTranslate, setAutoTranslate] = useState(false);
  
  // Check Translator API availability and load language preference on mount
  useEffect(() => {
    async function checkTranslator() {
      const result = await checkTranslatorAvailability();
      console.log('[ChatMessage] Translator status:', result.status);
      
      const isAvailable = result.status === 'available' || result.status === 'downloading';
      setTranslatorAvailable(isAvailable);
      setTranslatorStatus(result.status);
      
      // Load saved language preference and auto-translate setting
      try {
        const stored = await chrome.storage.local.get(['selectedLanguage', 'autoTranslate']);
        if (stored.selectedLanguage) {
          setTargetLanguage(stored.selectedLanguage as LanguageCode);
        }
        if (stored.autoTranslate !== undefined) {
          setAutoTranslate(stored.autoTranslate);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    }
    checkTranslator();
  }, []);
  
  
  // Check Summarizer API availability on component mount
  useEffect(() => {
    async function checkAvailability() {
      const result = await checkSummarizerAvailability();
      
      // Show button if API is 'ready', 'downloading', OR 'downloadable'
      const isAvailable = result.status === 'ready' || result.status === 'downloading' || result.status === 'downloadable';
      console.log('[ChatMessage] Is available?', isAvailable, '(status:', result.status, ')');
      setSummarizerAvailable(isAvailable);
      setSummarizerStatus(result.status);
      
      if (result.status === 'downloading') {
        console.log('[ChatMessage] ⏳ Summarizer model is downloading in background');
        console.log('[ChatMessage] 💡 Check chrome://on-device-internals for download progress');
        console.log('[ChatMessage] 💡 Or try calling Summarizer.create() to trigger/monitor download');
        
        // Poll every 10 seconds (less aggressive) while downloading
        let pollCount = 0;
        const maxPolls = 60; // Max 10 minutes of polling
        
        const pollInterval = setInterval(async () => {
          pollCount++;
          const pollResult = await checkSummarizerAvailability();
          console.log(`[ChatMessage] Poll ${pollCount}/${maxPolls} - Status: ${pollResult.status}`);
          setSummarizerStatus(pollResult.status);
          
          if (pollResult.status === 'ready') {
            console.log('[ChatMessage] ✅ Model download complete! Summarizer is now ready.');
            setSummarizerAvailable(true);
            clearInterval(pollInterval);
          } else if (pollResult.status !== 'downloading' && pollResult.status !== 'downloadable') {
            console.log('[ChatMessage] Status changed to:', pollResult.status);
            clearInterval(pollInterval);
          } else if (pollCount >= maxPolls) {
            console.log('[ChatMessage] ⏱️ Max polling time reached. Download may still be in progress.');
            clearInterval(pollInterval);
          }
        }, 10000); // Poll every 10 seconds instead of 3
        
        // Cleanup interval on unmount
        return () => clearInterval(pollInterval);
      } else if (result.status === 'downloadable') {
        console.log('[ChatMessage] ✓ Summarizer button will show - model will download on first click');
      } else if (result.status === 'ready') {
        console.log('[ChatMessage] ✓ Summarizer button will show - model is ready');
      } else {
        console.log('[ChatMessage] ✗ Summarizer button hidden - API unavailable:', result.error);
      }
    }
    checkAvailability();
  }, []);
  
  // Handle translate action
  async function handleTranslate() {
    // If message has originalContent (was auto-translated), toggle between them
    if (message.originalContent) {
      setShowTranslation(!showTranslation);
      return;
    }
    
    // Otherwise, perform manual translation
    // If already translated, toggle visibility
    if (translation) {
      setShowTranslation(!showTranslation);
      return;
    }
    
    // Skip translation if target language is English (original)
    if (targetLanguage === 'en') {
      console.log('[ChatMessage] Target language is English, skipping translation');
      return;
    }
    
    setIsTranslating(true);
    
    try {
      // Create translator session
      const sessionResult = await createTranslatorSession('en', targetLanguage);
      
      if (sessionResult.success && sessionResult.session) {
        console.log('[ChatMessage] Translator session created, translating to', targetLanguage);
        
        // Translate the message content
        const translationResult = await translateText(sessionResult.session, displayContent);
        
        if (translationResult.success && translationResult.translatedText) {
          setTranslation(translationResult.translatedText);
          setShowTranslation(true);
          console.log('[ChatMessage] Translation complete');
        } else {
          console.error('[ChatMessage] Translation failed:', translationResult.message);
        }
        
        // Cleanup session
        if (sessionResult.session.destroy) {
          sessionResult.session.destroy();
        }
      } else {
        console.error('[ChatMessage] Failed to create translator session:', sessionResult.message);
      }
    } catch (error) {
      console.error('[ChatMessage] Error during translation:', error);
    } finally {
      setIsTranslating(false);
    }
  }
  
  // Handle summarize action
  async function handleSummarize() {
    // If model is still downloading, show message
    if (summarizerStatus === 'downloading') {
      console.log('[ChatMessage] Model is still downloading, please wait...');
      return;
    }
    
    if (isSummarizing || summary) {
      // If already summarized, toggle visibility
      if (summary) {
        setShowSummary(!showSummary);
      }
      return;
    }
    
    setIsSummarizing(true);
    
    try {
      // Create summarizer session
      const sessionResult = await createSummarizerSession({
        type: 'tldr',
        format: 'plain-text',
        length: 'short',
      });
      
      if (sessionResult.success && sessionResult.session) {
        // Summarize the message content
        const summaryResult = await summarizeText(sessionResult.session, displayContent);
        
        if (summaryResult.success && summaryResult.summary) {
          setSummary(summaryResult.summary);
          setShowSummary(true);
        } else {
          console.error('Summarization failed:', summaryResult.message);
        }
        
        // Cleanup session
        await destroySummarizerSession(sessionResult.session);
      } else {
        console.error('Failed to create summarizer session:', sessionResult.message);
      }
    } catch (error) {
      console.error('Error during summarization:', error);
    } finally {
      setIsSummarizing(false);
    }
  }
  
  // Clean content by removing follow-up questions section
  // (follow-up questions only appear as suggestion chips)
  const displayContent = !isUser 
    ? removeFollowUpSection(message.content)
    : message.content;

  // Determine what content to show in the main bubble
  // Priority 1: If message has originalContent (was auto-translated) and showTranslation is false, show original
  // Priority 2: If message has originalContent (was auto-translated) and showTranslation is true, show translated (current content)
  // Priority 3: If manual translation exists and showTranslation is true, show translation
  // Otherwise: Show displayContent (original)
  const contentToDisplay = !isUser && message.originalContent
    ? (showTranslation ? displayContent : removeFollowUpSection(message.originalContent))
    : (!isUser && autoTranslate && translation && showTranslation
      ? translation
      : displayContent);

  // Format timestamp
  const date = new Date(message.timestamp);
  const timeString = date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div
      className={`flex gap-3 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Message Content - no bot icon, more space for content */}
      <div className="flex flex-col gap-2 max-w-[95%] group">
        {/* Message Bubble */}
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-nb-blue text-white'
              : isError
              ? 'bg-red-900/20 border border-red-800 text-red-200'
              : 'bg-nb-dark-200 text-nb-text'
          }`}
        >
          {isUser ? (
            // User messages: simple text
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {displayContent}
            </p>
          ) : (
            // Assistant messages: streamdown rendering for real-time markdown
            <Streamdown 
              className="text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ol]:list-decimal [&_ol]:list-inside [&_ul]:list-disc [&_ul]:list-inside [&_li]:ml-0"
              components={{
                code: ({ inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  
                  if (inline) {
                    return (
                      <code
                        className="px-1.5 py-0.5 bg-nb-dark-300 text-nb-blue rounded text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  
                  return (
                    <CodeBlock
                      code={String(children).replace(/\n$/, '')}
                      language={language || 'text'}
                      showLineNumbers={false}
                    >
                      <CodeBlockCopyButton />
                    </CodeBlock>
                  );
                },
              }}
            >
              {contentToDisplay}
            </Streamdown>
          )}
        </div>

        {/* Timestamp and Actions */}
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs text-nb-text-dim">
            {timeString}
          </span>
          {/* Show actions only for non-streaming assistant messages */}
          {!isUser && !isStreaming && (
            <MessageActions
              content={message.content}
              onRegenerate={onRegenerate}
              showRegenerate={!!onRegenerate}
              onSummarize={summarizerAvailable ? handleSummarize : undefined}
              showSummarize={summarizerAvailable}
              isSummarizing={isSummarizing || summarizerStatus === 'downloading'}
              hasSummary={!!summary}
              onTranslate={translatorAvailable && targetLanguage !== 'en' ? handleTranslate : undefined}
              showTranslate={translatorAvailable && targetLanguage !== 'en'}
              isTranslating={isTranslating}
              hasTranslation={!!translation}
            />
          )}
          {/* Download status indicator */}
          {!isUser && !isStreaming && summarizerStatus === 'downloading' && (
            <span className="text-xs text-nb-purple italic animate-pulse">
              Downloading model...
            </span>
          )}
          {/* Debug info for troubleshooting */}
          {!isUser && !isStreaming && !summarizerAvailable && (
            <span className="text-xs text-nb-text-dim italic">
              Summarizer unavailable
            </span>
          )}
        </div>

        {/* Summary Section (only for assistant messages with summary) */}
        {!isUser && summary && showSummary && (
          <div className="mt-2 rounded-lg bg-nb-dark-300 border border-nb-purple/30 px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-nb-purple uppercase tracking-wide">Summary</span>
              <button
                onClick={() => setShowSummary(false)}
                className="text-xs text-nb-text-dim hover:text-nb-text transition-colors"
                type="button"
              >
                Hide
              </button>
            </div>
            <p className="text-sm leading-relaxed text-nb-text whitespace-pre-wrap">
              {summary}
            </p>
          </div>
        )}

        {/* Translation Section (only show separate bubble when auto-translate is OFF) */}
        {!isUser && !autoTranslate && translation && showTranslation && (
          <div className="mt-2 rounded-lg bg-nb-dark-300 border border-nb-blue/30 px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-nb-blue uppercase tracking-wide">Translation</span>
              <button
                onClick={() => setShowTranslation(false)}
                className="text-xs text-nb-text-dim hover:text-nb-text transition-colors"
                type="button"
              >
                Show Original
              </button>
            </div>
            <p className="text-sm leading-relaxed text-nb-text whitespace-pre-wrap">
              {translation}
            </p>
          </div>
        )}

        {/* Suggestion Chips (only for assistant messages with suggestions) */}
        {!isUser && message.suggestions && message.suggestions.length > 0 && (
          <Suggestions className="mt-1">
            {message.suggestions.map((suggestion, index) => (
              <Suggestion
                key={`${message.id}-suggestion-${index}`}
                suggestion={suggestion}
                onClick={onSuggestionClick}
              />
            ))}
          </Suggestions>
        )}
      </div>
    </div>
  );
}
