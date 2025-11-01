/**
 * Chat Learning Suggestions Component
 * AI-generated follow-up questions for chat conversations
 */

import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { createSession, destroySession } from '../../../../src/lib/promptApi';
import type { AISession } from '../../../../src/types/ai';
import type { AIMessage } from '../../../../src/types/ai';

interface ChatLearningSuggestionsProps {
  userMessage: AIMessage;
  assistantMessage: AIMessage;
  onSuggestionClick: (suggestion: string) => void;
}

/**
 * Generate chat suggestions using AI
 */
async function generateChatSuggestions(userQuery: string, aiResponse: string): Promise<string[]> {
  let session: AISession | null = null;
  
  try {
    // Create temporary session
    const result = await createSession({
      systemPrompt: 'You are a conversation assistant that generates insightful follow-up questions based on the full conversation context.',
      outputLanguage: 'en',
    });
    
    if (!result.success || !result.session) {
      throw new Error('Failed to create AI session');
    }
    
    session = result.session;
    
    // Prompt for suggestions - include BOTH user query and AI response for context
    // CRITICAL: Make it explicit that questions are FROM user TO AI
    const prompt = `You are helping a user continue their conversation with an AI assistant.

Conversation so far:
User: "${userQuery}"
AI: "${aiResponse.substring(0, 500)}..."

Your task: Generate EXACTLY 3 follow-up questions that the USER would ask the AI to learn more, dive deeper, or explore related topics.

IMPORTANT:
- These questions are FROM the user TO the AI (not the other way around)
- Questions should be phrased as if the user is asking them
- Use question words: "Can you...", "How does...", "What are...", "Could you explain...", "Tell me more about..."
- Build on both what the user wanted AND what the AI provided

Examples of GOOD questions (user asking AI):
- Can you explain [topic] in more detail?
- How does [concept] actually work?
- What are some real-world examples of [subject]?
- Could you tell me more about [aspect]?

Examples of BAD questions (avoid these):
- Do you understand [topic]? (AI asking user)
- What do you think about [subject]? (AI asking user)
- Have you tried [thing]? (AI asking user)

Format your response EXACTLY as:
- Question 1?
- Question 2?
- Question 3?

Keep each question concise (max 15 words) and conversational.`;
    
    const response = await session.prompt(prompt);
    
    // Parse response - extract questions
    const questions = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.match(/^\d+\./)) // Starts with - or 1.
      .map(line => line.replace(/^[-\d.]+\s*/, '').trim()) // Remove bullet/number
      .filter(line => line.endsWith('?') && line.length > 10) // Valid question
      .slice(0, 3); // Max 3 suggestions
    
    return questions.length > 0 ? questions : [
      'Can you explain that in more detail?',
      'What are the practical applications?',
      'How does this relate to other concepts?',
    ];
  } catch (error) {
    console.error('[ChatLearningSuggestions] Generation failed:', error);
    
    // Fallback suggestions
    return [
      'Can you provide more examples?',
      'What are the key takeaways?',
      'How can I apply this knowledge?',
    ];
  } finally {
    if (session) {
      destroySession(session);
    }
  }
}

/**
 * Chat Learning Suggestions Component
 */
export function ChatLearningSuggestions({ 
  userMessage,
  assistantMessage, 
  onSuggestionClick 
}: ChatLearningSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [messageId, setMessageId] = useState<string>('');
  
  async function handleGenerate() {
    setIsLoading(true);
    try {
      const generated = await generateChatSuggestions(userMessage.content, assistantMessage.content);
      setSuggestions(generated);
      setHasGenerated(true);
    } catch (error) {
      console.error('[ChatLearningSuggestions] Failed to generate:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  // Auto-generate when assistant message changes
  useEffect(() => {
    if (assistantMessage.id !== messageId) {
      setMessageId(assistantMessage.id);
      setHasGenerated(false);
      setSuggestions([]);
      handleGenerate();
    }
  }, [assistantMessage.id, messageId]);
  
  // Don't render if no suggestions or loading failed
  if (!isLoading && suggestions.length === 0) {
    return null;
  }
  
  return (
    <div className="border-t border-nb-dark-300 pt-3 mt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-nb-purple" />
          <span className="text-xs font-medium text-nb-text">Follow-up Questions</span>
        </div>
        {suggestions.length > 0 && !isLoading && (
          <button
            onClick={handleGenerate}
            className="p-1 hover:bg-nb-dark-200 rounded transition-colors"
            title="Refresh suggestions"
          >
            <RefreshCw size={12} className="text-nb-text-dim" />
          </button>
        )}
      </div>
      
      {/* Loading state */}
      {isLoading && suggestions.length === 0 && (
        <div className="flex items-center justify-center py-2">
          <Loader2 size={16} className="text-nb-purple animate-spin" />
        </div>
      )}
      
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              className="px-3 py-1.5 bg-nb-purple/10 hover:bg-nb-purple/20 text-nb-purple text-xs rounded-full border border-nb-purple/30 hover:border-nb-purple/50 transition-colors text-left"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
